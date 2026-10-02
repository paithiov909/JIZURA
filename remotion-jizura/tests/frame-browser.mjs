// Fixed-font development verification. Run from the root after package build.
import assert from 'node:assert/strict';
import {build} from 'vite';
import {bundle} from '@remotion/bundler';
import {openBrowser, selectComposition, renderStill, renderFrames, renderMedia} from '@remotion/renderer';
import {createServer} from 'node:http';
import {readFile, mkdir, writeFile, readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';

const repo = path.resolve(import.meta.dirname, '../..');
const out = path.join(repo, 'dist/remotion/stage05');
const publicDir = path.join(repo, 'dist/remotion/stage04/assets');
const fontData = await readFile(path.join(publicDir, 'NotoSansJP.ttf'));
const browserExecutable = process.env.JIZURA_BROWSER ?? '/usr/bin/google-chrome';
await mkdir(out, {recursive: true});
await build({configFile: false, root: repo, publicDir: false, logLevel: 'warn', define: {'process.env.NODE_ENV': '"development"'}, build: {
  outDir: path.join(out, 'browser'), emptyOutDir: true, target: 'chrome88',
  lib: {entry: path.join(repo, 'remotion-jizura/tests/browser-entry.jsx'), formats: ['iife'], name: 'FrameTest', fileName: () => 'test.js'},
}});
const source = await readFile(path.join(out, 'browser/test.js'));
const server = createServer((req, res) => {
  if (req.url === '/slow-font.ttf') {const timer = setTimeout(() => res.end(fontData), 3000); res.on('close', () => clearTimeout(timer)); return;}
  if (req.url === '/NotoSansJP.ttf') {res.end(fontData); return;}
  if (req.url === '/test.js') {res.setHeader('Content-Type', 'text/javascript'); res.end(source); return;}
  if (req.url === '/') {res.end('<!doctype html><meta charset="utf-8"><script src="/test.js"></script>'); return;}
  res.writeHead(404); res.end();
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const hash = buffer => createHash('sha256').update(buffer).digest('hex');
const rgba = file => execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], {maxBuffer: 2 * 1024 * 1024});
let browser;
try {
  browser = await openBrowser('chrome', {browserExecutable});
  const page = await browser.newPage({context: () => null, logLevel: 'error', indent: false, pageIndex: 0, onBrowserLog: null, onLog: () => {}});
  await page.setViewport({width: 1280, height: 800, deviceScaleFactor: 2});
  await page.goto({url: `http://127.0.0.1:${server.address().port}/`, timeout: 30000});
  for (let i = 0; i < 100 && !await page.evaluate(() => typeof window.runFrameChecks === 'function'); i++) await new Promise(resolve => setTimeout(resolve, 50));
  const report = {browser: await page.evaluate(() => navigator.userAgent), fontSHA256: hash(fontData), fps: 24, dpr: 2,
    preview: await page.evaluate(() => window.runFrameChecks())};
  console.log('Preview lifecycle and synthetic frame checks passed');
  const serveUrl = await bundle({entryPoint: path.join(repo, 'remotion-jizura/examples/index.tsx'), outDir: path.join(out, 'bundle'), publicDir});
  const options = {serveUrl, puppeteerInstance: browser, logLevel: 'error'};
  const composition = await selectComposition({...options, id: 'TimedCuts', inputProps: {}});
  const stills = new Map();
  // Actual Remotion screenshots: boundaries, 1-frame Cut, gaps, Scene end.
  for (const frame of [0, 9, 10, 11, 14, 15, 29, 30, 47, 48, 119]) {
    const output = path.join(out, `frame-${frame}.png`);
    await renderStill({...options, composition, frame, output});
    const pixels = rgba(output);
    assert.equal(pixels.length, 640 * 360 * 4);
    if ([11, 14].includes(frame)) assert.ok(pixels.every((v, i) => v === [22, 50, 79, 255][i % 4]), 'Gap retained text');
    else if (frame >= 48) assert.ok(pixels.every(v => v === 0), 'Sequence end retained text/background');
    else assert.ok(pixels.some((v, i) => v !== [22, 50, 79, 255][i % 4]), 'Text is missing');
    stills.set(frame, pixels);
  }
  for (const [a, b] of [[0, 9], [11, 14], [15, 29], [30, 47]]) assert.ok(stills.get(a).equals(stills.get(b)));
  assert.equal(new Set([0, 10, 15, 30].map(f => hash(stills.get(f)))).size, 4, 'Distinct Cut text must change pixels');
  report.stills = [...stills].map(([frame, pixels]) => ({frame, rgbaSHA256: hash(pixels)}));
  console.log('Boundary PNGs passed');
  report.sequences = [];
  for (const offset of [12, 60]) {
    const inputProps = {offset};
    const shifted = await selectComposition({...options, id: 'TimedCuts', inputProps});
    for (const localFrame of [0, 10, 15, 30, 47, 48]) {
      const output = path.join(out, `offset-${offset}-local-${localFrame}.png`);
      await renderStill({...options, composition: shifted, inputProps, frame: offset + localFrame, output});
      assert.ok(rgba(output).equals(stills.get(localFrame)), `Sequence offset ${offset}, local ${localFrame} differs`);
    }
    report.sequences.push({offset, localFrames: [0, 10, 15, 30, 47, 48], differentPixels: 0});
  }
  const quantized = await selectComposition({...options, id: 'TimedCuts', inputProps: {motionFps: 12}});
  for (const frame of [9, 10, 11, 30]) {
    const output = path.join(out, `quantized-${frame}.png`);
    await renderStill({...options, composition: quantized, inputProps: {motionFps: 12}, frame, output});
    assert.ok(rgba(output).equals(stills.get(frame)), 'Quantization changed integer text selection');
  }
  // renderFrames preserves a mounted page for all frames. Compare the exported
  // images against independent PNGs, not only against the previous frame.
  const framesDir = path.join(out, 'frames');
  await renderFrames({...options, composition, inputProps: {}, outputDir: framesDir, imageFormat: 'png', frameRange: [0, 49], concurrency: 1});
  const files = (await readdir(framesDir)).filter(f => f.endsWith('.png')).sort();
  assert.equal(files.length, 50);
  const anchor = f => f < 10 ? 0 : f === 10 ? 10 : f < 15 ? 11 : f < 30 ? 15 : f < 48 ? 30 : 48;
  for (let frame = 0; frame < files.length; frame++) assert.ok(rgba(path.join(framesDir, files[frame])).equals(stills.get(anchor(frame))), `Sequential frame ${frame} differs from direct still`);
  report.frameSequence = {frames: 50, concurrency: 1, differentPixels: 0};
  console.log('50 sequential PNGs match direct stills');
  const outputLocation = path.join(out, 'timed-cuts.mp4');
  await renderMedia({...options, composition, inputProps: {}, outputLocation, codec: 'h264', crf: 1,
    pixelFormat: 'yuv444p', imageFormat: 'png', frameRange: [0, 49], concurrency: 2});
  const metadata = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate,nb_frames', '-of', 'json', outputLocation], {encoding: 'utf8'})).streams[0];
  assert.deepEqual([metadata.width, metadata.height, metadata.r_frame_rate, metadata.nb_frames], [640, 360, '24/1', '50']);
  const rgb = execFileSync('ffmpeg', ['-v', 'error', '-i', outputLocation, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], {maxBuffer: 40 * 1024 * 1024});
  assert.equal(rgb.length, 50 * 640 * 360 * 3);
  let maxChannelDifference = 0;
  const candidates = [0, 10, 11, 15, 30, 48];
  const videoFrames = [];
  for (let frame = 0; frame < 50; frame++) {
    const expected = stills.get(anchor(frame)), start = frame * 640 * 360 * 3;
    for (let pixel = 0; pixel < 640 * 360; pixel++) for (let c = 0; c < 3; c++) {
      const value = expected[pixel * 4 + c] * expected[pixel * 4 + 3] / 255;
      maxChannelDifference = Math.max(maxChannelDifference, Math.abs(rgb[start + pixel * 3 + c] - value));
    }
    const matches = candidates.map(candidate => {
      const pixels = stills.get(candidate); let difference = 0;
      for (let pixel = 0; pixel < 640 * 360; pixel++) for (let c = 0; c < 3; c++)
        difference += Math.abs(rgb[start + pixel * 3 + c] - pixels[pixel * 4 + c] * pixels[pixel * 4 + 3] / 255);
      return {candidate, meanChannelDifference: difference / (640 * 360 * 3)};
    }).sort((a, b) => a.meanChannelDifference - b.meanChannelDifference);
    assert.equal(matches[0].candidate, anchor(frame), `Video shows wrong Cut/gap at ${frame}`);
    assert.ok(matches[0].meanChannelDifference < matches[1].meanChannelDifference / 4, `Video frame ${frame} has ambiguous text/residue`);
    videoFrames.push({frame, ...matches[0]});
  }
  // CRF1 is lossy and converts RGB/YUV. Report pixel differences; verify frame
  // identity against all four text anchors, the gap and black outside the Scene.
  // Exact rendering equality is established by the PNG sequence above.
  report.video = {...metadata, concurrency: 2, codec: 'h264', crf: 1, pixelFormat: 'yuv444p', maxChannelDifference, fullyDecoded: true, frames: videoFrames};
  await writeFile(path.join(out, 'frame-result.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {if (browser) await browser.close({silent: true}); await new Promise(resolve => server.close(resolve));}
