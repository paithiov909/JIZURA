// Run after review-browser.mjs, with Studio on port3109. The source is restored.
// Exercises the Studio save backend, not a simulated codemod or a UI button click.
import assert from 'node:assert/strict';
import {openBrowser} from '@remotion/renderer';
import {readFile, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
const repo = path.resolve(import.meta.dirname, '../..'), out = path.join(repo, 'dist/remotion/stage08');
const rootFile = path.join(repo, 'remotion-jizura/examples/StudioRoot.tsx');
const original = await readFile(rootFile, 'utf8');
const report = JSON.parse(await readFile(path.join(out, 'review-result.json'), 'utf8'));
const url = process.env.JIZURA_STUDIO_URL ?? 'http://localhost:3109';
const browser = await openBrowser('chrome', {browserExecutable: process.env.JIZURA_BROWSER ?? '/usr/bin/google-chrome'});
const hash = b => createHash('sha256').update(b).digest('hex');
const rgba = file => execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], {maxBuffer: 2 * 1024 * 1024});
const api = async (route, input) => {
  const response = await fetch(`${url}/api/${route}`, {method: 'POST', headers: {'Content-Type': 'application/json', Origin: new URL(url).origin}, body: JSON.stringify(input)});
  const result = await response.json();
  assert.ok(response.ok && result.success, `Studio ${route}: HTTP${response.status} ${JSON.stringify(result)}`); return result.data;
};
let wroteSource = false;
let lastSaved;
try {
  const {projectInfo: info} = await api('project-info', {});
  assert.equal(info.rootFile, rootFile);
  const page = await browser.newPage({context: () => null, logLevel: 'error', indent: false, pageIndex: 0, onBrowserLog: null, onLog: () => {}});
  await page.setViewport({width: 1280, height: 800, deviceScaleFactor: 2});
  await page.goto({url: `${url}/ReviewWorkbench`, timeout: 30000});
  await until(async () => page.evaluate(() => !!document.querySelector('canvas[data-jizura-ready="true"]') && !!window.remotion_setFrame));
  await page.evaluate(() => window.remotion_setFrame(24, 'ReviewWorkbench', 1));
  await new Promise(resolve => setTimeout(resolve, 150));
  const initial = await page.evaluate(() => document.querySelector('canvas[data-jizura-ready="true"]').toDataURL());
  const initialFile = path.join(out, 'studio-initial-24.png');
  await writeFile(initialFile, Buffer.from(initial.split(',')[1], 'base64'));
  assert.equal(hash(rgba(initialFile)), report.candidates.find(c => c.name === 'combined').pngs.find(p => p.frame === 24).rgbaSHA256);
  const records = [];
  for (const name of ['combined', 'edited', 'combined']) {
    const inputProps = JSON.parse(await readFile(path.join(out, `${name}.json`), 'utf8'));
    assert.equal(await readFile(rootFile, 'utf8'), name === 'combined' && records.length === 0 ? original : lastSaved);
    const saved = await api('update-default-props', {compositionId: 'ReviewWorkbench', defaultProps: JSON.stringify(inputProps), enumPaths: []});
    assert.equal(saved.success, true, JSON.stringify(saved)); wroteSource = true;
    lastSaved = await readFile(rootFile, 'utf8');
    assert.match(lastSaved, new RegExp(`(?:["']name["']|name)\\s*:\\s*["']${name}["']`), 'Studio did not write input name');
    // Reload Studio to prove the saved source is used, not transient props state.
    await page.goto({url: `${url}/ReviewWorkbench`, timeout: 30000});
    await until(async () => page.evaluate(() => !!document.querySelector('canvas[data-jizura-ready="true"]') && !!window.remotion_setFrame));
    for (const frame of [24, 84, 6, 112, 24]) {
      await page.evaluate(f => window.remotion_setFrame(f, 'ReviewWorkbench', 1), frame);
      await new Promise(resolve => setTimeout(resolve, 150));
      const image = await page.evaluate(() => {
        const c = document.querySelector('canvas[data-jizura-ready="true"]');
        return {png: c?.toDataURL(), handles: window.remotion_delayRenderHandles.length};
      });
      assert.equal(image.handles, 0); assert.ok(image.png);
      const file = path.join(out, `studio-${records.length}-${name}-${frame}.png`);
      await writeFile(file, Buffer.from(image.png.split(',')[1], 'base64'));
      const expected = report.candidates.find(c => c.name === name).pngs.find(p => p.frame === frame).rgbaSHA256;
      assert.equal(hash(rgba(file)), expected, `Studio saved source mismatch ${name}/${frame}`);
    }
    records.push({name, frames: [24, 84, 6, 112, 24], saved: true, reloaded: true, differentPixels: 0, sourceSHA256: hash(lastSaved)});
    const shot = await page._client().send('Page.captureScreenshot', {format: 'png'});
    await writeFile(path.join(out, `studio-${name}.png`), Buffer.from(shot.value.data, 'base64'));
  }
  await writeFile(path.join(out, 'studio-review-result.json'), JSON.stringify({rootFile: info.relativeRootFile, initialDefault: {candidate: 'combined', frame: 24, differentPixels: 0}, records, method: 'Studio backend save + source read + full page reload + PNG comparison', uiSaveButtonTested: false}, null, 2));
  console.log('Studio: combined → edited → combined persisted to source; 15 reloaded frames match PNGs');
} finally {
  try {
    if (wroteSource) {
      assert.equal(await readFile(rootFile, 'utf8'), lastSaved, 'Source changed during test; refusing to overwrite concurrent edits');
      await writeFile(rootFile, original);
    }
  } finally {await browser.close({silent: true});}
}
async function until(fn) {for (let i = 0; i < 200; i++) {if (await fn()) return; await new Promise(resolve => setTimeout(resolve, 50));} throw new Error('Studio preparation timeout');}
