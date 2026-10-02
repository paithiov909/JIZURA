import {finalizeScene, prepareScene, type MeasurementService} from '../src/core/scene-plan.js';

const prepared = prepareScene({durationInFrames: 24}, {width: 640, height: 360, fps: 24}, [{text: '朝'}]);
// @ts-expect-error a PreparedScene is immutable
prepared.cuts[0].layout.params.sx = 2;
const stub: MeasurementService<{glyphs: {advance: number}[]}> = {
  prepareFonts() {}, measureCut: () => ({glyphs: [{advance: 10}]}),
};
export async function checkMeasuredTypes() {
  const scene = await finalizeScene(prepared, stub);
  // @ts-expect-error measured geometry is immutable, including nested data
  scene.cuts[0].geometry.glyphs[0].advance = 20;
}
