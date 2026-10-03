import {Fragment, isValidElement, type ReactNode} from 'react';
import type {JizuraCutProps, JizuraSceneProps} from '../types.js';
import {JizuraCut} from './JizuraCut.js';
import {fail, keys} from '../core/validation.js';
import {prepareScene} from '../core/scene-plan.js';

export function collectCuts(children: ReactNode): readonly JizuraCutProps[] {
  const cuts: JizuraCutProps[] = [];
  const visit = (child: ReactNode, path: string): void => {
    if (child == null || typeof child === 'boolean') return;
    if (Array.isArray(child)) { child.forEach((c, i) => visit(c, `${path}[${i}]`)); return; }
    if (isValidElement<{children?: ReactNode}>(child) && child.type === Fragment) {
      keys(child.props as Record<string, unknown>, ['children', 'key'], path, 'E_CHILD');
      visit(child.props.children, `${path}.children`); return;
    }
    if (isValidElement<JizuraCutProps>(child) && child.type === JizuraCut) {
      if (Object.hasOwn(child.props, 'children')) fail('E_CHILD', path, 'Cut does not accept children.');
      // React 19 also places a non-enumerable warning getter for key in props.
      // Do not read that getter or include React's key in the declaration.
      cuts.push(Object.fromEntries(Reflect.ownKeys(child.props).filter(key => key !== 'key')
        .map(key => [key, Reflect.get(child.props, key)])) as JizuraCutProps);
      if (cuts.length > 1000) fail('E_INPUT', 'children', 'Too many Cuts.');
      return;
    }
    fail('E_CHILD', path, 'Expected a direct Cut, array or Fragment.');
  };
  visit(children, 'children'); return cuts;
}
export function prepareSceneFromProps(props: JizuraSceneProps, config: {width: number; height: number; fps: number}) {
  const {children, onInspect, ...settings} = props;
  if (onInspect !== undefined && typeof onInspect !== 'function') fail('E_INPUT', 'onInspect', 'Expected a callback.');
  return prepareScene(settings, config, () => collectCuts(children));
}
