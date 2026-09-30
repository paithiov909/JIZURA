// Compatibility CLI for old developer commands; localization lives in i18n/.
import { parseArgs } from 'node:util';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { build } from 'vite';
import { repo, classicConfig } from '../vite.config.mts';
import { prepareBrowser } from './prepare-browser.mts';
import { packageClassic, classicOutput } from './packaging.mts';
import { EDITIONS, type LocaleCode } from '../i18n/index.ts';

const { values } = parseArgs({ options: { out: { type: 'string', default: '.' }, lang: { type: 'string' }, 'vite-input': { type: 'boolean' }, cep: { type: 'boolean' }, dev: { type: 'boolean' } } });
if (values.lang && !EDITIONS.some(locale => locale.code === values.lang)) throw new Error('Unknown locale: ' + values.lang);
if (values.cep && (!values['vite-input'] || !['ja', 'en'].includes(values.lang!))) throw new Error('--cep requires --vite-input and --lang ja/en');
const version = (await readFile(path.join(repo, 'VERSION'), 'utf8')).trim();
const output = path.resolve(values.out!);
const temporary = values['vite-input'] ? output : await mkdtemp(path.join(os.tmpdir(), 'jizura-cli-'));
try {
  await prepareBrowser(temporary, version, values.lang as LocaleCode | undefined, values.cep);
  if (!values['vite-input']) {
    await mkdir(output, { recursive: true });
    for (const locale of EDITIONS) {
      if (values.lang && values.lang !== locale.code) continue;
      const input = path.join(temporary, locale.folder);
      const config = classicConfig(input, path.join(temporary, '.bundle', locale.code));
      config.build!.write = false;
      const result = await build(config);
      if ('close' in result) throw new Error('Unexpected watcher');
      await packageClassic(input, path.join(output, locale.folder), result, 'index.html');
    }
    await writeFile(path.join(output, 'sitemap.xml'), await readFile(path.join(temporary, 'sitemap.xml')));
  }
  if (values.dev) {
    const devInput = await mkdtemp(path.join(os.tmpdir(), 'jizura-dev-'));
    try {
      await prepareBrowser(devInput, version, 'ja');
      const config = classicConfig(devInput, path.join(devInput, '.bundle'));
      config.build!.write = false;
      const result = await build(config);
      if ('close' in result) throw new Error('Unexpected watcher');
      const script = classicOutput(result).code;
      const devOutput = path.join(output, 'dev/www');
      await mkdir(devOutput, { recursive: true });
      await writeFile(path.join(devOutput, 'jizura.js'), script);
      await writeFile(path.join(devOutput, 'test.html'), await readFile(path.join(repo, 'dev/test.html')));
    } finally { await rm(devInput, { recursive: true, force: true }); }
  }
} finally { if (!values['vite-input']) await rm(temporary, { recursive: true, force: true }); }
