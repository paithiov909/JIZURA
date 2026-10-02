import assert from 'node:assert/strict';
import {test} from 'node:test';
import {JizuraError, parseLines} from '../dist/index.js';
import {resolveText} from '../dist/core/text.js';
import {autoChunks} from '../dist/core/scripts.js';
import installUtil from '../../engine/util.ts';
import installLayouts from '../../effects/core/layouts.ts';
import installPlanner from '../../engine/planner.ts';
const err = (code, path) => e => e instanceof JizuraError && e.code === code && (!path || e.path === path);

test('exact API example, manual boundaries and emphasis crossing Cuts', () => {
  assert.deepEqual(parseLines('\n新しい/朝が来た\n*希望*の朝だ\n', {numCuts: 'auto'}), [
    {text: '新しい', emphasis: [], source: {line: 1, cut: 0, lineText: '新しい朝が来た'}},
    {text: '朝が来た', emphasis: [], source: {line: 1, cut: 1, lineText: '新しい朝が来た'}},
    {text: '希望の朝だ', emphasis: [{start: 0, end: 2}], source: {line: 2, cut: 0, lineText: '希望の朝だ'}},
  ]);
  assert.deepEqual(parseLines('*朝/夜*').map(c => c.emphasis), [[{start: 0, end: 1}], [{start: 0, end: 1}]]);
  assert.deepEqual(parseLines('朝\\/夜').map(c => c.text), ['朝/', '夜']);
  assert.deepEqual(parseLines('朝\\*夜/\\\\朝').map(c => c.text), ['朝*夜', '\\朝']);
  assert.deepEqual(parseLines('非常に長い手動の本文/次').map(c => c.text), ['非常に長い手動の本文', '次']);
});
test('line/source and code point emphasis survive normalization and repeated words', () => {
  const [c] = parseLines('\r\n  *😀朝*　\t *夜* /次 \r');
  assert.deepEqual(c, {text: '😀朝 夜', emphasis: [{start: 0, end: 2}, {start: 3, end: 4}], source: {line: 1, cut: 0, lineText: '😀朝 夜 次'}});
  assert.deepEqual(resolveText('*朝*朝*朝*', 'text').emphasis, [{start: 0, end: 1}, {start: 2, end: 3}]);
  assert.deepEqual(resolveText('*朝**夜*', 'text').emphasis, [{start: 0, end: 2}]);
  assert.equal(parseLines(' 朝  /　夜 ')[0].source.lineText, '朝 夜');
  assert.equal(resolveText('\n 朝\t夜 \n\n 朝 \n', 'text').text, '朝 夜\n\n朝');
  assert.deepEqual(resolveText('e\u0301😀', 'text').text, 'e\u0301😀');
});
test('structured text is copied and validated without parsing literal markup', () => {
  const input = {text: '*/😀', emphasis: [{start: 1, end: 2}, {start: 2, end: 3}], source: {line: 1, cut: 2, lineText: '*/😀'}};
  const text = resolveText(input, 'text');
  assert.equal(text.text, input.text); assert.deepEqual(text.emphasis, [{start: 1, end: 3}]);
  assert.deepEqual(resolveText({...input, emphasis: [{start: 2, end: 3}, {start: 0, end: 1}]}, 'text').emphasis, [{start: 0, end: 1}, {start: 2, end: 3}]);
  input.emphasis[0].end = 3; input.source.line = 9;
  assert.deepEqual(text.source, {line: 1, cut: 2, lineText: '*/😀'});
  assert(Object.isFrozen(text.emphasis[0])); assert(!Object.isFrozen(input.source));
  for (const change of [{text: ''}, {text: ' 朝'}, {text: '朝\t夜'}, {text: '朝\r\n夜'}, {emphasis: [{start: 0, end: 4}]},
    {emphasis: [{start: 0, end: 2}, {start: 1, end: 3}]}, {emphasis: [{start: 0.5, end: 1}]},
    {source: {line: -1, cut: 0, lineText: '朝'}}, {source: {line: 0, cut: 0, lineText: '朝  夜'}}, {extra: 1}]) {
    assert.throws(() => resolveText({...input, ...change}, 'text'), err('E_TEXT'));
  }
});
test('parser rejects unsupported options, syntax, controls, Unicode and empty manual Cuts', () => {
  for (const raw of ['*朝', '**', '*　*', '朝//夜', '/朝', '朝/', '朝/ /夜', '*朝\n夜*', '\\q', '朝\\', '\uD800', '\uDC00', '\uD800朝', '朝\uDC00', '朝\u0000']) {
    assert.throws(() => parseLines(raw), err('E_TEXT'));
  }
  for (const v of [0, 1, 2, null, false, 'manual']) assert.throws(() => parseLines('朝', {numCuts: v}), err('E_NUM_CUTS', 'options.numCuts'));
  assert.throws(() => resolveText('朝/夜', 'text'), err('E_TEXT', 'text'));
  assert.throws(() => parseLines(null), err('E_TEXT', 'raw'));
  assert.throws(() => parseLines('朝', {extra: 1}), err('E_INPUT', 'options.extra'));
  assert.deepEqual(parseLines(' \n　\t\r\n'), []);
  assert.equal(resolveText('#[ti:朝]!|x', 'text').text, '#[ti:朝]!|x');
});
test('input, output Cut and count limits are enforced without rechunking manual text', () => {
  assert.throws(() => parseLines('朝'.repeat(100001)), err('E_INPUT', 'raw'));
  assert.throws(() => parseLines('朝'.repeat(10001) + '/夜'), err('E_INPUT'));
  assert.equal(parseLines('朝'.repeat(10000) + '/夜')[0].text.length, 10000);
  assert.equal(parseLines(Array(1000).fill('朝').join('\n')).length, 1000);
  assert.throws(() => parseLines(Array(1001).fill('朝').join('\n')), err('E_INPUT', 'raw'));
});
test('automatic chunks match reference script fallback and preserve emphasis offsets', () => {
  const J = {LAYOUT_ORDER: [], ENTER_ORDER: [], EXIT_ORDER: [], HOLD_ORDER: [], DECOR_ORDER: [],
    registerBaselineAll: (_group, defs) => { J.layouts = defs; }};
  installUtil(J); installLayouts(J); installPlanner(J);
  const old = Intl.Segmenter;
  try {
    // Only the test reference uses this override; the package must never use Intl.
    Intl.Segmenter = undefined;
    const inputs = ['希望の朝だ', '新しい朝が来た', '世界中の長い長い日本語の文章を分割する',
      'カタカナだけのとても長いメロディー', 'never-ending-story', 'supercalifragilisticexpialidocious',
      '朝、夜。', 'A b c', 'é😀朝だ', '한글한국어노래가사입니다', '[ti:Song] #朝!|x', '朝 夜 😀', '𠮷野家の朝'];
    for (const text of inputs) {
      assert.deepEqual(autoChunks([...text].map(ch => ({ch, marked: false}))).map(c => c.map(t => t.ch).join('')), J.chunkText(text), text);
      assert.deepEqual(parseLines('*' + text + '*').map(c => c.emphasis), parseLines(text).map(c => [{start: 0, end: [...c.text].length}]), text);
    }
    Intl.Segmenter = class {constructor() {throw new Error('Package must not construct Segmenter');}};
    assert.equal(parseLines('希望の朝だ')[0].text, '希望の朝だ');
  } finally { Intl.Segmenter = old; }
});
