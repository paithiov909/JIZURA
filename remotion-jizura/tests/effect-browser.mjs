// Fixed-font, same-browser source comparisons plus actual Remotion exports.
import assert from 'node:assert/strict';
import {build} from 'vite';
import {bundle} from '@remotion/bundler';
import {openBrowser, selectComposition, renderStill, renderFrames, renderMedia} from '@remotion/renderer';
import {createServer} from 'node:http';
import {readFile, mkdir, writeFile, readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {prepareScene} from '../dist/core/scene-plan.js';
import {effectCases} from './effect-cases.js';
const repo = path.resolve(import.meta.dirname, '../..'), out = path.join(repo, 'dist/remotion/stage06');
const publicDir = path.join(repo, 'dist/remotion/stage04/assets'), fontData = await readFile(path.join(publicDir, 'NotoSansJP.ttf'));
const browserExecutable = process.env.JIZURA_BROWSER ?? '/usr/bin/google-chrome';
await mkdir(out, {recursive: true});
await build({configFile: false, root: repo, publicDir: false, logLevel: 'warn', define: {'process.env.NODE_ENV': '"development"'}, build: {outDir: path.join(out, 'browser'), emptyOutDir: true, target: 'chrome88', lib: {entry: path.join(repo, 'remotion-jizura/tests/effect-entry.jsx'), formats: ['iife'], name: 'EffectTest', fileName: () => 'test.js'}}});
const source = await readFile(path.join(out, 'browser/test.js'));
const server = createServer((req, res) => {if (req.url === '/NotoSansJP.ttf') res.end(fontData); else if (req.url === '/test.js') {res.setHeader('Content-Type', 'text/javascript'); res.end(source);} else res.end('<!doctype html><meta charset="utf-8"><script src="/test.js"></script>');});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const hash = b => createHash('sha256').update(b).digest('hex');
const rgba = file => execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], {maxBuffer: 2 * 1024 * 1024});
let browser;
try {
  browser = await openBrowser('chrome', {browserExecutable});
  const page = await browser.newPage({context: () => null, logLevel: 'error', indent: false, pageIndex: 0, onBrowserLog: null, onLog: () => {}});
  await page.setViewport({width: 1280, height: 800, deviceScaleFactor: 2});
  await page.goto({url: `http://127.0.0.1:${server.address().port}/`, timeout: 30000});
  const report = await page.evaluate(() => window.runEffectChecks());
  report.resolved = Object.fromEntries(Object.entries(effectCases).map(([name, cut]) => [name,
    prepareScene({durationInFrames: 60, font: {family: 'Noto Sans JP', weight: 700, style: 'normal', src: '/NotoSansJP.ttf'}, style: {fontSize: 64}, background: '#16324F'}, {width: 640, height: 360, fps: 24}, [cut]).cuts[0]]));
  report.browser = await page.evaluate(() => navigator.userAgent); report.fontSHA256 = hash(fontData); report.fps = 24; report.dpr = 2; report.size = [640, 360]; report.motionFps = null;
  for (const im of report.images) for (const k of ['target', 'reference']) {await writeFile(path.join(out, `${im.name}-${im.frame}-${k}.png`), Buffer.from(im[k].split(',')[1], 'base64')); delete im[k];}
  await writeFile(path.join(out, 'effect-result.json'), JSON.stringify(report, null, 2));
  const failures = report.comparisons.filter(c => c.differentPixels);
  console.log(JSON.stringify({comparisons: report.comparisons.length, failures, cache: report.cache, mounted: report.mounted}));
  assert.equal(failures.length, 0, 'Effect reference pixel differences; inspect stage06/effect-result.json');
  assert.ok(report.geometry.every(c => c.maxDifference < 1e-9));
  if (process.env.JIZURA_EFFECT_COMPARE_ONLY === '1') process.exitCode = 0;
  else {
    const serveUrl = await bundle({entryPoint: path.join(repo, 'remotion-jizura/examples/index.tsx'), outDir: path.join(out, 'bundle'), publicDir});
    const inputProps = {mode: 'fixed', seed: 1234, motionFps: null, offset: 0};
    const composition = await selectComposition({serveUrl, id: 'EffectSamples', inputProps, browserExecutable});
    const options = {serveUrl, composition, inputProps, browserExecutable, imageFormat: 'png', logLevel: 'error'};
    const stills = new Map();
    for (const frame of [0, 3, 10, 30, 43, 48, 55, 59, 60]) {const file = path.join(out, `frame-${frame}.png`); await renderStill({...options, frame, output: file}); stills.set(frame, rgba(file));}
    for (const frame of [3, 30, 55]) assert.deepEqual(stills.get(frame), rgba(path.join(out, `fixed-${frame}-target.png`)), 'Remotion differs from direct Canvas');
    const repeat = path.join(out, 'repeat-55.png'); await renderStill({...options, frame: 55, output: repeat}); assert.deepEqual(rgba(repeat), stills.get(55));
    const offsetProps = {...inputProps, offset: 12};
    const offsetComp = await selectComposition({serveUrl, id: 'EffectSamples', inputProps: offsetProps, browserExecutable});
    for (const local of [3, 30, 55, 60]) {const file = path.join(out, `offset12-local${local}.png`); await renderStill({...options, composition: offsetComp, inputProps: offsetProps, frame: 12 + local, output: file}); assert.deepEqual(rgba(file), stills.get(local));}
    const variantPNGs = [];
    for (const mode of ['automatic', 'partial', 'disabled', 'seedDifferent', 'repeated']) {
      // renderStill uses composition.props resolved by selectComposition. Reusing
      // fixed metadata would silently export the fixed example for every mode.
      const variantProps = {...inputProps, mode};
      const variantComposition = await selectComposition({serveUrl, id: 'EffectSamples', inputProps: variantProps, browserExecutable});
      const output = path.join(out, `${mode}-remotion.png`);
      await renderStill({...options, composition: variantComposition, inputProps: variantProps, frame: 30, output});
      assert.notDeepEqual(rgba(output), stills.get(30), `${mode} used stale fixed props`);
      variantPNGs.push({mode, frame: 30, differsFromFixed: true});
    }
    const framesDir = path.join(out, 'frames');
    await renderFrames({...options, outputDir: framesDir, frameRange: [0, 60], concurrency: 2});
    const pngs = (await readdir(framesDir)).filter(f => f.endsWith('.png')).sort(); assert.equal(pngs.length, 61);
    const pngPixels = [];
    for (let frame = 0; frame < 61; frame++) {const pixels = rgba(path.join(framesDir, pngs[frame])); pngPixels.push(pixels); assert.deepEqual(pixels, rgba(path.join(out, `fixed-${frame}-target.png`)), `Parallel PNG mismatch at ${frame}`);}
    const movie = path.join(out, 'effects.mp4');
    await renderMedia({...options, imageFormat: undefined, outputLocation: movie, frameRange: [0, 60], concurrency: 2, codec: 'h264', crf: 1, pixelFormat: 'yuv444p'});
    const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-of', 'json', movie], {encoding: 'utf8'}));
    const rgb = execFileSync('ffmpeg', ['-v', 'error', '-i', movie, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], {maxBuffer: 60 * 1024 * 1024});
    assert.equal(rgb.length, 640 * 360 * 3 * 61);
    let maxChannelDifference = 0, maxMeanChannelDifference = 0;
    for (let frame = 0; frame < 61; frame++) {const original = pngPixels[frame]; let sum = 0;
      for (let p = 0; p < 640 * 360; p++) for (let c = 0; c < 3; c++) {const diff = Math.abs(original[p * 4 + c] - rgb[frame * 640 * 360 * 3 + p * 3 + c]); sum += diff; maxChannelDifference = Math.max(maxChannelDifference, diff);}
      maxMeanChannelDifference = Math.max(maxMeanChannelDifference, sum / (640 * 360 * 3));
    }
    const movieMatches = [];
    for (let frame = 0; frame < 61; frame++) {
      const scores = pngPixels.map((original, index) => {
        let difference = 0; for (let p = 0; p < 640 * 360; p++) for (let c = 0; c < 3; c++) difference += Math.abs(original[p * 4 + c] - rgb[frame * 640 * 360 * 3 + p * 3 + c]);
        return {frame: index, mean: difference / (640 * 360 * 3)};
      });
      const best = scores.reduce((a, b) => a.mean <= b.mean ? a : b);
      assert.ok(scores[frame].mean <= best.mean + 1e-6, `Video frame ${frame} is closer to frame ${best.frame}`);
      movieMatches.push({frame, expectedMeanDifference: scores[frame].mean, closestFrame: best.frame});
    }
    assert.ok(maxMeanChannelDifference < 2, 'Encoded movie deviates materially from parallel PNG frames');
    report.exports = {directCanvasIdentical: [3, 30, 55], repeatStillIdentical: 55, sequenceOffset12Identical: [3, 30, 55, 60], variantPNGs, parallelPNGEveryFrameIdentical: true, parallelFrames: 61, movie: {width: probe.streams[0].width, height: probe.streams[0].height, fps: probe.streams[0].r_frame_rate, frames: probe.streams[0].nb_frames, maxChannelDifference, maxMeanChannelDifference, closestFrameMatches: movieMatches, lossless: false}};
    await writeFile(path.join(out, 'effect-result.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify({...report.exports, movie: {...report.exports.movie, closestFrameMatches: "61 verified"}}));
  }
} finally {if (browser) await browser.close({silent: true}); await new Promise(resolve => server.close(resolve));}
