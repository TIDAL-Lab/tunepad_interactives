/**
 * Groove Garden prototype
 * April 27, 2025
 */
import { GrooveGarden } from './ggarden';
import { Parameter } from './params';
import { Point2 } from './defs';

export class Insect {

    px : Parameter;
    py : Parameter;

    get x() : number { return this.px.pixel; }
    get y() : number { return this.py.pixel; }
    private r : number = 40;
    private h : number = Math.PI / 2;

    private targetX : number;
    private targetY : number;
    private targetH : number;

    private down : boolean = false;
    private garden : GrooveGarden;
    private img : HTMLImageElement;

    private dockX : number = -1;
    private dockY : number = -1;
    private docked : boolean = false;

    private trail : Point2[] = [];


    constructor(garden : GrooveGarden, px : Parameter, py : Parameter, artwork : string = 'bee') {
        this.garden = garden;
        this.px = px;
        this.py = py;
        this.targetX = this.x;
        this.targetY = this.y;
        this.targetH = this.h;

        document.addEventListener('pointermove', (e : MouseEvent) => {
            if (this.down) {
                this.targetX = e.offsetX;
                this.targetY = e.offsetY;
                const dx = this.targetX - this.x;
                const dy = this.targetY - this.y;
                const h = -1 * Math.atan2(dy, dx);
                this.targetH = (h < 0) ? Math.PI * 2 + h : h;
                garden.render();
            }
        });

        document.addEventListener('pointerup', (e) => {
            if (this.down) {
                this.down = false;
                if (this.px.outOfBounds() || this.py.outOfBounds()) {
                    this.dock(this.dockX, this.dockY);
                }
                this.trail = [];
                garden.render();
            }
        });

        this.img = new Image();
        this.img.src = `/images/insects/${artwork}-small.png`;
        this.img.onload = () => { this.garden.render(); }
        this.img.onerror = () => {
            this.img.src = `/assets/images/insects/${artwork}-small.png`;
        }
    }

    dock(dockX : number, dockY : number) {
        this.dockX = dockX;
        this.dockY = dockY;
        this.docked = true;
        this.animateTo(dockX, dockY);
        this.px.active = false;
        this.py.active = false;
        this.h = this.targetH = Math.PI / 2;
    }

    undock() {
        this.animateTo(this.px.defaultPixel, this.py.defaultPixel);
        this.docked = false;
        this.px.active = true;
        this.py.active = true;
    }

    get dragging() : boolean { return this.down; }

    get isAnimating() : boolean {
        return (
            this.down || 
            Math.abs(this.targetX - this.x) > 0.1 ||
            Math.abs(this.targetY - this.y) > 0.1);
    }


    hitTest(x : number, y : number) : boolean {
        const cx = this.x;
        const cy = this.y;
        const r = this.r;
        const dx = x - cx;
        const dy = y - cy;
        const d = Math.sqrt(dx * dx + dy * dy);
        return d <= r;
    }

    pointerDown(e : PointerEvent) : boolean {
        if (this.hitTest(e.offsetX, e.offsetY)) {
            if (this.docked) {
                this.undock();
                return true;
            } else {
                this.down = true;
                this.trail = [];
                return true;
            }
        }
        return false;
    }


    animateTo(targetX : number, targetY : number) {
        this.targetX = targetX;
        this.targetY = targetY;
    }


    animate(t : number) : boolean {
        const dx = (this.targetX - this.x) * 0.05;
        const dy = (this.targetY - this.y) * 0.05;
        this.px.pixel += dx;
        this.py.pixel += dy;
        if (!this.docked) {
            this.py.clamp();
            if (this.px.perc < 0) this.px.perc = 0.0;
        }
        this.h = this.targetH;

        if (!this.docked && this.down) {
            if (this.trail.length > 150) {
                this.trail.shift();
            }
            if (this.trail.length > 0) {
                const lastX = this.trail[this.trail.length - 1][0];
                const lastY = this.trail[this.trail.length - 1][1];
                if (Math.abs(this.x - lastX) > 1 || Math.abs(this.y - lastY) > 1) {
                    this.trail.push([ this.x, this.y ]);
                }
            } else {
                this.trail.push([ this.x, this.y ]);
            }
        }
        return this.isAnimating;
    }


    drawTrail(c : CanvasRenderingContext2D) {
        if (this.trail.length < 3) return;
        c.save();
        {
            c.lineWidth = 5;
            c.lineJoin = 'round';
            c.lineCap = 'round';
            c.strokeStyle = '#fffa';
            c.setLineDash([10, 10]);
            c.beginPath();
            c.moveTo(this.trail[0][0], this.trail[0][1]);
            for (let i=1; i<this.trail.length; i++) {
                c.lineTo(this.trail[i][0], this.trail[i][1]);
            }
            c.stroke();
        }
        c.restore();
    }


    drawShadow(c : CanvasRenderingContext2D) {
        const x = this.dockX;
        const y = this.dockY;
        const r = this.r / 2;
        c.save();
        c.fillStyle = '#0003';
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.fill();
        c.restore();
    }


    draw(c : CanvasRenderingContext2D) {
        const x = this.x;
        const y = this.y;
        const r = this.r;
        const h = this.h;
        c.save();
        {
            c.resetTransform();
            c.translate(x, y);
            c.scale(1, -1);
            c.rotate(h);
            c.beginPath();

            if (this.img.complete && this.img.width > 0) {
                c.shadowBlur = 5;
                c.shadowColor = '#0003';
                c.shadowOffsetX = -5;
                c.shadowOffsetY = 5;
                c.drawImage(this.img, -r, -r, r*2, r*2);
            }
        }
        c.restore();
    }
}

