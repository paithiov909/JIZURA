import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const extension = path.join(repo, 'dist/task02/cep/com.852wa.jizura.spike');
const vendor = fs.readFileSync(path.join(repo, 'vendor/mp4-muxer.min.js'), 'utf8');
const guard = fs.readFileSync(path.join(repo, 'build/muxer-guard.js'), 'utf8');
const report = { node: process.version, formats: {}, muxer: [], host: {}, evidence: 'Node VM + AE object-model mock; no AE/CEP runtime' };
const output = path.join(repo, 'dist/task02');
// Syntax evidence is deliberately separate from actually running Chromium 88.
for (const name of ['vite-default', 'vite-chrome88']) {
  const file = fs.readdirSync(path.join(output, name, 'assets')).find(file => file.endsWith('.js'));
  const code = fs.readFileSync(path.join(output, name, 'assets', file), 'utf8');
  const ast = parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
  const count = node => {
    if (!node || typeof node !== 'object') return 0;
    return (node.type === 'StaticBlock' ? 1 : 0) + Object.values(node).reduce((sum, value) =>
      sum + (Array.isArray(value) ? value.reduce((n, item) => n + count(item), 0) : count(value)), 0);
  };
  const blocks = count(ast);
  assert.equal(blocks, name === 'vite-default' ? 1 : 0);
  report.formats[name] = { staticBlocks: blocks, format: 'ES module' };
}
const panel = fs.readFileSync(path.join(extension, 'panel.js'), 'utf8');
parse(panel, { ecmaVersion: 2021, sourceType: 'script' });
parse(vendor, { ecmaVersion: 2021, sourceType: 'script' });
parse(guard, { ecmaVersion: 2021, sourceType: 'script' });
assert.equal(panel.includes('import.meta'), false);
report.formats.classic = { parse: 'ES2021 script', importMeta: false };

// Use native Node modules, including Buffer, rather than a virtual filesystem here.
for (const mode of ['browser-global', 'mixed-commonjs', 'node-only-commonjs']) {
  const context = vm.createContext({ module: { exports: {} } });
  context.window = context;
  const source = mode === 'node-only-commonjs' ? `(function(module){${vendor}\n})(module);` : vendor;
  if (mode === 'browser-global') delete context.module;
  vm.runInContext(source, context);
  if (mode === 'node-only-commonjs') assert.equal(context.Mp4Muxer, undefined);
  vm.runInContext(guard, context);
  assert.equal(typeof context.Mp4Muxer.Muxer, 'function');
  const target = new context.Mp4Muxer.ArrayBufferTarget();
  const muxer = new context.Mp4Muxer.Muxer({ target, video: { codec: 'avc', width: 16, height: 16 }, fastStart: 'in-memory' });
  muxer.addVideoChunkRaw(vm.runInContext('new Uint8Array([0,0,0,1,101,0])', context), 'key', 0, 41667,
    { decoderConfig: { codec: 'avc1.42001e', description: vm.runInContext('new Uint8Array([1,66,0,30,255,225,0,4,103,66,0,30,1,0,2,104,0])', context) } });
  muxer.finalize();
  assert.ok(target.buffer.byteLength > 0);
  if (context.module) assert.equal(context.module.exports.Muxer, context.Mp4Muxer.Muxer);
  report.muxer.push({ mode, bytes: target.buffer.byteLength });
}

// Load the existing AE model with this spike's Acorn dependency, without installing dev/ dependencies.
const modelContext = vm.createContext({ module: { exports: {} }, require: name => {
  assert.equal(name, 'acorn'); return { parse };
} });
vm.runInContext(fs.readFileSync(path.join(repo, 'dev/aeom.js'), 'utf8'), modelContext);
const env = modelContext.module.exports.makeEnv({ fonts: () => true });
const context = vm.createContext(env.ctx);
const host = fs.readFileSync(path.join(extension, 'jsx/host.jsx'), 'utf8');
const core = fs.readFileSync(path.join(extension, 'jsx/jizura_core.jsx'), 'utf8');
parse(host, { ecmaVersion: 3 }); parse(core, { ecmaVersion: 3 });
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'jizura-spike-'));
function file(filename) {
  return { fsName: filename, parent: { parent: { fsName: extension } },
    get exists() { return fs.existsSync(filename); },
    open() { return true; }, close() {},
    read() { return fs.readFileSync(filename, 'utf8'); },
    remove() { fs.unlinkSync(filename); return true; } };
}
context.File = file;
context.$ = { global: context, fileName: path.join(extension, 'jsx/host.jsx'),
  evalFile(f) { vm.runInContext(fs.readFileSync(f.fsName, 'utf8'), context); }, writeln() {}, sleep() {} };
try {
  vm.runInContext(host, context);
  const call = source => JSON.parse(vm.runInContext(source, context));
  assert.equal(call(`JZCEP.init(${JSON.stringify(extension)})`).ok, true);
  const planPath = path.join(temporary, '構成 plan.json');
  const planText = fs.readFileSync(path.join(repo, 'tests/baseline/v1/lrc-ja-ae-plan.json'), 'utf8');
  const plan = JSON.parse(planText);
  for (const mode of ['file', 'string']) {
    let start;
    if (mode === 'file') {
      fs.writeFileSync(planPath, planText, 'utf8');
      start = call(`JZCEP.startFromFile(${JSON.stringify(planPath)},0,false)`);
      assert.equal(fs.existsSync(planPath), false, 'host must remove the temporary plan');
    } else start = call(`JZCEP.startFromString(${JSON.stringify(encodeURIComponent(planText))},0,false)`);
    assert.equal(start.ok, true, JSON.stringify(start));
    let result;
    for (let i = 0; i < 100; i++) {
      result = call('JZCEP.step(1200)');
      assert.equal(result.ok, true, JSON.stringify(result));
      if (result.done) break;
    }
    assert.equal(result.done, true); assert.equal(result.cuts, plan.cuts.length); assert.equal(result.fallbacks, 0);
    report.host[mode] = { cuts: result.cuts, fallbacks: result.fallbacks };
  }
  // The save bridge uses NodeBuffer.from on a browser-created typed array.
  const browserBytes = vm.runInNewContext('new Uint8Array([0, 127, 128, 255])');
  const saved = path.join(temporary, 'saved.bin');
  fs.writeFileSync(saved, Buffer.from(browserBytes));
  assert.deepEqual([...fs.readFileSync(saved)], [0, 127, 128, 255]);
  assert.equal(env.stats.unknown.size, 0);
  assert.equal(env.stats.exprErrors.length, 0);
  assert.equal(env.stats.problems.length, 0);
  report.host.es3 = 'host + core parsed';
  report.host.nativeBufferSave = 'passed';
} finally { fs.rmSync(temporary, { recursive: true, force: true }); }
fs.writeFileSync(path.join(repo, 'dist/task02/node-results.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
