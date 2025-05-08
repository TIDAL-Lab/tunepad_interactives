/**
 * Groove Garden prototype
 * April 27, 2025
 */
import { Vector3, dot, rotate, normal, normalize } from './defs';

const LIGHT_RAY : Vector3 = normalize([ -100, -80, -1 ]);



export class Flower {

    private color : string;
    public note : number = 0;
    private petals = new Array<number>();

    cx : number;
    h : number; // height
    r : number;

    private currentX : number;
    private currentH : number;
    private currentR : number;
    private currentC : number = 0;

    private targetX : number;
    private targetH : number;
    private targetR : number;

    //private pattern? : CanvasPattern = undefined;
    //private texture : HTMLImageElement;

    constructor(note : number, cx : number, h : number, r : number, color : string) {
        this.cx = this.currentX = this.targetX = cx;
        this.h = this.currentH = this.targetH = h;
        this.r = this.currentR = this.targetR = r;
        this.note = note;
        this.color = color;
        //this.texture = texture;
        for (let i=0; i<16; i++) this.petals.push(0);
    }


    get isAnimating() : boolean {
        return (
            Math.abs(this.targetX - this.currentX) > 0.1 ||
            Math.abs(this.targetH - this.currentH) > 0.1 ||
            Math.abs(this.targetR - this.currentR) > 0.1);
    }


    animateTo(targetX : number, targetH : number, targetR : number) {
        this.targetX = targetX;
        this.targetH = targetH;
        this.targetR = targetR;
    }

    moveTo(cx : number, h : number, r : number) {
        this.cx = this.currentX = this.targetX = cx;
        this.h = this.currentH = this.targetH = h;
        this.r = this.currentR = this.targetR = r;   
    }


    bounce(factor : number = 1.05) {
        this.currentR *= factor;
        //this.currentC = 1.0;
    }


    restore() {
        this.targetX = this.cx;
        this.targetH = this.h;
        this.targetR = this.r;
    }


    animate(t : number) : boolean {
        this.currentX += (this.targetX - this.currentX) * 0.25;
        this.currentH += (this.targetH - this.currentH) * 0.25;
        this.currentR += (this.targetR - this.currentR) * 0.25;
        this.currentC += (0.0 - this.currentC) * 0.1;
        return this.isAnimating;
    }


    _surfaceNormal(i : number, up : boolean) : Vector3 {
        const arc = Math.PI * -2 / 16;
        const off = arc * 4;
        const P1 = rotate([ 1, 0 ], i * arc - off);
        const P2 = up ? rotate([ 1, 0 ], (i + 1) * arc - off) : rotate([ 1, 0 ], (i - 1) * arc - off);
        const foldZ = this.isPetalHighlighted(i) ? -0.05 : 0.05;
        return up ? 
            normalize(normal([ P1[0], P1[1], foldZ ], [0, 0, 0], [ P2[0], P2[1], 0 ])) :
            normalize(normal([0, 0, 0], [ P1[0], P1[1], foldZ ], [ P2[0], P2[1], 0 ]));
    }


    _shadowColor(i : number, up : boolean, boost : number = 1) : string {
        const norm = this._surfaceNormal(i, up);
        const shadow = Math.max(-1.0, Math.min(1.0, dot(LIGHT_RAY, norm) * boost));
        return (shadow > 0) ? `rgba(255, 255, 255, ${shadow})` : `rgba(0, 0, 0, ${-shadow})`;        
    }


    _halfPetalShape(c : CanvasRenderingContext2D, sh : number, i : number, up : boolean) {
        const x = this.currentX;
        const y = sh - this.currentH;
        const r = this.currentR;
        const ry = r / 5.7;
        const arc = Math.PI * -2 / 16;
        const off = arc * 4;

        c.resetTransform();
        c.translate(x, y);
        c.scale(1, -1);
        c.rotate(i * arc - off);
        c.moveTo(0, 0);
        if (up) {
            c.bezierCurveTo(r * 0.8, ry, r * 0.8, ry, r, 0);
        } else {
            c.bezierCurveTo(r * 0.8, -ry, r * 0.8, -ry, r, 0);
        }
        c.lineTo(0, 0);
    }

    _petalShape(c : CanvasRenderingContext2D, sh : number, i : number) {
        c.beginPath();
        this._halfPetalShape(c, sh, i, true);
        this._halfPetalShape(c, sh, i, false);
        c.closePath();
    }


    drawShadow(c : CanvasRenderingContext2D, sh : number) {
        c.save();
        c.beginPath();
        for (let i = 0; i<16; i++) {
            this._halfPetalShape(c, sh, i, true);
            this._halfPetalShape(c, sh, i, false);
        }
        c.closePath();
        c.shadowBlur = 8;
        c.shadowOffsetX = -10;
        c.shadowOffsetY = 10;
        c.shadowColor = '#0005';
        c.fillStyle = this.color;
        c.fill();
        c.restore();
    }

    _drawLeaf(c : CanvasRenderingContext2D, y : number, angle : number) {
        const x = this.cx;
        y += 5;
        const l = 120;
        c.save();
        {
            c.resetTransform();
            c.translate(x, y);
            c.scale(1, -1);
            c.rotate(angle);
            c.beginPath();
            c.moveTo(0, 0);
            c.quadraticCurveTo(l * 0.7, l * 0.3, l, 0);
            c.quadraticCurveTo(l * 0.7, l * -0.3, 0, 0);
            c.fillStyle = '#006600';
            c.fill();
            c.lineWidth = 1.5;
            c.strokeStyle = '#fff3';
            c.beginPath();
            c.moveTo(0, 0);
            c.quadraticCurveTo(l * 0.25, l * -0.02, l * 0.95, 0);
            c.stroke();
        }
        c.restore();
    }


