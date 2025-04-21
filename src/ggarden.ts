import styles from './ggarden.module.css' with {type: 'css'};
import stageStyles from './ggarden.stage.module.css' with {type: 'css'};
import html from './ggarden.module.html';
import stageHTML from './ggarden.stage.module.html';
import { Synthesizer, TunePadAudio } from '@tunepad/audio';

const ORANGE = 'rgb(220, 100, 70)';
const BLUE = 'rgb(150, 190, 215)';
const YELLOW = 'rgb(250, 210, 110)';
const LIGHT_RAY : Vector3 = normalize([ -100, -80, -1 ]);


class Flower {

    private color : string;
    private petals = new Array<number>();

    private cx : number;
    private cy : number; 
    private r : number;
    public note : number = 0;
    //private pattern? : CanvasPattern = undefined;
    //private texture : HTMLImageElement;

    constructor(note : number, cx : number, cy : number, r : number, color : string) {
        this.cx = cx;
        this.cy = cy;
        this.r = r;
        this.note = note;
        this.color = color;
        //this.texture = texture;
        for (let i=0; i<16; i++) this.petals.push(0);
    }


    surfaceNormal(i : number, up : boolean) : Vector3 {
        const arc = Math.PI * 2 / 16;
        const P1 = rotate([ 1, 0 ], i * arc);
        const P2 = up ? rotate([ 1, 0 ], (i + 1) * arc) : rotate([ 1, 0 ], (i - 1) * arc);
        const foldZ = this.isPetalHighlighted(i) ? -0.075 : 0.075;
        return up ? 
            normalize(normal([ P1[0], P1[1], foldZ ], [0, 0, 0], [ P2[0], P2[1], 0 ])) :
            normalize(normal([0, 0, 0], [ P1[0], P1[1], foldZ ], [ P2[0], P2[1], 0 ]));
    }


    halfPetalShape(c : CanvasRenderingContext2D, i : number, up : boolean) {
        const x = this.cx;
        const y = this.cy;
        const r = this.r;
        const ry = r / 5.5;

        c.resetTransform();
        c.translate(x, y);
        c.scale(1, -1);
        c.rotate(i * Math.PI * 2 / 16);
        c.moveTo(0, 0);
        if (up) {
            c.bezierCurveTo(r * 0.95, ry, r * 0.65, ry, r, 0);
        } else {
            c.bezierCurveTo(r * 0.95, -ry, r * 0.65, -ry, r, 0);
        }
        c.lineTo(0, 0);
    }

    petalShape(c : CanvasRenderingContext2D, i : number) {
        c.beginPath();
        this.halfPetalShape(c, i, true);
        this.halfPetalShape(c, i, false);
        c.closePath();
    }


    drawShadow(c : CanvasRenderingContext2D) {
        c.save();
        c.beginPath();
        for (let i = 0; i<16; i++) {
            this.halfPetalShape(c, i, true);
            this.halfPetalShape(c, i, false);
        }
        c.closePath();
        c.shadowBlur = 8;
        c.shadowOffsetX = -10;
        c.shadowOffsetY = 10;
        c.shadowColor = '#0007';
        c.fillStyle = this.color;
        c.fill();
        c.restore();
    }

    drawHalfPetal(c : CanvasRenderingContext2D, i : number, up : boolean, highlight : boolean = false) {
        const r = this.r;
        c.resetTransform();
        c.save();
        {
            c.beginPath();
            this.halfPetalShape(c, i, up);
            c.closePath();

            const norm = this.surfaceNormal(i, up);
            const shadow = Math.max(-1.0, Math.min(1.0, dot(LIGHT_RAY, norm)));
            const fill = shadow > 0 ? `rgba(255, 255, 255, ${shadow})` : `rgba(0, 0, 0, ${-shadow})`;
            c.fillStyle = this.color;
            c.fill();
            if (highlight) {
                c.fillStyle = '#fffa';
                c.strokeStyle = 'white';
                c.lineWidth = 1;
            }
            else if (this.isPetalHighlighted(i)) {
                c.fillStyle = '#fff7';
                c.strokeStyle = '#ffff';
                c.fill();
                c.lineWidth = 2;
            } 
            else {
                c.fillStyle = fill;
                c.strokeStyle = '#fff2';
                c.fill();
                c.lineWidth = 1;
            }
            c.fill();
            c.stroke();
        }
        c.restore();
    }

