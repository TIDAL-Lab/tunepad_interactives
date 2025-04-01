import styles from './ggarden.module.css' with {type: 'css'};
import html from './ggarden.module.html';
import { Synthesizer, TunePadAudio } from '@tunepad/audio';


class Flower {

    private petals = new Array<number>();

    private cx : number;
    private cy : number; 
    private r : number;
    public note : number = 0;

    constructor(note : number, cx : number, cy : number, r : number, count : number = 16) {
        this.cx = cx;
        this.cy = cy;
        this.r = r;
        this.note = note;
        for (let i=0; i<count; i++) this.petals.push(0);
    }

    _drawPetal(c : CanvasRenderingContext2D, i : number, highlight : boolean, render : boolean = true) {
        const x = this.cx;
        const y = this.cy;
        const r = this.r;
        const rx = this.petals.length > 16 ? r/12 : r/7;
        c.resetTransform();
        c.save();
        c.beginPath();
        c.fillStyle = (this.petals[i] > 0) ? 'cyan' : 'white';
        c.strokeStyle = 'black';
        c.translate(x, y);
        c.rotate(i * Math.PI * 2 / this.petals.length);
        c.ellipse(0, -r/2, rx, r/2, 0, 0, 2 * Math.PI);
        if (render) {
            c.fill();
            c.lineWidth = highlight ? 4 : 2;
            c.stroke();
        }
        c.translate(-x, -y);
        c.restore();
    }


    draw(c : CanvasRenderingContext2D, beat : number = -1) {

        let highlight = -1;
        let even = false;
        const x = this.cx;
        const y = this.cy;
        const r = this.r;
        const d = this.petals.length / 4;

        if (beat >= 0) {
            highlight = Math.floor(beat * d);
            even = Math.floor(beat) % 2 == 0;
        }

        c.save();
        {
            c.strokeStyle = 'black';
            c.lineWidth = 10;
            c.lineCap = 'round';
            c.beginPath();
            c.resetTransform();
            c.translate(x, y);
            c.moveTo(0, 0);
            if (even) {
                c.quadraticCurveTo(-r/3, r * 1.25, 0, r * 2);
                //c.bezierCurveTo(-r/4, r, r/2, r, 0, r * 2);
            } else {
                c.quadraticCurveTo(r/3, r * 1.25, 0, r * 2);
                //c.bezierCurveTo(r/4, r, -r/2, r, 0, r * 2);
            }
            c.stroke();

            for (let i=0; i<this.petals.length; i++) {
                this._drawPetal(c, i, (i == highlight));
            }
            if (highlight >= 0) {
                this._drawPetal(c, highlight, true);
            }

            
            c.beginPath();
            c.arc(x, y, r / 3.75, 0, Math.PI * 2);
            c.fillStyle = 'black';
            c.fill();

            c.beginPath();
            c.resetTransform();
            c.translate(x, y + r * 2);
            const wave = Math.PI / 15 * (even ? -1 : 1);
            c.rotate(Math.PI / 4 + wave);
            c.ellipse(0, -r/2, r/7, r/2, 0, 0, 2 * Math.PI);
            c.rotate(-Math.PI / 2)
            c.ellipse(0, -r/2, r/7, r/2, 0, 0, 2 * Math.PI);
            c.fillStyle = 'black';
            c.fill();
        }
        c.restore();
        c.resetTransform();
    }


    playLoop(synth : Synthesizer, delay : number) {
        const d = this.petals.length / 4;
        for (let i=0; i<this.petals.length; i++) {
            if (this.isPetalHighlighted(i)) {
                synth.scheduleNote(this.note, i / d + delay);
            }
        }
    }


    hitTest(c : CanvasRenderingContext2D, x : number, y : number) : number {
        const cx = this.cx;
        const cy = this.cy;
        const r = this.r;
        const dx = x - cx;
        const dy = y - cy;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d <= r / 3.75 || d > r * 1.25) return -1;

