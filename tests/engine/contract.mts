import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createEngine, INITIALIZATION_ORDER } from '../../engine/index.ts';
import type { EffectGroup, Plan, Project } from '../../engine/types.ts';

// A font-measurement stub only; rendering is verified separately in Chrome.
Object.assign(globalThis, { document: { createElement: () => ({ getContext: () => ({
  measureText: () => ({ width: 100 }),
}) }) } });
const version = readFileSync(new URL('../../VERSION', import.meta.url), 'utf8').trim();
const fixture = (name: string) => JSON.parse(readFileSync(new URL(`../baseline/v1/${name}.json`, import.meta.url), 'utf8'));
const summarize = (plan: Plan) => ({ duration: plan.duration, W: plan.W, H: plan.H, lines: plan.lines,
  cuts: plan.cuts.map(c => ({ text: c.text, line: c.line, layout: c.layout, enter: c.enter, hold: c.hold, exit: c.exit,
    decor: c.decor.map(d => d.id), treat: c.treat, bg: c.bg, cam: c.cam, trans: c.trans || null,
    start: c.start, end: c.end, seed: c.seed })) });

test('explicit initialization order preserves core capture and all stable registries', () => {
  const engine = createEngine(version);
  assert(Object.isFrozen(INITIALIZATION_ORDER));
  assert.equal(INITIALIZATION_ORDER.length, new Set(INITIALIZATION_ORDER).size);
  assert(INITIALIZATION_ORDER.indexOf('08_planner') < INITIALIZATION_ORDER.indexOf('11p_bgcamB'));
  assert.deepEqual(engine.CORE_ORDER.layout, fixture('registry').groups.layout.slice(0, 17).map((d: { id: string }) => d.id));
  const baseline = fixture('registry');
  const groups = Object.fromEntries(engine.GROUP_KEYS.map(g => [g, engine.order(g).map(id => {
    const d = engine.registry(g)[id];
    // AE_MAP is a temporary legacy slot; declared counterparts remain fixture-tested in Chrome.
    return { id, pack: d.pack || 'core', name: d.name, special: !!d.special };
  })]));
  const expected = Object.fromEntries(Object.entries(baseline.groups).map(([g, entries]) => [g,
    (entries as Array<Record<string, unknown>>).map(({ ae: _ae, ...entry }) => entry)]));
  assert.deepEqual(groups, expected);
  assert.deepEqual(engine.STYLE_ORDER, baseline.styles);
  assert.deepEqual(Object.keys(engine.FONTS), baseline.fonts);
  assert.equal('ui' in engine, false);
  assert.equal('uiApi' in engine, false);
  assert.equal('J' in globalThis, false);
});

for (const name of ['lrc-ja', 'portrait-en']) {
  test(`${name}: project interpretation, deterministic plan and serialization`, () => {
    const engine = createEngine(version);
    const input = fixture(`${name}-project`);
    const project = engine.mergeProject(input);
    assert.deepEqual({ ...project, appVersion: version }, input);
    const first = engine.plan(project, null);
    assert.deepEqual({ seed: project.seed, planSummary: summarize(first) }, fixture(`${name}-plan-summary`));
    assert.deepEqual(JSON.parse(JSON.stringify(engine.plan(project, null))), JSON.parse(JSON.stringify(first)));
    assert.deepEqual(engine.mergeProject(JSON.parse(JSON.stringify(project))), project);
    if (name === 'lrc-ja') assert.deepEqual(engine.planForAE(first, project), fixture('lrc-ja-ae-plan'));
  });
}

test('legacy timingOrder migration keeps overrides, lineTimes and ranges attached to their lyric rows', () => {
  const engine = createEngine(version);
  const project = engine.mergeProject({ lyrics: '[00:02]second\nuntagged\n[00:01]first',
    timingOrder: 1, timing: { lineTimes: { 0: 1, 1: 2, 2: 3 } },
    overrides: { 2: { layout: 'center', lock: true } }, exportRange: { from: 1, to: 2 } });
  assert.equal(project.timingOrder, 2);
  assert.deepEqual(project.timing.lineTimes, { 0: 1, 1: 2, 2: 3 });
  assert.deepEqual(project.overrides, { 2: { layout: 'center', lock: true } });
  // The fixture above is identity after parsing; force the mixed-row reorder too.
  const mixed = engine.mergeProject({ lyrics: '[00:00]first\nuntagged\n[00:02]second', timingOrder: 1,
    timing: { lineTimes: { 1: 2, 2: 1 } }, overrides: { 2: { cuts: 2, lock: true } },
    exportRange: { from: 1, to: 2 } });
  assert.deepEqual(mixed.timing.lineTimes, { 1: 1, 2: 2 });
  assert.deepEqual(mixed.overrides, { 1: { cuts: 2, lock: true } });
  assert.deepEqual(mixed.exportRange, { from: 1, to: 2 });
});

