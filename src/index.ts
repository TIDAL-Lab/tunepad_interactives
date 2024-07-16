import { NoteExplorer } from './note-explorer';
import { Piano } from '@tunepad/ui';
import { NoteDoodle } from "./note-doodle";
import { Scale } from './scale';

customElements.define(NoteDoodle.ELEMENT, NoteDoodle);
customElements.define(Piano.ELEMENT, Piano);
customElements.define(NoteExplorer.ELEMENT, NoteExplorer);
customElements.define(Scale.ELEMENT, Scale);