        for (let i=this.petals.length - 1; i >= 0; i--) {
            this._drawPetal(c, i, false, false);
            if (c.isPointInPath(x, y)) {
                return i;
            }
            c.restore();

        }
        return -1;
    }
    
    isPetalHighlighted(i : number) : boolean {
        return (i >= 0 && i < this.petals.length && this.petals[i] > 0);
    }

    highlightPetal(i : number, velocity : number = 100) {
        if (i >=0 && i < this.petals.length) this.petals[i] = velocity;
    }

    unhighlightPetal(i : number) {
        if (i >= 0 && i < this.petals.length) this.petals[i] = 0;
    }

    togglePetal(i : number, velocity : number = 100) {
        if (i >= 0 && i < this.petals.length) this.petals[i] = (this.petals[i] > 0) ? 0 : velocity;
    }

}


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

    private canvas : HTMLCanvasElement;
    private ctx : CanvasRenderingContext2D;

    private playButton : HTMLButtonElement;

    private audio : TunePadAudio;

    private isPlaying : boolean = false;

    private flowers : Array<Flower> = [];

    constructor() {
        super();
        this.audio = TunePadAudio.init();
        this.root = this.attachShadow({ mode: 'open' });
        this.root.adoptedStyleSheets.push(styles);
        this.root.innerHTML = html;
        this.canvas = this.root.querySelector('#garden-canvas') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
        this.playButton = this.root.querySelector('#play-pause-button') as HTMLButtonElement;

        this.flowers.push(new Flower(0, 80, 200, 76));
        this.flowers.push(new Flower(2, 220, 270, 70));
        this.flowers.push(new Flower(4, 380, 200, 82));
        this.flowers.push(new Flower(10, 580, 300, 90));
    }

    async connectedCallback() {
        this.render();
        this.synth = new Synthesizer();
        try {
            await this.synth.loadPatch(new URL('/sounds/voices/808-drums/patch.json', import.meta.url));
        } catch(e) {
            this.synth.loadPatch(new URL('/assets/sounds/voices/808-drums/patch.json', import.meta.url));
        }


        this.canvas.addEventListener('pointerdown', (evt) => {
            this.flowers.forEach((flower) => {
                const petal = flower.hitTest(this.ctx, evt.offsetX, evt.offsetY);
                if (petal >= 0) {
                    flower.togglePetal(petal);
                    if (flower.isPetalHighlighted(petal)) {
                        this.synth.scheduleNote(flower.note, 0);
                    }
                    this.render();
                }
            });
        });

        this.playButton.addEventListener('click', (evt) => {
            if (this.isPlaying) {
                this.playButton.innerHTML = 'Play';
                this.synth.cancelAllNotes();
                this.isPlaying = false;
            } else {
                this.playButton.innerHTML = 'Pause';
                this.synth.scheduleNote(10, 0);
                this._start_time = this.audio.contextTime;
                this._playLoop();
                this.isPlaying = true;
                window.requestAnimationFrame((t) => this._animate(t));
            }
        });
    }

    private _start_time = 0;
    private _loop_time = 0;

    _playLoop(delay : number = 0) {
        const spb = (60 / this.audio.bpm);
        this._loop_time = this.audio.contextTime + delay * spb;
        this.flowers.forEach((flower) => {
            flower.playLoop(this.synth, delay);
        });
    }

    _animate(t : number) {
        this.render();
        if (this.isPlaying) {
            const now = this.audio.contextTime;
            const elapsed = now - this._start_time;
            const beat = elapsed * (this.audio.bpm / 60) % this.audio.beatsPerMeasure;
            const remaining = this.audio.beatsPerMeasure - beat;
            const secondsPerMeasure = (60 / this.audio.bpm) * this.audio.beatsPerMeasure;
            if (remaining < 0.25 && this._loop_time < now) {
                this._playLoop(remaining);
            } 
            // missed the loop trigger!  FIXME should probably call playLoop with a negative delay
            else if (now - this._loop_time > secondsPerMeasure) {
                this._start_time = this._loop_time + secondsPerMeasure;
                this._playLoop();
            }
            window.requestAnimationFrame((t) => this._animate(t));
        }
    }
    
    disconnectedCallback() {
    }

    attributeChangedCallback(name : string, oldValue : string, newValue : string) {
    }

    render() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const c = this.ctx;
        let cx = w/2;
        const cy = h/2 - 30;

        c.clearRect(0, 0, w, h);
        let beat = -1;

        if (this.isPlaying) {
            const elapsed = this.audio.contextTime - this._start_time;
            beat = elapsed * (this.audio.bpm / 60) % this.audio.beatsPerMeasure;
        }
        this.flowers.forEach((flower) => { flower.draw(c, beat); });
    }
 
}
