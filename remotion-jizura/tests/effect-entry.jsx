import React, {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Internals, Sequence} from 'remotion';
import {JizuraScene, JizuraCut} from '../src/index.ts';
import {prepareScene, finalizeScene} from '../src/core/scene-plan.ts';
import {CanvasMeasurementService} from '../src/canvas/service.ts';
import {drawFrame, createCanvasFrame} from '../src/canvas/frame.ts';
import {prepareEffectItems, clearEffectCache} from '../src/canvas/effect-frame.ts';
import {GlyphCache} from '../src/canvas/glyphs.ts';
import {drawReference} from './effect-reference.jsx';
import {effectCases} from './effect-cases.js';
const config = {width: 640, height: 360, fps: 24};
const font = {family: 'Noto Sans JP', weight: 700, style: 'normal', src: '/NotoSansJP.ttf'};
const props = {durationInFrames: 60, font, style: {fontSize: 64}, background: '#16324F'};
const canvas = (w = 640, h = 360) => {const c = document.createElement('canvas'); c.width = w; c.height = h; return c;};
const check = (v, m) => {if (!v) throw new Error(m);};
const wait = () => new Promise(resolve => setTimeout(resolve, 20));
async function ready(host, count = 1) {for (let n = 0; n < 500; n++) {if (host.querySelectorAll('canvas[data-jizura-ready="true"]').length === count) return; await wait();} throw new Error('Effect Scene never ready');}
const pixels = c => c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
function compare(a, b) {
  const x = pixels(a), y = pixels(b); let differentPixels = 0, maxChannelDifference = 0, sum = 0;
  for (let i = 0; i < x.length; i += 4) {let diff = false; for (let j = 0; j < 4; j++) {const d = Math.abs(x[i + j] - y[i + j]); diff ||= d !== 0; maxChannelDifference = Math.max(maxChannelDifference, d); sum += d;} if (diff) differentPixels++;}
  return {differentPixels, maxChannelDifference, meanChannelDifference: sum / x.length};
}
function context(child, f) {return <Internals.CompositionManager.Provider value={{compositions: [{id: 'test', ...config, durationInFrames: 120, defaultProps: {}}], canvasContent: {type: 'composition', compositionId: 'test'}}}><Internals.CanUseRemotionHooksProvider><Internals.TimelineContext.Provider value={{frame: {test: f}}}>{child}</Internals.TimelineContext.Provider></Internals.CanUseRemotionHooksProvider></Internals.CompositionManager.Provider>;}
window.runEffectChecks = async () => {
  const report = {comparisons: [], geometry: [], images: [], lifecycle: {}};
  const frames = [0, 1, 3, 8, 14, 24, 30, 43, 48, 55, 59, 60];
  for (const [name, declaration] of Object.entries(effectCases)) {
    const service = new CanvasMeasurementService(document), prepared = prepareScene(props, config, [declaration]);
    const plan = await finalizeScene(prepared, service), before = JSON.stringify(plan), target = canvas(), reference = canvas();
    try {
      for (const frame of name === "fixed" ? Array.from({length: 61}, (_, i) => i) : frames) {
        drawFrame(target, plan, frame); const result = drawReference(reference, plan, frame);
        report.comparisons.push({name, frame, ...compare(target, reference)});
        if (result) {
          check(result.text === plan.cuts[0].geometry.items[0].text, `${name}: reference reflow mismatch`);
          let difference = 0;
          const work = createCanvasFrame(plan, frame); prepareEffectItems(work);
          if (result.box && work.box) for (const key of ['x0', 'x1', 'y0', 'y1', 'cx', 'cy']) difference = Math.max(difference, Math.abs(result.box[key] - work.box[key]));
          for (let i = 0; i < result.glyphs.length; i++) for (const k of ['x', 'y', 'w', 'h']) difference = Math.max(difference, Math.abs(result.glyphs[i][k] - plan.cuts[0].geometry.items[0].glyphs[i][k]));
          report.geometry.push({name, frame, maxDifference: difference});
        }
        if (name === 'fixed' || (['pop', 'wipe', 'drift', 'repeated', 'center'].includes(name) && [3, 30, 55].includes(frame))) report.images.push({name, frame, target: target.toDataURL(), reference: reference.toDataURL()});
      }
      const snapshots = new Map();
      for (const f of [0, 55, 10, 55, 30, 1, 59, 30]) {drawFrame(target, plan, f); const url = target.toDataURL(); if (snapshots.has(f)) check(url === snapshots.get(f), `${name}: seek changed pixels`); snapshots.set(f, url);}
      clearEffectCache(target); drawFrame(target, plan, 55); check(target.toDataURL() === snapshots.get(55), `${name}: cache recreation changed pixels`);
      check(before === JSON.stringify(plan), `${name}: mutated plan`);
      report.lifecycle[name] = {seekIdentical: true, cacheRecreatedIdentical: true, planUnchanged: true};
    } finally {service.dispose();}
  }
  // Same canvas, distinct Cut seeds in reverse order and a quantized frame pair.
  const service = new CanvasMeasurementService(document), multi = await finalizeScene(prepareScene({...props, durationInFrames: 120}, config,
    [{...effectCases.drift, durationInFrames: 60}, {...effectCases.seedDifferent, durationInFrames: 60}]), service);
  const cv = canvas(), images = new Map();
  for (const f of [55, 115, 55, 115]) {drawFrame(cv, multi, f); const url = cv.toDataURL(); if (images.has(f)) check(images.get(f) === url, 'Cross-Cut seed cache leaked'); images.set(f, url);}
  for (const f of [0, 59, 60, 61, 119, 120]) {
    const ref = canvas(); drawFrame(cv, multi, f); drawReference(ref, multi, f);
    report.comparisons.push({name: 'cutBoundary', frame: f, ...compare(cv, ref)});
  }
  check(images.get(55) !== images.get(115), 'Different seeds did not change output');
  const q = await finalizeScene(prepareScene({...props, motionFps: 12}, config, [effectCases.fixed]), service);
  drawFrame(cv, q, 54); const q54 = cv.toDataURL(); drawFrame(cv, q, 55); check(q54 === cv.toDataURL(), 'Quantized effects differ on twos');
  // Exercise fragment seed 0 directly, independently of the effect->item hash.
  const cache = new GlyphCache(document), a = cache.get(font, '朝', 64, 0), b = cache.get(font, '朝', 64, 1);
  check(a !== b && cache.get(font, '朝', 64, 0) === a, 'Glyph cache omitted seed');
  check(JSON.stringify(a.shards.map(p => p.poly)) !== JSON.stringify(b.shards.map(p => p.poly)), 'Zero seed lost its polygon');
  report.cache = {crossCutIdentical: true, seedsDiffer: true, zeroSeedSeparate: true, quantizedPairIdentical: true, components: a.glyph.pieces.length, shards: a.shards.length}; service.dispose();

  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host);
  const scene = (mode = 'fixed', extra = {}) => <JizuraScene {...props} {...extra}><JizuraCut {...effectCases[mode]} /></JizuraScene>;
  flushSync(() => root.render(context(<StrictMode>{scene()}</StrictMode>, 55))); await ready(host); const initialCanvas = host.querySelector('canvas');
  const captured = new Map();
  for (const f of [55, 0, 30, 10, 55, 59, 60, 55]) {flushSync(() => root.render(context(<StrictMode>{scene()}</StrictMode>, f))); check(host.querySelector('canvas') === initialCanvas, 'Effects recreated Scene canvas'); const url = initialCanvas.toDataURL(); if (captured.has(f)) check(captured.get(f) === url, 'Mounted seek changed effects'); captured.set(f, url);}
  flushSync(() => root.render(context(<Sequence from={12}>{scene()}</Sequence>, 67))); await ready(host); check(host.querySelector('canvas').toDataURL() === captured.get(55), 'Sequence changed effect pose');
  flushSync(() => root.render(context(<>{scene('seedDifferent')}{scene()}</>, 55))); await ready(host, 2); check(host.querySelectorAll('canvas')[1].toDataURL() === captured.get(55), 'Multiple Scenes shared effect state');
  flushSync(() => root.render(context(scene(), 55))); await ready(host); check(host.querySelector('canvas').toDataURL() === captured.get(55), 'Remount changed fragments');
  const regenerated = new CanvasMeasurementService(document), rebuilt = await finalizeScene(prepareScene(props, config, [effectCases.fixed]), regenerated);
  const direct = canvas(); drawFrame(direct, rebuilt, 55); check(direct.toDataURL() === captured.get(55), 'Public Scene differs from direct canvas'); regenerated.dispose();
  root.unmount(); host.remove(); check(document.fonts.size === 0 && window.remotion_delayRenderHandles.length === 0, 'Effects leaked fonts/handles');
  report.mounted = {strictMode: true, seekIdentical: true, sequenceIdentical: true, multipleScenes: true, remountIdentical: true, rebuiltPlanIdentical: true, directIdentical: true, finalFaces: document.fonts.size, finalHandles: window.remotion_delayRenderHandles.length};
  return report;
};
