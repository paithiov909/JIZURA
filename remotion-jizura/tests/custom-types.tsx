import {JizuraCut, defineLayoutEffect, defineMotionEffect, defineDecorEffect, resolveScene, type SceneInspection} from 'remotion-jizura';
const layout = defineLayoutEffect({id: 'typed.layout', name: 'T', description: 'T', tags: [], schema: {}, layout: c => [{x: 0, y: 0, size: c.fitText({maxWidth: 100, maxHeight: 50})}]});
const motion = defineMotionEffect({group: 'hold', id: 'typed.motion', name: 'T', description: 'T', tags: [],
  schema: {mode: {type: 'enum', values: ['a', 'b'], default: 'a', description: 'Mode'}, amount: {type: 'number', default: 1, min: 0, max: 2, description: 'Amount'}},
  transform: c => ({dy: c.params.amount + (c.params.mode === 'a' ? 1 : 0)})});
const decor = defineDecorEffect({id: 'typed.decor', name: 'T', description: 'T', tags: [], schema: {}, layer: 'back', draw: c => {c.ctx.fillRect(0, 0, 2, 2);}});
export const Example = () => <JizuraCut text="朝" layout={layout()} hold={motion({params: {mode: 'b', amount: 0}})} decor={[decor()]} />;
// @ts-expect-error Group mismatch.
export const WrongGroup = () => <JizuraCut text="朝" enter={layout()} />;
// @ts-expect-error Schema keeps enum literals.
motion({params: {mode: 'c'}});
// @ts-expect-error Schema keeps numeric params.
motion({params: {amount: '2'}});
// @ts-expect-error Unknown parameter.
motion({params: {unknown: 0}});
const data: SceneInspection = resolveScene({durationInFrames: 60}, {width: 640, height: 360, fps: 24}, [{text: '朝', layout: layout()}]);
void data;

// @ts-expect-error Empty schema rejects params.
layout({params: {unknown: 1}});
