/**
 * Groove Garden prototype
 * April 27, 2025
 * 
 * TODO:
 *   Fix Play/Stop button icons
 *   Add clouds
 */
import { Synthesizer, TunePadAudio, SoundLoader, Note } from "@tunepad/audio";
import { Flower } from "./flower";
import { Insect } from "./insect";
import { DrumkitIcon } from "./drum-icon";
import { COLORS } from "./defs";
import { Parameter } from "./params";
import styles from './ggarden.module.css' with {type: 'css'};
import html from './ggarden.module.html';
import { Creator, Renderer } from 'easy-qrcode';

const MAX_TEMPO = 180;
const MIN_TEMPO = 40;
const MAX_DETUNE = 250;
const MIN_DETUNE = -250;
const HOST_URL = 'https://learn.tunepad.space/interactives/groove-garden/';

export class GrooveGarden extends HTMLElement {

    static readonly ELEMENT = "groove-garden";

    static observedAttributes = [
        'min-value',
        'max-value',
        'value'
    ];

    /// all of the HTML elements are contained in a shadow DOM
    root : ShadowRoot;

    /// synthesizer for note audio
    private synth : Synthesizer = new Synthesizer;

    canvas : HTMLCanvasElement;
    private ctx : CanvasRenderingContext2D;

    private playButton : HTMLButtonElement;

    private audio : TunePadAudio;

    private isPlaying : boolean = false;

    private _start_time = 0;
    private _start_beat = 0;

    private _timer : any = -1;

    private flowers : Array<Flower> = [];
    private insects : Array<Insect> = [];
    private dicon : DrumkitIcon;

    private focusFlower : Flower | undefined = undefined;

    //---------------------------------------------
    // parameters
    //---------------------------------------------
    private detuneParam : Parameter;
    private tempoParam : Parameter;
    private freqParam : Parameter;
    private gainParam : Parameter;
    private panParam : Parameter;
    private qParam : Parameter;


    //---------------------------------------------
    // audio chain
    //---------------------------------------------
    private chain : GainNode;
    private bypass : GainNode; // bypasses the lowpass filter
    private bypassed = true;
    private lowpass : BiquadFilterNode;
    private pan : StereoPannerNode;
    private volume : GainNode;
    private absn : AudioBufferSourceNode | undefined;
    private loop : AudioBuffer | undefined;
    private analyzer : AnalyserNode;
    private abuffer : Uint8Array;

    private qrcode : Creator;



    constructor() {
        super();
        this.audio = TunePadAudio.init();

        const urlParams = new URLSearchParams(window.location.search);


        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Barriecito&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);

        this.root = this.attachShadow({ mode: 'open' });


        this.root.adoptedStyleSheets.push(styles);
        this.root.innerHTML = html;
        this.canvas = this.root.querySelector('#garden-canvas') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
        this.playButton = this.root.querySelector('#play-pause-button') as HTMLButtonElement;

        //this.flowers.push(new Flower(0, 80, 200, 76, GrooveGarden.aqua_texture));
        this.flowers.push(new Flower(4, 100, 500, 80, COLORS.WHITE));
        this.flowers.push(new Flower(2, 240, 340, 110, COLORS.BLUE));
        this.flowers.push(new Flower(0, 490, 300, 140, COLORS.ORANGE));
        this.flowers.push(new Flower(6, 730, 400, 110, COLORS.YELLOW));
        this.flowers.forEach((flower) => {
            const key = `n${flower.note}`;
            const value = urlParams.get(key);
            if (value) flower.load(parseInt(value));
        });


        //---------------------------------------------
        // parameters
        //---------------------------------------------
        const x0 = 200;
        const x1 = 800;
        this.freqParam = new Parameter(50, 8000, x0, x1);
        this.freqParam.value = 6000;
        this.freqParam.defaultValue = 6000;
        this.freqParam.name = 'Frequency';

        // usually -1 to 1
        this.panParam = new Parameter(-0.9, 0.1, x0, x1);
        this.panParam.value = 0;
        this.panParam.defaultValue = 0;
        this.panParam.name = ''; // this.panParam.name = 'Pan';

        this.detuneParam = new Parameter(MIN_DETUNE, MAX_DETUNE, 150, 550);
        this.detuneParam.value = 0;
        this.detuneParam.defaultValue = 0;
        this.detuneParam.name = 'Pitch';
        this.detuneParam.inverted = true;

        this.tempoParam = new Parameter(MIN_TEMPO, MAX_TEMPO, x0, x1);
        this.tempoParam.value = 90;
        this.tempoParam.defaultValue = 90;
        this.tempoParam.name = 'Tempo';

