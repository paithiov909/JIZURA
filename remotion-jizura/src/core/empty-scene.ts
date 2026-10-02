import {Fragment, isValidElement, type ReactNode} from 'react';
import type {JizuraSceneProps} from '../types.js';
import {JizuraError, unimplemented} from './error.js';
import {JizuraCut} from '../react/JizuraCut.js';

function positiveInteger(value: number, path: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new JizuraError('E_NUMBER', path, 'Expected a positive safe integer.');
  }
  return value;
}

function assertEmpty(children: ReactNode, path = 'children'): void {
  if (children == null || typeof children === 'boolean') return;
  if (Array.isArray(children)) {
    children.forEach((child, index) => assertEmpty(child, `${path}[${index}]`));
    return;
  }
  if (isValidElement<{children?: ReactNode}>(children) && children.type === Fragment) {
    if (Object.keys(children.props).some((key) => key !== 'children')) {
      throw new JizuraError('E_CHILD', path, 'Fragment only supports children.');
    }
    assertEmpty(children.props.children, path);
    return;
  }
  // Collection and validation of Cut declarations belongs to stage 03.
  if (isValidElement(children) && children.type === JizuraCut) unimplemented(path);
  throw new JizuraError('E_CHILD', path, 'Expected a Cut declaration, array or Fragment.');
}

export function resolveEmptyScene(
  props: JizuraSceneProps,
  config: {width: number; height: number; fps: number},
): {width: number; height: number; durationInFrames: number; background: string | null} {
  const allowed = ['durationInFrames', 'width', 'height', 'seed', 'font', 'style', 'background', 'motionFps', 'children'];
  for (const key of Object.keys(props)) {
    if (!allowed.includes(key)) throw new JizuraError('E_INPUT', key, 'Unknown Scene prop.');
  }
  const durationInFrames = positiveInteger(props.durationInFrames, 'durationInFrames');
  const width = positiveInteger(props.width === undefined ? config.width : props.width, 'width');
  const height = positiveInteger(props.height === undefined ? config.height : props.height, 'height');
  if (!Number.isFinite(config.fps) || config.fps <= 0) {
    throw new JizuraError('E_NUMBER', 'fps', 'Expected positive finite fps.');
  }
  // These props have their final public types, but require the stage 03 resolver.
  for (const key of ['seed', 'font', 'style', 'motionFps'] as const) {
    if (props[key] !== undefined) unimplemented(key);
  }
  let background = props.background === undefined ? '#111111' : props.background;
  if (background !== null) {
    if (typeof background !== 'string' || !/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(background)) {
      throw new JizuraError('E_STYLE', 'background', 'Expected #RGB, #RRGGBB or null.');
    }
    background = background.length === 4
      ? '#' + [...background.slice(1)].map((c) => c + c).join('').toUpperCase()
      : background.toUpperCase();
  }
  assertEmpty(props.children);
  return {width, height, durationInFrames, background};
}