    drawCenter(c : CanvasRenderingContext2D) {
        const x = this.cx;
        const y = this.cy;
        const d = this.r / 5.5;

        c.resetTransform();
        c.save();
        {
            c.beginPath();
            c.arc(x, y, d, 0, Math.PI * 2);
            c.fillStyle = this.color;
            c.shadowBlur = 4;
            c.shadowOffsetX = 0;
            c.shadowOffsetY = 0;
            c.shadowColor = '#0007';
            c.fill();
        }
        c.restore();
        for (let i=0; i<16; i++) {
            c.resetTransform();
            c.save();
            c.beginPath();
            c.translate(x, y);
            c.scale(1, -1);
            c.rotate(i * Math.PI * 2 / 16);
            c.moveTo(0, 0);
            c.lineTo(d, d * 0.187);
            c.lineTo(d, d * -0.187);
            c.closePath();
            c.fillStyle = this.color;
            c.strokeStyle = '#0002';
            c.fill();
            c.stroke();
            c.restore();
        }
    }

    drawPetal(c : CanvasRenderingContext2D, i : number, beat : number = -1) {
        this.drawHalfPetal(c, i, true, beat == i);
        this.drawHalfPetal(c, i, false, beat == i);
    }


    draw(c : CanvasRenderingContext2D, beat : number = -1) {
        this.drawShadow(c);

        for (let i=0; i<16; i++) {
            this.drawPetal(c, i, Math.floor(beat * 4));
        }
        this.drawCenter(c);
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
            this.petalShape(c, i);
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

        //this.flowers.push(new Flower(0, 80, 200, 76, GrooveGarden.aqua_texture));
        this.flowers.push(new Flower(4, 190, 230, 150, BLUE));
        this.flowers.push(new Flower(0, 530, 200, 190, ORANGE));
        this.flowers.push(new Flower(2, 350, 457, 130, YELLOW));
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
        c.resetTransform();
        c.clearRect(0, 0, w, h);
        let beat = -1;

        if (this.isPlaying) {
            const elapsed = this.audio.contextTime - this._start_time;
            beat = elapsed * (this.audio.bpm / 60) % this.audio.beatsPerMeasure;
        }
        this.flowers.forEach((flower) => { flower.draw(c, beat); });
    }
 
}





type Point2 = [ x : number, y : number ];
type Point3 = [ x : number, y : number, z : number ];
type Vector3 = [ a : number, b : number, c : number ];

function rotate(point : Point2, theta : number) : Point2 {
    const x = point[0] * Math.cos(theta) - point[1] * Math.sin(theta);
    const y = point[0] * Math.sin(theta) - point[1] * Math.cos(theta);
    return [ x, y ];
}

function cross(A : Vector3, B : Vector3) : Vector3 {
    const x = A[1] * B[2] - A[2] * B[1];
    const y = A[2] * B[0] - A[0] * B[2];
    const z = A[0] * B[1] - A[1] * B[0];
    return [ x, y, z ];
}

function dot(A : Vector3, B : Vector3) : number {
    return A[0] * B[0] + A[1] * B[1] + A[2] * B[2];
}

function normal(a : Point3, b : Point3, c : Point3) : Vector3 {
    const AB : Vector3 = [ b[0] - a[0], b[1] - a[1], b[2] - a[2] ];
    const AC : Vector3 = [ c[0] - a[0], c[1] - a[1], c[2] - a[2] ];
    return cross(AB, AC);
}

function length(V : Vector3) : number {
    return Math.sqrt(V[0] * V[0] + V[1] * V[1] + V[2] * V[2]);
}

function normalize(V : Vector3) : Vector3 {
    const l = length(V);
    return [ V[0] / l, V[1] / l, V[2] / l ];
}
