import assert from 'node:assert/strict';
import {test} from 'node:test';
import {prepareScene, finalizeScene} from '../dist/core/scene-plan.js';
import {CanvasMeasurementService} from '../dist/canvas/service.js';
import {SceneFonts} from '../dist/canvas/fonts.js';
import {measureStaticCut} from '../dist/canvas/geometry.js';

const config = {width: 640, height: 360, fps: 24};
const prepared = (text, extra = {}) => prepareScene({durationInFrames: 24}, config, [{text, enter: null, exit: null, hold: null, decor: [], ...extra}]);
const font = {family: 'Noto Sans JP', weight: 700, style: 'normal', src: './font.ttf'};
function documentFixture({fail = false, pending = false, failure = new Error('bad font')} = {}) {
  let calls = 0;
  class Face {
    constructor(family, source, descriptors) { Object.assign(this, {family, source, ...descriptors, status: 'unloaded'}); }
    async load() {
      calls++;
      if (pending) await new Promise(() => {});
      if (fail) throw failure;
      this.status = 'loaded'; return this;
    }
  }
  const fonts = new Set();
  fonts.check = () => true; // deliberately reports fallback success
  fonts.load = async () => [...fonts];
  return {doc: {baseURI: 'https://example.test/', fonts, defaultView: {FontFace: Face},
    createElement() { throw new Error('Must not measure before preparing fonts'); }}, get calls() { return calls; }};
}

test('static geometry keeps code point emphasis across newlines and centers each line', () => {
  const scene = prepared('A\n*朝😀*　B', {style: {fontSize: 40, track: 0.1, lead: 1.5}});
  const g = measureStaticCut(scene.cuts[0], scene, () => 1);
  assert.equal(g.items[0].size, 40);
  assert.deepEqual(g.items[0].glyphs.map(g => [g.ch, g.codePointIndex, g.color]), [
    ['A', 0, '#FFFFFF'], ['朝', 2, '#F5A50C'], ['😀', 3, '#F5A50C'], [' ', 4, '#FFFFFF'], ['B', 5, '#FFFFFF'],
  ]);
  assert.equal(g.items[0].glyphs[0].x, 0);
  assert.equal(g.items[0].glyphs[1].y, 30);
  assert.deepEqual(g.box, {x0: 234, x1: 406, y0: 130, y1: 230, cx: 320, cy: 180});
});
test('static fitting respects width/height and explicit zero track precedence', () => {
  const scene = prepared('朝'.repeat(100), {style: {fontSize: 100, track: 0.3}, layout: {group: 'layout', id: 'center', params: {track: 0}}});
  const g = measureStaticCut(scene.cuts[0], scene, () => 1);
  assert.equal(g.items[0].track, 0);
  assert.ok(Math.abs(g.box.x1 - g.box.x0 - 640 * 0.84) < 1e-8);
  assert.equal(measureStaticCut(prepared('朝').cuts[0], prepared('朝'), () => 1).items[0].track, 0.06);
});
test('font check fallback cannot authorize missing registered faces or premature measurement', async () => {
  const {doc} = documentFixture();
  const service = new CanvasMeasurementService(doc);
  const scene = prepared('朝');
  assert.throws(() => service.measureCut(scene.cuts[0], scene), {code: 'E_FONT'});
  await assert.rejects(finalizeScene(scene, service), error => {
    assert.equal(error.code, 'E_FONT'); assert.equal(error.path, 'cuts[0].font');
    assert.match(error.message, /not registered/);
    assert.match(error.message, /Register a matching FontFace or @font-face/);
    return true;
  });
  service.dispose();
});
test('font load errors identify the face, input path, resolved URL and Remotion public directory remedy', async () => {
  const failure = new DOMException('A network error occurred.', 'NetworkError');
  const fixture = documentFixture({fail: true, failure}), fonts = new SceneFonts(fixture.doc);
  try {
    await assert.rejects(fonts.prepare(font, '朝', 'cuts[2].font'), error => {
      assert.equal(error.code, 'E_FONT'); assert.equal(error.path, 'cuts[2].font');
      assert.equal(error.cause, failure);
      for (const detail of ['[E_FONT] cuts[2].font', 'Noto Sans JP', 'weight 700', 'style normal',
        './font.ttf', 'https://example.test/font.ttf', 'NetworkError: A network error occurred.',
        'valid font file', 'staticFile()', '--public-dir', 'CORS']) assert.ok(error.message.includes(detail), detail);
      return true;
    });
  } finally { fonts.dispose(); }
  assert.equal(fixture.doc.fonts.size, 0);
});
test('matching source loads share ownership; conflicts fail and last cleanup removes only owned faces', async () => {
  const fixture = documentFixture(), a = new SceneFonts(fixture.doc), b = new SceneFonts(fixture.doc), c = new SceneFonts(fixture.doc);
  await Promise.all([a.prepare(font, '朝', 'a'), b.prepare(font, '希望', 'b')]);
  assert.equal(fixture.calls, 1); assert.equal(fixture.doc.fonts.size, 1);
  await assert.rejects(c.prepare({...font, src: './other.ttf'}, '朝', 'c'), {code: 'E_FONT', path: 'c'});
  a.dispose(); assert.equal(fixture.doc.fonts.size, 1);
  b.dispose(); b.dispose(); assert.equal(fixture.doc.fonts.size, 0);
  c.dispose();
  const caller = new fixture.doc.defaultView.FontFace(font.family, '', {weight: '100 900', style: 'normal'});
  await caller.load(); fixture.doc.fonts.add(caller);
  const d = new SceneFonts(fixture.doc);
  await d.prepare({...font, src: undefined}, '朝', 'd'); d.dispose();
  assert.equal(fixture.doc.fonts.size, 1);
});
test('failed, cancelled and timed-out font preparations release resources', async () => {
  for (const mode of ['fail', 'pending']) {
    const fixture = documentFixture({[mode]: true}), fonts = new SceneFonts(fixture.doc, 10);
    await assert.rejects(fonts.prepare(font, '朝', mode), error => {
      assert.equal(error.code, 'E_FONT'); assert.equal(error.path, mode);
      assert.match(error.message, /https:\/\/example.test\/font.ttf/);
      assert.ok(error.message.includes(mode === 'pending' ? 'timed out after 10ms' : 'bad font'));
      return true;
    });
    fonts.dispose(); assert.equal(fixture.doc.fonts.size, 0);
  }
  const fixture = documentFixture({pending: true}), fonts = new SceneFonts(fixture.doc);
  const job = fonts.prepare(font, '朝', 'cancel'); fonts.dispose();
  await assert.rejects(job, error => {
    assert.equal(error.code, 'E_FONT'); assert.equal(error.path, 'cancel');
    assert.match(error.message, /cancelled/); assert.match(error.message, /font.ttf/);
    return true;
  });
  assert.equal(fixture.doc.fonts.size, 0);
});
