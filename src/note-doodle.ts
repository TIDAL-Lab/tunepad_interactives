/*
 * TunePad
 *
 * Michael S. Horn
 * Northwestern University
 * michael-horn@northwestern.edu
 *
 * This project was funded by the National Science Foundation (grant DRL-1612619).
 * Any opinions, findings and conclusions or recommendations expressed in this
 * material are those of the author(s) and do not necessarily reflect the views
 * of the National Science Foundation (NSF).
 */
import styles from './note-doodle.module.css' with {type: 'css'};
import html from './note-doodle.module.html';
import { noteValues } from './note.arrays';
import { noteColors } from './note.arrays';
import { noteNames } from './note.arrays';
import { lighterColors } from './note.arrays';
import { sharps } from './note.arrays';
import { Synthesizer } from '@tunepad/audio';


export class NoteDoodle extends HTMLElement {

    static readonly ELEMENT = "note-doodle";

    // static observedAttributes = [
    //     'min-value',
    //     'max-value',
    //     'value'
    // ];

    /// all of the HTML elements for the instrument are contained within a shadow DOM

    
    
    root: ShadowRoot;
    
    container: SVGSVGElement | null = null;
    
    wholeInteractive: HTMLDivElement | null = null;;

    notes: MusicNote[] = [];

    private synth: Synthesizer;
    private svg: SVGSVGElement;
    public svgY = 30;
    // private firstNote = false;
    // private secondNote = false;
    // private thirdNote = false;
    // private fourthNote = false;

    private leftXBound = 155;
    private rightXBound = 255;
    private noteXPos = 10;
    private numNotes = 0;
    public pointerOnMenu = false;
    
    allNotes = document.createElementNS("http://www.w3.org/2000/svg", 'g');
    textBox = document.createElement('div');

    

    constructor() {
        super();
        this.root = this.attachShadow({ mode: 'open' }); 
        this.root.adoptedStyleSheets.push(styles); //add stylesheets
        this.root.innerHTML = html; //giving document some HTML
        this.svg = this.root.querySelector('svg') as SVGSVGElement; // root svg element
        const patch_url = new URL('/assets/sounds/voices/grand-piano/patch.json', import.meta.url);
        this.synth = new Synthesizer(patch_url);
    }

    playNote(note: number, length: number, releasePrev: boolean) {
        if (releasePrev) {
            this.synth.releaseAll();
        }
        this.synth.playNote(note);
        setTimeout(() => this.synth.releaseNote(note), length);
    }

    // waitNoteDuration(time: number) {
    //     setTimeout(() => {
    //       console.log('This line is delayed by one second.');
    //       // Additional code to run after the delay can go here
    //     }, 1000); // 1000 milliseconds = 1 second
    // }
    sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async playAll() {
        for (const note of this.notes) {
            this.playNote(note.value, note.length, false);
            note.textFlash();
            note.noteFlash();
            await this.sleep(note.length);
            console.log("playing one note");
            note.textBlack();
            note.noteReturn();
        }
        console.log("playing all");
    }
    
    svgCoords(mouseX : number, mouseY : number) {
        const ctm = this.svg.getScreenCTM();
        const pt = this.svg.createSVGPoint();
        // Note: rest of method could work with another element,
        // if you don't want to listen to drags on the entire svg.
        // But createSVGPoint only exists on <svg> elements.
        pt.x = mouseX;
        pt.y = mouseY;
        return pt.matrixTransform(ctm!.inverse());
    }

    render() {
        this.notes = [];

        const timeSig1 = document.createElementNS("http://www.w3.org/2000/svg", 'g');
        const lowerNum = document.createElementNS("http://www.w3.org/2000/svg", 'path');
        
        lowerNum.setAttribute("d", "M56.15,142.08c0,0,0.38-3.35,1.97-3.93c1.52-0.56,2.24-0.46,2.24-0.46l25.71-0.44c0,0-8.78,17.73-49.27,61.81h34.94l0.54-8.42c0,0,0-2.51-3.58-5.02l25.26-29.56l0.72,43h11.47v4.84H94.5v12.9c0,0,0.72,9.5,11.65,8.6v6.79l-44.84,0.2v-5.38c0,0,12.03-1.97,11.22-9.85v-5.02c0,0,0.73-7.7-8.45-7.88l-33.75,0.54c0,0-1.44-1.89,0.02-4.12C37.54,189.74,54.9,170.3,56.15,142.08z");
        timeSig1.append(lowerNum);
        const upperNum = lowerNum.cloneNode(true) as SVGPathElement;
        upperNum.setAttribute("transform", "translate(0 -102)")
        timeSig1.append(upperNum);
        timeSig1.setAttribute("transform", "translate(117 52) scale(0.21)");
        const timeSig2 = timeSig1.cloneNode(true) as SVGPathElement;
        timeSig2.setAttribute("transform", "translate(117 -28) scale(0.21)");
        this.allNotes.append(timeSig1);
        this.allNotes.append(timeSig2);
        /*const newNote = new musicNote(this, 0);

        this.allNotes.append(newNote.el);*/
        this.allNotes.setAttribute("transform", "translate(20 0)");
        
    }


