import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createElement, Fragment} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as api from '../dist/index.js';
import {resolveEmptyScene} from '../dist/core/empty-scene.js';

const config = {width: 640, height: 360, fps: 24};
const isError = (code, path) => (e) => e instanceof api.JizuraError && e.code === code && e.path === path;

test('root exports the contracted values, without DOM access at import', () => {
  assert.deepEqual(Object.keys(api).sort(), [
    'JizuraScene', 'JizuraCut', 'JizuraError', 'parseLines', 'center', 'pop', 'wipe',
    'drift', 'breathe', 'kasumi', 'checkerStrip',
  ].sort());
});

test('empty Scene resolves design dimensions and opaque/transparent background', () => {
  assert.deepEqual(resolveEmptyScene({durationInFrames: 24}, config), {
    width: 640, height: 360, durationInFrames: 24, background: '#111111',
  });
  assert.deepEqual(resolveEmptyScene({durationInFrames: 1, width: 100, height: 50, background: '#abc'}, config), {
    width: 100, height: 50, durationInFrames: 1, background: '#AABBCC',
  });
  assert.equal(resolveEmptyScene({durationInFrames: 1, background: null}, config).background, null);
  const children = [null, false, [undefined, createElement(Fragment, null, [])]];
  assert.doesNotThrow(() => resolveEmptyScene({durationInFrames: 24, children}, config));
});

test('invalid dimensions, durations and color fail with code/path', () => {
  for (const value of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, null]) {
    for (const key of ['durationInFrames', 'width', 'height']) {
      assert.throws(() => resolveEmptyScene({durationInFrames: 24, [key]: value}, config), isError('E_NUMBER', key));
    }
  }
  assert.throws(() => resolveEmptyScene({durationInFrames: 24, background: 'red'}, config), isError('E_STYLE', 'background'));
  assert.throws(() => resolveEmptyScene({durationInFrames: 24, extra: true}, config), isError('E_INPUT', 'extra'));
});

test('later-stage props, parser, factories and nonempty children do not silently succeed', () => {
  for (const key of ['seed', 'font', 'style', 'motionFps']) {
    assert.throws(() => resolveEmptyScene({durationInFrames: 24, [key]: {}}, config), isError('E_INPUT', key));
  }
  assert.throws(() => resolveEmptyScene({durationInFrames: 24, children: createElement(api.JizuraCut, {text: '朝'})}, config), isError('E_INPUT', 'children'));
  for (const child of ['text', 1, createElement('div')]) {
    assert.throws(() => resolveEmptyScene({durationInFrames: 24, children: child}, config), isError('E_CHILD', 'children'));
  }
  for (const name of ['parseLines', 'center', 'pop', 'wipe', 'drift', 'breathe', 'kasumi', 'checkerStrip']) {
    assert.throws(() => api[name](), isError('E_INPUT', name));
  }
});

test('Scene requires Remotion context; Cut cannot be rendered alone', () => {
  assert.throws(() => renderToStaticMarkup(createElement(api.JizuraScene, {durationInFrames: 24})), isError('E_INPUT', 'scene'));
  assert.throws(() => renderToStaticMarkup(createElement(api.JizuraCut, {text: '朝'})), isError('E_CHILD', 'children'));
});