test('partial/untrusted projects preserve baseline sanitation and enable new registered IDs', () => {
  const engine = createEngine(version);
  engine.register('layout', 'contractOnly', { name: 'Contract', special: false }, 'test');
  const project = engine.mergeProject({ enabled: { layout: { center: false } }, colors: {
    enabled: true, fg: '#abc', bg: '<script>', accentOn: true }, fonts: { display: 'gothic_black', body: 'missing' },
    locks: { tech: { layout: true, bad: 1, 'bad key': true }, params: { seed: true } },
    userFonts: [{ key: '<bad>', family: '<bad>' }], appVersion: 'old' });
  assert.equal(project.enabled.layout.center, false);
  assert.equal(project.enabled.layout.contractOnly, true);
  assert.deepEqual(project.colors, { enabled: true, fg: '#abc', accentOn: true });
  assert.deepEqual(project.fonts, { display: 'gothic_black' });
  assert.deepEqual(project.locks, { tech: { layout: true }, params: { seed: true } });
  assert.deepEqual(project.userFonts, []);
  assert.equal('appVersion' in project, false);
});

test('instances isolate registry/style/language/typeset state and cached streams', () => {
  const a = createEngine(version), b = createEngine(version);
  a.register('layout', 'onlyA', { name: 'A', special: true }, 'test');
  assert('onlyA' in a.registry('layout'));
  assert(!('onlyA' in b.registry('layout')));
  a.STYLES.noir.name = 'changed';
  assert.notEqual(a.STYLES.noir.name, b.STYLES.noir.name);
  const input = fixture('lrc-ja-project') as Project;
  a.plan({ ...input, typeset: true, lang: 'en' }, null);
  assert.deepEqual(summarize(b.plan(input, null)), fixture('lrc-ja-plan-summary').planSummary);
  const ra = a.rng(42), rb = b.rng(42);
  assert.deepEqual(Array.from({ length: 20 }, () => ra()), Array.from({ length: 20 }, () => rb()));
});

test('AE v2 range export clones its input and shifts cuts, companions, events and audio', () => {
  const engine = createEngine(version), project = fixture('lrc-ja-project') as Project;
  const plan = engine.plan(project, null);
  const before = JSON.stringify(plan);
  const range = engine.planForAE(plan, project, { t0: 2.4, t1: 4.8 });
  assert.equal(range.version, 2);
  assert.equal(range.duration, 2.4);
  assert.equal(range.audioOffset, 2.4);
  assert.deepEqual(range.range, { t0: 2.4, t1: 4.8 });
  assert(range.cuts.every(c => c.end > 0.001 && c.start < 2.399));
  assert.equal(JSON.stringify(plan), before);
});

test('cutAt boundaries and effect groups are stable', () => {
  const engine = createEngine(version), plan = engine.plan(fixture('lrc-ja-project'), null);
  assert.equal(engine.cutAt(plan, -1), null);
  assert.equal(engine.cutAt(plan, plan.duration), null);
  for (const c of plan.cuts) assert.equal(engine.cutAt(plan, c.start), c);
  const groups: EffectGroup[] = ['layout', 'enter', 'hold', 'exit', 'decor', 'treat', 'bg', 'cam', 'fx', 'trans'];
  assert.deepEqual(engine.GROUP_KEYS, groups);
});

test('saved locked cuts and per-cut overrides round-trip and retain their chosen effects', () => {
  const engine = createEngine(version), project = engine.mergeProject(fixture('lrc-ja-project'));
  const plan = engine.plan(project);
  const snapshot = engine.lineSnapshot(plan, 0);
  assert(snapshot && snapshot.length > 0);
  project.overrides = { 0: { lock: true, lockedSeed: plan.lines[0].seed, lockedCuts: snapshot },
    1: { cuts: 1, cutTech: { 0: { layout: 'center', enter: 'blur', trans: 'none' } } } };
  const restored = engine.mergeProject(JSON.parse(JSON.stringify(project)));
  assert.deepEqual(restored.overrides, project.overrides);
  const locked = engine.plan(restored);
  const before = plan.cuts.filter(c => c.line === 0), after = locked.cuts.filter(c => c.line === 0);
  for (let i = 0; i < before.length; i++) {
    for (const field of ['text', 'layout', 'enter', 'hold', 'exit', 'params', 'decor', 'scheme', 'seed'] as const)
      assert.deepEqual(after[i][field], before[i][field]);
  }
  assert.equal(locked.cuts.find(c => c.line === 1)?.layout, 'center');
  assert.equal(locked.cuts.find(c => c.line === 1)?.enter, 'blur');
});
