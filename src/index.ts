import { NoteExplorer } from './note-explorer';
import { Piano } from '@tunepad/ui';
import { NoteDoodle } from "./note-doodle";
import { Scale } from './scale';
import { GrooveGarden } from './ggarden/ggarden';
import { NeuralNet } from './perceptron/perceptron';

customElements.define(NoteDoodle.ELEMENT, NoteDoodle);
customElements.define(Piano.ELEMENT, Piano);
customElements.define(NoteExplorer.ELEMENT, NoteExplorer);
customElements.define(Scale.ELEMENT, Scale);
customElements.define(GrooveGarden.ELEMENT, GrooveGarden);
customElements.define(NeuralNet.ELEMENT, NeuralNet);