    drawStem(c : CanvasRenderingContext2D, sh : number, i : number) {
        const x1 = this.cx;
        const x0 = this.currentX;
        const y0 = sh - this.currentH;
        const y2 = sh - 80;
        const y1 = (y2 + y0) / 2;
        const even = Math.floor(i / 4) % 2 == 0;

        c.save();
        c.beginPath();
        c.moveTo(x0, y0);
        c.lineWidth = 9;
        c.strokeStyle = '#006600';
        c.shadowBlur = 8;
        c.shadowOffsetX = -6;
        c.shadowOffsetY = 8;
        c.shadowColor = '#0003';
        //c.lineTo(this.currentX, 1000);
        c.bezierCurveTo(
            even ? x0 + 50 : x0 - 50, y1, 
            even ? x1 - 50 : x1 + 50, y1,
            x1, y2);
        c.stroke();
        c.restore();
        const da = even ? Math.PI * 0.07 : Math.PI * -0.07;
        this._drawLeaf(c, y2, Math.PI * 0.25 + da);
        this._drawLeaf(c, y2, Math.PI * 0.75 + da);
    }


    drawNumbers(c : CanvasRenderingContext2D, sh : number) {
        c.save();
        c.font = '30px sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillStyle = '#fffa';
        const arc = Math.PI * 2 / 16;
        const off = arc * 4;
        for (let i=0; i<16; i++) {
            const r = this.currentR - 35;
            const a = arc * i - off;
            const x = this.currentX + r * Math.cos(a);
            const y = (sh - this.currentH) + r * Math.sin(a);
            if (i % 4 == 0) {
                c.fillText(`${(i / 4) + 1}`, x, y);
            } else {
                c.fillText('•', x, y);
            }
        }
        c.restore();
    }


    _drawHalfPetal(c : CanvasRenderingContext2D, sh : number, i : number, up : boolean, highlight : boolean = false) {
        const r = this.currentR;
        c.resetTransform();
        c.save();
        {
            c.beginPath();
            this._halfPetalShape(c, sh, i, up);
            c.closePath();

            c.fillStyle = this.color;
            c.fill();
            c.lineWidth = 1;
            c.strokeStyle = '#0001';

            if (highlight) {
                c.fillStyle = '#fff8';
                c.strokeStyle = 'white';
            }
            else if (this.isPetalHighlighted(i)) {
                c.fillStyle = '#fff8';
            } 
            else {
                c.fillStyle = this._shadowColor(i, up);
            }
            c.fill();
            c.stroke();

            c.beginPath();
            c.moveTo(0, up ? 1 : -1);
            c.lineTo(r, up ? 1 : -1);
            c.lineWidth = 1;
            c.strokeStyle = this._shadowColor(i, up, 0.9);
            c.stroke();
        }
        c.restore();
    }

    drawCenter(c : CanvasRenderingContext2D, sh : number) {
        const x = this.currentX;
        const y = sh - this.currentH;
        const d = this.currentR / 5.5;

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
            c.quadraticCurveTo(d * 1.25, 0, d, d * -0.187);
            c.closePath();
            c.fillStyle = this.color;
            c.strokeStyle = '#0001';
            c.lineWidth = 0.5;
            c.fill();
            c.stroke();

            if (this.currentC > 0) {
                c.fillStyle = `rgba(255, 255, 255, ${this.currentC})`;
                c.fill();
            }
            c.restore();
        }
    }


    _drawPetal(c : CanvasRenderingContext2D, sh : number, i : number, highlight : boolean = false) {
        this._drawHalfPetal(c, sh, i, true, highlight);
        this._drawHalfPetal(c, sh, i, false, highlight);
    }


    draw(c : CanvasRenderingContext2D, sh : number, highlight : number = -1) {
        if (highlight != this.last_beat && this.isPetalHighlighted(highlight)) {
            this.bounce(1.02);
        }
        for (let i=0; i<16; i++) {
            this._drawPetal(c, sh, i, highlight == i);
        }
        this.drawCenter(c, sh);
        this.last_beat = highlight;
    }
    last_beat : number = -1;


    hitTest(c : CanvasRenderingContext2D, x : number, y : number, sh : number) : number {
        const cx = this.currentX;
        const cy = (sh - this.currentH);
        const r = this.currentR;
        const dx = x - cx;
        const dy = y - cy;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > r * 1.25) {
            return -1;
        } else if (d < r / 5.5) {
            return 16;
        }


        for (let i=this.petals.length - 1; i >= 0; i--) {
            this._petalShape(c, sh, i);
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



    load(encode : number) {
        for (let i=0; i < this.petals.length; i++) {
            if ((encode & 0x01) === 1) {
                this.highlightPetal(i);
            } else {
                this.unhighlightPetal(i);
            }
            encode >>= 1;
        }
    }

    save() : number {
        let encode = 0;
        for (let i=this.petals.length - 1; i >= 0; i--) {
            if (this.isPetalHighlighted(i)) {
                encode = (encode << 1) | 0x01;
            } else {
                encode = (encode << 1) | 0x00;
            }
        }
        return encode;
    }

}
