import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as api from '../dist/index.js';
import {Internals} from 'remotion';
import {prepareSceneFromProps} from '../dist/react/collect-cuts.js';
const config = {width: 640, height: 360, fps: 24};
const isError = (code, path) => e => e instanceof api.JizuraError && e.code === code && e.path === path;

test('root exposes only the public contract and imports without DOM access', () => {
  assert.deepEqual(Object.keys(api).sort(), ['JizuraScene', 'JizuraCut', 'JizuraError', 'defineLayoutEffect', 'defineMotionEffect', 'defineDecorEffect', 'resolveScene', 'parseLines', 'center', 'pop', 'wipe', 'drift', 'breathe', 'kasumi', 'checkerStrip'].sort());
});
test('empty Scene resolves dimensions, background and stage 03 settings', () => {
  const scene = prepareSceneFromProps({durationInFrames: 24}, config);
  assert.equal(scene.width, 640); assert.equal(scene.height, 360);
  assert.equal(scene.background, '#111111'); assert.deepEqual(scene.cuts, []);
  assert.equal(prepareSceneFromProps({durationInFrames: 1, background: '#abc'}, config).background, '#AABBCC');
  assert.equal(prepareSceneFromProps({durationInFrames: 1, background: null}, config).background, null);
});
test('invalid dimensions/durations/colors fail with code and path', () => {
  for (const value of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, null, '24']) {
    for (const key of ['durationInFrames', 'width', 'height']) {
      assert.throws(() => prepareSceneFromProps({durationInFrames: 24, [key]: value}, config), isError('E_NUMBER', key));
    }
  }
  assert.throws(() => prepareSceneFromProps({durationInFrames: 24, background: 'red'}, config), isError('E_STYLE', 'background'));
  assert.throws(() => prepareSceneFromProps({durationInFrames: 24, extra: true}, config), isError('E_INPUT', 'extra'));
});
test('Scene requires Remotion context and standalone Cut fails', () => {
  assert.throws(() => renderToStaticMarkup(createElement(api.JizuraScene, {durationInFrames: 24})), isError('E_INPUT', 'scene'));
  assert.throws(() => renderToStaticMarkup(createElement(api.JizuraCut, {text: '朝'})), isError('E_CHILD', 'children'));
});

// Minimal React context fixture, not Studio/Player, browser or pixel evidence.
function inComposition(child) {
  return createElement(Internals.CompositionManager.Provider, {value: {
    compositions: [{id: 'test', ...config, durationInFrames: 60, defaultProps: {}}],
    canvasContent: {type: 'composition', compositionId: 'test'},
  }}, createElement(Internals.CanUseRemotionHooksProvider, null,
    createElement(Internals.TimelineContext.Provider, {value: {frame: {test: 0}}}, child)));
}
test('Scene runs the resolver and renders a font-pending canvas without SSR DOM access', () => {
  const empty = renderToStaticMarkup(inComposition(createElement(api.JizuraScene, {durationInFrames: 24})));
  assert.match(empty, /<canvas[^>]*width="640"[^>]*height="360"/);
  const scene = props => inComposition(createElement(api.JizuraScene, {durationInFrames: 24}, createElement(api.JizuraCut, props)));
  assert.throws(() => renderToStaticMarkup(scene({text: '朝', enter: 'bad'})), isError('E_EFFECT', 'cuts[0].enter'));
  assert.match(renderToStaticMarkup(scene({text: '朝'})), /data-jizura-ready="false"/);
});
