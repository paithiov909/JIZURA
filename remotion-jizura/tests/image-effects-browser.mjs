import assert from 'node:assert/strict';
import {build} from 'vite';
import {bundle} from '@remotion/bundler';
import {openBrowser, selectComposition, renderStill, renderMedia} from '@remotion/renderer';
import {createServer} from 'node:http';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
const repo = path.resolve(import.meta.dirname, '../..'), out = path.join(repo, 'dist/remotion/stage10');
const publicDir = path.join(repo, 'dist/remotion/stage04/assets');
const font = await readFile(path.join(publicDir, 'NotoSansJP.ttf'));
const browserExecutable = process.env.JIZURA_BROWSER ?? '/usr/bin/google-chrome';
const chromiumOptions = {gl: 'swangle'};
const hash = b => createHash('sha256').update(b).digest('hex');
const rgba = file => execFileSync('ffmpeg', ['-v','error','-i',file,'-frames:v','1','-f','rawvideo','-pix_fmt','rgba','-'], {maxBuffer: 10*1024*1024});
function compare(actual, wanted) {
  assert.equal(actual.length, wanted.length);
  let differentPixels = 0, maxRaw = 0, maxAlpha = 0, maxPremultiplied = 0;
  for (let i = 0; i < actual.length; i += 4) {
    let changed = false;
    maxAlpha = Math.max(maxAlpha, Math.abs(actual[i+3]-wanted[i+3]));
    for (let j = 0; j < 4; j++) {const d = Math.abs(actual[i+j]-wanted[i+j]); maxRaw = Math.max(maxRaw,d); changed ||= d !== 0;}
    for (let j = 0; j < 3; j++) maxPremultiplied = Math.max(maxPremultiplied, Math.abs(Math.round(actual[i+j]*actual[i+3]/255)-Math.round(wanted[i+j]*wanted[i+3]/255)));
    if (changed) differentPixels++;
  }
  return {differentPixels, maxRaw, maxAlpha, maxPremultiplied};
}
await mkdir(out, {recursive: true});
await build({configFile: false, root: repo, publicDir: false, logLevel: 'warn', define: {'process.env.NODE_ENV': '"development"'},
  build: {outDir: path.join(out, 'preview'), emptyOutDir: true, lib: {entry: path.join(repo, 'remotion-jizura/tests/image-effects-entry.jsx'), formats: ['iife'], name: 'ImageEffectTest', fileName: () => 'test.js'}}});
