// Real Studio schema/save backend, source persistence, full reload and PNG export.
// Test-only API requests are not part of the package runtime.
import assert from 'node:assert/strict';
import {openBrowser, selectComposition, renderStill} from '@remotion/renderer';
import {bundle} from '@remotion/bundler';
import {readFile, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {parse} from '@babel/parser';
import {sliceGlitch} from '../dist/index.js';
import path from 'node:path';
const repo = path.resolve(import.meta.dirname,'../..'), out = path.join(repo,'dist/remotion/stage10');
const fileName = path.join(repo,'remotion-jizura/examples/image-effects/ImageEffects.tsx');
const original = await readFile(fileName,'utf8'), ast = parse(original,{sourceType:'module',plugins:['typescript','jsx']});
const targets = [];
function walk(node, segments=[]) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'JSXOpeningElement' && node.name.name === 'HtmlInCanvas') {
    const attribute = node.attributes.find(a => a.name?.name === 'effects');
    if (attribute?.value.expression.elements[0]?.callee.name === 'blur') targets.push(segments);
  }
  for (const [key,value] of Object.entries(node)) {
    if (Array.isArray(value)) {
      let count = 0;
      for (const child of value) {
        if (node.type === 'Program' && key === 'body' && child.type === 'ImportDeclaration') continue;
        if (child?.type) walk(child,[...segments,key,count]); count++;
      }
    } else if (value?.type) walk(value,[...segments,key]);
  }
}
walk(ast); assert.equal(targets.length,1);
const schema = sliceGlitch().definition.schema;
const key = {absolutePath:fileName,nodePath:targets[0],sequenceKeys:[],effectKeys:[],videoConfigValues:{width:640,height:360,fps:24,durationInFrames:144}};
const url = process.env.JIZURA_STUDIO_URL ?? 'http://localhost:3110';
const api = async(route,input) => {
  const response = await fetch(`${url}/api/${route}`,{method:'POST',headers:{'Content-Type':'application/json',Origin:new URL(url).origin},body:JSON.stringify(input)});
  const result = await response.json(); assert.ok(response.ok && result.success,JSON.stringify(result)); return result.data;
};
const browserExecutable=process.env.JIZURA_BROWSER??'/usr/bin/google-chrome', chromiumOptions={gl:'swangle'};
const browser=await openBrowser('chrome',{browserExecutable,chromiumOptions});
const hash=b=>createHash('sha256').update(b).digest('hex');
const rgba=file=>execFileSync('ffmpeg',['-v','error','-i',file,'-frames:v','1','-f','rawvideo','-pix_fmt','rgba','-'],{maxBuffer:2*1024*1024});
let lastSaved=original;
try {
  const page=await browser.newPage({context:()=>null,logLevel:'error',indent:false,pageIndex:0,onBrowserLog:null,onLog:()=>{}});
  await page.setViewport({width:1280,height:800,deviceScaleFactor:2});
  const records=[];
  for (const displacement of [0.05,0.1,0.05]) {
    assert.equal(await readFile(fileName,'utf8'),lastSaved,'Concurrent source edit detected');
    const saved=await api('save-effect-props',{fileName,sequenceNodePath:key,effectIndex:1,key:'displacement',defaultValue:'0.05',schema,clientId:'jizura-stage10-validation',type:'value',value:JSON.stringify(displacement)});
    assert.equal(saved.canUpdate,true,JSON.stringify(saved));
    lastSaved=await readFile(fileName,'utf8');
    await page.goto({url:`${url}/ImageEffects`,timeout:30000});
    await until(async()=>page.evaluate(()=>!!document.querySelector('canvas[data-jizura-ready="true"]') && !!window.remotion_setFrame));
    await page.evaluate(()=>window.remotion_setFrame(24,'ImageEffects',1));
    await new Promise(resolve=>setTimeout(resolve,300));
    const png=await page.evaluate(()=>document.querySelector('canvas')?.toDataURL()); assert.ok(png);
    const file=path.join(out,`studio-${records.length}-24.png`);await writeFile(file,Buffer.from(png.split(',')[1],'base64'));
    const bytes=rgba(file);
    const serveUrl=await bundle({entryPoint:path.join(repo,'remotion-jizura/examples/studio-entry.tsx'),outDir:path.join(out,`studio-bundle-${records.length}`),publicDir:path.join(repo,'dist/remotion/stage04/assets')});
    const inputProps={target:'lyrics',mode:'combined'},composition=await selectComposition({serveUrl,id:'ImageEffects',browserExecutable,chromiumOptions,inputProps});
    const exported=path.join(out,`studio-export-${records.length}-24.png`);
    await renderStill({serveUrl,composition,browserExecutable,chromiumOptions,inputProps,frame:24,output:exported,imageFormat:'png',logLevel:'error'});
    const actual=rgba(exported);
    let maxRaw=0,maxAlpha=0,maxPremultiplied=0;
    for(let i=0;i<bytes.length;i+=4){maxAlpha=Math.max(maxAlpha,Math.abs(bytes[i+3]-actual[i+3]));for(let j=0;j<3;j++){
      maxRaw=Math.max(maxRaw,Math.abs(bytes[i+j]-actual[i+j]));maxPremultiplied=Math.max(maxPremultiplied,Math.abs(Math.round(bytes[i+j]*bytes[i+3]/255)-Math.round(actual[i+j]*actual[i+3]/255)));}}
    assert.ok(maxRaw<=1 && maxAlpha===0 && maxPremultiplied===0,JSON.stringify({maxRaw,maxAlpha,maxPremultiplied}));
    records.push({displacement,sourceSHA256:hash(lastSaved),studioRGBA:hash(bytes),exportRGBA:hash(actual),maxRaw,maxAlpha,maxPremultiplied,status:saved});
    const shot=await page._client().send('Page.captureScreenshot',{format:'png'});await writeFile(path.join(out,`studio-${records.length}.png`),Buffer.from(shot.value.data,'base64'));
  }
  assert.notEqual(records[0].studioRGBA,records[1].studioRGBA,'Studio edit invisible');
  assert.equal(records[0].studioRGBA,records[2].studioRGBA,'Studio restore differs');
  await writeFile(path.join(out,'studio-image-effects-result.json'),JSON.stringify({records,schema,method:'native save-effect-props + source read + full reload + separately bundled PNG',uiSaveButtonTested:false},null,2));
  console.log('Studio: displacement .05 → .1 → .05 saved in effects array, reloaded and compared to export');
} finally {
  try {assert.equal(await readFile(fileName,'utf8'),lastSaved,'Refusing to overwrite concurrent edit');await writeFile(fileName,original);}
  finally {await browser.close({silent:true});}
}
async function until(fn){for(let i=0;i<300;i++){if(await fn())return;await new Promise(resolve=>setTimeout(resolve,50));}throw new Error('Studio timeout');}
