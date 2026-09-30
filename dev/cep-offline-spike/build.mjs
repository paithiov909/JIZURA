import { build } from 'vite';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));
const repo = path.resolve(root, '../..');
const out = path.join(repo, 'dist/task02');
const template = await readFile(path.join(root, 'index.html'), 'utf8');
const vendor = await readFile(path.join(repo, 'vendor/mp4-muxer.min.js'), 'utf8');
const guard = await readFile(path.join(root, 'muxer-guard.js'), 'utf8');
const common = { root, configFile: false, base: './', publicDir: false, logLevel: 'warn' };

for (const [name, target] of [['vite-default', undefined], ['vite-chrome88', 'chrome88']]) {
  await build({ ...common, build: {
    outDir: path.join(out, name), emptyOutDir: true, assetsInlineLimit: 0,
    ...(target ? { target, cssTarget: target } : {}),
  } });
  console.log(`built ${name}: relative-base Vite HTML / ES modules`);
}

const cepOut = path.join(out, 'cep/com.852wa.jizura.spike');
const result = await build({ ...common, build: {
  outDir: cepOut, emptyOutDir: true, target: 'chrome88', cssTarget: 'chrome88',
  lib: { entry: path.join(root, 'entry.ts'), name: 'JizuraSpike', formats: ['iife'],
    fileName: () => 'panel.js', cssFileName: 'panel' },
} });
const outputs = (Array.isArray(result) ? result : [result]).flatMap(item => item.output);
const chunks = outputs.filter(item => item.type === 'chunk');
if (chunks.length !== 1 || chunks[0].imports.length || chunks[0].dynamicImports.length) {
  throw new Error('Classic target must be one self-contained chunk');
}
const css = outputs.find(item => item.type === 'asset' && item.fileName.endsWith('.css'));
if (!css) throw new Error('Expected a CSS asset');
const styles = typeof css.source === 'string' ? css.source : new TextDecoder().decode(css.source);
const classicHtml = template.replace('<script type="module" src="./entry.ts"></script>',
  '<script src="./mp4-muxer.js"></script>\n<script src="./muxer-guard.js"></script>\n<script src="./panel.js"></script>')
  .replace('</head>', () => `<link rel="stylesheet" href="./${css.fileName}"></head>`);
await writeFile(path.join(cepOut, 'index.html'), classicHtml);
await writeFile(path.join(cepOut, 'mp4-muxer.js'), vendor);
await writeFile(path.join(cepOut, 'muxer-guard.js'), guard);
await mkdir(path.join(cepOut, 'CSXS'), { recursive: true });
await mkdir(path.join(cepOut, 'jsx'), { recursive: true });
const version = (await readFile(path.join(repo, 'VERSION'), 'utf8')).trim();
const manifest = (await readFile(path.join(repo, 'cep/manifest.xml'), 'utf8'))
  .replaceAll('@VERSION@', version).replaceAll('com.852wa.jizura', 'com.852wa.jizura.spike')
  .replace('<Menu>JIZURA 字面</Menu>', '<Menu>JIZURA task 02 spike</Menu>');
await writeFile(path.join(cepOut, 'CSXS/manifest.xml'), manifest);
await copyFile(path.join(repo, 'cep/host.jsx'), path.join(cepOut, 'jsx/host.jsx'));
execFileSync('python3', ['build_ae.py', '--core', '--lang', 'ja', '--out', path.join(cepOut, 'jsx/jizura_core.jsx')],
  { cwd: repo, stdio: 'inherit' });
console.log('built CEP: chrome88 IIFE, local CSS/vendor, production host + Japanese core');

// Vite library mode embeds imported images as data URLs. Only HTML/CSS/JS need packaging.
const inlineScript = source => `<script>${source.replace(/<\/script/gi, '<\\/script')}</script>`;
const offline = template.replace('<script type="module" src="./entry.ts"></script>',
  () => inlineScript(vendor) + inlineScript(guard) + inlineScript(chunks[0].code))
  .replace('</head>', () => `<style>${styles}</style></head>`);
await mkdir(path.join(out, 'offline'), { recursive: true });
await writeFile(path.join(out, 'offline/JIZURA-spike.html'), offline);
console.log('built offline: one HTML file with inline classic JS/CSS/image/vendor');
