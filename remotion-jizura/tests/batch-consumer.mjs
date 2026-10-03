// Actual external installation via the existing gate, then the new public
// layout/motion/decor example with strict types and matching lossless PNGs.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile, writeFile, cp, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {bundle} from '@remotion/bundler';
import {openBrowser, selectComposition, renderStill, renderMedia} from '@remotion/renderer';
import path from 'node:path';
const repo = path.resolve(import.meta.dirname, '../..'), out = path.join(repo, 'dist/remotion/stage13');
await mkdir(out, {recursive: true});
const log = execFileSync(process.execPath, [path.join(import.meta.dirname, 'consumer-validation.mjs')], {cwd: repo, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024});
await writeFile(path.join(out, 'legacy-consumer.log'), log);
const legacy = JSON.parse(await readFile(path.join(repo, 'dist/remotion/stage07/consumer-result.json'), 'utf8'));
const {consumer} = legacy;
await cp(path.join(repo, 'remotion-jizura/examples/batch/FirstEffectBatch.tsx'), path.join(consumer, 'FirstEffectBatch.tsx'));
await cp(path.join(repo, 'remotion-jizura/tests/batch-types.tsx'), path.join(consumer, 'batch-types.tsx'));
await writeFile(path.join(consumer, 'batch-entry.tsx'), `import {Composition,registerRoot} from 'remotion';
import {FirstEffectBatch} from './FirstEffectBatch.tsx';
registerRoot(()=><Composition id="FirstEffectBatch" component={FirstEffectBatch} defaultProps={{candidate:'combined',amount:1,rotAmp:6}} width={640} height={360} fps={24} durationInFrames={60}/>);
`);
execFileSync(path.join(consumer, 'node_modules/.bin/tsc'), ['-p', 'tsconfig.json'], {cwd: consumer, stdio: 'pipe'});
await writeFile(path.join(consumer, 'batch-render.mjs'), `import {bundle} from '@remotion/bundler';
import {openBrowser,selectComposition,renderStill} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
const browserExecutable=process.env.JIZURA_BROWSER??'/usr/bin/google-chrome';
const serveUrl=await bundle({entryPoint:new URL('./batch-entry.tsx',import.meta.url).pathname,outDir:new URL('./batch-bundle',import.meta.url).pathname,publicDir:new URL('./public',import.meta.url).pathname});
const results=[], browser=await openBrowser('chrome',{browserExecutable,chromiumOptions:{gl:null}});
try {for(const candidate of ['mixed','slideLeft','shrink','jitter','brackets','combined']) {
 const inputProps={candidate};const composition=await selectComposition({serveUrl,id:'FirstEffectBatch',browserExecutable,inputProps,puppeteerInstance:browser});
 for(const frame of [1,6,24,54,59]) {
  const output=new URL('./batch-'+candidate+'-'+frame+'.png',import.meta.url).pathname;
  await renderStill({serveUrl,composition,browserExecutable,inputProps,frame,output,imageFormat:'png',puppeteerInstance:browser,logLevel:'error'});
  const pixels=execFileSync('ffmpeg',['-v','error','-threads','1','-i',output,'-frames:v','1','-f','rawvideo','-pix_fmt','rgba','-'],{maxBuffer:2*1024*1024});
  results.push({candidate,frame,output,rgbaSHA256:createHash('sha256').update(pixels).digest('hex')});
 }
}}finally{await browser.close({silent:true});}
await writeFile(new URL('./batch-render-result.json',import.meta.url),JSON.stringify(results,null,2));
`);
const renderLog = execFileSync(process.execPath, ['batch-render.mjs'], {cwd: consumer, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024});
await writeFile(path.join(out, 'batch-consumer-render.log'), renderLog);
const frames = JSON.parse(await readFile(path.join(consumer, 'batch-render-result.json'), 'utf8'));
const browserExecutable = process.env.JIZURA_BROWSER ?? '/usr/bin/google-chrome';
const serveUrl = await bundle({entryPoint: path.join(repo, 'remotion-jizura/examples/index.tsx'), outDir: path.join(out, 'example-bundle'), publicDir: path.join(repo, 'dist/remotion/stage04/assets')});
const browser = await openBrowser('chrome', {browserExecutable, chromiumOptions: {gl: null}});
const localFrames = [], videos = [];
try {
  for (const candidate of ['mixed','slideLeft','shrink','jitter','brackets','combined']) {
    const inputProps = {candidate}, common = {serveUrl, browserExecutable, puppeteerInstance: browser, chromiumOptions: {gl: null}, logLevel: 'error'};
    const composition = await selectComposition({...common, id: 'FirstEffectBatch', inputProps});
    for (const record of frames.filter(f => f.candidate === candidate)) {
      const output = path.join(out, `example-${candidate}-${record.frame}.png`);
      await renderStill({...common, composition, inputProps, frame: record.frame, output, imageFormat: 'png'});
      const pixels = execFileSync('ffmpeg', ['-v','error','-threads','1','-i',output,'-frames:v','1','-f','rawvideo','-pix_fmt','rgba','-'], {maxBuffer: 2*1024*1024});
      assert.equal(createHash('sha256').update(pixels).digest('hex'), record.rgbaSHA256, `External batch differs ${candidate}/${record.frame}`);
      localFrames.push({...record, local: path.relative(repo, output), differentPixels: 0});
    }
    const outputLocation = path.join(out, `${candidate}.mp4`);
    await renderMedia({...common, composition, inputProps, outputLocation, concurrency: 1, codec: 'h264', crf: 1, pixelFormat: 'yuv444p'});
    const stream = JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=width,height,nb_frames,duration','-of','json',outputLocation],{encoding:'utf8'})).streams[0];
    assert.equal(Number(stream.nb_frames),60);
    const decoded = execFileSync('ffmpeg',['-v','error','-threads','1','-i',outputLocation,'-f','rawvideo','-pix_fmt','rgb24','-'], {maxBuffer:64*1024*1024});
    assert.equal(decoded.length,640*360*3*60);
    execFileSync('ffmpeg',['-v','error','-threads','1','-i',outputLocation,'-vf','select=eq(n\\,1)+eq(n\\,6)+eq(n\\,24)+eq(n\\,54)+eq(n\\,59),scale=320:-1,tile=5x1','-frames:v','1',path.join(out,`${candidate}-filmstrip.png`)]);
    videos.push({candidate, outputLocation, ...stream, fullyDecoded: true, concurrency: 1, lossless: false, sampleFrames: [1,6,24,54,59]});
    console.log(`External/local example: ${candidate}, 5 PNG exact, 60-frame movie decoded`);
  }
} finally {await browser.close({silent: true});}
await writeFile(path.join(out, 'batch-consumer-result.json'), JSON.stringify({consumer, tarball: legacy.tarball, workspaceLink: false, typecheck: true,
  importsChecked: legacy.importsChecked, deepImportsRejected: legacy.deepImportsRejected, legacyFrames: legacy.frames.length, frames: localFrames, differentPixels: 0, videos}, null, 2));
