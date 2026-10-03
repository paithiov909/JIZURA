// Install/validate the public tarball using the established consumer gate first,
// then compile and render caller-owned custom definitions from that installation.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile, writeFile, cp, mkdir} from 'node:fs/promises';
import path from 'node:path';
const repo = path.resolve(import.meta.dirname, '../..'), out = path.join(repo, 'dist/remotion/stage09');
await mkdir(out, {recursive: true});
const log = execFileSync(process.execPath, [path.join(import.meta.dirname, 'consumer-validation.mjs')], {cwd: repo, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024});
await writeFile(path.join(out, 'legacy-consumer.log'), log);
const legacy = JSON.parse(await readFile(path.join(repo, 'dist/remotion/stage07/consumer-result.json'), 'utf8'));
const {consumer} = legacy;
for (const file of ['effects.tsx', 'CustomEffects.tsx']) await cp(path.join(repo, 'remotion-jizura/examples/custom', file), path.join(consumer, file));
await cp(path.join(repo, 'remotion-jizura/tests/custom-types.tsx'), path.join(consumer, 'custom-types.tsx'));
await writeFile(path.join(consumer, 'custom-entry.tsx'), `import {Composition,registerRoot} from 'remotion';
import {CustomEffects} from './CustomEffects.tsx';
registerRoot(()=><Composition id="CustomEffects" component={CustomEffects} defaultProps={{amplitude:12}} width={640} height={360} fps={24} durationInFrames={120}/>);
`);
execFileSync(path.join(consumer, 'node_modules/.bin/tsc'), ['-p', 'tsconfig.json'], {cwd: consumer, stdio: 'pipe'});
await writeFile(path.join(consumer, 'custom-render.mjs'), `import {bundle} from '@remotion/bundler';
import {selectComposition,renderStill} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
const browserExecutable=process.env.JIZURA_BROWSER??'/usr/bin/google-chrome';
const serveUrl=await bundle({entryPoint:new URL('./custom-entry.tsx',import.meta.url).pathname,outDir:new URL('./custom-bundle',import.meta.url).pathname,publicDir:new URL('./public',import.meta.url).pathname});
const results=[];
for(const [variant,amplitude] of [['baseline',12],['edited',32]]) {
 const inputProps={amplitude}; const composition=await selectComposition({serveUrl,id:'CustomEffects',browserExecutable,inputProps});
 for(const frame of [0,6,12,24,43,52,59,60,84,112,119]) {
  const output=new URL('./custom-'+variant+'-'+frame+'.png',import.meta.url).pathname;
  await renderStill({serveUrl,composition,browserExecutable,inputProps,frame,output,imageFormat:'png',logLevel:'error'});
  const pixels=execFileSync('ffmpeg',['-v','error','-i',output,'-frames:v','1','-f','rawvideo','-pix_fmt','rgba','-'],{maxBuffer:2*1024*1024});
  results.push({variant,frame,rgbaSHA256:createHash('sha256').update(pixels).digest('hex')});
 }
}
await writeFile(new URL('./custom-render-result.json',import.meta.url),JSON.stringify(results,null,2));
`);
const renderLog = execFileSync(process.execPath, ['custom-render.mjs'], {cwd: consumer, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024});
await writeFile(path.join(out, 'custom-consumer-render.log'), renderLog);
const frames = JSON.parse(await readFile(path.join(consumer, 'custom-render-result.json'), 'utf8'));
const expected = JSON.parse(await readFile(path.join(out, 'custom-result.json'), 'utf8')).exports;
for (const frame of frames) assert.equal(frame.rgbaSHA256, expected.find(f => f.variant === frame.variant && f.frame === frame.frame).rgbaSHA256);
await writeFile(path.join(out, 'custom-consumer-result.json'), JSON.stringify({consumer, tarball: legacy.tarball,
  typecheck: true, workspaceLink: false, deepImportsRejected: legacy.deepImportsRejected, importsChecked: legacy.importsChecked,
  legacyFrames: legacy.frames.length, frames, differentPixels: 0}, null, 2));
console.log(JSON.stringify({consumer, typecheck: true, legacyFrames: legacy.frames.length, customFrames: frames.length, differentPixels: 0}));
