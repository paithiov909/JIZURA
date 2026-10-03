// Retained entry for existing still/render commands and validation harnesses.
// Remotion validates registerRoot in the entry itself before following imports.
import {registerRoot} from 'remotion';
import {Root} from './StudioRoot.tsx';

registerRoot(Root);
