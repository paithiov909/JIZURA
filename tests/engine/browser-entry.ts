import { createEngine, INITIALIZATION_ORDER } from '../../engine/index.ts';
// Browser harness has the engine alone: no editor, locale installer or WebMCP.
Object.assign(window, { createJizuraEngine: createEngine, engineOrder: INITIALIZATION_ORDER });
