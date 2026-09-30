import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { parse } from 'acorn';
import { repo, routes } from '../vite.config.mts';

const require = createRequire(import.meta.url);
const read = (file: string): Promise<string> => readFile(path.join(repo, 'dist', file), 'utf8');
const version = (await readFile(path.join(repo, 'VERSION'), 'utf8')).trim();
const expectedLocales = ['ja', 'en', 'zh-Hant', 'zh-Hans', 'ko', 'id-ID', 'vi'];
const report = { version, web: 0, offline: 0, ae: 0, cep: 0, coreMock: [] as object[], evidence: 'Output structure + ES2021/ES3 parsing + Node AE model mock; no actual AE/CEP runtime' };

function htmlMetadata(html: string, language: string): void {
  assert.ok(html.includes(`<html lang="${language}">`));
  assert.equal((html.match(/rel="alternate"/g) || []).length, 7);
  assert.ok(html.includes(version), 'HTML must propagate VERSION');
  assert.ok(!html.includes('@VERSION@'));
}

async function localResources(html: string, directory: string): Promise<void> {
  const refs = [...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g)].map(match => match[1]);
  for (const ref of refs) {
    if (/^https?:/.test(ref)) continue; // Canonicals, alternates and optional Google Fonts preconnects.
    assert.ok(!ref.startsWith('/'), `Local artifact has an absolute resource: ${ref}`);
    await readFile(path.join(repo, 'dist', directory, ref));
  }
}

for (const [i, route] of routes.entries()) {
  const html = await read(path.posix.join('web', route, 'index.html'));
  htmlMetadata(html, expectedLocales[i]);
  assert.ok(/<script\b[^>]*type="module"/.test(html));
  assert.ok(html.includes('./mp4-muxer.js'));
  await readFile(path.join(repo, 'dist/web', route, 'mp4-muxer.js'));
  report.web++;

  const offline = await read(`offline/JIZURA${route ? '_' + route : ''}.html`);
  htmlMetadata(offline, expectedLocales[i]);
  assert.ok(!/<script\b[^>]*\bsrc=/.test(offline));
  assert.ok(!/<script\b[^>]*type="module"/.test(offline));
  assert.ok(!/<link\b[^>]*rel="stylesheet"/.test(offline));
  assert.ok(offline.includes('Copyright (c) 2023 Vanilagy'), 'Standalone HTML must carry the muxer license');
  for (const script of offline.matchAll(/<script>([\s\S]*?)<\/script>/g)) parse(script[1], { ecmaVersion: 2021, sourceType: 'script' });
  report.offline++;
}

for (const filename of await readdir(path.join(repo, 'dist/web/assets'))) {
  if (filename.endsWith('.js')) parse(await read(`web/assets/${filename}`), { ecmaVersion: 2021, sourceType: 'module' });
}

for (const file of ['ae/JIZURA_AE.jsx', 'ae/JIZURA_AE_en.jsx', 'ae/ja/jizura_core.jsx', 'ae/en/jizura_core.jsx']) {
  const source = await read(file);
  assert.ok(!/[^\x00-\x7f]/.test(source), 'AE assembly must preserve ASCII escaping');
  assert.ok(source.includes(version));
  parse(source.replace(/^#target.*\n/, ''), { ecmaVersion: 3 });
  report.ae++;
}

// Exercise both assembled/localized CEP cores against the unchanged version-2
// plan in the production host API. This is an AE object-model mock only.
const model = require(path.join(repo, 'dev/aeom.js'));
for (const language of ['ja', 'en']) {
  const id = 'com.852wa.jizura' + (language === 'en' ? '.en' : '');
  const directory = `cep/${id}`;
  const html = await read(`${directory}/index.html`);
  htmlMetadata(html, language);
  assert.ok(!html.includes('type="module"'));
  await localResources(html, directory);
  const panel = await read(`${directory}/panel.js`);
  assert.ok(!panel.includes('jizura_get_state'), 'CEP must exclude browser WebMCP');
  assert.ok(!panel.includes('import.meta'));
  for (const file of ['panel.js', 'mp4-muxer.js', 'muxer-guard.js']) parse(await read(`${directory}/${file}`), { ecmaVersion: 2021, sourceType: 'script' });
  const manifest = await read(`${directory}/CSXS/manifest.xml`);
  assert.ok(manifest.includes(`ExtensionBundleId="${id}"`));
  assert.ok(manifest.includes(`ExtensionBundleVersion="${version}"`));
  assert.ok(!manifest.includes('@VERSION@'));
  const host = await read(`${directory}/jsx/host.jsx`);
  const core = await read(`${directory}/jsx/jizura_core.jsx`);
  parse(host, { ecmaVersion: 3 }); parse(core, { ecmaVersion: 3 });
  const env = model.makeEnv({ fonts: () => true });
  const context = vm.createContext(env.ctx);
  const extension = path.join(repo, 'dist', directory);
  context.File = (filename: string) => ({ fsName: filename });
  context.$ = { global: context, fileName: path.join(extension, 'jsx/host.jsx'), writeln() {}, sleep() {} };
  vm.runInContext(core, context);
  vm.runInContext(host, context);
  const call = (code: string): { ok: boolean; done?: boolean; cuts?: number; fallbacks?: number } => JSON.parse(vm.runInContext(code, context));
  assert.equal(call(`JZCEP.init(${JSON.stringify(extension)})`).ok, true);
  const text = await readFile(path.join(repo, 'tests/baseline/v1/lrc-ja-ae-plan.json'), 'utf8');
  assert.equal(call(`JZCEP.startFromString(${JSON.stringify(encodeURIComponent(text))},0,false)`).ok, true);
  let result;
  for (let step = 0; step < 100; step++) {
    result = call('JZCEP.step(1200)');
    assert.equal(result.ok, true);
    if (result.done) break;
  }
  assert.ok(result?.done);
  assert.equal(result.cuts, JSON.parse(text).cuts.length);
  assert.equal(result.fallbacks, 0);
  assert.equal(env.stats.unknown.size, 0);
  assert.equal(env.stats.exprErrors.length, 0);
  assert.equal(env.stats.problems.length, 0);
  report.coreMock.push({ language, cuts: result.cuts, fallbacks: result.fallbacks });
  const zip = await readFile(path.join(repo, 'dist/cep', language === 'ja' ? 'JIZURA_CEP.zip' : 'JIZURA_CEP_en.zip'));
  assert.equal(zip.subarray(0, 2).toString(), 'PK');
  report.cep++;
}

for (const output of ['web', 'offline', 'ae', 'cep']) {
  assert.equal((await read(`${output}/VERSION`)).trim(), version);
}
console.log(JSON.stringify(report, null, 2));