        this.gainParam = new Parameter(0.8, 1.0, 150, 550); //this.gainParam = new Parameter(0.02, 1.0, 150, 550);
        this.gainParam.value = 0.9;
        this.gainParam.defaultValue = 0.9;
        this.gainParam.inverted = true;
        this.gainParam.name = ''; // this.gainParam.name = 'Volume';

        this.qParam = new Parameter(0.1, 4.0, 150, 550);
        this.qParam.value = 1.0;
        this.qParam.defaultValue = 1.0;
        this.qParam.inverted = true;
        this.qParam.name = 'Resonance';


        //---------------------------------------------
        // insects
        //---------------------------------------------
        this.insects.push(new Insect(this, this.tempoParam, this.detuneParam, "bee"));
        this.insects.push(new Insect(this, this.panParam, this.gainParam, "butterfly"));
        //this.insects.push(new Insect(this, this.freqParam, this.qParam, "butterfly"));
        //this.insects.push(new Insect(this, this.loopParam1, py, "beetle"));
        //this.insects.push(new Insect(this, this.loopParam2, py2, "moth"));


        //---------------------------------------------
        // audio chain
        //---------------------------------------------
        this.chain = new GainNode(this.audio.context);
        this.bypass = new GainNode(this.audio.context);
        this.lowpass = new BiquadFilterNode(this.audio.context);
        this.pan = new StereoPannerNode(this.audio.context);
        this.volume = new GainNode(this.audio.context);
        this.analyzer = new AnalyserNode(this.audio.context);

        this.chain.connect(this.pan);
        this.lowpass.connect(this.bypass);
        this.bypass.connect(this.pan);
        this.pan.connect(this.volume);
        this.volume.connect(this.analyzer);
        this.analyzer.connect(this.audio.context.destination);
        this.analyzer.fftSize = 64;
        this.abuffer = new Uint8Array(this.analyzer.frequencyBinCount);

        this.dicon = new DrumkitIcon(15, 600, 70, 70);

