/**
 * Groove Garden prototype
 * April 27, 2025
 */

import { COLORS } from "./defs";

export class DrumkitIcon {

    x : number;
    y : number;
    w : number;
    h : number;

    private notes = new Map<number, number> ([
        [ 0, 1.0 ],    // kick
        [ 2, 1.0 ],    // snare
        [ 4, 1.0 ],    // hat
        [ 6, 1.0 ]     // tom
    ]);


    constructor(x : number, y : number, w : number, h : number) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }

    hit(note : number) {
        this.notes.set(note, 1.5);
    }


    animate(t : number) : boolean {
        let animating = false;
        this.notes.forEach((value, key) => {
            if (value > 1.01) {
                value *= 0.97;
                animating = true;
                this.notes.set(key, value);
            }
        });
        return animating;
    }


    _drawKick(c : CanvasRenderingContext2D) {
        c.save();
        {
            const cx = this.w / 2;
            const cy = this.h * 0.63;
            const r = 8 * (this.notes.get(0) ?? 1.0);
            c.lineWidth = 2;
            c.strokeStyle = 'black';
            c.fillStyle = COLORS.ORANGE;

            c.beginPath();
            c.arc(cx, cy, r, 0, Math.PI * 2);
            c.fill();
            c.stroke();
        }
        c.restore();
    }

    _drawHat(c : CanvasRenderingContext2D) {
        const cx = this.w * 0.27;
        const y0 = this.h * 0.32;
        const y1 = this.h * 0.5;
        const y2 = this.h * 0.37;
        const off = 5 * ((this.notes.get(4) ?? 1.0) - 1.0);
        c.save();
        {
            // hat 
            c.beginPath();
            c.moveTo(cx, y0);
            c.lineTo(cx, y1);
            c.stroke();
            c.beginPath();
            c.moveTo(cx - 8, y2 - off);
            c.lineTo(cx + 8, y2 + off);
            c.stroke();
        }
        c.restore();
    }

    _drawTom(c : CanvasRenderingContext2D) {
        const cx = this.w * 0.68;
        const cy = this.h * 0.52;
        const y2 = this.h * 0.75;
        const w = 13.5 * (this.notes.get(6) ?? 1.0);
        const h = 13.5 * (this.notes.get(6) ?? 1.0);
        c.save();
        {
            c.beginPath();
            c.moveTo(cx, cy);
            c.lineTo(cx, y2);
            c.stroke();
            c.fillStyle = COLORS.YELLOW;
            c.fillRect(cx - w/2, cy - h/2, w, h);
            c.strokeRect(cx - w/2, cy - h/2, w, h);
        }
        c.restore();       
    }

    _drawSnare(c : CanvasRenderingContext2D) {
        const cx = this.w * 0.33;
        const cy = this.h * 0.52;
        const y2 = this.h * 0.75;
        const w = 13.5 * (this.notes.get(2) ?? 1.0);
        const h = 7 * (this.notes.get(2) ?? 1.0);
        c.save();
        {
            c.beginPath();
            c.moveTo(cx, cy);
            c.lineTo(cx, y2);
            c.stroke();
            c.fillStyle = COLORS.BLUE;
            c.fillRect(cx - w/2, cy - h/2, w, h);
            c.strokeRect(cx - w/2, cy - h/2, w, h);
        }
        c.restore();        
    }


    draw(c : CanvasRenderingContext2D) {
        const x = this.x;
        const y = this.y;
        const w = this.w;
        const h = this.h;
        const m = 3;
        const r = w/2 - m * 2;
        c.resetTransform();
        c.save();
        {
            c.lineJoin = 'round';
            c.translate(x, y);

            c.beginPath();
            c.arc(w/2, h/2, r, 0, Math.PI * 2);
            c.fillStyle = '#ddd';
            c.fill();

            c.lineWidth = 2;
            c.strokeStyle = 'black';
            c.moveTo(m * 3.7, h * 0.75);
            c.lineTo(w - m * 3.7, h * 0.75);
            c.stroke();

            this._drawHat(c);
            this._drawSnare(c);
            this._drawTom(c);
            this._drawKick(c);
        }
        c.restore();
    }
}

