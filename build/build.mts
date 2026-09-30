import { readFile, writeFile, mkdir, rm, copyFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { build } from 'vite';
import { repo, webConfig, classicConfig, routes } from '../vite.config.mts';
import { packageClassic, copyNotices } from './packaging.mts';

const dist = path.join(repo, 'dist');
const python = process.env.PYTHON || 'python3';
const run = (command: string, args: string[]): void => { execFileSync(command, args, { cwd: repo, stdio: 'inherit' }); };
const version = (await readFile(path.join(repo, 'VERSION'), 'utf8')).trim();
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('VERSION must be a CEP-compatible x.y.z version');
run(process.execPath, ['build/check-effects.mts']);
const selected = process.argv[2] || 'all';
if (!['all', 'web', 'offline', 'ae', 'cep'].includes(selected)) throw new Error(`Unknown target: ${selected}`);

async function reset(directory: string): Promise<void> {
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory, { recursive: true });
}

async function prepare(target: 'web' | 'offline' | 'cep', language?: 'ja' | 'en'): Promise<string> {
  const root = path.join(dist, '.inputs', target, language || '');
  await reset(root);
  run(python, ['build.py', '--out', root, '--vite-input', ...(language ? ['--lang', language] : []), ...(target === 'cep' ? ['--cep'] : [])]);
  return root;
}

async function web(): Promise<void> {
  const root = await prepare('web');
  await build(webConfig(root));
  // Vite leaves classic scripts outside its module graph. Copy the explicit,
  // source-controlled vendor to the corresponding local paths after bundling.
  for (const route of routes) {
    await copyFile(path.join(root, route, 'mp4-muxer.js'), path.join(dist, 'web', route, 'mp4-muxer.js'));
  }
  await copyFile(path.join(root, 'sitemap.xml'), path.join(dist, 'web/sitemap.xml'));
  await copyNotices(path.join(dist, 'web'));
  await writeFile(path.join(dist, 'web/VERSION'), version + '\n');
}

async function offline(): Promise<void> {
  const root = await prepare('offline');
  const out = path.join(dist, 'offline');
  await reset(out);
  for (const route of routes) {
    const input = path.join(root, route);
    const bundle = path.join(dist, '.bundles/offline', route || 'ja');
    const result = await build(classicConfig(input, bundle));
    if ('close' in result) throw new Error('Watch output is not a packaging input');
    await packageClassic(input, out, result, `JIZURA${route ? '_' + route : ''}.html`);
  }
  await copyNotices(out);
  await writeFile(path.join(out, 'VERSION'), version + '\n');
}

async function ae(): Promise<void> {
  const out = path.join(dist, 'ae');
  await reset(out);
  const data = path.join(dist, '.inputs/ae/data.json');
  run(process.execPath, ['tools/export_ae_data.js', '--out', data]);
  for (const language of ['ja', 'en']) {
    run(python, ['build_ae.py', '--lang', language, '--data', data, '--out', path.join(out, language === 'ja' ? 'JIZURA_AE.jsx' : 'JIZURA_AE_en.jsx')]);
    run(python, ['build_ae.py', '--lang', language, '--data', data, '--core', '--out', path.join(out, language, 'jizura_core.jsx')]);
  }
  await copyNotices(out);
  await writeFile(path.join(out, 'VERSION'), version + '\n');
}

async function cep(): Promise<void> {
  // CEP always rebuilds its two cores from source rather than consuming a stale
  // dist/ae or a tracked root JSX. It can be built independently of build:ae.
  const out = path.join(dist, 'cep');
  await reset(out);
  const data = path.join(dist, '.inputs/cep/data.json');
  run(process.execPath, ['tools/export_ae_data.js', '--out', data]);
  for (const language of ['ja', 'en'] as const) {
    const root = await prepare('cep', language);
    const input = path.join(root, language === 'ja' ? '' : 'en');
    const panel = path.join(dist, '.bundles/cep', language);
    const result = await build(classicConfig(input, panel));
    if ('close' in result) throw new Error('Watch output is not a packaging input');
    await packageClassic(input, panel, result);
    await copyNotices(panel);
    const core = path.join(dist, '.bundles/cep', language + '-core.jsx');
    run(python, ['build_ae.py', '--lang', language, '--data', data, '--core', '--out', core]);
    run(python, ['build_cep.py', '--lang', language, '--out', out, '--panel-dir', panel, '--core-source', core]);
  }
  await writeFile(path.join(out, 'VERSION'), version + '\n');
}

for (const [name, buildTarget] of Object.entries({ web, offline, ae, cep })) {
  if (selected === 'all' || selected === name) {
    await buildTarget();
    console.log(`Built ${name} v${version} -> dist/${name}/`);
  }
}
