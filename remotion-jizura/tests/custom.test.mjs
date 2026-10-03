import assert from 'node:assert/strict';
import {test} from 'node:test';
import {defineLayoutEffect, defineMotionEffect, defineDecorEffect, resolveScene, JizuraError} from '../dist/index.js';
import {prepareScene, finalizeScene} from '../dist/core/scene-plan.js';
import {sceneInspection} from '../dist/inspection.js';
import {measureCustomCut} from '../dist/canvas/custom-layout.js';
import {createCanvasFrame} from '../dist/canvas/frame.js';
import {prepareEffectItems} from '../dist/canvas/effect-frame.js';
const config = {width: 640, height: 360, fps: 24}, scene = {durationInFrames: 60};
const spec = {id: 'test.layout', name: 'Test', description: 'Test placement.', tags: ['test'],
  schema: {offset: {type: 'number', min: -100, max: 100, default: 0, description: 'Offset.'}},
  layout: c => [{x: c.width / 2 + c.params.offset, y: c.height / 2, size: c.fitText({maxWidth: 400, maxHeight: 100})}]};
const layout = defineLayoutEffect(spec);
const cut = (effect = layout()) => ({text: '*朝*が来た', seed: 123, layout: effect, enter: null, exit: null, hold: null, decor: []});
const error = code => e => e instanceof JizuraError && e.code === code;
const service = {prepareFonts() {}, measureCut(c, s) {return measureCustomCut(c, s, () => 1);}}; // metrics stub, not real font evidence