    connectedCallback() {

        this.container = (this.root.querySelector("svg.container") as SVGSVGElement);
        this.container?.append(this.allNotes);

        this.container.setAttribute("transform", "scale (1)");

        this.wholeInteractive = (this.root.querySelector("#interactive-container") as HTMLDivElement);

        this.render();

        const playButton = document.createElement('button')
        playButton.textContent = "Play";
        playButton.classList.add("interactive-button");
        this.wholeInteractive.append(playButton);
        this.wholeInteractive.append(this.textBox);

        let down = false;
        document.addEventListener('pointerdown', (e) => {
            down = true;
            console.log('down');

            
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            
            const currentX = this.svgCoords(mouseX, mouseY).x;
            const currentY = this.svgCoords(mouseX, mouseY).y;

            console.log(currentX, currentY);

            if (currentX > this.leftXBound && currentX < this.rightXBound && this.noteXPos < 450 && currentY < 115 && currentY> -40 && this.pointerOnMenu == false) {
                //create the note
                const newNote = new MusicNote(this, this.noteXPos);
                this.allNotes.append(newNote.el);
                this.textBox.append(newNote.noteText);
                this.notes.push(newNote);
                console.log(this.notes);

                //change the bounds and the position for the next note
                this.leftXBound += 50;
                this.rightXBound += 50;
                this.noteXPos += 50;
                this.numNotes += 1;

            }
            


        });
        document.addEventListener('pointermove', (e) => {
            if (down) {

                const mouseX = e.clientX;
                const mouseY = e.clientY;
                this.svgY = this.svgCoords(mouseX, mouseY).y;
            }
            
        });
        document.addEventListener('pointerup', (e) => {
            if (down) console.log('up');
            down = false;
            
        });

        playButton.addEventListener('pointerdown', (e) => {
            this.playAll(); 
        });

    } //going to get called when we add element to webpage

    disconnectedCallback() {
    } //when we remove element from webpage

    attributeChangedCallback(name : string, oldValue : string, newValue : string) {
    } // going to get called once for every attribute in our dial
}

class MusicNote {
    el = document.createElementNS("http://www.w3.org/2000/svg", 'g'); //hold the whole element including ledger lines
    note = document.createElementNS("http://www.w3.org/2000/svg", 'g');
    ledgerLines = document.createElementNS("http://www.w3.org/2000/svg", 'g');
    noteText = document.createElement('p');
    contextMenu = document.createElementNS("http://www.w3.org/2000/svg", 'g')
    noteGroup = document.createElementNS("http://www.w3.org/2000/svg", 'g')
    
    

    private roundedPos = 0;
    private oldNote: number;
    private inBassClef: boolean;
    private noteValue = 60;
    private noteColor = 'rgb(255, 142, 161)';
    private noteLength = 1000; //note length in milleseconds
    private menuOpen = false;

    private selectedIcon: SVGRectElement | null = null;
    

    interactive: NoteDoodle;
        
