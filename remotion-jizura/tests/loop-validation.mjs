// Real Player controls + saved props + render evidence. No baseline adoption.
import assert from 'node:assert/strict';
import {build} from 'vite';
import {bundle} from '@remotion/bundler';
import {openBrowser, selectComposition, renderStill, renderMedia} from '@remotion/renderer';
import {createServer} from 'node:http';
import {readFile, writeFile, mkdir, mkdtemp} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {requirePixels, pixelDifference} from './port-metrics.mjs';

const repo = path.resolve(import.meta.dirname, '../..'), parent = path.join(repo, 'dist/remotion/stage14');
await mkdir(parent, {recursive: true});
const out = await mkdtemp(path.join(parent, 'run-'));
console.log(`Review loop evidence: ${out}`);
const publicDir = path.join(repo, 'dist/remotion/stage04/assets'), font = await readFile(path.join(publicDir, 'NotoSansJP.ttf'));
const hash = b => createHash('sha256').update(b).digest('hex');
assert.equal(hash(font), 'c2f3b4d463500a2ddcd3849cded1fceeb9fd6d1c32e6cbecd568453ba50fc68f');
const browserExecutable = process.env.JIZURA_BROWSER ?? '/usr/bin/google-chrome', chromiumOptions = {gl: 'swangle'};
const json = (name, value) => writeFile(path.join(out, name), JSON.stringify(value, null, 2) + '\n');
const rgba = file => execFileSync('ffmpeg', ['-v', 'error', '-threads', '1', '-i', file, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], {maxBuffer: 12 * 1024 * 1024});
const frames = [0, 12, 36, 71, 72, 84, 108, 143, 144, 156, 180, 215, 216, 224, 228, 240, 251, 252, 270, 287];
const uiOnly = process.argv.includes('--ui-only');
if (process.argv.slice(2).some(a => a !== '--ui-only')) throw new Error('Unknown option');
const report = {status: 'running', frames, variants: [], timings: {}, review: {agent: 'pending', user: 'unconfirmed', baseline: 'candidate'}};
async function run() {
let browser, server;
try {
  await build({configFile: false, root: repo, publicDir: false, logLevel: 'warn', define: {'process.env.NODE_ENV': '"development"'},
    build: {outDir: path.join(out, 'preview'), lib: {entry: path.join(repo, 'remotion-jizura/tests/loop-entry.jsx'), formats: ['iife'], name: 'LoopValidation', fileName: () => 'test.js'}}});
  const source = await readFile(path.join(out, 'preview/test.js'));
  server = createServer((req, res) => {
    if (req.url.startsWith('/delayed-NotoSansJP.ttf')) {res.setHeader('Cache-Control', 'no-store'); setTimeout(() => {res.setHeader('Content-Type', 'font/ttf'); res.end(font);}, 600);}
    else if (req.url === '/NotoSansJP.ttf') {res.setHeader('Content-Type', 'font/ttf'); res.end(font);}
    else if (req.url === '/missing.ttf') {res.statusCode = 404; res.end('missing');}
    else if (req.url === '/test.js') {res.setHeader('Content-Type', 'text/javascript'); res.end(source);}
    else {res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end('<!doctype html><meta charset="utf-8"><style>body{margin:0}</style><body><script src="/test.js"></script>');}
  });
  await new Promise((resolve, reject) => {server.once('error', reject); server.listen(0, '127.0.0.1', resolve);});
  browser = await openBrowser('chrome', {browserExecutable, chromiumOptions});
  const page = await browser.newPage({context: () => null, logLevel: 'error', indent: false, pageIndex: 0, onBrowserLog: null, onLog: () => {}});
  await page.setViewport({width: 2200, height: 1500, deviceScaleFactor: 1});
  const start = performance.now();
  await page.goto({url: `http://127.0.0.1:${server.address().port}`, timeout: 30000});
  const init = await page.evaluate(() => window.loopInit());
  report.timings.initialPageReadyMs = performance.now() - start;
  report.environment = {node: process.version, browser: init.environment, remotion: JSON.parse(await readFile(path.join(repo, 'node_modules/remotion/package.json'))).version,
    fontSHA256: hash(font), font: {family: 'Noto Sans JP', weight: 700, style: 'normal'}, gl: 'swangle', previewDPR: 1, pixelDensity: 1, fps: 24};
  report.selection = init.selectionSteps; report.reviews = init.reviews; report.invalidInputsRejected = init.invalidInputsRejected;
  report.sources = [];
  for (const file of ['examples/review-loop/model.tsx', 'examples/review-loop/ReviewLoop.tsx', 'examples/review-loop/LoopPlayer.tsx', 'examples/review-loop/preload.tsx', 'examples/custom/effects.tsx', 'tests/loop-entry.jsx', 'tests/loop-validation.mjs'])
    report.sources.push({file, sha256: hash(await readFile(path.join(repo, 'remotion-jizura', file)))});
  const capture = async (name, state) => {
    // Controls overlay the paused video. Exclude only the controls during pixel
    // capture, restore them immediately, and exercise their Player independently.
    await page.evaluate(() => {
      let el = document.querySelector('button[aria-label="Play video"]');
      while (el && !el.style.backgroundImage.includes('gradient')) el = el.parentElement;
      if (el) {el.dataset.loopCaptureControls = el.style.visibility; el.style.visibility = 'hidden';}
    });
    try {
      const shot = await page._client().send('Page.captureScreenshot', {format: 'png', clip: state.clip});
      const file = path.join(out, name); await writeFile(file, Buffer.from(shot.value.data, 'base64')); return rgba(file);
    } finally {await page.evaluate(() => {const el = document.querySelector('[data-loop-capture-controls]'); if (el) {el.style.visibility = el.dataset.loopCaptureControls; delete el.dataset.loopCaptureControls;}});}
  };
  const expected = new Map(), snapshots = {};
  for (const name of Object.keys(init.inputs)) {
    await page.evaluate(n => window.loopChoose(n), name);
    const record = {name, pngs: [], inputFile: `${name}-props.json`};
    await json(record.inputFile, {input: init.inputs[name]});
    for (const frame of frames) {
      const t = performance.now(), state = await page.evaluate(f => window.loopSeek(f), frame);
      assert.equal(state.props.input.name, name); assert.ok(state.status.includes(name));
      const pixels = await capture(`player-${name}-${frame}.png`, state);
      expected.set(`${name}/${frame}`, pixels); snapshots[name] = state.inspection;
      record.pngs.push({frame, rgbaSHA256: hash(pixels), previewSeekCaptureMs: performance.now() - t});
    }
    await json(`${name}-measured.json`, snapshots[name]); report.variants.push(record);
  }
  // Independent local instructions affect the target and preserve other Cut images.
  for (const review of init.reviews) {
    assert.ok(pixelDifference(expected.get(`${review.id}/${review.anchor}`), expected.get(`original/${review.anchor}`)).differentPixels > 0, `Invisible review ${review.id}`);
    const target = init.inputs.original.cuts.find(c => c.id === review.cutId).cut;
    const unchangedFrames = frames.filter(f => f < target.from || f >= target.from + target.durationInFrames);
    for (const frame of unchangedFrames) requirePixels(expected.get(`${review.id}/${frame}`), expected.get(`original/${frame}`), 'raw', `fixed ${review.id}/${frame}`);
    const other = snapshots[review.id].cuts.filter(c => c.declarationIndex !== init.inputs.original.cuts.findIndex(c => c.id === review.cutId));
    assert.deepEqual(other, snapshots.original.cuts.filter(c => c.declarationIndex !== init.inputs.original.cuts.findIndex(c => c.id === review.cutId)));
    review.unchangedFrames = unchangedFrames;
  }
  assert.equal(snapshots['arrival-slower'].cuts[1].enterDurationInFrames, 30);
  assert.equal(snapshots['rise-center'].cuts[2].layout.id, 'center');
  // Scope includes a background motif; even inside both windows, target differs.
  assert.ok(pixelDifference(expected.get('finale-window/224'), expected.get('original/224')).differentPixels > 0, 'Image target scope edit invisible');
  // Drive the action buttons cumulatively, then compare-before, save/restore, JSON.
  await page.evaluate(() => window.loopChoose('original'));
  for (const r of init.reviews) await page.evaluate(id => window.loopClick(id), r.id);
  await page.evaluate(() => window.loopChoose('all', '統合ループ範囲'));
  for (const frame of [84, 180, 240]) requirePixels(await capture(`actions-${frame}.png`, await page.evaluate(f => window.loopSeek(f), frame)), expected.get(`revised/${frame}`), 'raw', 'cumulative UI actions');
  await page.evaluate(() => window.loopClick('設定を保存'));
  const saved = await page.evaluate(() => localStorage.getItem('jizura-review-loop-v1'));
  assert.equal(JSON.parse(saved).input.name, 'edited', 'Cumulative edits must not masquerade as an independent preset');
  await json('ui-saved-props.json', JSON.parse(saved));
  await page.evaluate(() => window.loopClick('変更前後を比較'));
  requirePixels(await capture('compare-before.png', await page.evaluate(() => window.loopSeek(240))), expected.get('original/240'), 'raw', 'before toggle');
  await page.evaluate(() => window.loopClick('変更前後を比較'));
  await page.evaluate(() => window.loopClick('元設定へ復元'));
  for (const frame of [270, 12, 84, 224, 180, 240]) requirePixels(await capture(`restore-${frame}.png`, await page.evaluate(f => window.loopSeek(f), frame)), expected.get(`original/${frame}`), 'raw', 'restore/reverse seek');
  await page.evaluate(() => window.loopClick('保存設定を読込'));
  requirePixels(await capture('saved-reloaded.png', await page.evaluate(() => window.loopSeek(240))), expected.get('revised/240'), 'raw', 'storage reload');
  await page.evaluate(text => window.loopApplyJSON(text), JSON.stringify({input: init.inputs['rise-center']}));
  requirePixels(await capture('json-edited.png', await page.evaluate(() => window.loopSeek(180))), expected.get('rise-center/180'), 'raw', 'JSON edit');
  report.operations = await page.evaluate(() => window.loopRuntimeChecks());
  await page.evaluate(() => window.loopInit());
  requirePixels(await capture('strict-remount.png', await page.evaluate(() => window.loopSeek(180))), expected.get('original/180'), 'raw', 'strict remount');
  if (uiOnly) {
    report.status = 'passed'; report.scope = 'UI actions/100 preview frames only; exports/high-resolution/font trials not run';
    const shot = await page._client().send('Page.captureScreenshot', {format: 'png'});
    await writeFile(path.join(out, 'player-ui.png'), Buffer.from(shot.value.data, 'base64'));
    await json('result.json', report); console.log(`Review loop UI passed: ${out}`); return;
  }
  // Bind exports to reloaded scalar props, with fresh selectComposition each time.
  const bt = performance.now();
  const serveUrl = await bundle({entryPoint: path.join(repo, 'remotion-jizura/examples/studio-entry.tsx'), outDir: path.join(out, 'bundle'), publicDir});
  report.timings.bundleMs = performance.now() - bt;
  const common = {serveUrl, browserExecutable, chromiumOptions, puppeteerInstance: browser, logLevel: 'error'};
  for (const record of report.variants) {
    const inputProps = JSON.parse(await readFile(path.join(out, record.inputFile), 'utf8'));
    const composition = await selectComposition({...common, id: 'ReviewLoop', inputProps});
    assert.deepEqual(composition.props.input, inputProps.input, 'Stale resolved props');
    record.resolvedProps = composition.props; record.inputSHA256 = hash(await readFile(path.join(out, record.inputFile)));
    const t = performance.now();
    for (const png of record.pngs) {
      const name = `${record.name}-${png.frame}.png`, file = path.join(out, name);
      await renderStill({...common, composition, inputProps, frame: png.frame, imageFormat: 'png', output: file});
      png.export = name; png.comparison = requirePixels(rgba(file), expected.get(`${record.name}/${png.frame}`), 'raw', `Player/export ${name}`);
    }
    record.stillExportMs = performance.now() - t;
    console.log(`${record.name}: ${record.pngs.length} Player/export PNGs match`);
    if (['original', 'revised'].includes(record.name)) {
      const t = performance.now(), movie = path.join(out, `${record.name}.mp4`);
      await renderMedia({...common, composition, inputProps, outputLocation: movie, concurrency: 1, codec: 'h264', crf: 1, pixelFormat: 'yuv444p'});
      const metadata = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate,nb_frames,duration', '-of', 'json', movie], {encoding: 'utf8'})).streams[0];
      assert.deepEqual([metadata.width, metadata.height, metadata.r_frame_rate, metadata.nb_frames], [640, 360, '24/1', '288']);
      execFileSync('ffmpeg', ['-v', 'error', '-threads', '1', '-i', movie, '-f', 'null', '-']);
      const anchors = [];
      for (const frame of [36, 84, 180, 224, 240, 270]) {
        const file = path.join(out, `${record.name}-decoded-${frame}.png`);
        execFileSync('ffmpeg', ['-v', 'error', '-threads', '1', '-i', movie, '-vf', `select='eq(n,${frame})'`, '-frames:v', '1', '-y', file]);
        const pixels = rgba(file), reference = expected.get(`${record.name}/${frame}`);
        let sum = 0; for (let i = 0; i < pixels.length; i += 4) for (let c = 0; c < 3; c++) sum += Math.abs(pixels[i + c] - reference[i + c]);
        const meanChannelDifference = sum / (640 * 360 * 3); assert.ok(meanChannelDifference < 2, `Lossy video correspondence ${frame}`);
        anchors.push({frame, meanChannelDifference});
      }
      execFileSync('ffmpeg', ['-v', 'error', '-threads', '1', '-i', movie, '-vf', "select='eq(n,12)+eq(n,36)+eq(n,84)+eq(n,180)+eq(n,224)+eq(n,240)+eq(n,270)',scale=320:180,tile=7x1", '-frames:v', '1', '-y', path.join(out, `${record.name}-filmstrip.png`)]);
      record.movie = {file: `${record.name}.mp4`, ...metadata, concurrency: 1, renderMs: performance.now() - t, fullyDecoded: true, lossless: false, anchors, filmstrip: `${record.name}-filmstrip.png`};
      console.log(`${record.name}: 12-second MP4 decoded and 6 anchors compared`);
    }
  }
  report.representatives = [];
  for (const [id, width, height] of [['ReviewLoop1080', 1920, 1080], ['ReviewLoopPortrait', 360, 640]]) {
    for (const name of ['original', 'revised']) {
      const inputProps = JSON.parse(await readFile(path.join(out, `${name}-props.json`), 'utf8'));
      const timing = await page.evaluate((p, w, h) => window.loopRepresentative(p, w, h), inputProps, width, height);
      const composition = await selectComposition({...common, id, inputProps});
      assert.deepEqual(composition.props.input, inputProps.input);
      const pngs = [], t = performance.now();
      for (const frame of [36, 180, 224, 240]) {
        const state = await page.evaluate(f => window.representativeSeek(f), frame), preview = `${id}-${name}-player-${frame}.png`;
        const expected = await capture(preview, state), exported = `${id}-${name}-${frame}.png`;
        await renderStill({...common, composition, inputProps, frame, imageFormat: 'png', output: path.join(out, exported)});
        const actual = rgba(path.join(out, exported));
        // High-resolution representatives are not the640x360 regression gate.
        // Keep actual preview/export differences, never absorb them with a new
        // tolerance. Record two fresh exports separately: this fixed swangle
        // backend can differ at subpixel glyph edges at1080p. Any difference
        // remains unresolved evidence, rather than being labeled reproducible.
        const repeated = `${id}-${name}-repeat-${frame}.png`;
        await renderStill({...common, composition, inputProps, frame, imageFormat: 'png', output: path.join(out, repeated)});
        pngs.push({frame, preview, exported, repeated,
          previewExport: pixelDifference(actual, expected),
          exportRepeat: pixelDifference(rgba(path.join(out, repeated)), actual),
          previewExportGate: 'informational representative; no tolerance added',
          repeatStatus: hash(rgba(path.join(out, repeated))) === hash(actual) ? 'exact' : 'unresolved difference'});
        await json(`${id}-${name}-measured.json`, state.inspection);
      }
      report.representatives.push({id, name, width, height, timing, stillExportMs: performance.now() - t, pngs});
    }
  }
  report.fontTrials = await page.evaluate(() => window.loopFontTrials());
  await page.evaluate(() => window.loopInit());
  await page.evaluate(() => window.loopChoose('revised'));
  await page.evaluate(() => window.loopSeek(180));
  const shot = await page._client().send('Page.captureScreenshot', {format: 'png'});
  await writeFile(path.join(out, 'player-ui.png'), Buffer.from(shot.value.data, 'base64'));
  await page.evaluate(() => window.loopRuntimeChecks());
  report.status = 'passed';
  await json('result.json', report); await writeFile(path.join(parent, 'latest-run.txt'), out + '\n');
  console.log(`Review loop passed: ${out}`);
} catch (error) {
  report.status = 'failed'; report.error = String(error); await json('result.json', report); throw error;
} finally {
  if (browser) await browser.close({silent: true});
  if (server) await new Promise(r => server.close(r));
}

}
await run();
