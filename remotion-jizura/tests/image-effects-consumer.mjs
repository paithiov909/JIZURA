import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,cp,mkdir} from 'node:fs/promises';
import path from 'node:path';
const repo=path.resolve(import.meta.dirname,'../..'),out=path.join(repo,'dist/remotion/stage10');
await mkdir(out,{recursive:true});
const log=execFileSync(process.execPath,[path.join(import.meta.dirname,'consumer-validation.mjs')],{cwd:repo,encoding:'utf8',maxBuffer:4*1024*1024});
await writeFile(path.join(out,'legacy-consumer.log'),log);
const legacy=JSON.parse(await readFile(path.join(repo,'dist/remotion/stage07/consumer-result.json'),'utf8')), {consumer}=legacy;
// Only the caller example imports this dev dependency. The package uses its peers.
execFileSync('npm',['install','--save-dev','--save-exact','@remotion/effects@4.0.532','--cache','/tmp/jizura-remotion-npm-cache','--prefer-offline','--fetch-retries=0','--fetch-timeout=15000','--no-audit','--no-fund'],{cwd:consumer,stdio:'pipe'});
await cp(path.join(repo,'remotion-jizura/examples/image-effects/ImageEffects.tsx'),path.join(consumer,'ImageEffects.tsx'));
await cp(path.join(repo,'remotion-jizura/tests/image-effects-types.tsx'),path.join(consumer,'image-effects-types.tsx'));
await writeFile(path.join(consumer,'image-entry.tsx'),`import {Composition,registerRoot} from 'remotion';
import {ImageEffects} from './ImageEffects.tsx';
registerRoot(()=><Composition id="ImageEffects" component={ImageEffects} width={640} height={360} fps={24} durationInFrames={144}/>);
`);
execFileSync(path.join(consumer,'node_modules/.bin/tsc'),['-p','tsconfig.json'],{cwd:consumer,stdio:'pipe'});
await writeFile(path.join(consumer,'image-render.mjs'),`import {bundle} from '@remotion/bundler';
import {selectComposition,renderStill} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
const browserExecutable=process.env.JIZURA_BROWSER??'/usr/bin/google-chrome',chromiumOptions={gl:'swangle'};
const serveUrl=await bundle({entryPoint:new URL('./image-entry.tsx',import.meta.url).pathname,outDir:new URL('./image-bundle',import.meta.url).pathname,publicDir:new URL('./public',import.meta.url).pathname});
const frames=[];
for(const [variant,target,mode,samples] of [['lyrics','lyrics','combined',[12,24,48,84,120]],['image','image','glitch',[24]],['scene','scene','combined',[24]]]) {
 const inputProps={target,mode};const composition=await selectComposition({serveUrl,id:'ImageEffects',inputProps,browserExecutable,chromiumOptions});
 for(const frame of samples){const output=new URL('./image-'+variant+'-'+frame+'.png',import.meta.url).pathname;
 await renderStill({serveUrl,composition,inputProps,browserExecutable,chromiumOptions,frame,output,imageFormat:'png',logLevel:'error'});
 const pixels=execFileSync('ffmpeg',['-v','error','-i',output,'-frames:v','1','-f','rawvideo','-pix_fmt','rgba','-'],{maxBuffer:2*1024*1024});
 frames.push({variant,frame,rgbaSHA256:createHash('sha256').update(pixels).digest('hex')});}
}
await writeFile(new URL('./image-render-result.json',import.meta.url),JSON.stringify(frames,null,2));
`);
const renderLog=execFileSync(process.execPath,['image-render.mjs'],{cwd:consumer,encoding:'utf8',maxBuffer:4*1024*1024});
await writeFile(path.join(out,'image-consumer-render.log'),renderLog);
const frames=JSON.parse(await readFile(path.join(consumer,'image-render-result.json'),'utf8'));
const expected=JSON.parse(await readFile(path.join(out,'image-effects-result.json'),'utf8')).exports;
for(const frame of frames)assert.equal(frame.rgbaSHA256,expected.find(f=>f.variant===frame.variant&&f.frame===frame.frame).rgbaSHA256);
await writeFile(path.join(out,'image-effects-consumer-result.json'),JSON.stringify({consumer,tarball:legacy.tarball,typecheck:true,workspaceLink:false,
 deepImportsRejected:legacy.deepImportsRejected,importsChecked:legacy.importsChecked,legacyFrames:legacy.frames.length,frames,differentPixels:0},null,2));
console.log(`External tarball: strict TS, ${frames.length} native-image PNGs and ${legacy.frames.length} legacy PNGs match`);
