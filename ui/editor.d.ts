import type { Engine } from '../engine/types.ts';
import type { EditorHost } from './types.ts';
/** Preserved JavaScript editor implementation, verified by browser interactions
 * and source comparison. This declaration is its sole TypeScript boundary. */
export default function installEditor(engine: Engine): EditorHost | undefined;
