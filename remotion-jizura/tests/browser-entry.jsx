// Development-only harness: reference sources never enter the published package.
import React, {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Internals} from 'remotion';
import {JizuraScene, JizuraCut} from '../src/index.ts';
import {prepareScene, finalizeScene} from '../src/core/scene-plan.ts';
import {CanvasMeasurementService} from '../src/canvas/service.ts';
import {drawStaticFrame} from '../src/canvas/static-frame.ts';
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
  return <Internals.CompositionManager.Provider value={{compositions: [{id: 'test', ...config, durationInFrames: 60, defaultProps: {}}], canvasContent: {type: 'composition', compositionId: 'test'}}}>
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
window.runCanvasChecks = async () => {
  const report = {cases: [], lifecycle: {}};
  for (const variant of ['normal', 'override', 'small', 'transparent']) {
    const settings = variant === 'small' ? {...config, width: 320, height: 180} : config;
    const props = variant === 'override' ? {...cutProps, font: {...font, weight: 400}, style: {palette: {fg: '#B8B8B8', bg: '#FF0000'}, track: 0.12}} : cutProps;
    const prepared = prepareScene({durationInFrames: 24, font, style, background: variant === 'transparent' ? null : '#16324F'}, settings, [props]);
    const service = new CanvasMeasurementService(document);
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
  const callerService = new CanvasMeasurementService(document);
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
    const service = new CanvasMeasurementService(document, 100);
    try {
      await finalizeScene(prepareScene({durationInFrames: 24, font: {...font, src}}, config, [cutProps]), service);
      throw new Error('Invalid font unexpectedly prepared');
    } catch (error) { check(error.code === 'E_FONT', 'Wrong font error code'); report.failures.push({src, code: error.code, path: error.path, message: error.message}); }
    finally { service.dispose(); }
  }
  check(document.fonts.size === 0, 'Font failures leaked faces');
  return report;
};