test('custom schemas are owned, defaults preserve 0/false/enums and factory params are validated', () => {
  const factory = defineMotionEffect({group: 'hold', id: 'test.motion', name: 'T', description: 'T', tags: [], transform: () => null,
    schema: {n: {type: 'number', min: 0, max: 4, integer: true, default: 2, description: 'n'},
      b: {type: 'boolean', default: true, description: 'b'}, v: {type: 'enum', values: ['a', 'b'], default: 'a', description: 'v'}}});
  const result = resolveScene(scene, config, [{...cut(), hold: factory({seed: 0, params: {n: 0, b: false, v: 'b'}})}]);
  assert.deepEqual(result.cuts[0].hold.params, {n: 0, b: false, v: 'b'});
  assert.equal(result.cuts[0].hold.seed, 0);
  for (const params of [{n: 1.5}, {n: NaN}, {v: 'c'}, {b: 1}, {extra: 0}]) assert.throws(() => factory({params}), error('E_EFFECT'));
  const independent = defineLayoutEffect(spec); spec.schema.offset.default = 5;
  assert.equal(independent.metadata.schema.offset.default, 0); spec.schema.offset.default = 0;
  assert.equal(Object.isFrozen(independent.metadata.schema.offset), true);
});
test('schema definition errors fail before execution', () => {
  for (const change of [{schema: {x: {type: 'number', default: 1, min: 2, max: 3, description: 'x'}}},
    {schema: {x: {type: 'enum', default: 'x', values: ['a'], description: 'x'}}}, {tags: [0]}, {id: ''}, {layout: null}])
    assert.throws(() => defineLayoutEffect({...spec, ...change}), error('E_EFFECT'));
});
test('custom declarations reject JSON copies, mismatched groups and reserved built-in IDs', () => {
  assert.throws(() => resolveScene(scene, config, [cut(JSON.parse(JSON.stringify(layout())))]), error('E_EFFECT'));
  assert.throws(() => resolveScene(scene, config, [{...cut(), enter: layout()}]), error('E_EFFECT'));
  assert.throws(() => resolveScene(scene, config, [cut(defineLayoutEffect({...spec, id: 'center'})())]), error('E_EFFECT'));
});
test('ID collisions are local to a Scene; the same definition may repeat', () => {
  const other = defineLayoutEffect(spec);
  assert.throws(() => resolveScene(scene, config, [cut(), cut(other())]), e => error('E_EFFECT')(e) && e.path === 'cuts[1].layout');
  assert.equal(resolveScene(scene, config, [cut(), cut()]).cuts.length, 2);
  assert.equal(resolveScene(scene, config, [cut(other())]).cuts[0].layout.id, spec.id);
});
test('definitions never enter auto selection; custom edits preserve other groups and fixed Cuts', () => {
  const auto = resolveScene(scene, config, [{text: '朝', seed: 123}]);
  defineLayoutEffect({...spec, id: 'test.unused'});
  assert.deepEqual(resolveScene(scene, config, [{text: '朝', seed: 123}]), auto);
  const a = resolveScene(scene, config, [cut(), {...cut(), seed: 456}]);
  const b = resolveScene({...scene, seed: 1}, config, [cut(layout({params: {offset: 20}})), {...cut(), seed: 456}]);
  assert.deepEqual(a.cuts[1], b.cuts[1]); assert.equal(a.cuts[0].layout.seed, b.cuts[0].layout.seed);
});
test('prepared/measured snapshots are detached, serializable and contain no runtime identity', async () => {
  const prepared = prepareScene(scene, config, [cut()]), plan = await finalizeScene(prepared, service);
  const snapshot = sceneInspection(prepared, plan);
  assert.equal(resolveScene(scene, config, [cut()]).stage, 'prepared'); assert.equal(snapshot.stage, 'measured');
  assert.equal(snapshot.cuts[0].geometry.items[0].glyphCount, 4);
  snapshot.cuts[0].layout.params.offset = 99; snapshot.cuts[0].geometry.box.x0 = -999;
  assert.equal(prepared.cuts[0].layout.params.offset, 0); assert.notEqual(plan.cuts[0].geometry.box.x0, -999);
  assert.ok(!JSON.stringify(snapshot).includes('customKey')); assert.ok(!JSON.stringify(snapshot).includes('random'));
  assert.equal(plan.cuts[0].geometry.items[0].glyphs[0].color, prepared.cuts[0].style.emphasisColor);
});
test('layout rejects async, empty and invalid placements without corrupting plan', async () => {
  for (const fn of [() => [], () => [{x: 0, y: 0, size: NaN}], async () => [{x: 0, y: 0, size: 30}]]) {
    const prepared = prepareScene(scene, config, [cut(defineLayoutEffect({...spec, layout: fn})())]);
    await assert.rejects(finalizeScene(prepared, service), error('E_EFFECT'));
  }
});
test('custom glyph transforms are stateless across reverse frames and independent scenes', async () => {
  const hold = defineMotionEffect({group: 'hold', id: 'test.wave', name: 'T', description: 'T', tags: [], schema: {},
    transform: ({seconds, progress, random, glyphIndex}) => ({dy: (seconds + random(glyphIndex)) * progress, alpha: 0.5, rotation: 4})});
  const prepared = prepareScene(scene, config, [{...cut(), hold: hold({seed: 0})}]);
  const plan = await finalizeScene(prepared, service), before = JSON.stringify(plan);
  const run = frame => {const work = createCanvasFrame(plan, frame); return prepareEffectItems(work, prepared);};
  const expected = run(30); run(50); run(10); assert.deepEqual(run(30), expected);
  assert.equal(JSON.stringify(plan), before); assert.equal(expected[0].chars[0].a, 0.5);
});
test('invalid custom glyph output fails with a named effect path', async () => {
  const hold = defineMotionEffect({group: 'hold', id: 'test.bad', name: 'T', description: 'T', tags: [], schema: {}, transform: () => ({alpha: 2})});
  const prepared = prepareScene(scene, config, [{...cut(), hold: hold()}]), plan = await finalizeScene(prepared, service);
  assert.throws(() => prepareEffectItems(createCanvasFrame(plan, 30), prepared), e => error('E_EFFECT')(e) && e.path === 'hold.test.bad.transform.alpha');
});