const source = await readFile(path.join(out, 'preview/test.js'));
const server = createServer((req,res) => {
  if (req.url?.endsWith('.ttf')) res.end(font);
  else if (req.url === '/test.js') {res.setHeader('Content-Type', 'text/javascript; charset=utf-8'); res.end(source);}
  else {res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end('<!doctype html><meta charset="utf-8"><style>body{margin:0}</style><body><script src="/test.js"></script>');}
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await openBrowser('chrome', {browserExecutable, chromiumOptions});
  const page = await browser.newPage({context: () => null, logLevel: 'error', indent: false, pageIndex: 0, onBrowserLog: null, onLog: () => {}});
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.setViewport({width: 1280, height: 800, deviceScaleFactor: 2});
  await page.goto({url: `http://127.0.0.1:${server.address().port}/`, timeout: 30000});
  const report = await page.evaluate(() => window.runImageChecks());
  assert.deepEqual(errors, []);
  const expected = new Map();
  for (const im of report.images) {
    const file = path.join(out, `player-${im.variant}-${im.frame}.png`);
    await writeFile(file, Buffer.from(im.png.split(',')[1], 'base64')); expected.set(`${im.variant}/${im.frame}`, rgba(file));
  }
  const images = report.images.map(({png, ...record}) => record); delete report.images;
  report.environment = {node: process.version, browser: await page.evaluate(() => navigator.userAgent), remotion: '4.0.532', react: '19.3.0', effects: '4.0.532',
    width: 640, height: 360, fps: 24, pixelDensity: 1, previewDPR: 2, chromiumOptions, fontSHA256: hash(font)};
  console.log(`Player: ${images.length} samples, alpha/seek/order/remount/Sequence passed`);
  // Keep preview evidence even if a later export fails.
  await writeFile(path.join(out, 'preview-result.json'), JSON.stringify({...report, images}, null, 2));
  const serveUrl = await bundle({entryPoint: path.join(repo, 'remotion-jizura/examples/studio-entry.tsx'), outDir: path.join(out, 'bundle'), publicDir});
  report.exports = [];
  for (const im of images) {
    const inputFile = path.join(out, `${im.variant}.json`);
    await writeFile(inputFile, JSON.stringify(im.props, null, 2));
    const inputProps = JSON.parse(await readFile(inputFile, 'utf8'));
    const composition = await selectComposition({serveUrl, id: 'ImageEffects', browserExecutable, chromiumOptions, inputProps});
    const file = path.join(out, `${im.variant}-${im.frame}.png`);
    await renderStill({serveUrl, composition, browserExecutable, chromiumOptions, inputProps, imageFormat: 'png', frame: im.frame, output: file, logLevel: 'error'});
    const actual = rgba(file), wanted = expected.get(`${im.variant}/${im.frame}`);
    const difference = compare(actual, wanted);
    // Direct canvas PNG and Chromium screenshot can unpremultiply differently.
    // Require identical alpha and integer premultiplied RGB, plus raw delta <=1.
    assert.ok(difference.maxAlpha === 0 && difference.maxPremultiplied === 0 && difference.maxRaw <= 1,
      `Player/export mismatch ${im.variant}/${im.frame}: ${JSON.stringify(difference)}`);
    report.exports.push({...im, rgbaSHA256: hash(actual), ...difference});
    console.log(`PNG ${im.variant}/${im.frame}: premultiplied match, raw max ${difference.maxRaw}`);
  }
  const inputProps = {target: 'scene', mode: 'combined'}, composition = await selectComposition({serveUrl, id: 'ImageEffects', browserExecutable, chromiumOptions, inputProps});
  await renderMedia({serveUrl, composition, browserExecutable, chromiumOptions, inputProps, outputLocation: path.join(out,'image-effects.mp4'),
    frameRange: [0,119], concurrency: 2, codec: 'h264', crf: 1, pixelFormat: 'yuv444p', logLevel: 'error'});
  report.video = JSON.parse(execFileSync('ffprobe', ['-v','error','-select_streams','v:0','-show_entries','stream=width,height,r_frame_rate,nb_frames,duration','-of','json',path.join(out,'image-effects.mp4')], {encoding:'utf8'})).streams[0];
  assert.equal(report.video.nb_frames, '120');
  const decoded = execFileSync('ffmpeg', ['-v','error','-i',path.join(out,'image-effects.mp4'),'-f','rawvideo','-pix_fmt','rgb24','-'], {maxBuffer: 90*1024*1024});
  assert.equal(decoded.length, 640*360*3*120); report.video.lossless = false;
  const composition1080 = await selectComposition({serveUrl, id: 'ImageEffects1080', browserExecutable, chromiumOptions, inputProps});
  report.render1080 = [];
  for (const frame of [12,24,47]) {
    const start = performance.now(), file = path.join(out, `1080-${frame}.png`);
    await renderStill({serveUrl, composition: composition1080, browserExecutable, chromiumOptions, inputProps, imageFormat:'png', frame, output:file, logLevel:'error'});
    report.render1080.push({frame, ms: performance.now()-start, rgbaSHA256: hash(rgba(file)), scope: 'fresh-browser renderStill including startup/font/capture/blur/glitch/PNG'});
  }
  await writeFile(path.join(out,'image-effects-result.json'),JSON.stringify(report,null,2));
  console.log('Native image effects: PNGs match, 120-frame video decoded, 1080p samples rendered');
} finally {if (browser) await browser.close({silent:true}); await new Promise(resolve => server.close(resolve));}
