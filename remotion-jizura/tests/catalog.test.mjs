import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as api from '../dist/index.js';
import {SUPPORTED} from '../dist/effects/declarations.js';
import {validateCatalog} from './catalog-validation.mjs';
const catalog = api.getEffectCatalog();
test('package catalog covers every automatic candidate and separates native image execution', () => {
  assert.equal(validateCatalog(catalog), 13);
  assert.deepEqual(catalog.filter(e => e.origin === 'builtin').map(e => `${e.group}/${e.id}`).sort(),
    Object.entries(SUPPORTED).flatMap(([group, ids]) => ids.map(id => `${group}/${id}`)).sort());
  assert.equal(catalog.filter(e => e.autoSelect).length, 7);
  assert.equal(catalog.find(e => e.group === 'image').autoSelect, false);
  assert.throws(() => api.resolveScene({durationInFrames: 60}, {width:640,height:360,fps:24}, [{text:'朝', hold:catalog[7].id}]));
  assert.ok(Object.isFrozen(catalog)); assert.ok(Object.isFrozen(catalog[0].parameters.sx));
  assert.doesNotThrow(() => JSON.stringify(catalog));
});
test('catalog bounds and shared ignored parameters agree with executable factories', () => {
  for (const e of catalog.filter(e => e.origin === 'builtin')) {
    for (const [key, p] of Object.entries(e.parameters)) {
      const good = p.type === 'number' ? [p.min, p.exclusiveMax ? p.max - 0.01 : p.max] : p.type === 'enum' ? p.values : [true,false];
      for (const v of good) assert.doesNotThrow(() => api[e.id]({params:{[key]:v}}), `${e.id}.${key}=${v}`);
      const bad = p.type === 'number' ? [p.min-1,p.max+1,NaN] : p.type === 'enum' ? ['unknown'] : ['true'];
      if (p.exclusiveMax) bad.push(p.max);
      if (p.type === 'number' && p.integer) bad.push(p.min+0.5);
      for (const v of bad) assert.throws(() => api[e.id]({params:{[key]:v}}), `${e.id}.${key}=${v}`);
    }
    const snapshot = api.resolveScene({durationInFrames:60},{width:640,height:360,fps:24},[{text:'朝', [e.group]:e.group === 'decor' ? [api[e.id]()] : api[e.id]()}]).cuts[0];
    const effect = e.group === 'decor' ? snapshot.decor[0] : snapshot[e.group];
    assert.deepEqual(Object.keys(effect.params).sort(), Object.keys(e.parameters).sort());
  }
  const effective = id => Object.entries(catalog.find(e=>e.id===id).parameters).filter(([,p])=>p.usage==='effective').map(([k])=>k).sort();
  assert.deepEqual(effective('kasumi'), ['n','right']);
  assert.deepEqual(effective('checkerStrip'), ['accent','low','right','v']);
  for (const [key,p] of Object.entries(catalog[7].parameters)) {
    assert.equal(p.default.kind, 'fixed');
    assert.doesNotThrow(()=>api.sliceGlitch({[key]:p.default.value}));
    if (p.type === 'number') {assert.doesNotThrow(()=>api.sliceGlitch({[key]:p.min})); assert.doesNotThrow(()=>api.sliceGlitch({[key]:p.max})); assert.throws(()=>api.sliceGlitch({[key]:p.min-1}));}
  }
});
test('search combines name, tokens, tags, group and usage conditions without changing order', () => {
  assert.ok(api.searchEffects({uses:['静かな保持']}).length);
  assert.ok(api.searchEffects({uses:['短いキメ']}).length);
  assert.ok(api.searchEffects({uses:['控えめな装飾']}).length);
  assert.ok(api.searchEffects({name:'BREATHE',group:'hold',tags:['calm'],uses:['静かな保持'],conditions:['明示seed']}).some(e=>e.id==='breathe'));
  assert.deepEqual(api.searchEffects({text:'not-an-effect'}), []);
  assert.deepEqual(api.searchEffects({group:'decor',conditions:['WebGL2']}), []);
  assert.deepEqual(api.searchEffects({text:'CALM 静か'}), catalog.filter(e=>e.tags.includes('calm') && e.tags.includes('静か')));
});
test('metadata gate detects duplicates, missing descriptions and invalid parameter data', () => {
  const copy = () => structuredClone(catalog);
  assert.throws(()=>validateCatalog([...catalog,catalog[0]]), /duplicate/);
  let a=copy(); a[0].uses=[]; assert.throws(()=>validateCatalog(a), /uses/);
  a=copy(); a[0].parameters.sx.description=''; assert.throws(()=>validateCatalog(a), /description/);
  a=copy(); a[0].parameters.sx.min=5; assert.throws(()=>validateCatalog(a), /bounds/);
  a=copy(); a[7].parameters.amount.default.value=2; assert.throws(()=>validateCatalog(a), /default/);
});
