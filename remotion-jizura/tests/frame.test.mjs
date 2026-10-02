import assert from 'node:assert/strict';
import {test} from 'node:test';
import {prepareScene, finalizeScene} from '../dist/core/scene-plan.js';
import {evaluateFrame} from '../dist/core/frame.js';
import {createCanvasFrame} from '../dist/canvas/frame.js';
import {measureStaticCut} from '../dist/canvas/geometry.js';

const config = {width: 640, height: 360, fps: 24};
const scene = (cuts, props = {}, durationInFrames = 60) => prepareScene({durationInFrames, ...props}, config, cuts);
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-12, `${a} != ${b}`);

test('integer half-open boundaries, unsorted declarations, gaps and empty/outside Scenes', () => {
  const p = scene([{text: '夜', from: 30, durationInFrames: 10}, {text: '朝', from: 5, durationInFrames: 10}]);
  for (const f of [-1, 0, 4, 15, 29, 40, 59, 60]) {
    const s = evaluateFrame(p, f);
    assert.equal(s.sceneActive, f >= 0 && f < 60);
    assert.equal(s.activeCutIndex, null); assert.equal(s.localFrame, null);
    assert.equal(s.evaluationSeconds, null); assert.equal(s.applyHold, false);
  }
  for (const [f, index, local, declaration] of [[5, 0, 0, 1], [14, 0, 9, 1], [30, 1, 0, 0], [39, 1, 9, 0]]) {
    const s = evaluateFrame(p, f);
    assert.equal(s.activeCutIndex, index); assert.equal(s.localFrame, local);
    assert.equal(p.cuts[index].declarationIndex, declaration);
  }
  assert.equal(evaluateFrame(scene([]), 0).activeCutIndex, null);
  const adjacent = scene([{text: '朝', durationInFrames: 30}, {text: '夜', durationInFrames: 30}]);
  assert.equal(evaluateFrame(adjacent, 29).activeCutIndex, 0);
  assert.equal(evaluateFrame(adjacent, 30).activeCutIndex, 1);
  assert.equal(evaluateFrame(adjacent, 59).localFrame, 29);
  assert.equal(evaluateFrame(adjacent, 60).activeCutIndex, null);
  for (const f of [NaN, Infinity, 0.5, '1', Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => evaluateFrame(p, f), {code: 'E_NUMBER', path: 'frame'});
});

test('D60 phase progress and hold intensity follow the seconds contract', () => {
  const p = scene([{text: '朝', enter: 'pop', exit: 'drift', hold: 'breathe'}]);
  const start = evaluateFrame(p, 0);
  assert.equal(start.pIn, 0); assert.equal(start.applyEnter, true); assert.equal(start.applyHold, false);
  close(start.enterSeconds, 14 / 24); close(start.exitSeconds, 17 / 24);
  const entered = evaluateFrame(p, 14);
  assert.equal(entered.pIn, 1); assert.equal(entered.applyEnter, false);
  close(entered.holdAmount, ((14 / 24) - (14 / 24) * 0.85) / 0.25);
  assert.equal(evaluateFrame(p, 43).pOut, 0); assert.equal(evaluateFrame(p, 43).applyExit, false);
  const last = evaluateFrame(p, 59);
  close(last.pOut, 16 / 17); close(last.holdAmount, 1 / 17);
  assert.equal(last.applyExit, true); assert.equal(last.step, 59);
  assert.equal(evaluateFrame(p, 60).activeCutIndex, null);
});

test('D1/D2 and zero-duration or disabled effects skip their apply stages', () => {
  for (const d of [1, 2]) {
    const p = scene([{text: '朝', durationInFrames: d}]);
    const first = evaluateFrame(p, 0);
    assert.equal(first.pIn, 1); assert.equal(first.pOut, 0); assert.equal(first.applyEnter, false);
    assert.equal(first.exitSeconds, (d - 1) / 24);
    if (d === 2) { const last = evaluateFrame(p, 1); assert.equal(last.pOut, 0); assert.equal(last.applyExit, false); }
    assert.equal(evaluateFrame(p, d).activeCutIndex, null);
  }
  for (const cut of [{enter: null, exit: null, hold: null}, {enterDurationInFrames: 0, exitDurationInFrames: 0, hold: null}]) {
    const p = scene([{text: '朝', ...cut}]);
    for (const f of [0, 10, 59]) {
      const s = evaluateFrame(p, f);
      assert.equal(s.pIn, 1); assert.equal(s.pOut, 0);
      assert.equal(s.applyEnter || s.applyHold || s.applyExit, false);
    }
  }
});

test('motionFps quantizes only local evaluation time, never Cut selection', () => {
  const p = scene([{text: '朝', from: 0, durationInFrames: 5}, {text: '夜', from: 5, durationInFrames: 10}], {motionFps: 12});
  for (const [f, t, step] of [[5, 0, 0], [6, 0, 0], [7, 1 / 12, 2], [14, 1 / 3, 8]]) {
    const s = evaluateFrame(p, f);
    assert.equal(s.activeCutIndex, 1); assert.equal(s.evaluationSeconds, t); assert.equal(s.step, step);
  }
  assert.equal(evaluateFrame(p, 15).activeCutIndex, null);
  const unquantized = scene([{text: '朝'}]);
  close(evaluateFrame(unquantized, 7).evaluationSeconds, 7 / 24);
  const fractional = prepareScene({durationInFrames: 60, motionFps: 10}, {...config, fps: 29.97}, [{text: '朝'}]);
  close(evaluateFrame(fractional, 17).evaluationSeconds, 0.5);
});

test('scratch item, glyph, font and box changes cannot accumulate in immutable plans', async () => {
  const p = scene([{text: '朝', durationInFrames: 30}, {text: '夜', durationInFrames: 30}]);
  const service = {prepareFonts() {}, measureCut: (c, s) => measureStaticCut(c, s, () => 1)};
  const plan = await finalizeScene(p, service), before = JSON.stringify(plan);
  const first = createCanvasFrame(plan, 30);
  for (const f of [0, 30, 10, 30]) {
    const work = createCanvasFrame(plan, f);
    work.items[0].x += 100; work.items[0].font.family = 'scratch';
    work.items[0].glyphs[0].x = 999; work.items[0].glyphs[0].color = '#FF0000';
    work.box.x0 = 0;
  }
  assert.equal(JSON.stringify(plan), before);
  assert.deepEqual(createCanvasFrame(plan, 30), first);
  assert.deepEqual(createCanvasFrame(await finalizeScene(p, service), 30), first);
  assert.deepEqual(createCanvasFrame(plan, 60).items, []);
  assert.equal(createCanvasFrame(plan, 60).box, null);
});
