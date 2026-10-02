import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createElement, Fragment} from 'react';
import {createPortal} from 'react-dom';
import {Sequence} from 'remotion';
import * as api from '../dist/index.js';
import {prepareScene, finalizeScene} from '../dist/core/scene-plan.js';
import {collectCuts, prepareSceneFromProps} from '../dist/react/collect-cuts.js';
import {h, sid, rng, cutSeed, selectionSeed, effectSeed, parameterSeed, itemSeed} from '../dist/core/random.js';
import installUtil from '../../engine/util.ts';
import installLayouts from '../../effects/core/layouts.ts';
const config = {width: 640, height: 360, fps: 24};
const plan = (cuts, props = {}, video = config) => prepareScene({durationInFrames: 60, ...props}, video, cuts);
const err = (code, path) => e => e instanceof api.JizuraError && e.code === code && (!path || e.path === path);
const durations = scene => scene.cuts.map(c => c.durationInFrames);
const froms = scene => scene.cuts.map(c => c.from);
const texts = n => Array.from({length: n}, (_, i) => ({text: String(i)}));

test('sequential placements, remainders, fixed durations and empty Scene', () => {
  assert.deepEqual(durations(plan(texts(7))), [9, 9, 9, 9, 8, 8, 8]);
  assert.deepEqual(froms(plan(texts(7))), [0, 9, 18, 27, 36, 44, 52]);
  const mixed = plan([10, undefined, 11, undefined].map(d => ({text: '朝', durationInFrames: d})));
  assert.deepEqual(durations(mixed), [10, 20, 11, 19]); assert.deepEqual(froms(mixed), [0, 10, 30, 41]);
  assert.deepEqual(plan([{text: '朝', durationInFrames: 10}, {text: '夜', durationInFrames: 20}]).cuts.map(c => [c.from, c.end]), [[0, 10], [10, 30]]);
  assert.deepEqual(plan([]).cuts, []);
});
test('explicit placements sort by time while retaining seed declaration indices', () => {
  const scene = plan([{text: '後', from: 30, durationInFrames: 10}, {text: '前', from: 5, durationInFrames: 10}]);
  assert.deepEqual(scene.cuts.map(c => [c.declarationIndex, c.from, c.end]), [[1, 5, 15], [0, 30, 40]]);
  assert.deepEqual(scene.cuts.map(c => c.seed), [cutSeed(scene.seed, 1), cutSeed(scene.seed, 0)]);
  assert.doesNotThrow(() => plan([{text: '朝', from: 5, durationInFrames: 5}, {text: '夜', from: 10, durationInFrames: 1}]));
});
test('invalid frame values, mixed modes, overlaps, bounds and insufficient time fail', () => {
  for (const v of [-1, NaN, Infinity, 0.5, '1', null, Number.MAX_SAFE_INTEGER + 1]) {
    for (const key of ['from', 'durationInFrames', 'enterDurationInFrames', 'exitDurationInFrames']) {
      assert.throws(() => plan([{text: '朝', [key]: v}]), err('E_NUMBER', `cuts[0].${key}`));
    }
  }
  assert.throws(() => plan([{text: '朝', durationInFrames: 0}]), err('E_NUMBER'));
  for (const cuts of [
    [{text: '朝', from: 1}, {text: '夜', durationInFrames: 2}],
    [{text: '朝', from: 1, durationInFrames: 1}, {text: '夜'}],
    [{text: '朝', from: 5, durationInFrames: 10}, {text: '夜', from: 14, durationInFrames: 10}],
    [{text: '朝', from: 60, durationInFrames: 1}], [{text: '朝', durationInFrames: 61}],
  ]) assert.throws(() => plan(cuts), err('E_TIMING'));
  assert.throws(() => plan(texts(7), {durationInFrames: 6}), err('E_TIMING', 'cuts'));
  assert.throws(() => plan([{text: '朝', from: Number.MAX_SAFE_INTEGER, durationInFrames: 1}]), err('E_NUMBER', 'cuts[0].end'));
  assert.throws(() => plan([{text: '朝', durationInFrames: Number.MAX_SAFE_INTEGER}, {text: '夜', durationInFrames: 1}], {durationInFrames: Number.MAX_SAFE_INTEGER}), err('E_NUMBER'));
});
test('D-1 phase budget, proportional rounding and explicit phase overrides', () => {
  const phase = (d, props = {}) => {
    const c = plan([{text: '朝', durationInFrames: d, ...props}]).cuts[0];
    return [c.enterDurationInFrames, c.exitDurationInFrames];
  };
  assert.deepEqual(phase(60), [14, 17]); assert.deepEqual(phase(1), [0, 0]); assert.deepEqual(phase(2), [0, 1]);
  assert.deepEqual(phase(2, {enterDurationInFrames: 1}), [1, 0]);
  assert.deepEqual(phase(2, {exitDurationInFrames: 1}), [0, 1]);
  assert.deepEqual(phase(60, {enter: null, exit: null}), [0, 0]);
  assert.deepEqual(phase(60, {enterDurationInFrames: 0, exitDurationInFrames: 0}), [0, 0]);
  assert.equal(plan([{text: '朝', enterDurationInFrames: 0}]).cuts[0].enter.id !== null, true);
  assert.throws(() => phase(1, {enterDurationInFrames: 1}), err('E_TIMING'));
  assert.throws(() => phase(5, {enterDurationInFrames: 3, exitDurationInFrames: 2}), err('E_TIMING'));
  assert.throws(() => phase(60, {enter: null, enterDurationInFrames: 1}), err('E_TIMING'));
  // Equal fractional remainders favor enter before exit.
  const tie = plan([{text: '朝'}], {durationInFrames: 2}, {...config, fps: 1}).cuts[0];
  assert.deepEqual([tie.enterDurationInFrames, tie.exitDurationInFrames], [1, 0]);
  for (const fps of [1, 12, 23.976, 24, 30, 60, 120]) {
    for (let d = 1; d <= 60; d++) {
      const c = plan([{text: '朝'}], {durationInFrames: d}, {...config, fps}).cuts[0];
      assert(c.enterDurationInFrames + c.exitDurationInFrames <= d - 1);
      assert(Number.isSafeInteger(c.enterDurationInFrames)); assert(Number.isSafeInteger(c.exitDurationInFrames));
    }
  }
});
test('factories make detached declarations, preserve 0/false, and reject invalid input', () => {
  const options = {seed: 0, params: {sx: 1, track: 0, under: false, ox: 0}};
  const declared = api.center(options);
  assert.deepEqual(declared, {group: 'layout', id: 'center', ...options});
  assert(Object.isFrozen(declared.params)); assert(!Object.isFrozen(options.params));
  options.params.sx = 2; assert.equal(declared.params.sx, 1);
  for (const name of ['pop', 'wipe', 'drift', 'breathe']) {
    assert.deepEqual(api[name]({seed: 0, params: {}}), {group: name === 'drift' ? 'exit' : name === 'breathe' ? 'hold' : 'enter', id: name, seed: 0, params: {}});
    assert.throws(() => api[name]({params: {sx: 1}}), err('E_EFFECT'));
  }
  for (const input of [null, false, [], {extra: 1}, {params: null}, {params: {sx: 0}}, {params: {sx: Infinity}},
    {params: {track: 1.1}}, {params: {under: 0}}, {params: {seed: 1}}]) assert.throws(() => api.center(input), err('E_EFFECT'));
  for (const v of [-1, 2 ** 32, 0.5, '2']) assert.throws(() => api.center({seed: v}), err('E_NUMBER', 'center.seed'));
  assert.doesNotThrow(() => api.kasumi({params: {n: 3, r: 0, from: 0, to: 999, v: 0, mode: 'index', big: false}}));
  for (const p of [{n: 0}, {n: 1.5}, {r: 1}, {from: 21}, {to: 29}, {v: 6}, {mode: 'auto'}, {low: null}]) assert.throws(() => api.checkerStrip({params: p}), err('E_EFFECT'));
});
test('unknown/mismatched effects, disable rules and decor limits are explicit', () => {
  for (const value of [null, false, '', 'auto', 'missing', {group: 'enter', id: 'center'}, {group: 'layout', id: 'center', extra: true}]) {
    assert.throws(() => plan([{text: '朝', layout: value}]), err('E_EFFECT'));
  }
  for (const value of [false, '', 'auto', 'cut', 'none', api.kasumi(), {group: 'enter', id: 'pop', params: {v: 1}}]) assert.throws(() => plan([{text: '朝', enter: value}]), err('E_EFFECT'));
  for (const decor of [null, 'kasumi', [null], [undefined], new Array(1), Array(17).fill('kasumi')]) assert.throws(() => plan([{text: '朝', decor}]), err('E_EFFECT'));
  for (const group of ['treat', 'bg', 'cam', 'fx', 'trans']) {
    assert.throws(() => plan([{text: '朝', [group]: 'something'}]), err('E_EFFECT', `cuts[0].${group}`));
    assert.doesNotThrow(() => plan([{text: '朝', [group]: null}]));
  }
  const c = plan([{text: '朝', enter: null, exit: null, hold: null, decor: []}]).cuts[0];
  assert.equal(c.enter, null); assert.equal(c.exit, null); assert.equal(c.hold, null); assert.deepEqual(c.decor, []);
});
test('seed primitives match the retained util implementation exactly, including zero', () => {
  const J = {}; installUtil(J);
  for (const s of ['', 'cut', 'select', 'params', '😀', '漢字', '\uD800']) assert.equal(sid(s), J.sid(s));
  for (const args of [[0], [1], [0, 0, 0, 0, 0], [4294967295, 99, 4, 8, 0], [20260922, 1, sid('cut')]]) assert.equal(h(...args), J.h(...args));
  for (const s of [0, 1, 20260922, 4294967295]) {
    const a = rng(s), b = J.rng(s);
    for (let i = 0; i < 20; i++) assert.equal(a(), b());
    assert.equal(a.int(1, 3), b.int(1, 3)); assert.equal(a.range(-0.1, 0.2), b.range(-0.1, 0.2));
    assert.equal(a.chance(0.5), b.chance(0.5)); assert.equal(a.pick(['a', 'b']), b.pick(['a', 'b']));
  }
});
test('group seed derivation and old parameter call order preserve partial overrides', () => {
  const J = {FONTS: {face: {}}, registerBaselineAll: (_group, defs) => {J.layouts = defs;}};
  installUtil(J); installLayouts(J);
  for (const cut of [0, 1, 1234, 4294967295]) {
    const c = plan([{text: '朝', seed: cut}]).cuts[0];
    assert.equal(c.enter.id, J.rng(selectionSeed(cut, 'enter')).pick(['pop', 'wipe']));
    assert.equal(c.decor[0].id, J.rng(selectionSeed(cut, 'decor')).pick(['kasumi', 'checkerStrip']));
    const s = effectSeed(cut, 'layout', 'center', 0);
    const {font, ...expected} = J.layouts.center.plan(J.rng(parameterSeed(s)), {}, {fonts: {display: ['face'], serif: ['face']}});
    assert.deepEqual(c.layout.params, expected);
    assert.equal(c.layout.seed, s); assert.equal(c.layout.itemSeed, itemSeed(s, 0));
    const r = J.rng(parameterSeed(c.decor[0].seed)); r.int(1, 1e9);
    const decorExpected = {n: r.int(1, 3), right: r.chance(0.5), low: r.chance(0.5), accent: r.chance(0.4), corner: r.chance(0.5), big: r.chance(0.4), mode: r.pick(['count', 'index']), from: r.int(0, 20), to: r.int(30, 999), v: r.int(0, 5), r: r()};
    assert.deepEqual(c.decor[0].params, decorExpected);
    const overridden = plan([{text: '朝', seed: cut, layout: api.center({params: {sx: 1, under: false}})}]).cuts[0];
    assert.deepEqual(overridden.layout.params, {...expected, sx: 1, under: false});
  }
});
test('Cut seed isolates Scene/position; decor count/order do not perturb other groups', () => {
  const get = (decor, props = {}, extras = []) => plan([...extras, {text: '朝', seed: 1234, decor}], props).cuts.at(-1);
  const a = get(undefined), b = get([api.kasumi({seed: 889}), api.checkerStrip({seed: 721})], {seed: 88}, [{text: '前'}]);
  for (const g of ['layout', 'enter', 'exit', 'hold']) assert.deepEqual(a[g], b[g]);
  const duplicates = get(['kasumi', 'kasumi']);
  assert.notEqual(duplicates.decor[0].seed, duplicates.decor[1].seed);
  const fixed = get([api.kasumi({seed: 0}), api.kasumi({seed: 0})]);
  assert.deepEqual(fixed.decor[0], fixed.decor[1]);
  const reordered = get(['checkerStrip', api.kasumi({seed: 0})]);
  assert.deepEqual(reordered.decor[1], fixed.decor[0]);
  const plain = plan([{text: '朝', seed: 0}]), marked = plan([{text: '*朝*', seed: 0}]);
  for (const g of ['layout', 'enter', 'exit', 'hold', 'decor']) assert.deepEqual(plain.cuts[0][g], marked.cuts[0][g]);
  assert.notEqual(plan([{text: '朝'}]).cuts[0].seed, plan([{text: '朝'}], {seed: 0}).cuts[0].seed);
});
test('font replacement, palette merging and explicit track priorities', () => {
  const props = {font: {family: 'Scene', src: './scene.woff2', weight: 500}, style: {palette: {fg: '#f00'}, track: 0.1, lead: 2}};
  const c = plan([{text: '朝', font: {family: '別face'}, style: {palette: {accent: '#00f'}, track: 0}}], props).cuts[0];
  assert.deepEqual(c.font, {family: '別face', weight: 700, style: 'normal'});
  assert.equal(c.style.palette.fg, '#FF0000'); assert.equal(c.style.palette.accent, '#0000FF');
  assert.equal(c.style.emphasisColor, '#0000FF'); assert.equal(c.style.lead, 2);
  assert.equal(c.layout.params.track, 0); assert.equal(c.trackSource, 'style');
  const p = plan([{text: '朝', layout: api.center({params: {track: 0.3}})}], props).cuts[0];
  assert.equal(p.layout.params.track, 0.3); assert.equal(p.trackSource, 'params');
  assert.equal(plan([{text: '朝'}]).cuts[0].trackSource, 'auto');
  assert.equal(plan([], {style: {palette: {bg: '#123'}}}).background, '#112233');
  assert.equal(plan([{text: '朝', style: {palette: {bg: '#fff'}}}]).background, '#111111');
  assert.equal(plan([{text: '朝', style: {emphasisColor: '#abc'}}]).cuts[0].style.emphasisColor, '#AABBCC');
});
test('font, Style, seeds and motionFps are validated without loading resources', () => {
  for (const font of [null, {}, {family: ''}, {family: 'a,b'}, {family: 'a"'}, {family: 'a\\'}, {family: 'a\n'}, {family: 'a', weight: 0}, {family: 'a', style: 'bold'}, {family: 'a', src: ''}, {family: 'a', extra: 1}]) assert.throws(() => plan([], {font}), err('E_STYLE'));
  for (const style of [null, {palette: null}, {palette: {fg: 'red'}}, {palette: {nope: '#fff'}}, {fontSize: 0}, {track: -1}, {lead: 4.1}, {emphasisColor: null}, {extra: 1}]) assert.throws(() => plan([], {style}), err('E_STYLE'));
  for (const s of [-1, 2 ** 32, NaN, null, '0']) {
    assert.throws(() => plan([], {seed: s}), err('E_NUMBER', 'seed'));
    assert.throws(() => plan([{text: '朝', seed: s}]), err('E_NUMBER', 'cuts[0].seed'));
  }
  for (const m of [0, -1, 25, Infinity, '12', false]) assert.throws(() => plan([], {motionFps: m}), err('E_NUMBER', 'motionFps'));
  assert.equal(plan([], {motionFps: 12}).motionFps, 12); assert.equal(plan([], {motionFps: null}).motionFps, null);
  assert.throws(() => plan([], {}, {...config, fps: 0}), err('E_NUMBER', 'fps'));
  assert.throws(() => plan(texts(1001)), err('E_INPUT', 'cuts'));
  assert.throws(() => plan(Array(11).fill({text: '朝'.repeat(10000)})), err('E_INPUT', 'cuts'));
});
test('direct Cut/array/Fragment collection is depth first, ignores empties and React keys', () => {
  const cut = (text, key) => createElement(api.JizuraCut, {text, key});
  const children = [null, false, [cut('朝', 'a'), createElement(Fragment, null, [true, cut('夜', 'b')])], cut('次', 'c')];
  assert.deepEqual(collectCuts(children).map(c => c.text), ['朝', '夜', '次']);
  const scene = prepareSceneFromProps({durationInFrames: 60, children}, config);
  assert.deepEqual(scene.cuts.map(c => c.text), ['朝', '夜', '次']);
  assert.deepEqual(scene, prepareSceneFromProps({durationInFrames: 60, children: ['朝', '夜', '次'].map(t => cut(t, 'other' + t))}, config));
  let called = false;
  const Custom = () => {called = true; return cut('朝');};
  for (const child of ['朝', 1, createElement('div'), createElement(Custom), createElement(Sequence), createPortal(cut('朝'), {nodeType: 1}), createElement(Fragment, {title: 'x'}), createElement(api.JizuraCut, {text: '朝', children: null})]) {
    assert.throws(() => collectCuts(child), err('E_CHILD'));
  }
  assert.equal(called, false);
});
test('first invalid input respects Scene/children/declaration/time ordering', () => {
  assert.throws(() => prepareSceneFromProps({durationInFrames: 0, children: 'invalid'}, config), err('E_NUMBER', 'durationInFrames'));
  assert.throws(() => prepareSceneFromProps({durationInFrames: 60, children: [createElement(api.JizuraCut, {text: ''}), 'bad']}, config), err('E_CHILD', 'children[1]'));
  assert.throws(() => plan([{text: '', seed: -1, font: null, enter: 'bad'}]), err('E_TEXT', 'cuts[0].text'));
  assert.throws(() => plan([{text: '朝', seed: -1, font: null, enter: 'bad'}]), err('E_NUMBER', 'cuts[0].seed'));
  assert.throws(() => plan([{text: '朝', font: null, enter: 'bad'}]), err('E_STYLE', 'cuts[0].font'));
  assert.throws(() => plan([{text: '朝', from: 30, durationInFrames: 20, enter: 'bad'}, {text: '', from: 1, durationInFrames: 40}]), err('E_EFFECT', 'cuts[0].enter'));
  assert.throws(() => plan([{text: '朝', durationInFrames: 61}, {text: ''}]), err('E_TEXT', 'cuts[1].text'));
});
test('plans are detached and immutable, and repeat across interleaved Scenes', async () => {
  const input = {text: '朝', layout: {group: 'layout', id: 'center', params: {sx: 1}}, style: {palette: {fg: '#abc'}}};
  const a = plan([input]); plan([{text: '別', seed: 998}], {width: 100, seed: 2});
  assert.deepEqual(plan([input]), a);
  assert.throws(() => {a.cuts[0].layout.params.sx = 2;}, TypeError);
  input.layout.params.sx = 2; assert.equal(a.cuts[0].layout.params.sx, 1);
  assert.equal(Object.isFrozen(input.style.palette), false);
  const calls = [], geometry = {glyphs: [{ch: '朝', advance: 10}], box: {x0: 0, y0: 0, x1: 10, y1: 12}};
  // Explicit test measurement stub: no actual fonts, glyph raster or effects.
  const service = {prepareFonts: async s => {calls.push(['fonts', s.width]);}, measureCut: async c => {calls.push(['measure', c.text]); return geometry;}};
  const first = await finalizeScene(a, service);
  assert.deepEqual(calls, [['fonts', 640], ['measure', '朝']]);
  assert.deepEqual(await finalizeScene(a, service), first);
  assert(Object.isFrozen(first.cuts[0].geometry.glyphs[0])); assert(!Object.isFrozen(geometry.glyphs[0]));
  geometry.glyphs[0].advance = 20; assert.equal(first.cuts[0].geometry.glyphs[0].advance, 10);
  let measured = false;
  const error = new api.JizuraError('E_FONT', 'font', 'test load failure');
  await assert.rejects(finalizeScene(a, {prepareFonts: async () => {throw error;}, measureCut: () => {measured = true;}}), e => e === error);
  assert.equal(measured, false);
  await assert.rejects(finalizeScene(a, {prepareFonts() {}, measureCut: () => ({advance: NaN})}), err('E_NUMBER'));
  const cycle = {}; cycle.self = cycle;
  await assert.rejects(finalizeScene(a, {prepareFonts() {}, measureCut: () => cycle}), err('E_INPUT'));
});
