// Run from the repository root after building the package. Fonts stay in dist.
import {build} from 'vite';
import {openBrowser} from '@remotion/renderer';
import {createServer} from 'node:http';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const repo = path.resolve(import.meta.dirname, '../..');
const out = path.join(repo, 'dist/remotion/stage04');
await mkdir(out, {recursive: true});
const fontPath = path.join(out, 'assets/NotoSansJP.ttf');
const fontData = await readFile(fontPath);
await build({configFile: false, root: repo, publicDir: false, logLevel: 'warn', define: {'process.env.NODE_ENV': '"development"'}, build: {
  outDir: path.join(out, 'browser'), emptyOutDir: true, target: 'chrome88',
  lib: {entry: path.join(repo, 'remotion-jizura/tests/browser-entry.jsx'), formats: ['iife'], name: 'CanvasTest', fileName: () => 'test.js'},
}});
const bundle = await readFile(path.join(out, 'browser/test.js'));
const server = createServer((req, res) => {
  if (req.url === '/slow-font.ttf') { const timer = setTimeout(() => {res.writeHead(200, {'Content-Type': 'font/ttf'}); res.end(fontData);}, 3000); res.on('close', () => clearTimeout(timer)); return; }
  if (req.url === '/NotoSansJP.ttf') {res.writeHead(200, {'Content-Type': 'font/ttf'}); res.end(fontData); return;}
  if (req.url === '/bad-font.ttf') {res.end('invalid font data'); return;}
  if (req.url === '/test.js') {res.writeHead(200, {'Content-Type': 'text/javascript'}); res.end(bundle); return;}
  if (req.url === '/') {res.end('<!doctype html><meta charset="utf-8"><script src="/test.js"></script>'); return;}
  res.writeHead(404); res.end();
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await openBrowser('chrome', {browserExecutable: process.env.JIZURA_BROWSER ?? '/usr/bin/google-chrome'});
  const page = await browser.newPage({context: () => null, logLevel: 'error', indent: false, pageIndex: 0, onBrowserLog: null, onLog: () => {}});
  await page.setViewport({width: 1280, height: 800, deviceScaleFactor: 2});
  await page.goto({url: `http://127.0.0.1:${server.address().port}/`, timeout: 30000});
  for (let i = 0; i < 100 && !await page.evaluate(() => typeof window.runCanvasChecks === 'function'); i++) await new Promise(resolve => setTimeout(resolve, 50));
  const report = await page.evaluate(() => window.runCanvasChecks());
  for (const c of report.cases) for (const kind of ['target', 'reference', 'boxes']) {
    await writeFile(path.join(out, `${c.variant}-${kind}.png`), Buffer.from(c[kind].split(',')[1], 'base64'));
    delete c[kind];
  }
  report.fontSHA256 = createHash('sha256').update(fontData).digest('hex');
  report.browser = await page.evaluate(() => navigator.userAgent);
  report.dpr = 2; report.fps = 24; report.frame = 0; report.motionFps = null;
  report.reference = 'ui/services/fonts.js + engine/text.ts; horizontal/typeset=false, emphasis color adapter, no center reflow/effects';
  await writeFile(path.join(out, 'browser-result.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { if (browser) await browser.close({silent: true}); await new Promise(resolve => server.close(resolve)); }
