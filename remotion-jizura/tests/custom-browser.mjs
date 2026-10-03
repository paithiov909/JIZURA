// Stage09: public custom effects through two real Players and real Remotion PNGs.
import assert from 'node:assert/strict';
import {build} from 'vite';
import {bundle} from '@remotion/bundler';
import {openBrowser, selectComposition, renderStill, renderMedia} from '@remotion/renderer';
import {createServer} from 'node:http';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
const repo = path.resolve(import.meta.dirname, '../..'), out = path.join(repo, 'dist/remotion/stage09');
const publicDir = path.join(repo, 'dist/remotion/stage04/assets');
const font = await readFile(path.join(publicDir, 'NotoSansJP.ttf'));
const browserExecutable = process.env.JIZURA_BROWSER ?? '/usr/bin/google-chrome';
await mkdir(out, {recursive: true});
await build({configFile: false, root: repo, publicDir: false, logLevel: 'warn', define: {'process.env.NODE_ENV': '"development"'},
  build: {outDir: path.join(out, 'preview'), emptyOutDir: true, lib: {entry: path.join(repo, 'remotion-jizura/tests/custom-entry.jsx'), formats: ['iife'], name: 'CustomTest', fileName: () => 'test.js'}}});
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
  const browserErrors = []; page.on('pageerror', e => browserErrors.push(String(e)));
  await page.setViewport({width: 1280, height: 800, deviceScaleFactor: 2});
  await page.goto({url: `http://127.0.0.1:${server.address().port}/`, timeout: 30000});
  const report = await page.evaluate(() => window.runCustomChecks());
  assert.deepEqual(browserErrors, []);
  report.environment = {browser: await page.evaluate(() => navigator.userAgent), node: process.version,
    react: JSON.parse(await readFile(path.join(repo, 'node_modules/react/package.json'))).version,
    remotion: JSON.parse(await readFile(path.join(repo, 'node_modules/remotion/package.json'))).version,
    font: {family: 'Noto Sans JP', weight: 700, style: 'normal', sha256: hash(font)}, ...{width: 640, height: 360, fps: 24}, previewDPR: 2};
  const expected = new Map();
  for (const im of report.images) {
    const file = path.join(out, `player-${im.variant}-${im.frame}.png`);
    await writeFile(file, Buffer.from(im.png.split(',')[1], 'base64')); expected.set(`${im.variant}/${im.frame}`, rgba(file));
  }
  delete report.images;
  const serveUrl = await bundle({entryPoint: path.join(repo, 'remotion-jizura/examples/studio-entry.tsx'), outDir: path.join(out, 'bundle'), publicDir});
  report.exports = [];
  for (const [variant, amplitude] of [['baseline', 12], ['edited', 32]]) {
    const inputFile = path.join(out, `${variant}.json`); await writeFile(inputFile, JSON.stringify({amplitude}, null, 2));
    const inputProps = JSON.parse(await readFile(inputFile, 'utf8'));
    const composition = await selectComposition({serveUrl, id: 'CustomEffects', browserExecutable, inputProps});
    for (const frame of report.frames) {
      const file = path.join(out, `${variant}-${frame}.png`);
      await renderStill({serveUrl, composition, browserExecutable, inputProps, imageFormat: 'png', frame, output: file, logLevel: 'error'});
      const pixels = rgba(file); assert.deepEqual(pixels, expected.get(`${variant}/${frame}`), `Player/export mismatch ${variant}/${frame}`);
      report.exports.push({variant, frame, rgbaSHA256: hash(pixels), differentPixels: 0});
    }
    console.log(`${variant}: 11 custom Player/Remotion PNGs match`);
  }
  const inputProps = JSON.parse(await readFile(path.join(out, 'baseline.json'), 'utf8'));
  const composition = await selectComposition({serveUrl, id: 'CustomEffects', browserExecutable, inputProps});
  await renderStill({serveUrl, composition, browserExecutable, inputProps, imageFormat: 'png', frame: 24, output: path.join(out, 'restored-24.png'), logLevel: 'error'});
  assert.deepEqual(rgba(path.join(out, 'restored-24.png')), expected.get('baseline/24'));
  await renderMedia({serveUrl, composition, browserExecutable, inputProps, outputLocation: path.join(out, 'custom.mp4'),
    frameRange: [0, 59], concurrency: 2, codec: 'h264', crf: 1, pixelFormat: 'yuv444p', logLevel: 'error'});
  report.video = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate,nb_frames,duration', '-of', 'json', path.join(out, 'custom.mp4')], {encoding: 'utf8'})).streams[0];
  assert.deepEqual([report.video.width, report.video.height, report.video.nb_frames], [640, 360, '60']);
  const decoded = execFileSync('ffmpeg', ['-v', 'error', '-i', path.join(out, 'custom.mp4'), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], {maxBuffer: 50 * 1024 * 1024});
  assert.equal(decoded.length, 640 * 360 * 3 * 60); report.video.lossless = false;
  await writeFile(path.join(out, 'custom-result.json'), JSON.stringify(report, null, 2));
  console.log('Custom effects: two Scenes, reverse seek, mutation, edit/restore, identity swap and remount passed; 60-frame video decoded');
} finally {if (browser) await browser.close({silent: true}); await new Promise(resolve => server.close(resolve));}
