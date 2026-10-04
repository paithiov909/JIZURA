import React, {StrictMode, createRef} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Player} from '@remotion/player';
import {LoopPlayer, parseLoopProps} from '../examples/review-loop/LoopPlayer.tsx';
import {ReviewLoop} from '../examples/review-loop/ReviewLoop.tsx';
import {preloadLoopFont} from '../examples/review-loop/preload.tsx';
import {exampleCatalog} from '../examples/catalog/entries.tsx';
import {loopVariants, reviews, selectionSteps, originalInput, cloneInput, validateLoopInput} from '../examples/review-loop/model.tsx';

const host = document.createElement('div'); document.body.append(host);
const root = createRoot(host), ref = createRef();
const wait = ms => new Promise(r => setTimeout(r, ms));
const check = (ok, label) => {if (!ok) throw new Error(label);};
const raf = () => new Promise(r => requestAnimationFrame(r));
async function until(fn, allowError = false) {
  for (let i = 0; i < 1000; i++) {
    if (!allowError && host.querySelector('[role="alert"]')) throw new Error(host.querySelector('[role="alert"]').textContent);
    if (fn()) return;
    await wait(10);
  }
  throw new Error('Review loop timeout');
}
const ready = () => host.querySelector('canvas[data-jizura-ready="true"]') && host.querySelector('[aria-label="統合構成"]');
async function settle() {await until(ready); for (let i = 0; i < 4; i++) await raf();}
window.loopInit = async () => {
  flushSync(() => root.render(<StrictMode><LoopPlayer playerRef={ref} /></StrictMode>)); await settle();
  // Malformed saved inputs are rejected before altering a running composition.
  let rejected = 0;
  for (const change of [c => c.cuts[2].cut.hold.params.amount = 5,
    c => c.cuts[0].caller.wave.amplitude = 41, c => c.image.toLocal = 73,
    c => c.cuts[0].cut.font = {family: 'fallback'}, c => c.image.bands = 0]) {
    const value = cloneInput(originalInput); change(value);
    try {parseLoopProps(JSON.stringify({input: value}));} catch {rejected++;}
  }
  check(rejected === 5, 'Invalid input not rejected');
  for (const input of Object.values(loopVariants)) validateLoopInput(input);
  for (const step of selectionSteps) for (const id of step.chosen) check(exampleCatalog.some(e => e.id === id), `Unknown selected catalog ID ${id}`);
  return {inputs: loopVariants, reviews, selectionSteps, invalidInputsRejected: rejected, environment: navigator.userAgent};
};
window.loopSeek = async frame => {
  flushSync(() => ref.current.seekTo(frame)); await settle();
  check(ref.current.getCurrentFrame() === frame, 'Seek did not reach requested frame');
  const rect = host.querySelector('[data-review-loop]').getBoundingClientRect();
  return {frame, clip: {x: rect.x, y: rect.y, width: rect.width, height: rect.height, scale: 1},
    inspection: JSON.parse(host.querySelector('[aria-label="統合構成"]').textContent),
    props: JSON.parse(host.querySelector('textarea').value), status: host.querySelector('[aria-label="表示中の設定"]').textContent};
};
window.loopChoose = async (name, label = '統合比較案') => {
  const el = host.querySelector(`[aria-label="${label}"]`);
  flushSync(() => {el.value = name; el.dispatchEvent(new Event('change', {bubbles: true}));}); await settle();
};
window.loopClick = async label => {
  const el = [...host.querySelectorAll('button')].find(e => e.getAttribute('aria-label') === label || e.textContent === label);
  check(el, `Missing button ${label}`); flushSync(() => el.click()); await settle();
};
window.loopApplyJSON = async text => {
  const el = host.querySelector('textarea');
  flushSync(() => {Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, text); el.dispatchEvent(new Event('input', {bubbles: true}));});
  await window.loopClick('JSONを適用');
};
window.loopRuntimeChecks = async () => {
  const loops = [];
  for (const [range, start, end] of [['arrival', 72, 143], ['finale', 216, 287]]) {
    await window.loopChoose(range, '統合ループ範囲'); await window.loopSeek(end - 2);
    const observed = [], listener = e => observed.push(e.detail.frame);
    ref.current.addEventListener('frameupdate', listener); ref.current.play();
    await until(() => observed.some(f => f >= start && f < start + 5));
    ref.current.pause(); ref.current.removeEventListener('frameupdate', listener);
    check(observed.every(f => f >= start && f <= end), `Loop escaped ${range}`);
    loops.push({range, start, end, observed});
  }
  flushSync(() => root.render(null)); await wait(30);
  check([...document.fonts].length === 0, 'Caller preload face leaked');
  return {loops, facesAfterUnmount: [...document.fonts].length};
};
window.loopRepresentative = async (props, width, height) => {
  flushSync(() => root.render(null)); await wait(30);
  let inspection;
  flushSync(() => root.render(<Player ref={ref} component={ReviewLoop} inputProps={{...props, fontSrc: '/NotoSansJP.ttf', onInspect: v => inspection = v}}
    durationInFrames={288} compositionWidth={width} compositionHeight={height} fps={24} style={{width}} />));
  const start = performance.now(); await until(() => !!inspection && host.querySelector('canvas[data-jizura-ready="true"]'));
  const mountReadyMs = performance.now() - start;
  const samples = [];
  for (const frame of [36, 84, 180, 224, 240, 270]) {
    const t = performance.now(); flushSync(() => ref.current.seekTo(frame));
    for (let i = 0; i < 4; i++) await raf(); samples.push({frame, ms: performance.now() - t});
  }
  window.representativeSeek = async frame => {
    flushSync(() => ref.current.seekTo(frame)); for (let i = 0; i < 4; i++) await raf();
    const r = host.querySelector('[data-review-loop]').getBoundingClientRect();
    return {clip: {x: r.x, y: r.y, width: r.width, height: r.height, scale: 1}, inspection};
  };
  return {mountReadyMs, samples, scope: 'Player mount/font+measurement, then seek+4 animation frames; not effect-only or real-time fps'};
};
window.loopFontTrials = async () => {
  flushSync(() => root.render(null)); await wait(30);
  check([...document.fonts].length === 0, 'Font trial needs clean ownership');
  const records = [];
  for (const preloaded of [false, true]) {
    const src = `/delayed-NotoSansJP.ttf?trial=${preloaded}`, start = performance.now();
    let release, preloadMs = 0, inspected = false;
    if (preloaded) {release = await preloadLoopFont(src); preloadMs = performance.now() - start;}
    const mount = performance.now();
    flushSync(() => root.render(<Player ref={ref} component={ReviewLoop} inputProps={{fontSrc: src, fontPreloaded: preloaded, onInspect: () => inspected = true}}
      durationInFrames={288} compositionWidth={640} compositionHeight={360} fps={24} style={{width: 640}} />));
    ref.current.play(); await wait(100);
    // PlayerRef has no isBuffering() method in4.0.532. Observe preparation and
    // actual frame progression through its public ref instead.
    const frameAt100ms = ref.current.getCurrentFrame(), fontPreparedAt100ms = inspected;
    await until(() => inspected && host.querySelector('canvas[data-jizura-ready="true"]'));
    const mountReadyMs = performance.now() - mount;
    ref.current.pause();
    records.push({preloaded, preloadMs, mountReadyMs, totalMs: performance.now() - start, frameAt100ms, fontPreparedAt100ms});
    flushSync(() => root.render(null)); await wait(30); release?.();
    check([...document.fonts].length === 0, 'Font trial leaked face');
  }
  check(!records[0].fontPreparedAt100ms && records[0].frameAt100ms === 0, 'Scene failed to wait for delayed font');
  check(records[1].mountReadyMs < records[0].mountReadyMs, 'Preload did not reduce first Scene boundary wait');
  // Verify the UI surfaces a failed preload instead of waiting indefinitely.
  flushSync(() => root.render(<LoopPlayer fontSrc="/missing.ttf" />));
  await until(() => !!host.querySelector('[role="alert"]'), true);
  const failure = host.querySelector('[role="alert"]').textContent;
  check(failure.includes('/missing.ttf') && failure.includes('resolved:'), 'Missing preload context');
  flushSync(() => root.render(null)); await wait(30);
  return {delayMs: 600, records, failure, facesAfterCleanup: [...document.fonts].length};
};
