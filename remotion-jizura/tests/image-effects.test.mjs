import assert from 'node:assert/strict';
import {test} from 'node:test';
import {sliceGlitch} from '../dist/index.js';
test('native image effect keys include frame, seed and disabled; no DOM at factory time', () => {
  const a = sliceGlitch(), b = sliceGlitch({amount: 0.65, frame: 0});
  assert.equal(a.effectKey, b.effectKey);
  for (const params of [{frame: 1}, {seed: 0}, {disabled: true}, {amount: 0}]) assert.notEqual(sliceGlitch(params).effectKey, a.effectKey);
  assert.equal(a.definition.backend, '2d');
  assert.equal(a.definition.schema.disabled.type, 'boolean');
});
test('native image parameter bounds reject invalid values before resource work', () => {
  for (const params of [{amount: NaN}, {amount: null}, {amount: 1.1}, {displacement: -1}, {bands: 0}, {bands: 1.5}, {seed: -1}, {seed: 2 ** 32}, {frame: -1}, {fps: 0}, {rate: 121}, {disabled: 1}, {unknown: 1}, null]) {
    assert.throws(() => sliceGlitch(params), TypeError);
  }
  sliceGlitch({amount: 0, displacement: 0, bands: 1, seed: 0, frame: 0, rate: 0});
});
