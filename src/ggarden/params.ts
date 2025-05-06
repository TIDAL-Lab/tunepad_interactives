/**
 * Groove Garden prototype
 * April 27, 2025
 */
export class Parameter {

    name : string = '';
    unit : string = '';

    readonly minValue : number;
    readonly maxValue : number;

    minPixel : number;
    maxPixel : number;

    private p : number;
    private _default : number = 0.5;

    inverted : boolean = false;

    changed : boolean = false;

    active : boolean = true;

    constructor(minValue : number, maxValue : number, minPixel : number, maxPixel : number) {
        this.minValue = minValue;
        this.maxValue = maxValue;
        this.minPixel = minPixel;
        this.maxPixel = maxPixel;
        this.p = 0.5;
    }

    clamp() {
        this.p = Math.max(0.0, Math.min(1.0, this.p));
    }

    get valueRange() : number { return this.maxValue - this.minValue; }
    get pixelRange() : number { return this.maxPixel - this.minPixel; }

    get value() : number { return this.minValue + this.p * this.valueRange; }
    set value(v : number) { 
        this.p = (v - this.minValue) / this.valueRange;
        this.changed = true;
    }

    set defaultValue(v : number) { this._default = v; }
    get defaultValue() : number { return this._default; }
    get defaultPerc() : number { return (this._default - this.minValue) / this.valueRange; }
    get defaultPixel() : number { return this.percToPixel(this.defaultPerc); }

    get pixel() : number { return this.percToPixel(this.p); }
    set pixel(px : number) {
        if (this.inverted) {
            this.p = 1.0 - (px - this.minPixel) / this.pixelRange;
        } else {
            this.p = (px - this.minPixel) / this.pixelRange;
        }
        this.changed = true;
    }

    get perc() : number { return this.p; }
    set perc(pr : number) { 
        this.p = pr;
        this.changed = true;
    }

    percToPixel(perc : number) : number {
        if (this.inverted) {
            return this.minPixel + (1.0 - perc) * this.pixelRange;
        } else {
            return this.minPixel + perc * this.pixelRange;
        }
    }

    outOfBounds() : boolean {
        return this.p > 1.0 || this.p < 0.0;
    }
}

