import {JizuraError} from '../core/error.js';
import type {JizuraCutProps} from '../types.js';

export function JizuraCut(_props: JizuraCutProps): never {
  throw new JizuraError('E_CHILD', 'children', 'JizuraCut is a declaration and can only be collected inside JizuraScene.');
}
