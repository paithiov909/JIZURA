import React, {StrictMode, createRef} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Player} from '@remotion/player';
import {HtmlInCanvas} from 'remotion';
import {resolveScene, center, sliceGlitch} from 'remotion-jizura';
// Use the SAME emitted runtime as the public entry: custom declaration WeakMaps
// and font ownership cannot be shared between independently loaded src/dist copies.
import {prepareScene, finalizeScene} from '../dist/core/scene-plan.js';
import {CanvasMeasurementService} from '../dist/canvas/service.js';
import {createCanvasFrame, drawFrame} from '../dist/canvas/frame.js';
import {prepareEffectItems, clearEffectCache} from '../dist/canvas/effect-frame.js';
import {drawReference} from './effect-reference.jsx';
import {PortScene, portInputs, imageParameters} from './port-model.tsx';
import {glyphWave} from '../examples/custom/effects.tsx';
import {getPortCase, representativeFrames, sceneDuration, anchorFrame} from './port-cases.ts';
import {pixelDifference, requirePixels, requireVisible} from './port-metrics.mjs';

const check = (value, message) => {if (!value) throw new Error(message);};
// Decode a PNG into a CPU witness. Do not read/copy the live GPU canvas into
// a CPU canvas: observer readback heuristics can change its rendering backend.
const witnesses = new WeakMap();
const pixels = async canvas => {
  let witness = witnesses.get(canvas);
  if (!witness) {witness = document.createElement('canvas'); witness.width = canvas.width; witness.height = canvas.height; witnesses.set(canvas, witness);}
  const ctx = witness.getContext('2d', {willReadFrequently: true});
  const image = new Image(); image.src = canvas.toDataURL(); await image.decode();
  ctx.clearRect(0, 0, witness.width, witness.height); ctx.drawImage(image, 0, 0);
  return ctx.getImageData(0, 0, witness.width, witness.height).data;
};
const makeCanvas = spec => {const c = document.createElement('canvas'); c.width = spec.width; c.height = spec.height; return c;};
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const raf = () => new Promise(resolve => requestAnimationFrame(resolve));
const host = document.createElement('div'); document.body.append(host);
const root = createRoot(host), ref = createRef();
async function settle() {
  for (let n = 0; n < 500; n++) {
    if (window.portPlayerError) throw new Error(window.portPlayerError);
    const canvases = [...host.querySelectorAll('canvas[data-jizura-ready]')];
    if (host.querySelector('canvas') && canvases.every(c => c.dataset.jizuraReady === 'true') &&
        !(window.remotion_delayRenderHandles?.length)) {
      await raf(); await raf(); await raf(); await raf(); return;
    }
    await wait(20);
  }
  throw new Error('Port Player timeout: check font, errorFallback and native capture support');
}
function mount(spec, edit = false) {
  window.portPlayerError = null;
  flushSync(() => root.render(<StrictMode><Player ref={ref} component={PortScene} inputProps={{caseId: spec.id, edit, fontSrc: '/NotoSansJP.ttf'}}
    durationInFrames={sceneDuration(spec) + 1} compositionWidth={spec.width} compositionHeight={spec.height} fps={spec.fps}
    errorFallback={({error}) => {window.portPlayerError = String(error); return <div>{String(error)}</div>;}}
    style={{width: spec.width}} /></StrictMode>));
}
async function seek(frame) {flushSync(() => ref.current.seekTo(frame)); await settle(); return host.querySelector('canvas');}
const unmount = () => flushSync(() => root.render(null));
window.runPortCase = async (id, injection) => {
  const spec = getPortCase(id), frames = representativeFrames(spec), images = [], references = [], geometry = [], sourceComparisons = [];
  const anchor = anchorFrame(spec), service = new CanvasMeasurementService(document);
  const {scene, cut, config} = portInputs(spec), prepared = prepareScene(scene, config, [cut]);
  const plan = await finalizeScene(prepared, service), before = JSON.stringify(plan);
  const direct = makeCanvas(spec), reference = makeCanvas(spec), snapshots = new Map(), rawSnapshots = new Map();
  window.portFailure = null;
  try {
    for (const frame of frames) {
      drawFrame(direct, plan, frame); snapshots.set(frame, direct.toDataURL()); rawSnapshots.set(frame, new Uint8ClampedArray(await pixels(direct)));
      const work = createCanvasFrame(plan, frame), motions = prepareEffectItems(work, plan.prepared);
      // Diagnostic extension point for mixed/item-center/spacing, jitter steps,
      // emphasis code-point mapping and decor null/current-box cases in stage13.
      geometry.push({frame, state: work.state, box: work.box, motions,
        items: work.items.map(item => ({...item, font: {...item.font}}))});
      if (spec.legacy) {
        drawReference(reference, plan, frame);
        sourceComparisons.push({frame, ...pixelDifference(await pixels(direct), await pixels(reference))});
        references.push({frame, png: reference.toDataURL()});
      }
      if (spec.kind === 'text') images.push({frame, png: direct.toDataURL(), acquisition: 'direct-canvas'});
    }
    for (const frame of frames.toReversed()) {
      drawFrame(direct, plan, frame);
      const metrics = pixelDifference(await pixels(direct), rawSnapshots.get(frame));
      if (metrics.differentPixels) window.portFailure = {id, frame, expected: snapshots.get(frame), actual: direct.toDataURL(), metrics};
      requirePixels(await pixels(direct), rawSnapshots.get(frame), 'raw', `Direct reverse seek ${id}/${frame}`);
    }
    clearEffectCache(direct); drawFrame(direct, plan, anchor);
    requirePixels(await pixels(direct), rawSnapshots.get(anchor), 'raw', 'Cleared effect cache');
    check(before === JSON.stringify(plan), 'Frame evaluation mutated plan');
    let quantizedPair = null;
    if (spec.motionFps === 12) {
      drawFrame(direct, plan, spec.from + 2); const a = new Uint8ClampedArray(await pixels(direct));
      drawFrame(direct, plan, spec.from + 3); requirePixels(await pixels(direct), a, 'raw', 'Same quantized step');
      quantizedPair = [spec.from + 2, spec.from + 3];
    }
    if (injection === 'parameter') center({params: {track: -1}});
    if (spec.kind === 'image') check(HtmlInCanvas.isSupported(), 'HTML-in-Canvas unsupported');
    mount(spec); await settle();
    const player = new Map();
    for (const frame of frames) {
      const canvas = await seek(frame), png = canvas.toDataURL(); player.set(frame, new Uint8ClampedArray(await pixels(canvas)));
      if (spec.kind === 'text') requirePixels(await pixels(canvas), rawSnapshots.get(frame), 'raw', `Public Player/direct canvas ${id}/${frame}`);
      else images.push({frame, png, acquisition: 'native-player-canvas', imageParameters: imageParameters(spec, frame)});
    }
    for (const frame of frames.toReversed()) requirePixels(await pixels(await seek(frame)), player.get(frame), 'raw', `Player reverse seek ${id}/${frame}`);
    const blank = makeCanvas(spec);
    if (spec.kind === 'text' && spec.background) {blank.getContext('2d').fillStyle = spec.background; blank.getContext('2d').fillRect(0, 0, spec.width, spec.height);}
    const clearChecks = [];
    if (spec.kind === 'text' || spec.image?.target === 'lyrics') {
      for (const frame of [spec.from - 1, spec.from + spec.duration]) {
        requirePixels(player.get(frame), await pixels(blank), 'raw', `Expected gap/background ${id}/${frame}`); clearChecks.push(frame);
      }
      requirePixels(player.get(sceneDuration(spec)), await pixels(makeCanvas(spec)), 'raw', `Scene end alpha clear ${id}`);
      clearChecks.push(sceneDuration(spec));
    } else {
      // Independent images remain visible while the chain is disabled in gaps.
      for (const frame of [spec.from + spec.duration, sceneDuration(spec)]) requirePixels(player.get(frame), player.get(spec.from - 1), 'raw', 'Independent image pass-through');
    }
    const anchorCanvas = await seek(anchor);
    if (injection === 'empty') requireVisible(await pixels(blank), await pixels(blank), id);
    const visiblePixels = requireVisible(await pixels(anchorCanvas), await pixels(blank), id);
    const initial = new Uint8ClampedArray(await pixels(anchorCanvas));
    let canvasStateRestored = null;
    if (spec.kind === 'text') {
      const ctx = anchorCanvas.getContext('2d'), t = ctx.getTransform();
      check(ctx.globalAlpha === 1 && t.a === 1 && t.b === 0 && t.c === 0 && t.d === 1 && t.e === 0 && t.f === 0, 'Canvas alpha/transform leaked');
      canvasStateRestored = true;
    }
    if (injection === 'pixels') {
      const bad = makeCanvas(spec); bad.getContext('2d').drawImage(anchorCanvas, 0, 0);
      bad.getContext('2d').fillStyle = '#ff0000'; bad.getContext('2d').fillRect(0, 0, 20, 20);
      window.portFailure = {id, frame: anchor, expected: anchorCanvas.toDataURL(), actual: bad.toDataURL(), metrics: pixelDifference(await pixels(bad), await pixels(anchorCanvas))};
      requirePixels(await pixels(bad), await pixels(anchorCanvas), 'raw', 'intentional changed drawing');
    }
    mount(spec, true); await settle(); const editedCanvas = await seek(anchor), edited = editedCanvas.toDataURL();
    check(pixelDifference(await pixels(editedCanvas), initial).differentPixels > 0, `Edit did not reach real drawing: ${id}`);
    images.push({frame: anchor, edit: true, png: edited, acquisition: spec.kind === 'text' ? 'player-canvas' : 'native-player-canvas'});
    mount(spec); await settle(); requirePixels(await pixels(await seek(anchor)), initial, 'raw', 'Restore');
    unmount(); mount(spec); await settle();
    for (const frame of frames.toReversed()) requirePixels(await pixels(await seek(frame)), player.get(frame), 'raw', 'StrictMode remount/cache rebuild');
    unmount();
    const negativeParameters = [];
    for (const [label, fn, code] of [['builtin', () => center({params: {track: -1}}), 'E_EFFECT'],
      ['caller', () => glyphWave({params: {amplitude: 41}}), 'E_EFFECT'],
      ['native', () => sliceGlitch({amount: 2}), 'TypeError']]) {
      let caught; try {fn();} catch (error) {caught = error.code ?? error.name;}
      check(caught === code, `Invalid parameter escaped: ${label}`); negativeParameters.push({label, code: caught});
    }
    return {id, spec, frames, anchor, visiblePixels, clearChecks, canvasStateRestored, images, references, geometry, sourceComparisons,
      prepared: resolveScene(scene, config, [cut]), measuredGeometry: plan.cuts.map(c => c.geometry),
      reproducibility: {forwardReverse: true, strictModeRemount: true, clearedEffectCache: true, planUnchanged: true, editRestore: true, quantizedPair}, negativeParameters};
  } finally {unmount(); service.dispose(); check(document.fonts.size === 0 && !(window.remotion_delayRenderHandles?.length), 'Port case leaked fonts/render handles');}
};
