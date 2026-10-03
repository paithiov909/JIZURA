// Case-driven development harness. Never writes accepted baselines.
import assert from 'node:assert/strict';
import {build} from 'vite';
import {bundle} from '@remotion/bundler';
import {openBrowser, selectComposition, renderStill, renderFrames, renderMedia} from '@remotion/renderer';
import {createServer} from 'node:http';
import {readFile, mkdir, mkdtemp, writeFile, readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {portCases, getPortCase, sceneDuration} from './port-cases.ts';
import {requirePixels, requireResolvedProps} from './port-metrics.mjs';

const flags = Object.fromEntries(process.argv.slice(2).map(arg => {
  const match = /^--(case|compare-to|inject|list|stills-only|output)(?:=(.+))?$/.exec(arg);
  if (!match) throw new Error(`Unknown option ${arg}`);
  if (['case', 'compare-to', 'inject', 'output'].includes(match[1]) && !match[2]) throw new Error(`Missing value ${arg}`);
  return [match[1], match[2] ?? true];
}));
if (flags.list) {console.log(portCases.map(c => `${c.id}\t${c.kind}/${c.preset}\t${c.reason}`).join('\n')); process.exit(0);}
const selected = flags.case ? [...new Set(flags.case.split(','))].map(getPortCase) : portCases;
if (flags.inject && !['pixels', 'parameter', 'empty', 'stale-props'].includes(flags.inject)) throw new Error('Unknown injection');
const repo = path.resolve(import.meta.dirname, '../..'), parent = flags.output ? path.resolve(flags.output) : path.join(repo, 'dist/remotion/stage12');
const publicDir = path.join(repo, 'dist/remotion/stage04/assets');
const font = await readFile(path.join(publicDir, 'NotoSansJP.ttf'));
const browserExecutable = process.env.JIZURA_BROWSER ?? '/usr/bin/google-chrome';
const backends = {text: {gl: null}, image: {gl: 'swangle'}};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const fontSHA256 = hash(font);
assert.equal(fontSHA256, 'c2f3b4d463500a2ddcd3849cded1fceeb9fd6d1c32e6cbecd568453ba50fc68f', 'Comparison font changed; do not silently adopt a new environment');
await mkdir(parent, {recursive: true});
const out = await mkdtemp(path.join(parent, 'run-'));
console.log(`Port evidence: ${out}`);
const json = (file, data) => writeFile(file, JSON.stringify(data, null, 2) + '\n');
const rgba = file => execFileSync('ffmpeg', ['-v', 'error', '-threads', '1', '-i', file, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], {maxBuffer: 8 * 1024 * 1024});
const relative = file => path.relative(out, file);
const report = {status: 'running', injection: flags.inject ?? null, startedAt: new Date().toISOString(), cases: [],
  comparisonKinds: {legacy: 'informational, adapted retained source; equality is not required',
    repeat: 'same new implementation, raw exact; candidate until explicitly reviewed', visual: 'different case conditions; no cross-condition pixel gate'},
  review: {agent: 'pending', user: 'unconfirmed', regressionBaseline: 'candidate, not adopted'}};
const previous = flags['compare-to'] ? JSON.parse(await readFile(path.join(path.resolve(flags['compare-to']), 'result.json'), 'utf8')) : null;
let browser, server, page, stage = 'build';
try {
  await build({configFile: false, root: repo, publicDir: false, logLevel: 'warn', define: {'process.env.NODE_ENV': '"development"'},
    build: {outDir: path.join(out, 'preview'), emptyOutDir: true, lib: {entry: path.join(repo, 'remotion-jizura/tests/port-entry.jsx'), formats: ['iife'], name: 'PortValidation', fileName: () => 'test.js'}}});
  const source = await readFile(path.join(out, 'preview/test.js'));
  server = createServer((req, res) => {
    if (req.url === '/NotoSansJP.ttf') {res.setHeader('Content-Type', 'font/ttf'); res.end(font);}
    else if (req.url === '/test.js') {res.setHeader('Content-Type', 'text/javascript; charset=utf-8'); res.end(source);}
    else {res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end('<!doctype html><meta charset="utf-8"><style>body{margin:0}</style><body><script src="/test.js"></script>');}
  });
  await new Promise((resolve, reject) => {server.once('error', reject); server.listen(0, '127.0.0.1', resolve);});
  const errors = []; report.browserErrors = errors;
  let currentKind;
  async function ensurePreview(kind) {
    if (currentKind === kind) return;
    if (browser) await browser.close({silent: true});
    currentKind = kind;
    browser = await openBrowser('chrome', {browserExecutable, chromiumOptions: backends[kind]});
    page = await browser.newPage({context: () => null, logLevel: 'error', indent: false, pageIndex: 0, onBrowserLog: null, onLog: () => {}});
    page.on('pageerror', error => errors.push(String(error)));
    await page.setViewport({width: 1280, height: 900, deviceScaleFactor: 2});
    stage = 'preview-initialize';
    await page.goto({url: `http://127.0.0.1:${server.address().port}`, timeout: 30000});
    await page.evaluate(async () => {
      for (let i = 0; i < 200; i++) {if (typeof window.runPortCase === 'function') return; await new Promise(r => setTimeout(r, 25));}
      throw new Error('Port preview entry did not initialize');
    });
  }
  await ensurePreview(selected[0].kind);
  const versions = {};
  for (const name of ['react', 'remotion', '@remotion/effects']) versions[name] = JSON.parse(await readFile(path.join(repo, 'node_modules', name, 'package.json'), 'utf8')).version;
  report.environment = {node: process.version, browser: await page.evaluate(() => navigator.userAgent), versions,
    platform: process.platform, arch: process.arch, fontSHA256, font: {family: 'Noto Sans JP', weight: 700, style: 'normal'},
    previewDPR: 2, pixelDensity: 1, backends, browserExecutable};
  report.sources = [];
  for (const file of ['port-cases.ts', 'port-model.tsx', 'port-entry.jsx', 'port-composition.tsx', 'port-metrics.mjs', 'port-validation.mjs', 'effect-reference.jsx', 'batch-gates.jsx']) {
    report.sources.push({file: `remotion-jizura/tests/${file}`, sha256: hash(await readFile(path.join(import.meta.dirname, file)))});
  }
  for (const file of ['remotion-jizura/src/canvas/mixed.ts', 'remotion-jizura/src/canvas/effect-frame.ts', 'remotion-jizura/src/effects/motion.ts', 'remotion-jizura/src/effects/decor.ts', 'remotion-jizura/src/effects/batch-schema.ts', 'effects/core/layouts.ts', 'effects/core/animation.ts', 'effects/core/decor.ts', 'effects/packs/enter.ts']) report.sources.push({file, sha256: hash(await readFile(path.join(repo, file)))});
  if (previous) {
    assert.equal(previous.status, 'passed', 'Previous run incomplete');
    assert.deepEqual(previous.environment, report.environment, 'Regression environment differs; use visual assessment for different conditions');
  }
  stage = 'bundle';
  const serveUrl = await bundle({entryPoint: path.join(repo, 'remotion-jizura/tests/port-composition.tsx'), outDir: path.join(out, 'bundle'), publicDir});
  // Only one browser is active; text/default and image/swangle run sequentially.
  for (const spec of selected) {
    await ensurePreview(spec.kind);
    const common = {serveUrl, browserExecutable, chromiumOptions: backends[spec.kind], puppeteerInstance: browser, logLevel: 'error'};
    const select = async inputProps => {
      const composition = await selectComposition({...common, id: 'PortCase', inputProps});
      requireResolvedProps(composition, inputProps);
      const inputCase = getPortCase(inputProps.caseId);
      assert.deepEqual([composition.width, composition.height, composition.fps, composition.durationInFrames], [inputCase.width, inputCase.height, inputCase.fps, sceneDuration(inputCase) + 1]);
      return composition;
    };
    stage = `${spec.id}:browser`;
    const dir = path.join(out, spec.id); await mkdir(dir);
    await json(path.join(dir, 'case.json'), spec);
    const record = await page.evaluate((id, injection) => window.runPortCase(id, injection), spec.id, flags.inject);
    record.chromiumOptions = backends[spec.kind];
    if (previous) assert.deepEqual(previous.cases.find(c => c.id === spec.id)?.prepared, record.prepared, 'Regression resolved configuration differs');
    assert.deepEqual(errors, [], 'Unexpected browser errors');
    record.sourceComparisons.forEach(diff => {diff.acceptance = 'informational';});
    const captures = [...record.images, ...record.references.map(im => ({...im, reference: true}))];
    delete record.images; delete record.references;
    record.artifacts = [];
    for (const im of captures) {
      const name = `${im.reference ? 'legacy' : 'preview'}-${im.edit ? 'edit-' : ''}${im.frame}.png`, file = path.join(dir, name);
      await writeFile(file, Buffer.from(im.png.split(',')[1], 'base64'));
      record.artifacts.push({...im, png: undefined, file: relative(file)});
    }
    await json(path.join(dir, 'browser.json'), record);
    const inputProps = {caseId: spec.id, edit: false};
    await json(path.join(dir, 'input.json'), inputProps);
    const restoredInput = JSON.parse(await readFile(path.join(dir, 'input.json'), 'utf8'));
    const composition = await select(restoredInput), exports = [];
    const options = {...common, composition, inputProps: restoredInput, imageFormat: 'png'};
    const acquisition = spec.kind === 'image' || spec.background === null ? 'canvas-screenshot' : 'raw';
    stage = `${spec.id}:export`;
    for (const frame of record.frames) {
      const file = path.join(dir, `export-${frame}.png`);
      await renderStill({...options, frame, output: file});
      const actual = rgba(file), preview = rgba(path.join(dir, `preview-${frame}.png`));
      const diff = requirePixels(actual, preview, acquisition, `${spec.id}/${frame}`);
      exports.push({frame, file: relative(file), rgbaSHA256: hash(actual), acquisition, ...diff});
      if (previous) {
        const old = previous.cases.find(entry => entry.id === spec.id);
        assert.ok(old, `Missing previous case ${spec.id}`); assert.deepEqual(old.spec, spec, 'Regression input changed');
        const baseline = old.exports.find(entry => entry.frame === frame);
        assert.ok(baseline, `Missing previous frame ${frame}`);
        requirePixels(actual, rgba(path.join(path.resolve(flags['compare-to']), baseline.file)), 'raw', `repeat ${spec.id}/${frame}`);
      }
    }
    const editedInput = {...inputProps, edit: true}; await json(path.join(dir, 'edited-input.json'), editedInput);
    const editedComposition = await select(editedInput);
    // Negative gates exercise stale metadata and a REAL export with stale props.
    assert.throws(() => requireResolvedProps(composition, editedInput), /Stale Composition/);
    const staleFile = path.join(dir, 'stale-props-negative.png');
    await renderStill({...options, inputProps: editedInput, frame: record.anchor, output: staleFile});
    const editedPreview = rgba(path.join(dir, `preview-edit-${record.anchor}.png`));
    assert.throws(() => requirePixels(rgba(staleFile), editedPreview, acquisition, 'stale-props real PNG'), /Pixel mismatch/);
    if (flags.inject === 'stale-props') requireResolvedProps(composition, editedInput);
    const editedFile = path.join(dir, 'edited-export.png');
    await renderStill({...options, composition: editedComposition, inputProps: editedInput, frame: record.anchor, output: editedFile});
    const editedDiff = requirePixels(rgba(editedFile), editedPreview, acquisition, 'resolved edited PNG');
    assert.notEqual(hash(rgba(editedFile)), exports.find(entry => entry.frame === record.anchor).rgbaSHA256, 'Edited export stayed unchanged');
    const panels = [path.join(dir, `preview-${record.anchor}.png`),
      ...(spec.legacy ? [path.join(dir, `legacy-${record.anchor}.png`)] : []), path.join(dir, `export-${record.anchor}.png`), editedFile];
    const comparisonFile = path.join(dir, 'comparison.png');
    execFileSync('ffmpeg', ['-v', 'error', '-threads', '1', ...panels.flatMap(file => ['-i', file]),
      '-filter_complex', `hstack=inputs=${panels.length}`, '-frames:v', '1', comparisonFile]);
    let parallel = null;
    if (spec.parallel) {
      stage = `${spec.id}:parallel`; const dirs = [];
      for (const concurrency of [1, 2]) {
        const outputDir = path.join(dir, `frames-${concurrency}`);
        await renderFrames({...options, outputDir, frameRange: [0, sceneDuration(spec)], concurrency});
        const files = (await readdir(outputDir)).filter(f => f.endsWith('.png')).sort();
        assert.equal(files.length, sceneDuration(spec) + 1); dirs.push(files.map(file => path.join(outputDir, file)));
      }
      for (let f = 0; f < dirs[0].length; f++) {
        requirePixels(rgba(dirs[0][f]), rgba(dirs[1][f]), 'raw', `parallel ${f}`);
        const expected = exports.find(entry => entry.frame === f);
        if (expected) requirePixels(rgba(dirs[0][f]), rgba(path.join(out, expected.file)), 'raw', `parallel anchor ${f}`);
      }
      parallel = {frames: dirs[0].length, concurrency: [1, 2], differentPixels: 0};
    }
    let video = null;
    if (spec.video && !flags['stills-only']) {
      stage = `${spec.id}:video`; const file = path.join(dir, 'review.mp4');
      await renderMedia({...common, composition, inputProps, outputLocation: file, frameRange: [0, sceneDuration(spec) - 1],
        concurrency: 1, codec: 'h264', crf: 1, pixelFormat: 'yuv444p'});
      const stream = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate,nb_frames,duration', '-of', 'json', file], {encoding: 'utf8'})).streams[0];
      assert.deepEqual([stream.width, stream.height, stream.r_frame_rate, Number(stream.nb_frames)], [spec.width, spec.height, `${spec.fps}/1`, sceneDuration(spec)]);
      const decoded = execFileSync('ffmpeg', ['-v', 'error', '-threads', '1', '-i', file, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], {maxBuffer: 64 * 1024 * 1024});
      assert.equal(decoded.length, spec.width * spec.height * 3 * sceneDuration(spec));
      const sampleFrames = record.frames.filter(f => f < sceneDuration(spec));
      const selection = sampleFrames.map(f => `eq(n\\,${f})`).join('+');
      execFileSync('ffmpeg', ['-v', 'error', '-threads', '1', '-i', file, '-vf',
        `select=${selection},scale=320:-1,tile=${sampleFrames.length}x1`, '-frames:v', '1', path.join(dir, 'filmstrip.png')]);
      video = {file: relative(file), ...stream, concurrency: 1, fullyDecoded: true, lossless: false, pixelEqualityClaimed: false,
        sampleFrames, filmstrip: relative(path.join(dir, 'filmstrip.png')),
        alpha: spec.background === null ? 'H264 composites transparent pixels; inspect PNG alpha separately' : 'opaque case'};
    }
    report.cases.push({...record, exports, comparison: {file: relative(comparisonFile), panels: ['preview', ...(spec.legacy ? ['legacy'] : []), 'export', 'edited-export'], frame: record.anchor},
      edited: {inputProps: editedInput, file: relative(editedFile), ...editedDiff},
      negativeGates: {staleResolvedProps: true, staleRenderedPNG: true}, parallel, video,
      repeatComparison: previous ? {directory: path.resolve(flags['compare-to']), frames: exports.length, differentPixels: 0, status: 'candidate comparison; review controls adoption'} : null});
    await json(path.join(out, 'result.json'), report);
    console.log(`${spec.id}: ${exports.length} PNG, edit/restore/negative gates passed${parallel ? ', parallel 1/2 passed' : ''}${video ? ', video decoded' : ''}`);
  }
  const ordered = report.cases.find(c => c.id === 'image-combined'), reversed = report.cases.find(c => c.id === 'image-reverse');
  if (ordered && reversed) {
    assert.notEqual(ordered.exports.find(e => e.frame === ordered.anchor).rgbaSHA256,
      reversed.exports.find(e => e.frame === reversed.anchor).rgbaSHA256, 'Changing image effect order did not reach rendering');
    report.imageOrder = {cases: [ordered.id, reversed.id], frame: ordered.anchor, visiblyDifferentPixels: true};
  }
  report.status = 'passed'; report.completedAt = new Date().toISOString();
  await json(path.join(out, 'result.json'), report);
  await json(path.join(out, 'review.json'), {technicalReport: 'result.json', agent: {status: 'pending', artifacts: [], findings: []},
    user: {status: 'unconfirmed', reviewer: null, feedback: []}, regression: {status: 'candidate', adoptedBy: null, conditions: report.environment, reason: null},
    effects: report.cases.map(c => ({caseId: c.id, input: `${c.id}/case.json`, technical: 'passed', visual: 'pending', intentionalDifferences: [], limitations: []}))});
  console.log(`Passed ${report.cases.length} cases; visual/user/baseline review remains separate: ${out}/review.json`);
} catch (error) {
  report.status = 'failed'; report.failure = {stage, message: String(error), stack: error.stack};
  if (page) {
    try {
      const diagnostic = await page.evaluate(() => window.portFailure);
      if (diagnostic) {
        for (const key of ['expected', 'actual']) {
          const file = path.join(out, `failure-${key}.png`);
          await writeFile(file, Buffer.from(diagnostic[key].split(',')[1], 'base64')); diagnostic[key] = relative(file);
        }
        report.failure.diagnostic = diagnostic;
      }
    } catch { /* Keep the original failure if the browser itself is unavailable. */ }
  }
  await json(path.join(out, 'result.json'), report); console.error(`FAILED ${stage}; inspect ${out}/result.json`); throw error;
} finally {
  if (browser) await browser.close({silent: true});
  if (server?.listening) await new Promise(resolve => server.close(resolve));
}
