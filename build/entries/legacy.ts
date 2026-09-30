// Labels remain a build-time installer until task 06; UI retains the
// compatibility facade until tasks 07/08. Engine initialization is explicit.
import './style.css';
import { createEngine } from '../../engine/index.ts';
import installLabels from './labels.js';
import installUI from './src/12_ui.js';
import installAdapter from './adapter.js';
const engine = createEngine('@VERSION@');
Object.assign(window, { J: engine });
installLabels(engine);
installUI(engine);
installAdapter(engine);
