import type { EffectRuntime, BaselineDefinitions } from '../types.ts';
import { installRegistry } from '../registry.ts';

export default function install(J: EffectRuntime): void {
  installRegistry(J);
const treat: BaselineDefinitions<'treat'> = { none: { name: 'なし', apply() {} } };
const bg: BaselineDefinitions<'bg'> = { none: { name: '無地', draw() {} } };
const cam: BaselineDefinitions<'cam'> = {
  push: { name: 'ゆっくり寄る', tags: ['calm', 'editorial', 'emotional', 'graphic', 'pop', 'glitch'], w: 5,
    get: (env) => ({ s: 1 + 0.03 * (env.fx.motion ?? 0.7) * J.clamp(env.lt / Math.max(0.3, env.cut.dur)) }) },
};
// post / transition effects. Entries without draw() are handled by the renderer's built-in branch.
const fx: BaselineDefinitions<'fx'> = {
  slice:  { name: 'スライスグリッチ', builtin: true },
  block:  { name: 'ブロックグリッチ', builtin: true },
  invert: { name: '反転', builtin: true },
  flash:  { name: 'フラッシュ', builtin: true },
  zoom:   { name: 'ズームブラー', builtin: true },
  mosaic: { name: 'モザイク', builtin: true },
  shake:  { name: '揺れ', builtin: true },
  chroma: { name: '色ズレの跳ね', builtin: true },
};
// cut-to-cut transitions: draw(ctx, A, B, p, info) composites the previous cut (A) and this cut (B) in device pixels



J.registerBaselineAll('treat', treat);
J.registerBaselineAll('bg', bg);
J.registerBaselineAll('cam', cam);
J.registerBaselineAll('fx', fx, undefined, ['chroma', 'shake', 'slice', 'block', 'invert', 'flash', 'zoom', 'mosaic']);
}
