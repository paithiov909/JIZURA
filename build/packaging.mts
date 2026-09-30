import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import type { Rolldown } from 'vite';
import { repo } from '../vite.config.mts';

export async function copyNotices(outDir: string): Promise<void> {
  await mkdir(outDir, { recursive: true });
  for (const file of ['LICENSE', 'THIRD_PARTY_NOTICES.md']) {
    await copyFile(path.join(repo, file), path.join(outDir, file));
  }
  await copyFile(path.join(repo, 'vendor/LICENSE.mp4-muxer.txt'), path.join(outDir, 'LICENSE.mp4-muxer.txt'));
  await copyFile(path.join(repo, 'node_modules/vite/LICENSE.md'), path.join(outDir, 'LICENSE.vite.txt'));
}

export function classicOutput(result: Rolldown.RolldownOutput | Rolldown.RolldownOutput[]): { code: string; css: string; cssFile: string } {
  const outputs = (Array.isArray(result) ? result : [result]).flatMap(item => item.output);
  const chunks = outputs.filter(item => item.type === 'chunk');
  if (chunks.length !== 1 || chunks[0].imports.length || chunks[0].dynamicImports.length || chunks[0].code.includes('import.meta')) {
    throw new Error('Classic output must be one self-contained IIFE without import.meta');
  }
  const assets = outputs.filter(item => item.type === 'asset');
  if (assets.length !== 1 || !assets[0].fileName.endsWith('.css')) {
    throw new Error('Classic output expects only embedded assets and one CSS file');
  }
  const css = assets[0];
  return { code: chunks[0].code, css: typeof css.source === 'string' ? css.source : new TextDecoder().decode(css.source), cssFile: css.fileName };
}

export const inlineScript = (source: string): string => `<script>${source.replace(/<\/script/gi, '<\\/script')}</script>`;

export async function packageClassic(input: string, outDir: string, result: Rolldown.RolldownOutput | Rolldown.RolldownOutput[], offlineName?: string): Promise<void> {
  const { code, css, cssFile } = classicOutput(result);
  const template = await readFile(path.join(input, 'index.html'), 'utf8');
  const vendor = await readFile(path.join(input, 'mp4-muxer.js'), 'utf8');
  const guard = await readFile(path.join(repo, 'build/muxer-guard.js'), 'utf8');
  const vendorTag = '<script src="./mp4-muxer.js"></script>';
  const entryTag = '<script type="module" src="./entry.ts"></script>';
  if (!template.includes(vendorTag) || !template.includes(entryTag)) throw new Error('Missing classic template slots');
  let html: string;
  await mkdir(outDir, { recursive: true });
  if (offlineName) {
    const license = await readFile(path.join(repo, 'vendor/LICENSE.mp4-muxer.txt'), 'utf8');
    html = template.replace(vendorTag, () => inlineScript('/*!\n' + license + '\n*/\n' + vendor) + inlineScript(guard))
      .replace(entryTag, () => inlineScript(code))
      .replace('</head>', () => `<style>${css.replace(/<\/style/gi, '<\\/style')}</style></head>`);
  } else {
    html = template.replace(vendorTag, () => vendorTag + '\n<script src="./muxer-guard.js"></script>')
      .replace(entryTag, '<script src="./panel.js"></script>')
      .replace('</head>', () => `<link rel="stylesheet" href="./${cssFile}"></head>`);
    await writeFile(path.join(outDir, 'mp4-muxer.js'), vendor);
    await writeFile(path.join(outDir, 'muxer-guard.js'), guard);
  }
  await writeFile(path.join(outDir, offlineName || 'index.html'), html);
}
