import React, {StrictMode, createRef} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Player} from '@remotion/player';
import {JizuraScene, JizuraCut, defineLayoutEffect, resolveScene} from 'remotion-jizura';
import {customScene, customCuts, customConfig} from '../examples/custom/CustomEffects.tsx';
import {offsetLines} from '../examples/custom/effects.tsx';

const host = document.createElement('div'); document.body.append(host);
const root = createRoot(host), refs = [createRef(), createRef()], inspections = [], snapshots = [];
const {id, name, description, tags, schema} = offsetLines.metadata;
const altLayout = defineLayoutEffect({id, name, description, tags, schema,
  layout: ({width, height, params, fitText}) => [{x: width / 2 + 40, y: height * (0.5 + params.offset),
    size: fitText({maxWidth: width * 0.8, maxHeight: height * 0.4, maxSize: height * 0.24})}],
});
const inspect = value => {
  snapshots.push(JSON.parse(JSON.stringify(value)));
  // Mutation must never alter executable plan, even on the next seek.
  if (value.cuts[0]) {value.cuts[0].layout.params.offset = 0.2; value.cuts[0].geometry.box.x0 = -999;}
};
const Scene = ({amplitude = 12, alternate = false, measured = false}) => {
  const cuts = customCuts(amplitude).map((cut, i) => i === 0 && alternate ? {...cut, layout: altLayout({seed: 100, params: {offset: -0.06}})} : cut);
  return <JizuraScene {...customScene()} onInspect={measured ? inspect : undefined}>{cuts.map((cut, i) => <JizuraCut key={i} {...cut} />)}</JizuraScene>;
};
const render = (amplitude = 12, alternate = false) => flushSync(() => root.render(<StrictMode>
  {[0, 1].map(i => <Player key={i} ref={refs[i]} component={Scene} inputProps={{amplitude: i ? 12 : amplitude, alternate: !i && alternate, measured: !i}}
    compositionWidth={640} compositionHeight={360} fps={24} durationInFrames={120} style={{width: 640}} />)}
</StrictMode>));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const canvases = () => [...host.querySelectorAll('canvas')];
const ready = () => canvases().length === 2 && canvases().every(c => c.dataset.jizuraReady === 'true');
async function until(fn) {for (let i = 0; i < 1000; i++) {if (fn()) return; await wait(10);} throw new Error('Custom effect Player timeout');}
const check = (ok, message) => {if (!ok) throw new Error(message);};
const seek = async frame => {
  flushSync(() => refs.forEach(ref => ref.current.seekTo(frame))); await until(ready);
  return canvases().map(c => c.toDataURL());
};
window.runCustomChecks = async () => {
  render(); await until(ready);
  const frames = [0, 6, 12, 24, 43, 52, 59, 60, 84, 112, 119], images = [], baseline = new Map();
  for (const frame of frames) {const [a, b] = await seek(frame); check(a === b, 'Two identical Scenes differ'); baseline.set(frame, a); images.push({variant: 'baseline', frame, png: a});}
  const prepared = resolveScene(customScene(), customConfig, customCuts());
  const measured = snapshots.at(-1); inspections.push({prepared, measured});
  const {stage: _s, ...p} = prepared, {stage: _m, cuts, ...m} = measured;
  check(JSON.stringify({...m, cuts: cuts.map(({geometry, ...cut}) => cut)}) === JSON.stringify(p), 'Measured configuration differs from prepared');
  for (const f of [52, 6, 24, 112, 24]) check((await seek(f))[0] === baseline.get(f), 'Reverse seek or snapshot mutation differs');
  render(32); await until(ready);
  for (const frame of frames) {
    const [a, b] = await seek(frame); check(b === baseline.get(frame), 'Edit leaked into another Scene');
    if (frame >= 60) check(a === baseline.get(frame), 'Edit leaked into reference Cut');
    if (frame === 24) check(a !== baseline.get(frame), 'Amplitude edit was not visible');
    images.push({variant: 'edited', frame, png: a});
  }
  // The same ID/params with a new function must invalidate React's resource memo.
  render(12, true); await until(ready); const swapped = await seek(24);
  check(swapped[0] !== baseline.get(24) && swapped[1] === baseline.get(24), 'Definition identity swap failed or leaked');
  render(12); await until(ready); check((await seek(24))[0] === baseline.get(24), 'Restoring params/definition differs');
  flushSync(() => root.render(null)); render(12); await until(ready);
  for (const frame of [52, 6, 24, 112]) check((await seek(frame))[0] === baseline.get(frame), 'StrictMode/cache regeneration differs');
  check(canvases().every(c => {const ctx = c.getContext('2d'), t = ctx.getTransform(); return ctx.globalAlpha === 1 && t.a === 1 && t.d === 1 && t.e === 0 && t.f === 0;}), 'Canvas state leaked');
  flushSync(() => root.render(null));
  const finalFaces = [...document.fonts].length; check(finalFaces === 0, 'Owned font faces leaked after cleanup');
  return {images, inspections, frames, finalFaces, canvasStateRestored: true, reverseSeek: true, snapshotMutationIsolated: true, localEdit: true,
    fixedReference: true, twoScenes: true, definitionSwap: true, restore: true, strictModeRemount: true};
};
