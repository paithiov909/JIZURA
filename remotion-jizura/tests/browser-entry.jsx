// Development-only harness: reference sources never enter the published package.
import React, {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Internals, Sequence} from 'remotion';
import {JizuraScene, JizuraCut} from '../src/index.ts';
import {prepareScene, finalizeScene} from '../src/core/scene-plan.ts';
import {CanvasMeasurementService} from '../src/canvas/service.ts';
import {drawStaticFrame} from '../src/canvas/static-frame.ts';
import {drawFrame} from '../src/canvas/frame.ts';
import {measureStaticCut} from '../src/canvas/geometry.ts';
import {fontCSS} from '../src/canvas/fonts.ts';
import installFonts from '../../ui/services/fonts.js';
import installText from '../../engine/text.ts';

const check = (condition, message) => { if (!condition) throw new Error(message); };
const pause = () => new Promise(resolve => setTimeout(resolve, 20));
const pixel = canvas => [...canvas.getContext('2d').getImageData(0, 0, 1, 1).data];
const makeCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const config = {width: 960, height: 540, fps: 24};
const font = {family: 'Noto Sans JP', weight: 700, style: 'normal', src: '/NotoSansJP.ttf'};
const cutProps = {text: '新しい朝が来た\n*希望*の朝だ ABC 123', enter: null, exit: null, hold: null, decor: []};
const style = {fontSize: 64, track: 0.08, lead: 1.4};
class ErrorBoundary extends React.Component {
  state = {error: null};
  static getDerivedStateFromError(error) { return {error}; }
  render() { return this.state.error ? <span data-font-error={this.state.error.code}>{this.state.error.path}</span> : this.props.children; }
}

