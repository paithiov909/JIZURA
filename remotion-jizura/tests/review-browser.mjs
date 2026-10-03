// Stage08: actual example Player, persisted inputs, PNGs and short review videos.
import assert from 'node:assert/strict';
import {build} from 'vite';
import {bundle} from '@remotion/bundler';
import {openBrowser, selectComposition, renderStill, renderMedia} from '@remotion/renderer';
import {createServer} from 'node:http';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
const repo = path.resolve(import.meta.dirname, '../..'), out = path.join(repo, 'dist/remotion/stage08');
const publicDir = path.join(repo, 'dist/remotion/stage04/assets');
const font = await readFile(path.join(publicDir, 'NotoSansJP.ttf'));
const browserExecutable = process.env.JIZURA_BROWSER ?? '/usr/bin/google-chrome';
await mkdir(out, {recursive: true});
await build({configFile: false, root: repo, publicDir: false, logLevel: 'warn', define: {'process.env.NODE_ENV': '"development"'},
  build: {outDir: path.join(out, 'preview'), emptyOutDir: true, lib: {entry: path.join(repo, 'remotion-jizura/tests/review-entry.jsx'), formats: ['iife'], name: 'ReviewTest', fileName: () => 'test.js'}}});
const source = await readFile(path.join(out, 'preview/test.js'));
const server = createServer((req, res) => {
  if (req.url?.endsWith('.ttf')) res.end(font);
  else if (req.url === '/test.js') {res.setHeader('Content-Type', 'text/javascript; charset=utf-8'); res.end(source);}
  else {res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end('<!doctype html><meta charset="utf-8"><body><script src="/test.js"></script>');}
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const hash = b => createHash('sha256').update(b).digest('hex');
const rgba = file => execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], {maxBuffer: 2 * 1024 * 1024});
let browser;
try {
  browser = await openBrowser('chrome', {browserExecutable});
  const page = await browser.newPage({context: () => null, logLevel: 'error', indent: false, pageIndex: 0, onBrowserLog: null, onLog: () => {}});
  await page.setViewport({width: 1280, height: 800, deviceScaleFactor: 2});
  await page.goto({url: `http://127.0.0.1:${server.address().port}/`, timeout: 30000});
  const report = await page.evaluate(() => window.runReviewChecks());
  report.environment = {browser: await page.evaluate(() => navigator.userAgent), node: process.version,
    react: JSON.parse(await readFile(path.join(repo, 'node_modules/react/package.json'))).version,
    remotion: JSON.parse(await readFile(path.join(repo, 'node_modules/remotion/package.json'))).version,
    font: {family: 'Noto Sans JP', weight: 700, style: 'normal', sha256: hash(font)},
    width: 640, height: 360, fps: 24, durationInFrames: 120, motionFps: null, previewDPR: 2};
  const expected = new Map();
  for (const im of report.images) {
    const file = path.join(out, `player-${im.name}-${im.frame}.png`);
    await writeFile(file, Buffer.from(im.png.split(',')[1], 'base64'));
    expected.set(`${im.name}/${im.frame}`, rgba(file));
  }
  delete report.images;
  const serveUrl = await bundle({entryPoint: path.join(repo, 'remotion-jizura/examples/studio-entry.tsx'), outDir: path.join(out, 'bundle'), publicDir});
  report.candidates = [];
  for (const [name, input] of Object.entries(report.inputs)) {
    const propsFile = path.join(out, `${name}.json`);
    await writeFile(propsFile, JSON.stringify({input}, null, 2) + '\n');
    // Reload saved JSON; do not reuse a resolver from a different input.
    const inputProps = JSON.parse(await readFile(propsFile, 'utf8'));
    const composition = await selectComposition({serveUrl, id: 'ReviewWorkbench', browserExecutable, inputProps});
    const options = {serveUrl, composition, browserExecutable, inputProps, logLevel: 'error'};
    const pngs = [];
    for (const frame of report.player.frames) {
      const file = path.join(out, `${name}-${frame}.png`);
      await renderStill({...options, imageFormat: 'png', frame, output: file});
      const pixels = rgba(file);
      assert.deepEqual(pixels, expected.get(`${name}/${frame}`), `Saved input/export differs ${name}/${frame}`);
      pngs.push({frame, file: path.basename(file), rgbaSHA256: hash(pixels), differentPixels: 0});
    }
    // Each candidate gets its own 2.5 second target-Cut video.
    const movie = path.join(out, `${name}.mp4`);
    await renderMedia({...options, outputLocation: movie, frameRange: [0, 59], concurrency: 2, codec: 'h264', crf: 1, pixelFormat: 'yuv444p'});
    const metadata = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate,nb_frames,duration', '-of', 'json', movie], {encoding: 'utf8'})).streams[0];
    assert.deepEqual([metadata.width, metadata.height, metadata.r_frame_rate, metadata.nb_frames], [640, 360, '24/1', '60']);
    const decoded = execFileSync('ffmpeg', ['-v', 'error', '-i', movie, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], {maxBuffer: 50 * 1024 * 1024});
    assert.equal(decoded.length, 640 * 360 * 3 * 60);
    const comparisons = pngs.filter(p => p.frame < 60).map(({frame}) => {
      const pixels = expected.get(`${name}/${frame}`); let sum = 0;
      for (let p = 0; p < 640 * 360; p++) for (let c = 0; c < 3; c++) sum += Math.abs(pixels[p * 4 + c] - decoded[frame * 640 * 360 * 3 + p * 3 + c]);
      const meanChannelDifference = sum / (640 * 360 * 3);
      assert.ok(meanChannelDifference < 2, `Video anchor mismatch ${name}/${frame}`);
      return {frame, meanChannelDifference};
    });
    report.candidates.push({name, inputFile: path.basename(propsFile), inputSHA256: hash(await readFile(propsFile)), pngs,
      video: {file: path.basename(movie), ...metadata, frames: [0, 59], fullyDecoded: true, lossless: false, comparisons}});
    console.log(`${name}: 11 Player/export PNGs match; 60-frame MP4 decoded`);
  }
  const baseline = JSON.parse(await readFile(path.join(out, 'combined.json'), 'utf8'));
  const restored = await selectComposition({serveUrl, id: 'ReviewWorkbench', browserExecutable, inputProps: baseline});
  await renderStill({serveUrl, composition: restored, browserExecutable, inputProps: baseline, imageFormat: 'png', frame: 24, output: path.join(out, 'restored-24.png'), logLevel: 'error'});
  assert.deepEqual(rgba(path.join(out, 'restored-24.png')), expected.get('combined/24'));
  report.restoredExport = {file: 'restored-24.png', frame: 24, differentPixels: 0};
  for (const name of ['combined', 'edited']) {
    await page.evaluate(async n => window.showReview(n, 24), name);
    const shot = await page._client().send('Page.captureScreenshot', {format: 'png'});
    await writeFile(path.join(out, `${name}-player.png`), Buffer.from(shot.value.data, 'base64'));
  }
  await writeFile(path.join(out, 'review-result.json'), JSON.stringify(report, null, 2));
  console.log('Review: saved input reload, target edit, fixed reference, restore, seek and two loops passed');
} finally {if (browser) await browser.close({silent: true}); await new Promise(resolve => server.close(resolve));}
