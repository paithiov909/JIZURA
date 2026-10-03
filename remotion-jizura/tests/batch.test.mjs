import test from 'node:test';
import assert from 'node:assert/strict';
import * as api from '../dist/index.js';
import {prepareScene, finalizeScene} from '../dist/core/scene-plan.js';
import {CANDIDATES} from '../dist/effects/declarations.js';
import {measureCenterCut} from '../dist/canvas/center.js';
import {measureMixedCut} from '../dist/canvas/mixed.js';
import {createCanvasFrame} from '../dist/canvas/frame.js';
import {prepareEffectItems} from '../dist/canvas/effect-frame.js';
import {slideLeftChar, jitterChar} from '../dist/effects/motion.js';
import installUtil from '../../engine/util.ts';
import installText from '../../engine/text.ts';
import installAnimation from '../../effects/core/animation.ts';
import installEnter from '../../effects/packs/enter.ts';
const config = {width:640,height:360,fps:24};
const J = {registerBaseline(g,id,d) {(this[g] ??= {})[id] = d;}, registerBaselineAll(g,ds) {for (const [id,d] of Object.entries(ds)) this.registerBaseline(g,id,d);}};
installUtil(J); installText(J); installAnimation(J); installEnter(J);
const close = (a,b) => assert.ok(Math.abs(a-b) < 1e-10, `${a} != ${b}`);
test('new explicit IDs do not join automatic candidates; custom names cannot shadow them', () => {
  assert.deepEqual(CANDIDATES, {layout:['center'],enter:['pop','wipe'],exit:['drift'],hold:['breathe'],decor:['kasumi','checkerStrip']});
  for (const id of ['mixed','slideLeft','shrink','jitter','brackets']) {
    const e = api.getEffectCatalog().find(e=>e.id===id); assert.equal(e.autoSelect,false);
    assert.throws(()=>api.resolveScene({durationInFrames:60},config,[{text:'朝', [e.group]: e.group==='decor' ? [{...api[id](),params:{unknown:1}}] : {...api[id](),params:{unknown:1}}}]),err=>err.code==='E_EFFECT');
  }
  const reserved = api.defineMotionEffect({group:'hold',id:'jitter',name:'reserved',description:'reserved',tags:[],schema:{},transform:()=>({})});
  assert.throws(()=>api.resolveScene({durationInFrames:60},config,[{text:'朝',hold:reserved()}]),err=>err.code==='E_EFFECT');
});
test('slideLeft matches original pack at phase endpoints and every glyph', () => {
  for (const n of [1,3,10]) for (const p of [0,0.1,0.5,0.9,1]) {
    const it={size:64,charFns:[]}; J.enter.slideL.apply({},it,p);
    for(let i=0;i<n;i++) {
      const actual=slideLeftChar(i,n,p,64), expected=it.charFns[0](i,{},n)??{};
      assert.equal(actual.hide,expected.hide); for(const k of ['dx','a']) close(actual[k]??(k==='a'?1:0),expected[k]??(k==='a'?1:0));
    }
  }
});
test('jitter matches retained step/threshold equations including zero and high amount', () => {
  for(const seed of [0,1,4294967295]) for(const step of [0,1,10]) for(const amount of [0,1,4]) for(const amt of [0,0.01,0.5,1]) {
    const it={seed,size:64,charFns:[]}; J.hold.jitter.apply({step,fx:{motion:amount}},it,amt);
    for(let i=0;i<3;i++) assert.deepEqual(jitterChar(seed,step,i,64,amt,amount),it.charFns[0]?.(i)??{});
  }
  assert.notDeepEqual(jitterChar(0,10,0,64,1,1),jitterChar(0,11,0,64,1,1));
});
test('mixed measures distinct glyph items; emphasis, font cap and scratch shrink survive replay', async () => {
  const prepared=prepareScene({durationInFrames:60,style:{fontSize:64,track:1}},config,[{text:'朝 かなABC\n*希望*ゃ！？',seed:0,layout:api.mixed({params:{smallK:1}}),enter:api.slideLeft(),hold:api.jitter(),exit:api.shrink(),decor:[api.brackets()]}]);
  const service={prepareFonts(){},measureCut:(c,s)=>measureMixedCut(c,s,()=>1)}; // metric stub, not real font evidence
  const plan=await finalizeScene(prepared,service), snapshot=JSON.stringify(plan);
  const glyphs=plan.cuts[0].geometry.items.flatMap(it=>it.glyphs);
  assert.equal(glyphs.map(g=>g.ch).join(''),'朝かなABC希望ゃ！？');
  assert.ok(glyphs.filter(g=>'希望'.includes(g.ch)).every(g=>g.color==='#F5A50C'));
  assert.ok(plan.cuts[0].geometry.items.every(it=>it.size<=64 && it.track===0));
  const records=new Map();
  for(const f of [0,30,50,59,50,30,0]) {const work=createCanvasFrame(plan,f);const motion=prepareEffectItems(work);const value=JSON.stringify([work,motion]);if(records.has(f))assert.equal(value,records.get(f));records.set(f,value);}
  assert.equal(JSON.stringify(plan),snapshot);
});
test('shrink modifies full item size and spacing before glyph layout, matching original motion', async () => {
  const prepared=prepareScene({durationInFrames:60,style:{fontSize:64}},config,[{text:'朝ABC',layout:api.center({params:{sx:1,track:0.08,ox:0,oy:0,sub:false,under:false,accent:false}}),enter:null,hold:null,exit:api.shrink(),decor:[],exitDurationInFrames:12}]);
  const plan=await finalizeScene(prepared,{prepareFonts(){},measureCut:(c,s)=>measureCenterCut(c,s,()=>1)});
  const base=plan.cuts[0].geometry.items[0];
  for(const frame of [48,51,54,59]) {
    const work=createCanvasFrame(plan,frame), motions=prepareEffectItems(work), actual=work.items[0];
    const old={size:base.size,track:base.track,alpha:1};J.exit.shrink.apply({},old,work.state.pOut);
    close(actual.size,old.size);close(actual.track,old.track);close(motions[0].chars[0]?.a??1,old.alpha);
    close(actual.x,base.x);close(actual.y,base.y);
    const total=4*old.size+3*old.track*old.size;
    actual.glyphs.forEach((g,i)=>close(g.x,-total/2+old.size/2+i*(old.size+old.track*old.size)));
  }
});
