import {evaluateFrame, type FrameState} from '../core/frame.js';
import type {ScenePlan} from '../core/scene-plan.js';
import type {Box, CutGeometry, StaticItem} from './geometry.js';
import {drawEmptyFrame} from './empty-frame.js';
import {drawEffects} from './effect-frame.js';

type Mutable<T> = T extends object ? {-readonly [K in keyof T]: Mutable<T[K]>} : T;
export type FrameItem = Mutable<StaticItem>;
export type CanvasFrame = {
  readonly state: FrameState;
  readonly cut: ScenePlan<CutGeometry>['cuts'][number] | null;
  items: FrameItem[];
  box: Mutable<Box> | null;
};

export function createCanvasFrame(plan: ScenePlan<CutGeometry>, frame: number): CanvasFrame {
  const state = evaluateFrame(plan.prepared, frame);
  const cut = state.activeCutIndex === null ? null : plan.cuts[state.activeCutIndex];
  return {state, cut,
    items: cut?.geometry.items.map(item => ({...item, font: {...item.font}, glyphs: item.glyphs.map(g => ({...g}))})) ?? [],
    box: cut?.geometry.box ? {...cut.geometry.box} : null,
  };
}

// Internal synchronous entry; effects use owned scratch data and stateless layers.
// No callback or mutable item belongs in ScenePlan.
// The optional transform is used by development tests, not a public effect API.
export function drawFrame(canvas: HTMLCanvasElement, plan: ScenePlan<CutGeometry>, frame: number,
  transform?: (work: CanvasFrame) => void): void {
  const work = createCanvasFrame(plan, frame);
  drawEmptyFrame(canvas, plan.prepared.background, work.state.sceneActive);
  if (!work.cut) return;
  transform?.(work);
  drawEffects(canvas, plan, work);
}