function context(child, frame = 0) {
  return <Internals.CompositionManager.Provider value={{compositions: [{id: 'test', ...config, durationInFrames: 120, defaultProps: {}}], canvasContent: {type: 'composition', compositionId: 'test'}}}>
    <Internals.CanUseRemotionHooksProvider><Internals.TimelineContext.Provider value={{frame: {test: frame}}}>{child}</Internals.TimelineContext.Provider></Internals.CanUseRemotionHooksProvider>
  </Internals.CompositionManager.Provider>;
}
async function waitReady(host, count = 1) {
  for (let n = 0; n < 500; n++) {
    if (host.querySelectorAll('canvas[data-jizura-ready="true"]').length === count) return;
    await pause();
  }
  throw new Error('Canvas never became ready');
}
// Preserve stage04's isolated text subset comparison; public Scene uses center.
class LegacyMeasurementService extends CanvasMeasurementService {
  measureCut(cut, scene) {const ctx = document.createElement('canvas').getContext('2d'); return measureStaticCut(cut, scene, (font, ch) => {ctx.font = fontCSS(font, 100); const w = ctx.measureText(ch).width / 100; return w > 0 ? w : ch === ' ' ? 0.3 : 1;});}
}
window.runCanvasChecks = async () => {
  const report = {cases: [], lifecycle: {}};
  for (const variant of ['normal', 'override', 'small', 'transparent']) {
    const settings = variant === 'small' ? {...config, width: 320, height: 180} : config;
    const props = variant === 'override' ? {...cutProps, font: {...font, weight: 400}, style: {palette: {fg: '#B8B8B8', bg: '#FF0000'}, track: 0.12}} : cutProps;
    const prepared = prepareScene({durationInFrames: 24, font, style, background: variant === 'transparent' ? null : '#16324F'}, settings, [props]);
    const service = new LegacyMeasurementService(document);
    try {
      const plan = await finalizeScene(prepared, service), cut = plan.cuts[0], item = cut.geometry.items[0];
      check(Object.isFrozen(item.glyphs), 'Geometry must be immutable');
      const target = makeCanvas(prepared.width, prepared.height), reference = makeCanvas(prepared.width, prepared.height);
      drawStaticFrame(target, plan, true);
      const J = {}; installFonts(J); installText(J);
      J.FONTS.fixture = {family: '"Noto Sans JP"', weight: cut.prepared.font.weight, fb: 'sans-serif'};
      const opt = {track: item.track, lead: item.lead};
      const fit = Math.min(J.fitSize(cut.prepared.text, 'fixture', prepared.width * 0.84, prepared.height * 0.5, opt), prepared.height * 0.33, cut.prepared.style.fontSize ?? Infinity);
      check(Math.abs(fit - item.size) < 1e-9, 'Reference fitSize mismatch');
      const it = {text: cut.prepared.text, font: 'fixture', size: fit, x: item.x, y: item.y, ...opt,
        color: cut.prepared.style.palette.fg, charFn: i => ({color: item.glyphs[i].color})};
      const layout = J.layoutText(it);
      let maxGeometryDifference = 0;
      for (const g of layout) for (const key of ['x', 'y', 'w', 'h']) maxGeometryDifference = Math.max(maxGeometryDifference, Math.abs(g[key] - item.glyphs[g.i][key]));
      check(maxGeometryDifference < 1e-9, 'Reference glyph layout mismatch');
      const ctx = reference.getContext('2d');
      if (prepared.background !== null) { ctx.fillStyle = prepared.background; ctx.fillRect(0, 0, reference.width, reference.height); }
      const box = J.drawItem({ctx, pass: 'main', scale: 1}, it);
      for (const key of ['x0', 'y0', 'x1', 'y1', 'cx', 'cy']) check(Math.abs(box[key] - cut.geometry.box[key]) < 1e-9, 'Reference bbox mismatch');
      const a = target.getContext('2d').getImageData(0, 0, target.width, target.height).data;
      const b = ctx.getImageData(0, 0, reference.width, reference.height).data;
      let differentPixels = 0;
      for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) differentPixels++;
      check(differentPixels === 0, 'Reference pixel mismatch');
      check(variant === 'transparent' ? pixel(target)[3] === 0 : JSON.stringify(pixel(target)) === '[22,50,79,255]', 'Scene background mismatch');
      const overlay = makeCanvas(target.width, target.height), overlayCtx = overlay.getContext('2d');
      overlayCtx.drawImage(target, 0, 0); overlayCtx.strokeStyle = '#16F4D4'; overlayCtx.lineWidth = 1;
      for (const g of item.glyphs) overlayCtx.strokeRect(item.x + g.x - g.w / 2, item.y + g.y - g.h / 2, g.w, g.h);
      overlayCtx.strokeStyle = '#F5A50C'; overlayCtx.lineWidth = 2;
      overlayCtx.strokeRect(box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0);
      report.cases.push({variant, width: target.width, height: target.height, font: cut.prepared.font, size: fit, track: item.track, lead: item.lead, box: cut.geometry.box, maxGeometryDifference, differentPixels,
        target: target.toDataURL(), reference: reference.toDataURL(), boxes: overlay.toDataURL()});
    } finally { service.dispose(); }
  }
  const callerFace = new FontFace(font.family, 'url(/NotoSansJP.ttf)', {weight: '100 900', style: 'normal'});
  document.fonts.add(callerFace);
  const callerService = new LegacyMeasurementService(document);
  const callerPlan = await finalizeScene(prepareScene({durationInFrames: 24, font: {family: font.family}, style, background: '#16324F'}, config, [cutProps]), callerService);
  const callerCanvas = makeCanvas(960, 540); drawStaticFrame(callerCanvas, callerPlan, true);
  check(callerCanvas.toDataURL() === report.cases[0].target, 'Registered caller face changed pixels');
  callerService.dispose();
  check(document.fonts.has(callerFace), 'Caller face was incorrectly removed');
  document.fonts.delete(callerFace);
  report.callerFace = {variableWeight: true, identicalPixels: true, preservedAfterCleanup: true};
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  const scene = (extra = {}) => <JizuraScene durationInFrames={24} font={font} style={style} background="#16324F" {...extra}><JizuraCut {...cutProps} /></JizuraScene>;
  flushSync(() => root.render(context(<StrictMode>{scene()}</StrictMode>)));
  report.lifecycle.pending = host.querySelector('canvas').dataset.jizuraReady;
  check(report.lifecycle.pending === 'false', 'Preview must explicitly wait for preparation');
  await waitReady(host);
  const initial = host.querySelector('canvas').toDataURL();
  check(window.remotion_delayRenderHandles.length === 0, 'Ready Scene leaked render handle');
  check(document.fonts.size === 1, 'StrictMode leaked font resources');
  flushSync(() => root.render(context(<>{scene({width: 640, height: 360})}{scene({width: 320, height: 180, background: null})}</>)));
  await waitReady(host, 2);
  report.lifecycle.sizes = [...host.querySelectorAll('canvas')].map(c => [c.width, c.height]);
  check(document.fonts.size === 1, 'Scenes should share only the face resource');
  flushSync(() => root.render(context(<>{scene({width: 640, height: 360})}{scene({width: 320, height: 180, background: null})}</>, 24)));
  check([...host.querySelectorAll('canvas')].every(c => pixel(c)[3] === 0), 'Out-of-range Scene was not cleared');
  flushSync(() => root.render(context(scene())));
  await waitReady(host);
  check(initial === host.querySelector('canvas').toDataURL(), 'Remount changed pixels');
  root.unmount();
  check(document.fonts.size === 0 && window.remotion_delayRenderHandles.length === 0, 'Unmount leaked font or render handle');
  const pendingRoot = createRoot(host);
  flushSync(() => pendingRoot.render(context(scene({font: {...font, src: '/slow-font.ttf'}}))));
  pendingRoot.unmount();
  await new Promise(resolve => setTimeout(resolve, 3200));
  check(document.fonts.size === 0 && window.remotion_delayRenderHandles.length === 0, 'Pending cleanup leaked resources');
  report.lifecycle = {...report.lifecycle, remountIdentical: true, strictMode: true, finalFaces: document.fonts.size, finalHandles: window.remotion_delayRenderHandles.length};
  const failureRoot = createRoot(host);
  flushSync(() => failureRoot.render(context(<ErrorBoundary>{scene({font: {...font, src: '/missing-font.ttf'}})}</ErrorBoundary>)));
  for (let i = 0; i < 500 && !host.querySelector('[data-font-error]'); i++) await pause();
  check(host.querySelector('[data-font-error]')?.dataset.fontError === 'E_FONT', 'Preview must show the font failure');
  failureRoot.unmount();
  check(document.fonts.size === 0 && window.remotion_delayRenderHandles.length === 0, 'Failed Scene leaked resources');
  report.lifecycle.previewError = 'E_FONT';
  host.remove();
  // Real FontFace failure and bounded wait: no fallback metrics may be used.
  report.failures = [];
  for (const src of ['/missing-font.ttf', '/bad-font.ttf', '/slow-font.ttf']) {
    const service = new LegacyMeasurementService(document, 100);
    try {
      await finalizeScene(prepareScene({durationInFrames: 24, font: {...font, src}}, config, [cutProps]), service);
      throw new Error('Invalid font unexpectedly prepared');
    } catch (error) { check(error.code === 'E_FONT', 'Wrong font error code'); report.failures.push({src, code: error.code, path: error.path, message: error.message}); }
    finally { service.dispose(); }
  }
  check(document.fonts.size === 0, 'Font failures leaked faces');
  return report;
};

