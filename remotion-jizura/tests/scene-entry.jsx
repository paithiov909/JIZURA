import React, {StrictMode, createRef} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Player} from '@remotion/player';
import {useLayoutEffect, useState} from 'react';
import {useCurrentFrame} from 'remotion';
import {LyricsDemo, PartA, PartB, lyricSceneProps, partACuts, partBCuts} from '../examples/lyrics.tsx';
import {prepareScene, finalizeScene} from '../src/core/scene-plan.ts';
import {CanvasMeasurementService} from '../src/canvas/service.ts';
import {drawFrame} from '../src/canvas/frame.ts';

const config = {width: 640, height: 360, fps: 24};
const host = document.createElement('div'); document.body.append(host);
const root = createRoot(host), ref = createRef();
let key = 0;
const canvas = () => host.querySelector('canvas');
const ready = () => canvas()?.dataset.jizuraReady === 'true';
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const check = (value, message) => {if (!value) throw new Error(message);};
async function until(fn) {for (let i = 0; i < 1000; i++) {if (fn()) return; await wait(10);} throw new Error('Player preparation timeout');}
const watch = {frames: [], pendingFrames: []};
function ObservedLyrics(props) {
  const frame = useCurrentFrame();
  useLayoutEffect(() => {
    watch.frames.push(frame);
    if (!ready()) watch.pendingFrames.push(frame);
  }, [frame]);
  return <LyricsDemo {...props} />;
}
function Pair(props) {return <div style={{position: 'relative'}}>
  <div style={{position: 'absolute'}}><PartA {...props} /></div>
  <div style={{position: 'absolute'}}><PartB {...props} /></div>
</div>;}
function Changer(props) {
  const [seed, setSeed] = useState(1234);
  window.changeCutSeed = setSeed;
  return <LyricsDemo {...props} cutSeed={seed} />;
}
window.mountLyrics = (props = {}, initialFrame = 0, kind = 'lyrics') => {
  flushSync(() => root.render(<StrictMode><Player key={++key} ref={ref}
    component={kind === 'pair' ? Pair : kind === 'changer' ? Changer : ObservedLyrics}
    inputProps={{fontSrc: '/NotoSansJP.ttf', ...props}} durationInFrames={120}
    compositionWidth={640} compositionHeight={360} fps={24} initialFrame={initialFrame}
    controls moveToBeginningWhenEnded={false} bufferStateDelayInMilliseconds={0}
    errorFallback={({error}) => <div data-error={`${error.code}: ${error.message}`}>{error.message}</div>}
    style={{width: 640}} /></StrictMode>));
};
window.seekLyrics = async frame => {
  flushSync(() => ref.current.seekTo(frame));
  await until(() => ready() && ref.current.getCurrentFrame() === frame);
  return canvas().toDataURL();
};
window.runSceneChecks = async () => {
  const report = {images: [], plans: {}, player: {}};
  const services = [];
  try {
    // Independent direct drawing is the oracle for all 120 exported frames.
    for (const [name, cuts] of [['A', partACuts()], ['B', partBCuts()]]) {
      const service = new CanvasMeasurementService(document); services.push(service);
      const plan = await finalizeScene(prepareScene(lyricSceneProps({fontSrc: '/NotoSansJP.ttf'}), config, cuts), service);
      report.plans[name] = plan.prepared;
      const cv = document.createElement('canvas'); cv.width = 640; cv.height = 360;
      for (let frame = 0; frame < 60; frame++) {drawFrame(cv, plan, frame); report.images.push({frame: frame + (name === 'B' ? 60 : 0), png: cv.toDataURL()});}
    }
  } finally {for (const service of services) service.dispose();}
  const expected = new Map(report.images.map(({frame, png}) => [frame, png]));
  report.changedSeedPlan = prepareScene(lyricSceneProps({fontSrc: '/NotoSansJP.ttf'}), config, partACuts(999));
  check(report.changedSeedPlan.cuts.every((c, i) => c.seed !== report.plans.A.cuts[i].seed), 'Changed seed did not affect plan');
  check(JSON.stringify(report.plans.A.cuts.map(c => [c.from, c.durationInFrames])) === '[[0,20],[20,20],[40,20]]', 'PartA allocation differs');
  check(JSON.stringify(report.plans.A.cuts[2].emphasis) === '[{"start":0,"end":2}]', 'Parser emphasis missing');
  check(report.plans.B.cuts[0].decor.map(d => d.seed).join() === '889,721', 'PartB decor seeds missing');
  window.mountLyrics(); await until(ready);
  const anchors = [0, 19, 20, 39, 40, 59, 60, 61, 80, 110, 119];
  for (const f of [...anchors, 55, 3, 119, 3, 60, 40, 0]) check(await window.seekLyrics(f) === expected.get(f), `Player/direct mismatch ${f}`);
  window.mountLyrics({}, 110); await until(ready);
  check(canvas().toDataURL() === expected.get(110), 'Remount changed pixels');
  window.mountLyrics({}, 10, 'pair'); await until(() => host.querySelectorAll('canvas[data-jizura-ready="true"]').length === 2);
  const cvs = host.querySelectorAll('canvas');
  check(cvs[0].toDataURL() === expected.get(10) && cvs[1].toDataURL() === expected.get(70), 'Multiple Scenes shared state');
  window.mountLyrics({}, 10, 'changer'); await until(ready);
  const before = canvas().toDataURL();
  flushSync(() => window.changeCutSeed(999)); await until(ready);
  check(canvas().toDataURL() !== before, 'Changed Cut seed did not affect representative image');
  flushSync(() => window.changeCutSeed(1234)); await until(ready);
  check(canvas().toDataURL() === before, 'Declaration regeneration changed same seed');
  report.player = {anchors, noncontiguous: true, strictMode: true, remount: true, multipleScenes: true, seedChange: true, regeneration: true};
  // A fresh, slow face demonstrates real playback (delayRender is ineffective here).
  watch.frames = []; watch.pendingFrames = [];
  window.mountLyrics({fontSrc: '/slow.ttf'}); ref.current.play();
  await wait(300);
  report.player.slowFrame = ref.current.getCurrentFrame();
  check(!ready(), 'Slow resource responded too early');
  check(report.player.slowFrame === 0, 'Player advanced before font preparation');
  await until(() => ref.current.getCurrentFrame() === 119);
  check(canvas().toDataURL() === expected.get(119), 'Playback final frame differs');
  check(watch.frames.some(f => f >= 60 && f <= 65), 'Playback never crossed Scene boundary');
  check(watch.pendingFrames.every(f => f === 0 || f === 60), 'Player advanced during Scene preparation');
  report.player.playback = {framesObserved: watch.frames, pendingFrames: watch.pendingFrames, finalFrame: 119};
  window.mountLyrics({fontSrc: '/missing.ttf'}); await until(() => host.querySelector('[data-error]'));
  check(host.querySelector('[data-error]').dataset.error.includes('E_FONT'), 'Missing font did not show E_FONT');
  report.player.missingFontError = host.querySelector('[data-error]').dataset.error;
  flushSync(() => root.render(null)); await wait(50);
  check(document.fonts.size === 0 && window.remotion_delayRenderHandles.length === 0, 'Player leaked fonts/handles');
  report.player.finalFaces = document.fonts.size; report.player.finalHandles = window.remotion_delayRenderHandles.length;
  return report;
};