        this.qrcode = new Creator();
    }


    async connectedCallback() {
        this.render();

        // set up default drumkit
        this.synth = new Synthesizer();
        this.loadPatch('808-drums');


        // automatic resizing
        window.addEventListener('resize', (e) => { this.resize(window.innerWidth, window.innerHeight); });
        this.resize(window.innerWidth, window.innerHeight);



        this.canvas.addEventListener('pointerdown', (evt) => {
            const sh = this.canvas.height;
            let target : Flower | undefined = undefined;
            let petal = -1;
            this.flowers.forEach((flower) => flower.restore());

            for (let i = this.insects.length - 1; i >= 0; i--) {
                const insect = this.insects[i];
                if (insect.pointerDown(evt)) {
                    this.insects.splice(i, 1);
                    this.insects.push(insect);
                    if (this.focusFlower) {
                        this.focusFlower = undefined;
                    }
                    return;
                }
            }

            for (let flower of this.flowers) {
                petal = flower.hitTest(this.ctx, evt.offsetX, evt.offsetY, sh);
                if (petal >= 0) {
                    target = flower;
                }
            }

            if (this.focusFlower != undefined && target != this.focusFlower) {
                this.focusFlower = undefined;
            } else {
                this.focusFlower = target;
            }

            if (this.focusFlower != undefined) {
                const cx = this.canvas.width / 2;
                const cy = this.canvas.height / 2;
                this.moveToTop(this.focusFlower);
                this.focusFlower.animateTo(cx, cy + 50, cy * 0.75);
                this.focusFlower.togglePetal(petal);
                this.save();
                if (petal >= 16 || this.focusFlower.isPetalHighlighted(petal)) {
                    const note = new Note(this.focusFlower.note);
                    if (this.detuneParam.active) {
                        note.detune = this.detuneParam.value;
                    }
                    this.synth.scheduleNote(note, 0, 0, this.chain);
                }
                if (petal == 16) {
                    this.focusFlower.bounce();
                }
                this.render();
            }
        });


        // genre select pulldown
        const genreSelect = this.root.querySelector('.genre-select') as HTMLSelectElement;
        genreSelect.addEventListener('change', (evt) => { 
            this.loadPatch(genreSelect.value);
            this.save();
        });
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('voice')) {
            const voice = urlParams.get('voice') as string;
            this.loadPatch(voice);
            genreSelect.value = voice;
        }



        // play pause button
        this.playButton.addEventListener('click', (evt) => {
            if (this.isPlaying) {
                this.playButton.parentElement?.classList.toggle('pause', false);
                this.synth.cancelAllNotes();
                if (this._timer >= 0) clearInterval(this._timer);
                //(this.root.getElementById('bee-dance') as HTMLAudioElement).pause();
                this.isPlaying = false;
                this.render();
            } else {
                this.playButton.parentElement?.classList.toggle('pause', true);
                const note = new Note(10);
                note.velocity = 30;
                this.synth.scheduleNote(note, 0, 0, this.chain);
                this._start_time = this.clockTime;
                this._start_beat = 0;
                this._last_petal = -1;
                this._timer = setInterval(this.audioTimer, 20);
                //(this.root.getElementById('bee-dance') as HTMLAudioElement).play();
                this.isPlaying = true;
            }
        });

        window.requestAnimationFrame((t) => this._animate(t));

        this.loop = await SoundLoader.loadAudioBuffer('/sounds/loops/arpeggio.wav');
        if (!this.loop) this.loop = await SoundLoader.loadAudioBuffer('/assets/sounds/loops/arpeggio.wav');
        
        //this.loop2 = await SoundLoader.loadAudioBuffer('/sounds/loops/bee-dance.wav');
        //if (!this.loop2) this.loop2 = await SoundLoader.loadAudioBuffer('/assets/sounds/loops/bee-dance.wav');

        // draw qr code
        const qrCanvas = this.root.querySelector('#qrcode') as HTMLCanvasElement;
        qrCanvas.addEventListener('click', (e) => {
            qrCanvas.classList.toggle('big');
            e.stopPropagation();
        });
        this.root.addEventListener('click', (e) => {
            if (qrCanvas.classList.contains('big')) {
                qrCanvas.classList.remove('big');
                e.stopPropagation();
            }
        });
    }


    async loadPatch(name : string) {
        try {
            await this.synth.loadPatch(new URL(`/sounds/voices/${name}/patch.json`, import.meta.url));
        } catch(e) {
            this.synth.loadPatch(new URL(`/assets/sounds/voices/${name}/patch.json`, import.meta.url));
        }
    }


    resize(w : number, h : number) {
        const aspect_ratio = 4 / 3;  // ipad landscape
        const oldW = this.canvas.width;
        const oldH = this.canvas.height;

        /*
        if (w / aspect_ratio > h) {
            w = h * aspect_ratio;
        } else {
            h = w / aspect_ratio;
        }
        */

        this.canvas.setAttribute('width', `${w}`);
        this.canvas.setAttribute('height', `${h}`);

        this.dicon.y = h - this.dicon.h - 5;

        for (let i=0; i<this.insects.length; i++) {
            const insect = this.insects[i];
            insect.px.minPixel = 120;
            insect.px.maxPixel = w - 150;
            insect.py.minPixel = 100;
            insect.py.maxPixel = h - 150;
            insect.dock(w - 80, 200 + i * 80);
        }

        this.render();
    }


    moveToTop(flower : Flower) {
        const index = this.flowers.indexOf(flower);
        if (index >= 0) this.flowers.splice(index, 1);
        this.flowers.push(flower);
    }

    get clockTime() { return this.audio.contextTime; }
    get startTime() { return this._start_time; }
    get startBeat() { return this._start_beat; }
    get elapsedTime() { return this.clockTime - this.startTime; }
    get beatsPerSec() { return this.audio.bpm / 60.0; }
    get secsPerBeat() { return 60.0 / this.audio.bpm;  }
    get elapsedBeats() { return this.elapsedTime * this.beatsPerSec; }
    get currentBeat() { return this.elapsedBeats + this.startBeat; }


    changeTempo(newBPM : number) {
        if (newBPM != this.audio.bpm) {
            const beat = this.currentBeat;
            this._start_beat = beat;
            this._start_time = this.clockTime;
            this.audio.bpm = Math.max(MIN_TEMPO, Math.min(newBPM, MAX_TEMPO));
            this.root.querySelector('.bpm-indicator')!.innerHTML = `${newBPM} bpm`;
        }
    }


    audioTimer = () => {
        const beat = this.currentBeat;
        const petal = Math.floor(beat * 4) + 1;

        if (petal > this._last_petal) {
            const deltaBeats = (petal / 4) - beat;
            const deltaTime = deltaBeats * this.secsPerBeat;
            if (deltaTime < 0.5) {
                this._last_petal = petal;
                this.flowers.forEach((flower) => {
                    if (flower.isPetalHighlighted(petal % 16)) {
                        const note = new Note(flower.note);
                        if (this.detuneParam.active) {
                            note.detune = this.detuneParam.value;
                        }
                        this.synth.scheduleNote(note, deltaBeats, 0, this.chain);
                        this.dicon.hit(flower.note);
                    }
                });
            }
        }
    }
    _last_petal : number = -1;


    _animate(t : number) {
        let refresh = false;
        for (let flower of this.flowers) {
            if (flower.animate(t)) refresh = true;
        }
        for (let insect of this.insects) {
            if (insect.animate(t)) refresh = true;
        }
        if (this.dicon.animate(t)) refresh = true;


        //----------------------------------------
        // 1. tempo adjustments
        //----------------------------------------
        if (this.tempoParam.changed && this.tempoParam.active) {
            const tempo = Math.round(this.tempoParam.value);
            this.changeTempo(tempo);
            this.tempoParam.changed = false;
        } 
        else if (!this.tempoParam.active) {
            this.changeTempo(this.tempoParam.defaultValue);
        }

        //----------------------------------------
        // 2. lowpass filter adjustments
        //----------------------------------------
        if (this.freqParam.changed && this.freqParam.active) {
            this.lowpass.frequency.value = this.freqParam.value;
            this.freqParam.changed = false;
        }
        if (this.qParam.changed && this.qParam.active) {
            this.lowpass.Q.value = this.qParam.value;
            this.qParam.changed = false;
        }
        if (this.freqParam.active && this.bypassed) {
            if (this.loop) {
                this.absn = new AudioBufferSourceNode(this.audio.context);
                this.absn.loop = true;
                this.absn.connect(this.lowpass);
                this.absn.buffer = this.loop;
                this.bypass.gain.value = 0.05;
                this.absn.start();
            }
            this.bypassed = false;
        } else if (!this.freqParam.active && !this.bypassed) {
            if (this.absn) {
                this.absn.stop();
                this.absn.disconnect();
                this.absn = undefined;
                this.bypass.gain.value = 1.0;
            }
            this.bypassed = true;
        }

        //----------------------------------------
        // 3. volume adjustment
        //----------------------------------------
        if (this.gainParam.changed && this.gainParam.active) {
            this.volume.gain.value = this.gainParam.value;
            this.gainParam.changed = false;
        }
        else if (!this.gainParam.active) {
            this.volume.gain.value = this.gainParam.defaultValue;
        }


        //----------------------------------------
        // 4. pan adjustment
        //----------------------------------------
        if (this.panParam.changed && this.panParam.active) {
            this.pan.pan.value = Math.min(1.0, Math.max(-1.0, this.panParam.value));
            this.panParam.changed = false;
        }
        else if (!this.panParam.active) {
            this.pan.pan.value = this.panParam.defaultValue;
        }

        if (this.isPlaying || refresh) {
            this.render();
        }
        window.requestAnimationFrame((t) => this._animate(t));
    }
    
    disconnectedCallback() { }

    attributeChangedCallback(name : string, oldValue : string, newValue : string) {  }

    /*
    tempoToY(tempo : number) {
        const cy = this.canvas.height * 0.5;
        const p = 0.3;
        return cy - (tempo - 90) / p;
    }


    yToTempo(y : number) {
        const cy = this.canvas.height * 0.5;
        const p = 0.3;
        return (cy - y) * p + 90;
    }

    detuneToX(detune : number) {
        const cx = this.canvas.width * 0.7;
        const p = 1.2;
        return cx + detune / p;
    }

    xToDetune(x : number) {
        const cx = this.canvas.width * 0.7;
        const p = 1.2;
        return (x - cx) * p;
    }
        */

    insectDragging() : Insect | undefined {
        return this.insects.find((i) => i.dragging);
    }

    render() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const c = this.ctx;

        c.resetTransform();
        c.clearRect(0, 0, w, h);


        // flowers
        let beat = this.isPlaying ? this.currentBeat % this.audio.beatsPerMeasure : -1;
        const petal = Math.floor(beat * 4);

        this.flowers.forEach((flower) => {
            flower.drawShadow(c, h);
            flower.drawStem(c, h, petal);
        });

        this.flowers.forEach((flower) => {
            if (flower != this.focusFlower) flower.draw(c, h, petal);
        });


        // insect playpen
        c.save();
        {
            const insect = this.insectDragging();
            if (insect) {
                const tx = insect.px.minPixel;
                const ty = insect.py.minPixel;
                const tw = insect.px.pixelRange;
                const th = insect.py.pixelRange;
                c.fillStyle = '#0004';
                c.fillRect(tx, ty, tw, th);
                c.strokeStyle = '#fff';
                c.lineWidth = 2;
                c.strokeRect(tx, ty, tw, th);
                c.beginPath();
                c.moveTo(tx + 30, ty + th - 10);
                c.lineTo(tx + tw - 20, ty + th - 10);
                c.stroke();
                c.beginPath();
                c.moveTo(tx + tw - 20, ty + th - 10);
                c.lineTo(tx + tw - 30, ty + th - 15);
                c.lineTo(tx + tw - 30, ty + th - 5);
                c.closePath();
                c.fillStyle = '#fff';
                c.fill();
                c.beginPath();
                c.moveTo(tx + 20, ty + th - 10);
                c.lineTo(tx + 30, ty + th - 15);
                c.lineTo(tx + 30, ty + th - 5);
                c.closePath();
                c.fill();


                c.beginPath();
                c.moveTo(tx + 10, ty + 20);
                c.lineTo(tx + 10, ty + th - 30);
                c.stroke();
                c.beginPath();
                c.moveTo(tx + 10, ty + 20);
                c.lineTo(tx + 5, ty + 30);
                c.lineTo(tx + 15, ty + 30);
                c.closePath();
                c.fill();
                c.beginPath();
                c.moveTo(tx + 10, ty + th - 20);
                c.lineTo(tx + 5, ty +  th - 30);
                c.lineTo(tx + 15, ty + th - 30);
                c.closePath();
                c.fill();

                c.font = '15px sans-serif';
                c.textAlign = "center";
                c.textBaseline = "middle";
                c.fillText(insect.px.name, tx + tw/2, ty + th - 25);

                c.translate(tx + 24, ty + th/2);
                c.rotate(Math.PI / -2);
                c.fillText(insect.py.name, 0, 0);   
            }
        }
        c.restore();
    
        if (this.focusFlower) {
            c.fillStyle = '#0007';
            c.fillRect(0, 0, w, h);
            this.focusFlower.draw(c, h, Math.floor(beat * 4));
            this.focusFlower.drawNumbers(c, h);
        }

        // insects
        this.insects.forEach((insect) => { insect.drawShadow(c); });
        this.insects.forEach((insect) => { insect.drawTrail(c); });
        this.insects.forEach((insect) => { insect.draw(c); });

        // draw ground
        c.save();
        {
            c.fillStyle = 'rgba(90, 150, 60, 1.0)';
            c.fillRect(0, h - 80, w, 80);
        }
        c.restore();

        // audio data
        if (this.isPlaying) {
            this.analyzer.getByteFrequencyData(this.abuffer);
            c.save();
            c.fillStyle = 'white';
            c.beginPath();
            const leftX = w - 230;
            const centerY = h - 41;
            const bw = 4;
            const bs = 2;

            for (let i = 0; i < this.abuffer.length; i++) {
                //const v = this.abuffer[i] / 128.0;
                //const py = y + (v * 60) / 2;
                const v = (this.abuffer[i] / 256.0);
                const bh = Math.max(2, v * 50);
                const bx = leftX + (bw + bs) * i;
                const by = centerY - bh / 2;
                c.fillRect(bx, by, bw, bh);
            }
            c.stroke();
            c.restore();
        }

        // drum icon
        this.dicon.draw(c);
    }


    save() {
        let q = '?';
        this.flowers.forEach((flower) => {
            const encode = flower.save();
            q += `n${flower.note}=${encode}&`;
        });
        const genreSelect = this.root.querySelector('.genre-select') as HTMLSelectElement;
        q += `voice=${genreSelect.value}`;
        this.drawQRCode(HOST_URL + q);
    }


    drawQRCode(url : string) {
        const qrCanvas = this.root.querySelector('#qrcode') as HTMLCanvasElement;
        this.qrcode.clear();
        this.qrcode.setVersion(10);
        this.qrcode.add(url);
        this.qrcode.create();
        const matrix = this.qrcode.getMatrix();
        const renderer = new Renderer();
        renderer.drawCanvas(matrix, qrCanvas);
    }

    shimmer(insect : string) {
        if (this._shimmer === undefined && this.loop && insect === 'butterfly') {
            const gain = new GainNode(this.audio.context);
            gain.connect(this.analyzer);
            gain.gain.value = 0.15;
            gain.gain.linearRampToValueAtTime(0, this.audio.contextTime + this.loop.duration);
            this._shimmer = new AudioBufferSourceNode(this.audio.context);
            this._shimmer.buffer = this.loop;
            this._shimmer.connect(gain);
            this._shimmer.start(0);
            this._shimmer.addEventListener('ended', e => { this._shimmer = undefined; });
        }
    }
    private _shimmer? : AudioBufferSourceNode;
}
