import type {CanvasFrame} from './frame.js';
import type {PreparedScene} from '../core/scene-plan.js';
import type {ResolvedEffect} from '../effects/declarations.js';
import type {FrameEffectContext, ParameterValue} from '../custom-types.js';
import {customRandom, customRuntime} from '../effects/custom.js';
import {itemSeed} from '../core/random.js';
import {fail, finite, freeze, keys, record} from '../core/validation.js';
import type {ItemMotion} from '../effects/motion.js';

export function frameContext(scene: PreparedScene, work: CanvasFrame, effect: ResolvedEffect): FrameEffectContext<Readonly<Record<string, ParameterValue>>> {
  const cut = work.cut!.prepared;
  return Object.freeze({width: scene.width, height: scene.height, text: cut.text, emphasis: cut.emphasis,
    font: cut.font, style: cut.style, seed: effect.seed, params: effect.params, random: customRandom(effect.seed),
    localFrame: work.state.localFrame!, seconds: work.state.evaluationSeconds!, durationInFrames: cut.durationInFrames,
    fps: scene.fps, pIn: work.state.pIn, pOut: work.state.pOut, holdAmount: work.state.holdAmount});
}
export function applyCustomMotions(scene: PreparedScene, work: CanvasFrame, motions: ItemMotion[]): void {
  const cut = work.cut!.prepared;
  for (const [effect, active, progress] of [[cut.enter, work.state.applyEnter, work.state.pIn],
    [cut.hold, work.state.applyHold, work.state.holdAmount], [cut.exit, work.state.applyExit, work.state.pOut]] as const) {
    const runtime = effect && customRuntime(effect); if (!runtime?.transform || !active) continue;
    const context = frameContext(scene, work, effect!);
    work.items.forEach((item, itemIndex) => item.glyphs.forEach((glyph, glyphIndex) => {
      const value = runtime.transform!(Object.freeze({...context, seed: itemSeed(effect!.seed, itemIndex),
        random: customRandom(itemSeed(effect!.seed, itemIndex)), progress, glyph: freeze({...glyph}), glyphIndex, itemIndex}));
      if (value === null) return;
      const path = `${effect!.group}.${effect!.id}.transform`, t = record(value, path, 'E_EFFECT');
      keys(t, ['dx', 'dy', 'scale', 'rotation', 'alpha', 'hide'], path, 'E_EFFECT');
      for (const key of ['dx', 'dy', 'scale', 'rotation', 'alpha']) if (t[key] !== undefined)
        finite(t[key], `${path}.${key}`, key === 'scale' || key === 'alpha' ? 0 : -Infinity, key === 'alpha' ? 1 : Infinity, 'E_EFFECT');
      if (t.hide !== undefined && typeof t.hide !== 'boolean') fail('E_EFFECT', `${path}.hide`, 'Expected boolean.');
      const old = motions[itemIndex].chars[glyphIndex] ?? {};
      motions[itemIndex].chars[glyphIndex] = {hide: old.hide || t.hide as boolean | undefined,
        dx: (old.dx ?? 0) + (t.dx as number ?? 0), dy: (old.dy ?? 0) + (t.dy as number ?? 0),
        s: (old.s ?? 1) * (t.scale as number ?? 1), rot: (old.rot ?? 0) + (t.rotation as number ?? 0),
        a: (old.a ?? 1) * (t.alpha as number ?? 1)};
    }));
  }
}
