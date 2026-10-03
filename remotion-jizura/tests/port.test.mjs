import test from 'node:test';
import assert from 'node:assert/strict';
import {portCases, representativeFrames, sceneDuration, getPortCase} from './port-cases.ts';
import {requirePixels, requireVisible, requireResolvedProps} from './port-metrics.mjs';
test('port gates reject blank anchors, changed alpha/pixels and stale props', () => {
  assert.throws(() => requirePixels([], []), /empty RGBA/);
  assert.throws(() => requireVisible([0, 0, 0, 0], [0, 0, 0, 0], 'blank'), /Empty/);
  assert.throws(() => requirePixels([255, 0, 0, 255], [0, 0, 0, 255]), /Pixel mismatch/);
  assert.throws(() => requirePixels([1, 0, 0, 254], [1, 0, 0, 255], 'canvas-screenshot'), /Pixel mismatch/);
  requirePixels([101, 0, 0, 128], [102, 0, 0, 128], 'canvas-screenshot');
  assert.throws(() => requirePixels([101, 0, 0, 128], [102, 0, 0, 128]), /Pixel mismatch/);
  assert.throws(() => requireResolvedProps({props: {caseId: 'center'}}, {caseId: 'center', edit: true}), /Stale Composition/);
});
test('port cases keep distinct provenance, anchors and inspectable boundaries', () => {
  assert.equal(new Set(portCases.map(c => c.id)).size, portCases.length);
  assert.throws(() => getPortCase('missing'), /Unknown/);
  for (const spec of portCases) {
    const frames = representativeFrames(spec);
    assert.ok(spec.reason.length > 10);
    assert.ok(frames.includes(sceneDuration(spec)) && frames.includes(spec.from + spec.duration));
    assert.ok(frames.every(f => Number.isSafeInteger(f) && f >= 0 && f <= sceneDuration(spec)));
    assert.ok(spec.enter + spec.exit < spec.duration);
    if (spec.kind === 'image' || spec.preset === 'custom') assert.equal(spec.legacy, false);
  }
  assert.ok(portCases.some(c => c.parallel));
});
