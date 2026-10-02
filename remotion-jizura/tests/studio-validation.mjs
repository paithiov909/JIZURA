// Run after scene-browser.mjs and a Studio server on port3107 (override via env).
import assert from 'node:assert/strict';
import {openBrowser} from '@remotion/renderer';
import {writeFile, readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
const out = path.resolve(import.meta.dirname, '../../dist/remotion/stage07');
const browser = await openBrowser('chrome', {browserExecutable: process.env.JIZURA_BROWSER ?? '/usr/bin/google-chrome'});
const expected = JSON.parse(await readFile(path.join(out, 'scene-result.json'), 'utf8')).exports.rgbaSHA256;
try {
  const page = await browser.newPage({context: () => null, logLevel: 'error', indent: false, pageIndex: 0, onBrowserLog: null, onLog: () => {}});
  await page.setViewport({width: 1280, height: 800, deviceScaleFactor: 2});
  await page.goto({url: `${process.env.JIZURA_STUDIO_URL ?? 'http://localhost:3107'}/LyricsDemo`, timeout: 30000});
  let prepared = false;
  for (let i = 0; i < 200; i++) {
    if (await page.evaluate(() => !!document.querySelector('canvas[data-jizura-ready="true"]') && !!window.remotion_setFrame)) {prepared = true; break;}
    await new Promise(r => setTimeout(r, 50));
  }
  assert.ok(prepared, 'Studio failed to prepare LyricsDemo');
  const records = [];
  for (const frame of [0, 19, 20, 39, 40, 59, 60, 61, 80, 110, 119, 3, 110]) {
    await page.evaluate(f => window.remotion_setFrame(f, 'LyricsDemo', 1), frame);
    await new Promise(r => setTimeout(r, 150));
    const record = await page.evaluate(() => {
      const c = document.querySelector('canvas[data-jizura-ready]');
      return c ? {image: c.toDataURL(), ready: c.dataset.jizuraReady, width: c.width, height: c.height, handles: window.remotion_delayRenderHandles?.length} : null;
    });
    assert.ok(record); assert.equal(record.ready, 'true'); assert.equal(record.handles, 0);
    assert.deepEqual([record.width, record.height], [640, 360]);
    const file = path.join(out, `studio-${frame}.png`);
    await writeFile(file, Buffer.from(record.image.split(',')[1], 'base64')); delete record.image;
    const pixels = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], {maxBuffer: 2 * 1024 * 1024});
    assert.equal(createHash('sha256').update(pixels).digest('hex'), expected[frame], `Studio differs at ${frame}`);
    records.push({frame, ...record, differentPixels: 0});
    if (frame === 80) {
      const shot = await page._client().send('Page.captureScreenshot', {format: 'png'});
      await writeFile(path.join(out, 'studio.png'), Buffer.from(shot.value.data, 'base64'));
    }
  }
  await writeFile(path.join(out, 'studio-result.json'), JSON.stringify(records, null, 2));
  console.log(`${records.length} Studio frames match direct/exported PNGs; repeat and Sequence boundary passed`);
} finally {await browser.close({silent: true});}
