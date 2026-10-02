import assert from 'node:assert/strict';
import {test} from 'node:test';
import {prepareScene, finalizeScene} from '../dist/core/scene-plan.js';
import {measureCenterCut, centerText} from '../dist/canvas/center.js';
import {createCanvasFrame} from '../dist/canvas/frame.js';
import {prepareEffectItems} from '../dist/canvas/effect-frame.js';
import {fragments, resolutionBucket} from '../dist/canvas/glyphs.js';
import {popChar, driftPiece, PID} from '../dist/effects/motion.js';
import {center, kasumi, checkerStrip} from '../dist/index.js';
import installUtil from '../../engine/util.ts';
import installText from '../../engine/text.ts';
import installAnimation from '../../effects/core/animation.ts';
const config = {width: 640, height: 360, fps: 24};
const scene = (cut, extra = {}) => prepareScene({durationInFrames: 60, ...extra}, config, [cut]);
const fixed = center({params: {sx: 1, track: 0, ox: 0, oy: 0, under: false, sub: false, accent: false}});
const service = {prepareFonts() {}, measureCut: (c, s) => measureCenterCut(c, s, () => 1)};

test('center reflows Japanese/Latin, preserves explicit lines and original emphasis positions', () => {
  for (const text of ['新しい朝が来た希望の朝だ今日も', 'one two three four five six', 'ABCDEFGHIJKLMNO', '朝\n昼\n夜', 'A\n\nB']) {
    const p = scene({text, layout: fixed}), c = p.cuts[0], result = centerText(c, 640, 360);
    if (text === 'ABCDEFGHIJKLMNO' || text.includes('\n')) assert.equal(result.text, text);
    else assert.ok(result.text.includes('\n'));
  }
  const p = scene({text: '新しい朝が来た*希望の朝だ今日も*', layout: fixed}), g = measureCenterCut(p.cuts[0], p, () => 1);
  for (const glyph of g.items[0].glyphs) assert.equal(glyph.color, glyph.codePointIndex >= 7 ? '#F5A50C' : '#FFFFFF');
  const small = {...config, width: 180, height: 320};
  const portrait = prepareScene({durationInFrames: 60}, small, [{text: '新しい朝が来た希望の朝だ', layout: fixed}]);
  assert.ok(centerText(portrait.cuts[0], 180, 320).text.split('\n').length > 1);
});
test('center honors sx/offsets/accent/font cap, layout track priority and subtitle geometry', () => {
  const p = scene({text: {text: '朝', source: {line: 0, cut: 0, lineText: '新しい朝'}, emphasis: []}, layout: center({params: {sx: 1.45, ox: 0.1, oy: -0.1, track: 0, sub: true, accent: true}}), style: {fontSize: 40, track: 0.5}});
  const g = measureCenterCut(p.cuts[0], p, () => 1), it = g.items[0];
  assert.equal(it.sx, 1.45); assert.equal(it.x, 384); assert.equal(it.y, 144); assert.equal(it.track, 0); assert.equal(it.size, 40); assert.equal(it.glyphs[0].color, '#F5A50C'); assert.equal(g.subtitle.text, '新しい朝');
});
test('pop and drift formulas exactly match reference callback values with adapted item seeds', () => {
  const J = {registerBaselineAll(g, defs) {this[g] = defs;}}; installUtil(J); installText(J); installAnimation(J);
  for (const seed of [0, 1, 889, 4294967295]) {
    for (const p of [0, 0.1, 0.5, 0.99]) {
      const it = {seed, charFns: []}; J.enter.pop.apply({}, it, p);
      for (let i = 0; i < 5; i++) assert.deepEqual(popChar(seed, i, 5, p), it.charFns[0](i, {}, 5));
    }
    for (const elapsed of [0, 0.01, 0.4, 0.9, 1]) {
      const it = {seed, size: 64, pieceFns: []}; J.exit.drift.apply({lt: 2 + elapsed}, it, elapsed, {dur: 3, outDur: 1});
      for (let i = 0; i < 3; i++) {
        const a = driftPiece(seed, i, 2, 64, elapsed, 1), b = it.pieceFns[0](i, 2);
        if (a === PID || a === null) assert.equal(a === PID ? b === J.PID : b, a === PID ? true : null);
        else for (const k of Object.keys(a)) assert.ok(Math.abs(a[k] - b[k]) < 1e-10);
      }
    }
  }
});
test('fragment polygons preserve area, seed zero and bucket bounds without cached seed contamination', () => {
  assert.deepEqual([0, 64, 65, 128, 513].map(resolutionBucket), [64, 64, 128, 128, 512]);
  const piece = {id: 889, w: 0.9, h: 0.8};
  const a = fragments(piece, 0), b = fragments(piece, 1);
  assert.notDeepEqual(a, b); assert.deepEqual(fragments(piece, 0), a);
  const area = a.reduce((s, f) => s + Math.abs(f.poly.reduce((v, p, i, poly) => {const q = poly[(i + 1) % poly.length]; return v + p[0] * q[1] - q[0] * p[1];}, 0)) / 2, 0);
  assert.ok(Math.abs(area - piece.w * piece.h) < 1e-12);
});
test('effects mutate only frame scratch, breathe reflows and pop bbox falls back without history', async () => {
  const p = scene({text: '朝の光', layout: fixed, enter: 'pop', hold: 'breathe', exit: 'drift'}), plan = await finalizeScene(p, service), snapshot = JSON.stringify(plan);
  const start = createCanvasFrame(plan, 0); prepareEffectItems(start); assert.equal(start.box, null);
  const frames = new Map();
  for (const f of [0, 30, 10, 30, 50, 59, 30]) {const w = createCanvasFrame(plan, f); const motions = prepareEffectItems(w); const value = JSON.stringify([w, motions]); if (frames.has(f)) assert.equal(value, frames.get(f)); frames.set(f, value);}
  assert.equal(JSON.stringify(plan), snapshot);
  const hold = createCanvasFrame(plan, 30); prepareEffectItems(hold); assert.notEqual(hold.items[0].size, plan.cuts[0].geometry.items[0].size);
  const off = scene({text: '朝', layout: fixed, enter: null, hold: null, exit: null, decor: []});
  const offPlan = await finalizeScene(off, service), work = createCanvasFrame(offPlan, 20);
  const motions = prepareEffectItems(work); assert.deepEqual(work.items, offPlan.cuts[0].geometry.items); assert.deepEqual(motions, [{chars: []}]);
});
test('repeated decor and explicit seeds remain independent of other groups', () => {
  const declarations = {text: '朝', decor: [kasumi({seed: 0}), checkerStrip({seed: 1}), kasumi({seed: 0})]};
  const a = scene(declarations), b = scene({...declarations, decor: []});
  for (const key of ['layout', 'enter', 'exit', 'hold']) assert.deepEqual(a.cuts[0][key], b.cuts[0][key]);
  assert.equal(a.cuts[0].decor[0].seed, 0); assert.deepEqual(a.cuts[0].decor[0], a.cuts[0].decor[2]);
});
