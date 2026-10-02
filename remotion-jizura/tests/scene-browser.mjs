// Stage07 integration: real Player, independent drawing, serial/parallel export.
import assert from 'node:assert/strict';
import {build} from 'vite';
import {bundle} from '@remotion/bundler';
import {openBrowser, selectComposition, renderStill, renderFrames, renderMedia} from '@remotion/renderer';
import {createServer} from 'node:http';
import {readFile, mkdir, writeFile, readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
const repo = path.resolve(import.meta.dirname, '../..'), out = path.join(repo, 'dist/remotion/stage07');
const publicDir = path.join(repo, 'dist/remotion/stage04/assets');
const font = await readFile(path.join(publicDir, 'NotoSansJP.ttf'));
const browserExecutable = process.env.JIZURA_BROWSER ?? '/usr/bin/google-chrome';
await mkdir(out, {recursive: true});
await build({configFile: false, root: repo, publicDir: false, logLevel: 'warn', define: {'process.env.NODE_ENV': '"development"'},
  build: {outDir: path.join(out, 'preview'), emptyOutDir: true, lib: {entry: path.join(repo, 'remotion-jizura/tests/scene-entry.jsx'), formats: ['iife'], name: 'SceneTest', fileName: () => 'test.js'}}});
const source = await readFile(path.join(out, 'preview/test.js'));
const server = createServer((req, res) => {
  if (req.url === '/missing.ttf') {res.statusCode = 404; res.end();}
  else if (req.url?.endsWith('.ttf')) {
    if (req.url === '/slow.ttf') setTimeout(() => res.end(font), 1000);
    else res.end(font);
  } else if (req.url === '/test.js') {res.setHeader('Content-Type', 'text/javascript; charset=utf-8'); res.end(source);}
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
  const report = await page.evaluate(() => window.runSceneChecks());
  report.environment = {browser: await page.evaluate(() => navigator.userAgent), node: process.version,
    fontSHA256: hash(font), size: [640, 360], fps: 24, motionFps: null, previewDPR: 2};
  const direct = path.join(out, 'direct'); await mkdir(direct, {recursive: true});
  for (const im of report.images) await writeFile(path.join(direct, `${im.frame}.png`), Buffer.from(im.png.split(',')[1], 'base64'));
  delete report.images;
  console.log('Player: seek, remount, multiple Scenes, slow font, playback, error/cleanup passed');
  await page.evaluate(async () => {window.mountLyrics({}, 80); await window.seekLyrics(80);});
  const screenshot = await page._client().send('Page.captureScreenshot', {format: 'png'});
  await writeFile(path.join(out, 'player.png'), Buffer.from(screenshot.value.data, 'base64'));
  const serveUrl = await bundle({entryPoint: path.join(repo, 'remotion-jizura/examples/index.tsx'), outDir: path.join(out, 'bundle'), publicDir});
  const composition = await selectComposition({serveUrl, id: 'LyricsDemo', browserExecutable});
  assert.deepEqual([composition.width, composition.height, composition.fps, composition.durationInFrames], [640, 360, 24, 120]);
  const options = {serveUrl, composition, browserExecutable, imageFormat: 'png', logLevel: 'error'};
  const expected = Array.from({length: 120}, (_, f) => rgba(path.join(direct, `${f}.png`)));
  const anchors = [0, 19, 20, 39, 40, 59, 60, 61, 80, 110, 119];
  for (const f of [...anchors, 110, 3, 110]) {
    const file = path.join(out, `still-${f}.png`); await renderStill({...options, frame: f, output: file});
    assert.deepEqual(rgba(file), expected[f], `Still mismatch ${f}`);
  }
  // Isolated PartB should produce the same local pose at the Sequence handoff.
  const changedProps = {cutSeed: 999};
  const changedComposition = await selectComposition({serveUrl, id: 'LyricsDemo', browserExecutable, inputProps: changedProps});
  for (const f of [60, 61, 80, 110, 119]) {
    const file = path.join(out, `partB-${f}.png`);
    await renderStill({...options, composition: changedComposition, frame: f, output: file, inputProps: changedProps});
    assert.deepEqual(rgba(file), expected[f], 'PartA seed leaked into PartB');
  }
  const seedFile = path.join(out, 'changed-seed.png');
  await renderStill({...options, composition: changedComposition, frame: 10, output: seedFile, inputProps: changedProps});
  assert.notDeepEqual(rgba(seedFile), expected[10], 'Changed seed did not affect PNG');
  report.exports = {anchors, repeatedStills: [110, 3, 110], differentPixels: 0, independentPartB: true, seedChangeImage: 10, pngRuns: []};
  for (const concurrency of [1, 2]) {
    const outputDir = path.join(out, `frames-${concurrency}`);
    await renderFrames({...options, outputDir, frameRange: [0, 119], concurrency});
    const files = (await readdir(outputDir)).filter(f => f.endsWith('.png')).sort(); assert.equal(files.length, 120);
    for (let f = 0; f < 120; f++) assert.deepEqual(rgba(path.join(outputDir, files[f])), expected[f], `PNG run${concurrency} frame${f}`);
    report.exports.pngRuns.push({concurrency, frames: 120, differentPixels: 0});
    console.log(`120 PNGs concurrency ${concurrency} match independent drawing`);
  }
  const movie = path.join(out, 'lyrics.mp4');
  await renderMedia({...options, imageFormat: undefined, outputLocation: movie, concurrency: 2, codec: 'h264', crf: 1, pixelFormat: 'yuv444p'});
  const metadata = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate,nb_frames,duration', '-of', 'json', movie], {encoding: 'utf8'})).streams[0];
  assert.deepEqual([metadata.width, metadata.height, metadata.r_frame_rate, metadata.nb_frames], [640, 360, '24/1', '120']);
  const rgb = execFileSync('ffmpeg', ['-v', 'error', '-i', movie, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], {maxBuffer: 100 * 1024 * 1024});
  assert.equal(rgb.length, 640 * 360 * 3 * 120);
  let maxChannelDifference = 0, maxMeanChannelDifference = 0;
  const matches = [];
  for (let f = 0; f < 120; f++) {
    let expectedMean = 0;
    const scores = expected.map((original, candidate) => {
      let sum = 0;
      for (let p = 0; p < 640 * 360; p++) for (let c = 0; c < 3; c++) {
        const difference = Math.abs(original[p * 4 + c] - rgb[f * 640 * 360 * 3 + p * 3 + c]);
        sum += difference;
        if (candidate === f) maxChannelDifference = Math.max(maxChannelDifference, difference);
      }
      const mean = sum / (640 * 360 * 3); if (candidate === f) expectedMean = mean;
      return {candidate, mean};
    });
    const best = scores.reduce((a, b) => a.mean <= b.mean ? a : b);
    assert.ok(expectedMean <= best.mean + 1e-6, `Video ${f} closer to wrong frame ${best.candidate}`);
    matches.push({frame: f, closestFrame: best.candidate, meanChannelDifference: expectedMean});
    maxMeanChannelDifference = Math.max(maxMeanChannelDifference, expectedMean);
  }
  assert.ok(maxMeanChannelDifference < 2, 'Video materially differs from PNG');
  report.exports.video = {...metadata, concurrency: 2, codec: 'h264', crf: 1, pixelFormat: 'yuv444p', fullyDecoded: true, lossless: false, maxChannelDifference, maxMeanChannelDifference, matches};
  report.exports.rgbaSHA256 = expected.map(hash);
  await writeFile(path.join(out, 'scene-result.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({...report.exports, rgbaSHA256: '120 recorded', video: {...report.exports.video, matches: '120 verified'}}));
} finally {if (browser) await browser.close({silent: true}); await new Promise(resolve => server.close(resolve));}