    constructor(interactive: NoteDoodle, translateX: number) {

        this.interactive = interactive;
        this.oldNote = 0;
        this.inBassClef = false;
        // this.noteText.style.fontSize = "4px";
        // this.noteText.style.margin = "1px";
        // this.noteText.style.paddingLeft = "35px";
        this.noteText.classList.add("interactive-text");
        this.noteText.textContent = "playNote(60) #C4"

        const body = document.createElementNS("http://www.w3.org/2000/svg", 'ellipse');
        body.setAttribute("cx", "160");
        body.setAttribute("cy", "30");
        body.setAttribute("rx", "6");
        body.setAttribute("ry", "4.5");
        body.setAttribute("class", "note");

        const stem = document.createElementNS("http://www.w3.org/2000/svg", 'line');
        stem.setAttribute("x1", "165.5");
        stem.setAttribute("x2", "165.5");
        stem.setAttribute("y1", "30");
        stem.setAttribute("y2", "-5");
        stem.setAttribute("id", "stem");

        


        const tail = document.createElementNS("http://www.w3.org/2000/svg", 'path');
        tail.setAttribute("d", "M780.124,451.278C791.607,571.761 822.743,570.836 890.699,654.592C978.478,762.782 922.593,888.363 880.724,953.947C897.077,887.487 1003.32,711.966 780.915,630.724C781.328,570.03 775.998,529.329 780.124,451.278Z");
        tail.setAttribute("fill", this.noteColor);
        tail.setAttribute("transform", "scale(0.05) translate(2540 -550)");
        tail.setAttribute("class", "tail");
        tail.style.display = 'none';

        
        this.note.append(body);
        this.note.append(stem);
        this.note.append(tail);

        const cLine = document.createElementNS("http://www.w3.org/2000/svg", 'line');
        cLine.setAttribute("x1", "152.5");
        cLine.setAttribute("x2", "167.5");
        cLine.setAttribute("y1", "30");
        cLine.setAttribute("y2", "30");
        cLine.setAttribute("class", "ledger-line");

        const aLine = cLine.cloneNode(true) as SVGLineElement;
        aLine.setAttribute("y1", "40");
        aLine.setAttribute("y2", "40");

        const cLineBass = cLine.cloneNode(true) as SVGLineElement;
        cLineBass.setAttribute("y1", "50");
        cLineBass.setAttribute("y2", "50");

        const aLineHigh = cLine.cloneNode(true) as SVGLineElement;
        aLineHigh.setAttribute("y1", "-30");
        aLineHigh.setAttribute("y2", "-30");

        const cLineHigh = cLine.cloneNode(true) as SVGLineElement;
        cLineHigh.setAttribute("y1", "-40");
        cLineHigh.setAttribute("y2", "-40");

        const eLineLow = cLine.cloneNode(true) as SVGLineElement;
        eLineLow.setAttribute("y1", "110");
        eLineLow.setAttribute("y2", "110");

        const cLineLow = cLine.cloneNode(true) as SVGLineElement;
        cLineLow.setAttribute("y1", "120");
        cLineLow.setAttribute("y2", "120");

        [aLine, aLineHigh, cLineHigh, cLineBass, eLineLow, cLineLow].forEach(el => el.style.display = 'none');

        this.ledgerLines.append(cLine);
        this.ledgerLines.append(aLine);
        this.ledgerLines.append(cLineBass);
        this.ledgerLines.append(aLineHigh);
        this.ledgerLines.append(cLineHigh);
        this.ledgerLines.append(eLineLow);
        this.ledgerLines.append(cLineLow);

        //now create context menu
        const menuBox = document.createElementNS("http://www.w3.org/2000/svg", 'rect');
        menuBox.setAttribute('x', '67.5');
        menuBox.setAttribute('width', '185');
        menuBox.setAttribute('y', '45');
        menuBox.setAttribute('height', '50');
        menuBox.setAttribute('fill', '#F8F8F8');
        menuBox.classList.add('.menuBox');
        menuBox.setAttribute('stroke', "#CCCCCC");
        menuBox.setAttribute('stroke-width', '2')
        menuBox.setAttribute('rx', '5');
        menuBox.setAttribute('ry', '5');
        //menuBox.classList.add('.context-menu');

       

        const option1 = document.createElementNS("http://www.w3.org/2000/svg", 'g');
        const option2 = document.createElementNS("http://www.w3.org/2000/svg", 'g');
        const option3 = document.createElementNS("http://www.w3.org/2000/svg", 'g');
        const option4 = document.createElementNS("http://www.w3.org/2000/svg", 'g');

        const menuItemBox = document.createElementNS("http://www.w3.org/2000/svg", 'rect');
        menuItemBox.setAttribute('x', '72.5');
        menuItemBox.setAttribute('width', '40');
        menuItemBox.setAttribute('y', '50');
        menuItemBox.setAttribute('height', '40');
        menuItemBox.setAttribute('fill', '#E8E8E8');
        // menuItemBox.setAttribute('stroke', '#888888');
        
        const menuItemBox2 = menuItemBox.cloneNode(true) as SVGRectElement;
        menuItemBox2.setAttribute('x', '117.5');

        const menuItemBox3 = menuItemBox.cloneNode(true) as SVGRectElement;
        menuItemBox3.setAttribute('x', '162.5');

        const menuItemBox4 = menuItemBox.cloneNode(true) as SVGRectElement;
        menuItemBox4.setAttribute('x', '207.5');

        const iconBody = document.createElementNS("http://www.w3.org/2000/svg", 'ellipse');
        iconBody.setAttribute("cx", "92.5");
        iconBody.setAttribute("cy", "79.5");
        iconBody.setAttribute("rx", "4");
        iconBody.setAttribute("ry", "3");
        iconBody.style.fill = 'none';
        iconBody.style.stroke = 'black';

        const iconStem = document.createElementNS("http://www.w3.org/2000/svg", 'line');
        iconStem.setAttribute("x1", "96.4");
        iconStem.setAttribute("x2", "96.4");
        iconStem.setAttribute("y1", "79.5");
        iconStem.setAttribute('y2', '57.5');
        iconStem.style.stroke = 'black';
        
        const quarterIcon = document.createElementNS("http://www.w3.org/2000/svg", 'g');
        quarterIcon.append(iconBody);
        
        const wholeIcon = quarterIcon.cloneNode(true) as SVGElement;
        wholeIcon.setAttribute('transform', 'translate(135 -5)');
        

        quarterIcon.append(iconStem);

        
        const halfIcon = quarterIcon.cloneNode(true) as SVGElement;
        halfIcon.setAttribute('transform', 'translate(90 0)');

        iconBody.style.fill = 'black';

        const eighthIcon = quarterIcon.cloneNode(true) as SVGElement;

        const iconTail = document.createElementNS("http://www.w3.org/2000/svg", 'line');
        iconTail.setAttribute("x1", "100");
        iconTail.setAttribute("x2", "96.4");
        iconTail.setAttribute("y1", "63");
        iconTail.setAttribute('y2', '57.5');
        iconTail.style.stroke = 'black';
        

        eighthIcon.appendChild(iconTail);
        quarterIcon.setAttribute('transform', 'translate(45 0)');
        

        

        
        

       

        iconBody.style.fill = 'black';
        
        
        


        
        //this.note.append(quarterIcon);

        option1.appendChild(menuItemBox);
        option1.appendChild(eighthIcon);
        option2.appendChild(menuItemBox2);
        option2.appendChild(quarterIcon);
        option3.appendChild(menuItemBox3);
        option3.appendChild(halfIcon);
        option4.appendChild(menuItemBox4);
        option4.appendChild(wholeIcon);
        this.contextMenu.append(menuBox);
        this.contextMenu.append(option1);
        this.contextMenu.append(option2);
        this.contextMenu.append(option3);
        this.contextMenu.append(option4);

        

        this.contextMenu.style.display = 'none';

        this.noteGroup.append(this.note);
        this.noteGroup.append(this.contextMenu);


        this.el.setAttribute('transform', `translate (${translateX} 0)`);

        this.el.append(this.ledgerLines);

        this.el.append(this.noteGroup);

       // this.el.append(this.contextMenu);

        let downOnNote = true;
        this.note.addEventListener('pointerdown', (e) => {
            downOnNote = true;
            console.log('down on note');
            this.interactive.playNote(this.noteValue, this.noteLength, true);
            this.noteText.style.color = this.noteColor;
            this.oldNote = this.noteValue
            //console.log('play note on down');
        });

        document.addEventListener('pointermove', (e) => {
            if (downOnNote) {
                //console.log(this.interactive.svgY);

                this.roundedPos = Math.round(this.interactive.svgY! / 5) * 5 - 30; //C4 is 0, every note below is +5, every note above is -5

                if (this.roundedPos < -75) { this.roundedPos = -75 }
                if (this.roundedPos > 95) { this.roundedPos = 95 }

                let noteKey = (this.roundedPos * -1) / 5;
                if (this.roundedPos >= 0 && this.inBassClef == true) { noteKey += 4 };
                this.noteColor = noteColors[(noteKey + 21) % 7];
                let noteName = noteNames[(noteKey + 21) % 7];
                let noteOctave = Math.floor((noteKey / 7) + 4);
                this.noteValue = noteValues[(noteKey + 21) % 7] + (noteOctave - 4) * 12;

                //move the note
                this.noteGroup.setAttribute('transform', `translate(0 ${this.roundedPos})`);
                //console.log(this.roundedPos, this.interactive.svgY);

                //sets bass clef or not bass clef
                 if (this.roundedPos <= 0) {
                    this.inBassClef = false;
                } 
                if (this.roundedPos >= 20) {
                    this.inBassClef = true
                }

                //play sound
                if (this.noteValue != this.oldNote) {
                    this.interactive.playNote(this.noteValue, this.noteLength, true);
                }

                //set text
                this.noteText.textContent = "playNote(" + this.noteValue + ")";
                this.noteText.textContent += " #" + noteName + noteOctave;
                //console.log(this.noteText);

                //change color
                body.style.fill = this.noteColor;
                stem.style.stroke = this.noteColor;
                tail.style.fill = this.noteColor;
                this.noteText.style.color = this.noteColor;
                //for ledger lines
                [cLine, aLine, aLineHigh, cLineHigh, cLineBass, eLineLow, cLineLow].forEach(el => el.style.stroke = this.noteColor);

                //changing stem
                if (this.roundedPos <= -30 || (this.roundedPos >0 && this.roundedPos <= 50 && this.inBassClef)) { //bass clef, stem on left, downward pointing
                    stem.setAttribute('x1', '154.5');
                    stem.setAttribute('x2', '154.5'); 
                    stem.setAttribute('transform', `translate(0 35)`)
                    tail.setAttribute("transform", "scale(0.05 -0.05) translate(2322 -1750)");
                } else {
                    stem.setAttribute('transform',`translate(0 0)`) //treble clef, stem on right
                    stem.setAttribute('x1', '165.5');
                    stem.setAttribute('x2', '165.5'); 
                    tail.setAttribute("transform", "scale(0.05 0.05) translate(2540 -550)");
                }

                //displaying ledger lines

                if (this.roundedPos < 0 || this.roundedPos > 15 || this.inBassClef) {
                    cLine.style.display = 'none';
                } else {
                    cLine.style.display = 'block';
                }

                if ((this.roundedPos < 10 && !this.inBassClef) || (this.roundedPos > 10) && this.inBassClef) {
                    aLine.style.display = 'none';
                } else {
                    aLine.style.display = 'block';
                }

                if (this.roundedPos > -60) {
                    aLineHigh.style.display = 'none';
                } else {
                    aLineHigh.style.display = 'block';
                }

                if (this.roundedPos > - 70) {
                    cLineHigh.style.display = 'none';
                } else {
                    cLineHigh.style.display = 'block';
                }

                if (this.roundedPos < 20 && !this.inBassClef || this.roundedPos > 20) {
                    cLineBass.style.display = 'none';
                } else {
                    cLineBass.style.display = 'block';
                }

                if (this.roundedPos < 80) {
                    eLineLow.style.display = 'none';
                } else {
                    eLineLow.style.display = 'block';
                }

                if (this.roundedPos < 90) {
                    cLineLow.style.display = 'none';
                } else {
                    cLineLow.style.display = 'block';
                }


                this.oldNote = this.noteValue;
            }
        });

        this.note.addEventListener('mouseover', () => {
            this.noteText.style.color = this.noteColor; 
            this.noteFlash();
        });

        this.note.addEventListener('mouseleave', () => {
            this.noteText.style.color = 'black'; 
            this.noteReturn();
        });

        this.noteText.addEventListener('mouseenter', () => {
            this.noteText.style.color = this.noteColor; 
            this.noteFlash();
        });

        this.noteText.addEventListener('mouseleave', () => {
            this.noteText.style.color = 'black'; 
            this.noteReturn();
        });

        document.addEventListener('pointerup', (e) => {
            if (downOnNote) {
                console.log('released note');
                downOnNote = false;
                this.noteText.style.color = 'black';
            }
        });  

        this.note.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // Prevent the native context menu
            this.interactive.allNotes.appendChild(this.el);
            this.menuOpen = true;
            this.contextMenu.style.display = 'block';
        });

        document.addEventListener('pointerdown', (e) => {
            if (this.menuOpen) {
                if (!this.interactive.pointerOnMenu) {
                    this.contextMenu.style.display = 'none';
                    this.menuOpen = false;
                } 
            }

        });

        this.contextMenu.addEventListener('mouseenter', () => this.interactive.pointerOnMenu = true);
        this.contextMenu.addEventListener('mouseleave', () => this.interactive.pointerOnMenu = false);

        option1.addEventListener('mouseenter', () => this.handleMouseEnter(menuItemBox, eighthIcon));
        option1.addEventListener('mouseleave', () => this.handleMouseLeave(menuItemBox, eighthIcon));
        option1.addEventListener('mousedown', () => this.handleClick(menuItemBox, eighthIcon, 500));

        option2.addEventListener('mouseenter', () => this.handleMouseEnter(menuItemBox2, quarterIcon));
        option2.addEventListener('mouseleave', () => this.handleMouseLeave(menuItemBox2, quarterIcon));
        option2.addEventListener('mousedown', () => this.handleClick(menuItemBox2, quarterIcon, 1000));

        option3.addEventListener('mouseenter', () => this.handleMouseEnter(menuItemBox3, halfIcon));
        option3.addEventListener('mouseleave', () => this.handleMouseLeave(menuItemBox3, halfIcon));
        option3.addEventListener('mousedown', () => this.handleClick(menuItemBox3, halfIcon, 2000));

        option4.addEventListener('mouseenter', () => this.handleMouseEnter(menuItemBox4, wholeIcon));
        option4.addEventListener('mouseleave', () => this.handleMouseLeave(menuItemBox4, wholeIcon));
        option4.addEventListener('mousedown', () => this.handleClick(menuItemBox4, wholeIcon, 4000));

        
    }

    get value() {
        return this.noteValue;
    }

    get length() {
        return this.noteLength;
    }

    textFlash() {
        this.noteText.style.color = this.noteColor;
    }

    textBlack() {
        this.noteText.style.color = 'black';
    }

    noteFlash() {
        const ellipse = this.note.querySelector('ellipse');
        const line = this.note.querySelector('line');
        const path = this.note.querySelector('path');

        if (ellipse && line && path) {
            ellipse.style.fill = lighterColors[this.noteColor];
            line.style.stroke = lighterColors[this.noteColor];
            path.style.fill = lighterColors[this.noteColor];
            console.log(lighterColors[this.noteColor]);
        }

        const ledgerLines = this.ledgerLines.querySelectorAll('.ledger-line') as NodeListOf<SVGElement>;
        console.log(ledgerLines);
        ledgerLines.forEach((line: SVGElement) => {
            line.style.stroke = lighterColors[this.noteColor];
        });
    
        console.log('attempting to change color');
    }

    noteReturn() {
        const ellipse = this.note.querySelector('ellipse');
        const line = this.note.querySelector('line');
        const path = this.note.querySelector('path');

        if (ellipse && line && path) {
            ellipse.style.fill = this.noteColor;
            line.style.stroke = this.noteColor;
            path.style.fill = this.noteColor;
        }

        const ledgerLines = this.ledgerLines.querySelectorAll('.ledger-line') as NodeListOf<SVGElement>;
        console.log(ledgerLines);
        ledgerLines.forEach((line: SVGElement) => {
            line.style.stroke = this.noteColor;
        });
    }

    // Function to handle mouse enter event
    handleMouseEnter(menuItemBox: SVGRectElement, icon: SVGElement) {
        if (menuItemBox != this.selectedIcon) {
            menuItemBox.style.fill = '#F1F1F1';
            icon.setAttribute('opacity', '0.7');
        }
    }

    // Function to handle mouse leave event
    handleMouseLeave(menuItemBox: SVGRectElement, icon: SVGElement) {
        if (menuItemBox != this.selectedIcon) {
            menuItemBox.style.fill = '#E8E8E8';
            icon.setAttribute('opacity', '1');
            console.log(menuItemBox == this.selectedIcon);
        } 
    }

    // Function to handle click event
    handleClick(menuItemBox: SVGRectElement, icon: SVGElement, length: number) {
        menuItemBox.style.fill = '#C1C1C1';
        icon.setAttribute('opacity', '1');
        this.selectedIcon = menuItemBox;
        this.noteLength = length;
    }


}


