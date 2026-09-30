import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createEngine } from '../../engine/index.ts';
import { installEffectPack, validateEffects } from '../../effects/registry.ts';
import type { EffectDefinition, EffectRuntime } from '../../effects/types.ts';
import type { EffectGroup } from '../../engine/types.ts';
import example from './example-pack.ts';

Object.assign(globalThis, { document: { createElement: () => ({ getContext: () => ({ measureText: () => ({ width: 100 }) }) }) } });
const version = readFileSync(new URL('../../VERSION', import.meta.url), 'utf8').trim();
const fixture = (name: string) => JSON.parse(readFileSync(new URL(`../baseline/v1/${name}.json`, import.meta.url), 'utf8'));
const definition = (): EffectDefinition<'hold'> => ({ name: 'Test', tags: ['calm'], w: 1,
  aeSupport: { kind: 'fallback', id: 'still', reason: 'No dedicated test-only AE port' }, apply() {} });

test('all baseline IDs, order, effective AE mappings and special entries remain intact', () => {
  const engine = createEngine(version), baseline = fixture('registry');
  for (const group of engine.GROUP_KEYS) {
    const runtime = engine as unknown as EffectRuntime;
    assert.deepEqual(engine.order(group).map(id => { const def = engine.registry(group)[id]; return {
      id, pack: def.pack || 'core', name: def.name, special: !!def.special,
      ae: runtime.AE_MAP?.[group]?.[id] || def.ae || null,
    }; }), baseline.groups[group]);
    for (const id of Object.keys(engine.registry(group))) assert.deepEqual(engine.effectSupport(group, id), { kind: 'implementation', id });
  }
  const report = validateEffects(engine);
  assert.equal(report.effects, engine.GROUP_KEYS.reduce((n, g) => n + Object.keys(engine.registry(g)).length, 0));
  assert.equal(report.implementations, report.effects);
  assert.deepEqual(report.fallbacks, []);
  assert(!engine.order('layout').includes('title'));
  assert(engine.registry('layout').title.special);
});

test('sample pack installs without core edits and participates in planning, rendering and AE export', () => {
  const engine = createEngine(version), other = createEngine(version);
  installEffectPack(engine, example);
  assert.equal(engine.order('hold').at(-1), 'examplePulse');
  const def = engine.registry('hold').examplePulse;
  assert.equal(def.pack, 'example'); assert.equal(def.extra, true); assert.equal(def.ae, 'breathe');
  assert(!other.registry('hold').examplePulse);
  const project = engine.mergeProject({ ...fixture('lrc-ja-project'), extra: true, overrides: { 0: { hold: 'examplePulse', single: true } } });
  const plan = engine.plan(project), cut = plan.cuts.find(c => c.line === 0)!;
  assert.equal(cut.hold, 'examplePulse');
  assert.equal(engine.planForAE(plan, project).cuts.find(c => c.line === 0)!.hold, 'examplePulse');
  const item = { sx: 1 };
  // Rendering callback integration; actual Canvas comparisons are separate.
  (def.apply as EffectDefinition<'hold'>['apply'])({ ltb: 0.5, fx: { motion: 1 } } as never, item, 1, {});
  assert(item.sx > 1);
  assert.deepEqual(validateEffects(engine).fallbacks, [{ group: 'hold', id: 'examplePulse', target: 'breathe',
    reason: 'The example has no dedicated ES3 port; use the built-in breathing motion.' }]);
  assert.throws(() => installEffectPack(engine, example), /duplicate ID/);
});

test('invalid registrations fail before changing registry or order, including same-pack duplicates', () => {
  const engine = createEngine(version), before = engine.order('hold').slice();
  const registerUntrusted = engine.register as unknown as (g: string, id: string, d: unknown, pack?: string) => unknown;
  const cases: Array<[string, unknown, RegExp]> = [
    ['badName', { ...definition(), name: '' }, /name/],
    ['badTags', { ...definition(), tags: undefined }, /tags/],
    ['badTag', { ...definition(), tags: ['unknown'] }, /tags/],
    ['badWeight', { ...definition(), w: undefined }, /w/],
    ['infiniteWeight', { ...definition(), w: Infinity }, /w/],
    ['badAE', { ...definition(), aeSupport: undefined }, /AE/],
    ['badTarget', { ...definition(), aeSupport: { kind: 'fallback', id: 'missing', reason: 'test' } }, /unknown AE/],
    ['badReason', { ...definition(), aeSupport: { kind: 'fallback', id: 'still', reason: '' } }, /reason/],
    ['badPort', { ...definition(), aeSupport: { kind: 'implementation', id: 'still' } }, /must match/],
    ['missingCallback', { ...definition(), apply: undefined }, /apply/],
    ['badSet', { ...definition(), set: 'unknown' }, /set/],
    ['badFlag', { ...definition(), wa: 1 }, /wa/],
    ['aeConflict', { ...definition(), ae: 'drift' }, /conflicts/],
    ['bad-id', definition(), /stable ID/],
  ];
  for (const [id, def, error] of cases) {
    assert.throws(() => registerUntrusted('hold', id, def, 'test'), error);
    assert(!Object.hasOwn(engine.registry('hold'), id));
    assert.deepEqual(engine.order('hold'), before);
  }
  assert.throws(() => registerUntrusted('missing', 'test', definition()), /unknown group/);
  assert.throws(() => registerUntrusted('__proto__', 'test', definition()), /unknown group/);
  assert.throws(() => engine.register('hold', 'still', definition(), 'core'), /duplicate ID/);
  engine.register('hold', 'newTest', definition(), 'test');
  assert.throws(() => engine.register('hold', 'newTest', definition(), 'test'), /duplicate ID/);
});

test('source pack flags preserve extra/wa/set gating after initialization', () => {
  const engine = createEngine(version);
  engine.register('hold', 'flaggedHold', { ...definition(), set: 'horror', wa: true }, 'test');
  const def = engine.registry('hold').flaggedHold;
  assert.equal(def.set, 'horror'); assert.equal(def.wa, true); assert.equal(def.extra, undefined);
  const randomOk = (engine as unknown as { randomOk(p: unknown, g: EffectGroup, id: string): boolean }).randomOk;
  assert.equal(randomOk({ horror: false, wa: true }, 'hold', 'flaggedHold'), false);
  assert.equal(randomOk({ horror: true, wa: false }, 'hold', 'flaggedHold'), false);
  assert.equal(randomOk({ horror: true, wa: true }, 'hold', 'flaggedHold'), true);
});

test('build validation catches metadata damaged after registration', () => {
  const engine = createEngine(version);
  installEffectPack(engine, example);
  delete engine.registry('hold').examplePulse.aeSupport;
  // Preserve the strict/baseline classification independently of mutable definitions.
  assert.throws(() => validateEffects(engine), /AE/);
});


test('registry initialization works without newer Chromium/Node convenience APIs', () => {
  const hasOwn = Object.hasOwn;
  try {
    Object.hasOwn = undefined as unknown as typeof Object.hasOwn;
    const engine = createEngine(version);
    assert.equal(validateEffects(engine).effects, 862);
    installEffectPack(engine, example);
    assert.equal(engine.order('hold')[engine.order('hold').length - 1], 'examplePulse');
  } finally { Object.hasOwn = hasOwn; }
});