window.runFrameChecks = async () => {
  const props = {durationInFrames: 60, font, style, background: '#16324F'};
  const declarations = [
    {text: '*夜*', from: 30, durationInFrames: 30},
    {text: '朝', from: 0, durationInFrames: 10},
    {text: '一瞬', from: 10, durationInFrames: 1},
  ];
  const service = new CanvasMeasurementService(document);
  const prepared = prepareScene(props, config, declarations), plan = await finalizeScene(prepared, service);
  const snapshot = JSON.stringify(plan), canvas = makeCanvas(960, 540), images = {};
  // Deliberately synthetic motion proves frame-local scratch data only. These
  // formulas are not JIZURA effects and never run in the public Scene.
  const syntheticTransform = work => {
    const t = work.state.evaluationSeconds;
    work.items[0].x += Math.sin(t * 7) * 80;
    work.items[0].sx *= 1 + work.state.pIn * 0.1;
    work.items[0].glyphs[0].y += work.state.pOut * 20;
    work.box.x0 += 10;
  };
  for (const f of [0, 30, 10, 30, 31, 40, 59, 30]) {
    drawFrame(canvas, plan, f, syntheticTransform);
    const url = canvas.toDataURL();
    if (images[f]) check(images[f] === url, 'Synthetic seek changed pixels');
    images[f] = url;
  }
  check(images[30] !== images[40], 'Synthetic transform must exercise changing pixels');
  check(JSON.stringify(plan) === snapshot, 'Drawing changed the plan');
  for (const f of [-1, 60]) {
    drawFrame(canvas, plan, f);
    check(canvas.getContext('2d').getImageData(0, 0, 960, 540).data.every(v => v === 0), 'Direct out-of-range draw retained pixels');
  }
  service.dispose();
  const regeneratedService = new CanvasMeasurementService(document);
  const regenerated = await finalizeScene(prepareScene(props, config, declarations), regeneratedService);
  drawFrame(canvas, regenerated, 40, syntheticTransform);
  check(canvas.toDataURL() === images[40], 'Rebuilt font/metrics/plan changed pixels');
  const quantized = await finalizeScene(prepareScene({...props, motionFps: 12}, config, declarations), regeneratedService);
  drawFrame(canvas, quantized, 30, syntheticTransform); const q30 = canvas.toDataURL();
  drawFrame(canvas, quantized, 31, syntheticTransform); check(canvas.toDataURL() === q30, 'Quantized pose did not repeat');
  drawFrame(canvas, quantized, 32, syntheticTransform); check(canvas.toDataURL() !== q30, 'Quantized pose never advanced');
  regeneratedService.dispose();

  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  const component = extra => <JizuraScene {...props} {...extra}>{declarations.map((c, i) =>
    <JizuraCut key={i} {...c} enter={null} exit={null} hold={null} decor={[]} />)}</JizuraScene>;
  flushSync(() => root.render(context(<StrictMode>{component()}</StrictMode>)));
  await waitReady(host);
  const original = host.querySelector('canvas'), captured = {};
  for (const f of [0, 30, 10, 30, 11, 60, 0]) {
    flushSync(() => root.render(context(<StrictMode>{component()}</StrictMode>, f)));
    check(host.querySelector('canvas') === original, 'Frame update recreated Scene resources');
    const url = original.toDataURL();
    if (captured[f]) check(captured[f] === url, 'Mounted Scene seek changed pixels');
    captured[f] = url;
    if (f === 11) check(original.getContext('2d').getImageData(0, 0, 960, 540).data.every((v, i) => v === [22, 50, 79, 255][i % 4]), 'Gap left old text');
    if (f === 60) check(original.getContext('2d').getImageData(0, 0, 960, 540).data.every(v => v === 0), 'Outside Scene left text/background');
    check(window.remotion_delayRenderHandles.length === 0, 'Frame commit leaked a render handle');
  }
  // Real Sequence components exercise useCurrentFrame, rather than a fabricated
  // offset passed to the Scene. Nested offsets must also compose exactly once.
  for (const [parentFrame, child] of [
    [40, <Sequence from={30} durationInFrames={60}>{component()}</Sequence>],
    [50, <Sequence from={20} durationInFrames={60}><Sequence from={20} durationInFrames={60}>{component()}</Sequence></Sequence>],
  ]) {
    flushSync(() => root.render(context(child, parentFrame)));
    await waitReady(host);
    check(host.querySelector('canvas').toDataURL() === captured[10], 'Sequence local time changed pixels');
  }
  flushSync(() => root.render(context(<>{component()}{component({width: 320, height: 180, background: null})}</>, 30)));
  await waitReady(host, 2);
  check(host.querySelector('canvas').toDataURL() === captured[30], 'Another Scene changed output');
  root.unmount();
  const pendingRoot = createRoot(host);
  const pendingScene = () => component({font: {...font, src: '/slow-font.ttf'}});
  flushSync(() => pendingRoot.render(context(pendingScene(), 0)));
  flushSync(() => pendingRoot.render(context(pendingScene(), 30)));
  await waitReady(host);
  check(host.querySelector('canvas').toDataURL() === captured[30], 'Async preparation drew a stale frame');
  pendingRoot.unmount();
  check(document.fonts.size === 0 && window.remotion_delayRenderHandles.length === 0, 'Frame lifecycle leaked resources');
  host.remove();
  return {syntheticTransform: {jizuraEffect: false, seekOrder: [0, 30, 10, 30, 31, 40, 59, 30], identicalPixels: true, rebuiltPlanIdentical: true, planUnchanged: true, quantizedPoses: true, outsideClear: [-1, 60]},
    scene: {seekOrder: [0, 30, 10, 30, 11, 60, 0], sameCanvas: true, sequenceIdentical: true, nestedSequenceIdentical: true,
      multipleScenes: true, strictMode: true, latestFrameAfterSlowPreparation: true, finalFaces: document.fonts.size, finalHandles: window.remotion_delayRenderHandles.length}};
};
