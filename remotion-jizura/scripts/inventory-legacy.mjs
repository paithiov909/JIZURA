import assert from 'node:assert/strict';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {createEngine} from '../../engine/index.ts';
import {annotations, groupRules, batch} from './legacy-catalog-rules.mjs';
const repo = path.resolve(import.meta.dirname, '../..');
const baselineBytes = await readFile(path.join(repo, 'tests/baseline/v1/registry.json'));
const baseline = JSON.parse(baselineBytes);
// Engine setup requires a measurement context. No plan/render/measure is run.
let measurements = 0;
globalThis.document = {createElement: () => ({getContext: () => ({measureText() {measurements++; throw new Error('Inventory must not measure fonts');}})})};
const engine = createEngine('catalog-inventory');
const rows = [], special = [];
for (const group of engine.GROUP_KEYS) {
  assert.ok(groupRules[group], `Missing classification rule: ${group}`);
  const ordered = engine.order(group);
  const actual = ordered.map(id => {
    const def = engine.registry(group)[id];
    return {id, pack: def.pack || 'core', name: def.name, special: !!def.special};
  });
  assert.deepEqual(actual, baseline.groups[group].map(({ae, ...rest}) => rest), `Registry drift: ${group}`);
  assert.equal(ordered.length, new Set(ordered).size);
  for (const [id, def] of Object.entries(engine.registry(group))) {
    if (!ordered.includes(id)) {assert.ok(def.special, `Unordered ordinary ID: ${group}/${id}`); special.push({group,id,name:def.name});}
  }
  for (const [index, entry] of actual.entries()) {
    const key = `${group}/${entry.id}`, def = engine.registry(group)[entry.id];
    const callbacks = Object.values(def).filter(v => typeof v === 'function').map(v => v.toString()).join('\n');
    const helperHints = [...new Set([...callbacks.matchAll(/\bJ\.([A-Za-z][A-Za-z0-9]*)/g)].map(m => m[1]))].sort();
    rows.push({key,group,index,...entry,...groupRules[group], review: 'coarse', publicName: null,
      comparison: 'not-run', helperHints, hintScope: 'Direct J.member references only; not a complete dependency graph.',
      ...(annotations[key] ?? {}), ...(annotations[key]?.disposition === 'ported' ? {comparison: 'stage06-reference-validated'} : {})});
  }
}
assert.equal(measurements, 0);
assert.equal(rows.length, 860);
assert.equal(new Set(rows.map(r => r.key)).size, 860);
for (const key of Object.keys(annotations)) assert.ok(rows.some(r => r.key === key), `Stale annotation: ${key}`);
assert.ok(batch.length >= 4 && batch.length <= 6);
for (const group of ['layout','enter','decor']) assert.ok(batch.some(r => r.key.startsWith(`${group}/`)));
const count = key => Object.fromEntries([...new Set(rows.map(r => r[key]))].map(value => [value, rows.filter(r => r[key] === value).length]));
const report = {scope: 'Ordinary ordered catalog only. Styles/fonts excluded; unordered special definitions reported separately.',
  node: process.version, baselineSHA256: createHash('sha256').update(baselineBytes).digest('hex'),
  registryAndOrderMatch: true, measurements, total: rows.length, counts: {group: count('group'), category: count('category'), disposition: count('disposition'), review: count('review')},
  caution: 'Group-based coarse classification plus selected authored annotations. Helper hints miss aliases and indirect calls; all 860 have not been visually reviewed.',
  special, batch, rows};
const out = path.join(repo,'dist/remotion/stage11'); await mkdir(out,{recursive:true});
await writeFile(path.join(out,'legacy-inventory.json'), JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({total:report.total,counts:report.counts,special,batch:batch.map(b=>b.key),registryAndOrderMatch:true}));
