// Actual Studio persistence/reload/seek. Backend save, not a UI Save-button test.
import assert from 'node:assert/strict';
import {openBrowser, selectComposition, renderStill} from '@remotion/renderer';
import {bundle} from '@remotion/bundler';
import {readFile, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {requirePixels} from './port-metrics.mjs';
const repo = path.resolve(import.meta.dirname, '../..'), parent = path.join(repo, 'dist/remotion/stage14');
const out = (await readFile(path.join(parent, 'latest-run.txt'), 'utf8')).trim();
const report = JSON.parse(await readFile(path.join(out, 'result.json')));
assert.equal(report.status, 'passed');
const rootFile = path.join(repo, 'remotion-jizura/examples/StudioRoot.tsx'), original = await readFile(rootFile, 'utf8');
const url = process.env.JIZURA_STUDIO_URL ?? 'http://localhost:3114';
const api = async (route, input) => {
  const response = await fetch(`${url}/api/${route}`, {method: 'POST', headers: {'Content-Type': 'application/json', Origin: new URL(url).origin}, body: JSON.stringify(input)});
  const result = await response.json(); assert.ok(response.ok && result.success, `Studio ${route}: ${JSON.stringify(result)}`); return result.data;
};
const browserExecutable = process.env.JIZURA_BROWSER ?? '/usr/bin/google-chrome', chromiumOptions = {gl: 'swangle'};
const browser = await openBrowser('chrome', {browserExecutable, chromiumOptions});
const rgba = file => execFileSync('ffmpeg', ['-v', 'error', '-threads', '1', '-i', file, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], {maxBuffer: 2 * 1024 * 1024});
let lastSaved = original;
async function until(fn) {for (let i = 0; i < 500; i++) {if (await fn()) return; await new Promise(r => setTimeout(r, 20));} throw new Error('Studio loop timeout');}
try {
  const {projectInfo} = await api('project-info', {}); assert.equal(projectInfo.rootFile, rootFile);
  const page = await browser.newPage({context: () => null, logLevel: 'error', indent: false, pageIndex: 0, onBrowserLog: null, onLog: () => {}});
  await page.setViewport({width: 1280, height: 900, deviceScaleFactor: 1});
  const records = [];
  for (const name of ['original', 'arrival-slower', 'rise-center', 'finale-window', 'revised', 'original']) {
    const inputProps = JSON.parse(await readFile(path.join(out, `${name}-props.json`), 'utf8'));
    assert.equal(await readFile(rootFile, 'utf8'), lastSaved, 'Concurrent source edit');
    const saved = await api('update-default-props', {compositionId: 'ReviewLoop', defaultProps: JSON.stringify(inputProps), enumPaths: []});
    assert.equal(saved.success, true); lastSaved = await readFile(rootFile, 'utf8');
    assert.match(lastSaved, new RegExp(`(?:["']name["']|name)\\s*:\\s*["']${name}["']`));
    const t = performance.now();
    await page.goto({url: `${url}/ReviewLoop`, timeout: 30000});
    await until(() => page.evaluate(() => !!document.querySelector('canvas[data-jizura-ready="true"]') && !!window.remotion_setFrame));
    const reloadReadyMs = performance.now() - t, pngs = [];
    for (const frame of [84, 180, 240]) {
      await page.evaluate(f => window.remotion_setFrame(f, 'ReviewLoop', 1), frame);
      await page.evaluate(async () => {for (let i = 0; i < 6; i++) await new Promise(r => requestAnimationFrame(r));});
      const state = await page.evaluate(() => ({png: document.querySelector('canvas')?.toDataURL(), handles: window.remotion_delayRenderHandles.length}));
      assert.equal(state.handles, 0); assert.ok(state.png);
      const file = path.join(out, `studio-${records.length}-${name}-${frame}.png`);
      await writeFile(file, Buffer.from(state.png.split(',')[1], 'base64'));
      pngs.push({frame, file: path.basename(file), comparison: requirePixels(rgba(file), rgba(path.join(out, `${name}-${frame}.png`)), 'raw', `Studio ${name}/${frame}`)});
    }
    // Independent bundle proves persisted code feeds a new render, not preview state.
    const serveUrl = await bundle({entryPoint: path.join(repo, 'remotion-jizura/examples/studio-entry.tsx'), outDir: path.join(out, `studio-bundle-${records.length}`), publicDir: path.join(repo, 'dist/remotion/stage04/assets')});
    const common = {serveUrl, browserExecutable, chromiumOptions, puppeteerInstance: browser, logLevel: 'error'};
    const composition = await selectComposition({...common, id: 'ReviewLoop'});
    assert.deepEqual(composition.props.input, inputProps.input);
    const file = path.join(out, `saved-source-${records.length}-${name}.png`);
    await renderStill({...common, composition, frame: 240, imageFormat: 'png', output: file});
    requirePixels(rgba(file), rgba(path.join(out, `${name}-240.png`)), 'raw', 'saved source render');
    records.push({name, pngs, reloadReadyMs, saved: true, reloaded: true, freshBundleUsesSavedSource: true});
    console.log(`Studio ${name}: saved, reloaded, 3 PNGs and independent bundle match`);
    if (name === 'revised') {
      const shot = await page._client().send('Page.captureScreenshot', {format: 'png'});
      await writeFile(path.join(out, 'studio-ui.png'), Buffer.from(shot.value.data, 'base64'));
    }
  }
  await writeFile(path.join(out, 'studio-result.json'), JSON.stringify({records, method: 'actual update-default-props backend + source read + full reload + seek + fresh bundle/default-props render', uiSaveButtonTested: false, sourceRestored: true}, null, 2) + '\n');
} finally {
  try {assert.equal(await readFile(rootFile, 'utf8'), lastSaved, 'Refusing to overwrite concurrent edit'); await writeFile(rootFile, original);}
  finally {await browser.close({silent: true});}
}
