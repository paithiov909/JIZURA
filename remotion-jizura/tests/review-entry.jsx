import React, {StrictMode, createRef} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {ReviewPlayer} from '../examples/review/ReviewPlayer.tsx';
import {reviewInputs} from '../examples/review/inputs.tsx';

const host = document.createElement('div'); document.body.append(host);
const root = createRoot(host), ref = createRef();
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const check = (ok, message) => {if (!ok) throw new Error(message);};
async function until(fn) {for (let i = 0; i < 1000; i++) {
  const error = host.querySelector('[role="alert"]');
  if (error) throw new Error(error.textContent);
  if (fn()) return; await wait(10);
} throw new Error('Review Player timeout');}
const ready = () => host.querySelector('canvas[data-jizura-ready="true"]');
const choose = async (label, value) => {
  const el = host.querySelector(`[aria-label="${label}"]`);
  flushSync(() => {el.value = value; el.dispatchEvent(new Event('change', {bubbles: true}));});
  await until(ready);
};
const seek = async frame => {
  flushSync(() => ref.current.seekTo(frame));
  await until(() => ready() && ref.current.getCurrentFrame() === frame);
  return ready().toDataURL();
};
window.runReviewChecks = async () => {
  flushSync(() => root.render(<StrictMode><ReviewPlayer playerRef={ref} /></StrictMode>));
  await until(ready);
  await choose('ループ範囲', 'all');
  const frames = [0, 6, 12, 24, 43, 52, 59, 60, 84, 112, 119];
  const images = [];
  for (const name of Object.keys(reviewInputs)) {
    await choose('比較案', name);
    for (const frame of frames) images.push({name, frame, png: await seek(frame)});
  }
  const expected = (name, frame) => images.find(im => im.name === name && im.frame === frame).png;
  check(expected('combined', 24) !== expected('edited', 24), 'Local edit was not visible');
  for (const frame of frames.filter(f => f >= 60)) for (const name of Object.keys(reviewInputs))
    check(expected(name, frame) === expected('combined', frame), `Reference changed: ${name}/${frame}`);
  await choose('比較案', 'combined');
  for (const frame of [52, 6, 24, 112, 24]) check(await seek(frame) === expected('combined', frame), 'Restore/reverse seek differs');
  // Exercise the real example's target/reference loops, without replacing Player.
  const loops = [];
  for (const [range, start, end] of [['target', 0, 59], ['reference', 60, 119]]) {
    await choose('ループ範囲', range);
    const observed = [];
    const listener = e => observed.push(e.detail.frame);
    ref.current.addEventListener('frameupdate', listener);
    await seek(end - 2); ref.current.play();
    await until(() => observed.some(f => f >= start && f < start + 6));
    ref.current.pause(); ref.current.removeEventListener('frameupdate', listener);
    check(observed.every(f => f >= start && f <= end), `Loop escaped ${range}`);
    loops.push({range, start, end, observed});
  }
  flushSync(() => root.render(null));
  flushSync(() => root.render(<StrictMode><ReviewPlayer playerRef={ref} /></StrictMode>));
  await until(ready); await choose('ループ範囲', 'all');
  check(await seek(24) === expected('combined', 24), 'Remount differs');
  return {images, inputs: reviewInputs, player: {frames, restore: true, referenceUnchanged: true, strictModeRemount: true, loops}};
};
window.showReview = async (name, frame) => {await choose('ループ範囲', 'all'); await choose('比較案', name); return seek(frame);};
