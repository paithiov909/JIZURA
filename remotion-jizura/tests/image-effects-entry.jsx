import React, {StrictMode, createRef} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Player} from '@remotion/player';
import {HtmlInCanvas} from 'remotion';
import {sliceGlitch} from 'remotion-jizura';
import {ImageEffects} from '../examples/image-effects/ImageEffects.tsx';

const host = document.createElement('div'); document.body.append(host);
const root = createRoot(host), ref = createRef();
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const check = (ok, label) => {if (!ok) throw new Error(label);};
const raf = () => new Promise(resolve => requestAnimationFrame(resolve));
async function settle() {
  for (let i = 0; i < 500; i++) {
    const lyrics = [...host.querySelectorAll('canvas[data-jizura-ready]')];
    if (lyrics.every(c => c.dataset.jizuraReady === 'true') && !(window.remotion_delayRenderHandles?.length)) break;
    await wait(20);
    if (i === 499) throw new Error('Image effect preparation timeout');
  }
  await raf(); await raf(); await raf(); await raf();
}
function render(props) {flushSync(() => root.render(<StrictMode><Player ref={ref} component={ImageEffects} inputProps={{fontSrc: '/NotoSansJP.ttf', ...props}}
  durationInFrames={144} compositionWidth={640} compositionHeight={360} fps={24} style={{width: 640}} /></StrictMode>));}
async function seek(frame) {
  flushSync(() => ref.current.seekTo(frame)); await settle();
  const canvas = host.querySelector('canvas');
  if (canvas) return canvas.toDataURL();
  const blank = document.createElement('canvas'); blank.width = 640; blank.height = 360; return blank.toDataURL();
}
window.runImageChecks = async () => {
  check(HtmlInCanvas.isSupported(), 'HTML-in-canvas is unsupported');
  const images = [], baseline = new Map(), records = [];
  const mainFrames = [11, 12, 24, 47, 48, 60, 84, 95, 96, 120];
  for (const variant of ['lyrics', 'scene', 'image', 'standard', 'glitch', 'disabled', 'reverse']) {
    const props = ['lyrics', 'scene', 'image'].includes(variant) ? {target: variant, mode: variant === 'image' ? 'glitch' : 'combined'} : {target: 'lyrics', mode: variant};
    render(props); await settle();
    const frames = ['lyrics', 'scene', 'image'].includes(variant) ? mainFrames : [24, 47];
    for (const frame of frames) {
      const png = await seek(frame); baseline.set(`${variant}/${frame}`, png); images.push({variant, frame, props, png});
    }
    for (const frame of frames.toReversed()) check(await seek(frame) === baseline.get(`${variant}/${frame}`), `Reverse seek differs: ${variant}/${frame}`);
    records.push({variant, props, frames});
  }
  check(baseline.get('lyrics/24') !== baseline.get('disabled/24'), 'Effects are not visible on JIZURA');
  check(baseline.get('standard/24') !== baseline.get('disabled/24'), 'Standard blur is not visible on JIZURA');
  check(baseline.get('glitch/24') !== baseline.get('disabled/24'), 'Slice glitch is not visible on JIZURA');
  check(baseline.get('reverse/24') !== baseline.get('lyrics/24'), 'Effect ordering has no visible difference');
  render({target: 'lyrics', mode: 'combined', amount: 0.2}); await settle();
  const edited = await seek(24); check(edited !== baseline.get('lyrics/24'), 'Amount edit is not visible');
  images.push({variant: 'edited', frame: 24, props: {target: 'lyrics', mode: 'combined', amount: 0.2}, png: edited});
  flushSync(() => root.render(null));
  render({target: 'lyrics', mode: 'combined'}); await settle();
  for (const frame of [24, 84, 12]) check(await seek(frame) === baseline.get(`lyrics/${frame}`), 'Remount/restore differs');
  render({target: 'lyrics', mode: 'combined', offset: 24}); await settle();
  for (const local of [11, 12, 24, 47, 48, 84]) {
    const png = await seek(local + 24); check(png === baseline.get(`lyrics/${local}`), `Sequence local frame differs ${local}`);
    images.push({variant: 'offset', frame: local + 24, props: {target: 'lyrics', mode: 'combined', offset: 24}, png});
  }
  // Exercise the public native definition on synthetic alpha, separate from Player.
  const source = document.createElement('canvas'), target = document.createElement('canvas');
  source.width = target.width = 640; source.height = target.height = 360;
  const src = source.getContext('2d'); src.fillStyle = 'rgba(255,90,25,.5)'; src.fillRect(70, 20, 430, 300);
  const pixels = c => c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const alpha = bytes => {let sum = 0, empty = 0; for (let i = 3; i < bytes.length; i += 4) {sum += bytes[i]; if (!bytes[i]) empty++;} return {sum, empty};};
  const apply = (params = {}) => {
    const effect = sliceGlitch(params);
    effect.definition.apply({source, target, params: effect.params, state: null, width: source.width, height: source.height, gpuDevice: null, flipSourceY: false});
    return target.toDataURL();
  };
  apply({frame: 24}); const a = alpha(pixels(source)), b = alpha(pixels(target));
  check(a.sum === b.sum && a.empty === b.empty && b.empty > 0, 'Slice alpha is not conserved');
  const neutral = apply({amount: 0}); check(neutral === source.toDataURL(), 'Amount zero is not pass-through');
  const same = apply({frame: 24, seed: 1234}); apply({frame: 100}); check(apply({frame: 24, seed: 1234}) === same, 'Image effect retains history');
  check(apply({frame: 24, seed: 987}) !== same, 'Seed does not change slice pattern');
  src.clearRect(0, 0, 640, 360); apply(); check(alpha(pixels(target)).sum === 0, 'Transparent input filled by slices');
  // Steady state CPU effect cost, without font/capture/GPU/export startup.
  source.width = target.width = 1920; source.height = target.height = 1080;
  src.fillStyle = '#16f4d4'; src.fillRect(0, 0, 1920, 1080);
  const times = []; for (let frame = 0; frame < 30; frame++) {const start = performance.now(); apply({frame}); times.push(performance.now() - start);}
  flushSync(() => root.render(null));
  check([...document.fonts].length === 0, 'Owned font face leaked');
  return {images, records, alpha: {source: a, target: b, transparentInput: true, amountZeroPassThrough: true},
    reverseSeek: true, seed: true, orderDifference: true, remountRestore: true, sequenceLocalFrame: true, finalFaces: 0,
    cpu1080: {samples: times, medianMs: times.toSorted((a,b) => a-b)[15], scope: 'slice apply + toDataURL, 1920x1080, 30 frames'}};
};
