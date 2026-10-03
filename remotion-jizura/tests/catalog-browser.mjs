import assert from 'node:assert/strict';
import {build} from 'vite';
import {openBrowser} from '@remotion/renderer';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {catalogMedia} from '../examples/catalog/media.mjs';
const repo=path.resolve(import.meta.dirname,'../..'),out=path.join(repo,'dist/remotion/stage11');
await mkdir(out,{recursive:true});
const font=await readFile(path.join(repo,'dist/remotion/stage04/assets/NotoSansJP.ttf'));
await build({configFile:false,root:repo,publicDir:false,logLevel:'warn',define:{'process.env.NODE_ENV':'"development"'},
 build:{outDir:path.join(out,'preview'),emptyOutDir:true,lib:{entry:path.join(import.meta.dirname,'catalog-entry.jsx'),formats:['iife'],name:'CatalogTest',fileName:()=> 'test.js'}}});
const source=await readFile(path.join(out,'preview/test.js'));
const server=createServer((req,res)=>catalogMedia(req,res,()=>{
 if(req.url?.endsWith('.ttf'))res.end(font);
 else if(req.url==='/test.js'){res.setHeader('Content-Type','text/javascript');res.end(source);}
 else {res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><meta charset="utf-8"><body><script src="/test.js"></script>');}
}));
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
const hash=b=>createHash('sha256').update(b).digest('hex');
const rgba=file=>execFileSync('ffmpeg',['-v','error','-i',file,'-frames:v','1','-f','rawvideo','-pix_fmt','rgba','-'],{maxBuffer:2*1024*1024});
try {
 const browserExecutable=process.env.JIZURA_BROWSER??'/usr/bin/google-chrome';
 browser=await openBrowser('chrome',{browserExecutable,chromiumOptions:{gl:'swangle'}});
 const page=await browser.newPage({context:()=>null,logLevel:'error',indent:false,pageIndex:0,onBrowserLog:null,onLog:()=>{}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.setViewport({width:1280,height:1000,deviceScaleFactor:2});
 const base=`http://127.0.0.1:${server.address().port}`;
 await page.goto({url:base,timeout:30000});
 const report=await page.evaluate(()=>window.runCatalogChecks()); assert.deepEqual(errors,[]);
 report.environment={node:process.version,browser:await page.evaluate(()=>navigator.userAgent),fontSHA256:hash(font),width:640,height:360,fps:24,DPR:2,gl:'swangle'};
 report.previews=[];
 for(const im of report.images) {
  const file=path.join(out,`${im.key.replaceAll('/','-')}-${im.frame}.png`);
  await writeFile(file,Buffer.from(im.png.split(',')[1],'base64'));
  const entry=report.metadata.find(e=>`${e.group}/${e.id}`===im.key);
  const reference=path.join(repo,entry.visual.route==='review' ? `dist/remotion/stage08/player-${entry.id}-${im.frame}.png` :
    entry.visual.route==='custom' ? `dist/remotion/stage09/player-baseline-${im.frame}.png` : `dist/remotion/stage10/player-${entry.visual.candidate}-${im.frame}.png`);
  const fresh=path.join(out,`original-${im.key.replaceAll('/','-')}-${im.frame}.png`);
  await writeFile(fresh,Buffer.from(im.referencePNG.split(',')[1],'base64'));
  // Never let assert format megabytes of Buffer differences. Compare booleans and metrics.
  const pixels=rgba(file),actualReference=rgba(fresh);
  assert.ok(pixels.equals(actualReference),`Catalog differs from the original example in this browser: ${im.key}`);
  const prior=rgba(reference); assert.equal(prior.length,pixels.length);
  let differentPixels=0,maxChannelDifference=0;
  for(let i=0;i<pixels.length;i+=4){let changed=false;for(let c=0;c<4;c++){const d=Math.abs(pixels[i+c]-prior[i+c]);if(d)changed=true;maxChannelDifference=Math.max(maxChannelDifference,d);}if(changed)differentPixels++;}
  report.previews.push({key:im.key,frame:im.frame,file:path.basename(file),reference:path.basename(fresh),rgbaSHA256:hash(pixels),differentPixels:0,
    historicalEvidence:{file:path.relative(repo,reference),differentPixels,maxChannelDifference,scope:'Older run, backend differs for text previews. Informational; no new tolerance or baseline.'}});
 }
 delete report.images;
 const videos=[...new Set(report.metadata.map(e=>e.visual.video))];
 report.videos=[];
 for(const video of videos) {
  await access(path.join(repo,video));
  const response=await fetch(`${base}/catalog-media/${video.replace('dist/remotion/','')}`);
  assert.equal(response.status,200); assert.equal(response.headers.get('content-type'),'video/mp4');
  assert.equal(hash(Buffer.from(await response.arrayBuffer())),hash(await readFile(path.join(repo,video))));
  report.videos.push({video,servedByteMatch:true});
 }
 for(const key of ['hold/breathe','enter/pop','decor/kasumi','image/io.jizura.sliceGlitch']) {
  await page.evaluate(k=>window.catalogShow(k),key);
  const shot=await page._client().send('Page.captureScreenshot',{format:'png'});
  await writeFile(path.join(out,`catalog-${key.replaceAll('/','-')}.png`),Buffer.from(shot.value.data,'base64'));
 }
 await writeFile(path.join(out,'catalog-result.json'),JSON.stringify(report,null,2)+'\n');
 console.log(`Catalog: 12 metadata entries, 3 queries, group/text filters, 12 preview PNGs match original examples in this browser; ${videos.length} video links serve matching bytes.`);
} finally {if(browser)await browser.close({silent:true}); await new Promise(r=>server.close(r));}
