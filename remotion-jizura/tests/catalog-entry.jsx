import React, {StrictMode, createRef} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {CatalogPlayer} from '../examples/catalog/CatalogPlayer.tsx';
import {exampleCatalog, searchExamples} from '../examples/catalog/entries.tsx';
import {offsetLines, glyphWave, boxRule} from '../examples/custom/effects.tsx';
import {validateCatalog} from './catalog-validation.mjs';
import {searchEffects} from 'remotion-jizura';
import {Player} from '@remotion/player';
import {ReviewWorkbench} from '../examples/review/ReviewWorkbench.tsx';
import {CustomEffects} from '../examples/custom/CustomEffects.tsx';
import {ImageEffects} from '../examples/image-effects/ImageEffects.tsx';
const host = document.createElement('div'); document.body.append(host);
const root = createRoot(host), ref = createRef();
const referenceHost = document.createElement('div'); document.body.append(referenceHost);
const referenceRoot = createRoot(referenceHost), referenceRef = createRef();
const wait = ms => new Promise(r => setTimeout(r,ms));
const check = (ok, message) => {if (!ok) throw new Error(message);};
const raf = () => new Promise(r=>requestAnimationFrame(r));
async function settle() {
  for (let i=0;i<500;i++) {
    const error=host.querySelector('[role="alert"]'); if(error) throw new Error(error.textContent);
    if (ref.current && host.querySelector('canvas') && [...host.querySelectorAll('[data-jizura-ready]')].every(c=>c.dataset.jizuraReady==='true') && !window.remotion_delayRenderHandles?.length) {
      await raf(); await raf(); await raf(); await raf(); return;
    }
    await wait(20);
  }
  throw new Error('Catalog Player preparation timeout');
}
const button = text => [...host.querySelectorAll('button')].find(b=>b.textContent===text);
const ids = () => [...host.querySelectorAll('[data-effect]')].map(b=>b.dataset.effect);
async function choose(entry) {
  flushSync(()=>button('全件').click());
  flushSync(()=>host.querySelector(`[data-effect="${entry.group}/${entry.id}"]`).click());
  await settle(); flushSync(()=>ref.current.seekTo(entry.visual.frame)); await settle();
  check(ref.current.getCurrentFrame()===entry.visual.frame,'Representative frame not selected');
  const sample=document.createElement('canvas'); sample.width=640; sample.height=360;
  const context=sample.getContext('2d'); context.drawImage(host.querySelector('canvas'),0,0);
  const pixels=context.getImageData(0,0,640,360).data;
  // Reject empty/flat examples, including image wrappers.
  const colors=new Set(); for(let i=0;i<pixels.length;i+=4) colors.add(`${pixels[i]},${pixels[i+1]},${pixels[i+2]},${pixels[i+3]}`);
  check(colors.size>10,`Empty/flat preview ${entry.id}`);
  return host.querySelector('canvas').toDataURL();
}
window.runCatalogChecks = async () => {
  check(validateCatalog(exampleCatalog)===12,'Catalog missing entries');
  for(const factory of [offsetLines,glyphWave,boxRule]) {
    const entry=exampleCatalog.find(e=>e.id===factory.metadata.id);
    check(JSON.stringify(Object.keys(entry.parameters))===JSON.stringify(Object.keys(factory.metadata.schema)), 'Custom schema keys diverged');
    for(const [key,p] of Object.entries(entry.parameters)) {
      check(p.description===factory.metadata.schema[key].description,'Custom description diverged');
      check(p.default.value===factory.metadata.schema[key].default,'Custom default diverged');
    }
  }
  flushSync(()=>root.render(<StrictMode><CatalogPlayer playerRef={ref}/></StrictMode>)); await settle();
  const queries=[];
  for(const example of searchExamples) {
    flushSync(()=>button(example.label).click());
    const expected=searchEffects(example.query,exampleCatalog).map(e=>`${e.group}/${e.id}`);
    check(JSON.stringify(ids())===JSON.stringify(expected),`UI search differs ${example.label}`);
    check(expected.length>0,'Empty example query'); queries.push({label:example.label,ids:expected});
  }
  flushSync(()=>button('全件').click());
  const select=host.querySelector('[aria-label="カタログ種類"]');
  flushSync(()=>{select.value='image'; select.dispatchEvent(new Event('change',{bubbles:true}));});
  check(ids().length===2 && ids().every(i=>i.startsWith('image/')),'Group filter differs');
  flushSync(()=>button('全件').click());
  const input=host.querySelector('[aria-label="カタログ検索"]');
  flushSync(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'checker'); input.dispatchEvent(new Event('input',{bubbles:true}));});
  check(JSON.stringify(ids())===JSON.stringify(['decor/checkerStrip']),'Name/tag text filter differs');
  const images=[], links=[];
  for(const entry of exampleCatalog) {
    const png=await choose(entry);
    const component=entry.visual.route==='review' ? ReviewWorkbench : entry.visual.route==='custom' ? CustomEffects : ImageEffects;
    const inputProps=entry.visual.route==='review' ? {candidate:entry.visual.candidate,fontSrc:'/NotoSansJP.ttf'} :
      entry.visual.route==='custom' ? {} : {mode:entry.visual.candidate,fontSrc:'/NotoSansJP.ttf'};
    flushSync(()=>referenceRoot.render(<StrictMode><Player ref={referenceRef} component={component} inputProps={inputProps}
      durationInFrames={entry.group==='image'?144:120} compositionWidth={640} compositionHeight={360} fps={24} style={{width:640}} /></StrictMode>));
    flushSync(()=>referenceRef.current.seekTo(entry.visual.frame));
    for(let i=0;i<500;i++) {if(referenceHost.querySelector('canvas') && [...referenceHost.querySelectorAll('[data-jizura-ready]')].every(c=>c.dataset.jizuraReady==='true'))break; await wait(20); if(i===499)throw new Error('Original example timeout');}
    await raf();await raf();await raf();await raf();
    const referencePNG=referenceHost.querySelector('canvas').toDataURL();
    images.push({key:`${entry.group}/${entry.id}`,frame:entry.visual.frame,png,referencePNG});
    flushSync(()=>referenceRoot.render(null));
    const article=host.querySelector('article'); check(article.textContent.includes(entry.description),'Metadata/preview mismatch');
    const anchors=[...article.querySelectorAll('a')].map(a=>a.getAttribute('href'));
    links.push({key:`${entry.group}/${entry.id}`,anchors});
  }
  const entry=exampleCatalog.find(e=>e.id==='breathe');
  const restored=await choose(entry);
  check(restored===images.find(i=>i.key==='hold/breathe').png,'Catalog revisit changed pixels');
  return {metadata:exampleCatalog,queries,links,images,restored:true};
};
window.catalogShow = async key => {await choose(exampleCatalog.find(e=>`${e.group}/${e.id}`===key));};
