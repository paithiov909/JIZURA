import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createI18n, LOCALES, EDITIONS } from '../../i18n/index.ts';
import { validateDictionaries } from '../../i18n/validate.ts';
import type { LocaleDictionary } from '../../i18n/types.ts';
import { createEngine } from '../../engine/index.ts';
import type { LegacyFacade } from '../../engine/legacy-types.ts';

const fixture = JSON.parse(readFileSync(new URL('./legacy-catalog.json', import.meta.url), 'utf8'));
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
globalThis.document = { createElement: () => ({ getContext: () => ({ measureText: () => ({ width: 100 }) }) }) } as unknown as Document;

test('all locale labels, samples and metadata match captured contributor translations', () => {
  for (const locale of EDITIONS) {
    const { effects, styles, moods, sampleLyrics, title, description } = locale;
    assert.equal(digest({ effects, styles, moods, sampleLyrics, title, description }), fixture[locale.code]);
  }
});
test('missing keys, effect labels and interpolation parameters fail validation', () => {
  for (const mutate of [
    (locale: any) => { delete locale.messages['ui.loop']; },
    (locale: any) => { delete locale.effects.layout.center; },
    (locale: any) => { locale.messages['ui.set_to_s_so_the_lines_stay'] = 'Broken {p8}'; },
    (locale: any) => { locale.moods.pop = ''; },
  ]) {
    const locales = structuredClone(EDITIONS) as LocaleDictionary[];
    mutate(locales[1]); assert.throws(() => validateDictionaries(locales));
  }
});
test('interpolation preserves user strings literally and reports missing arguments', () => {
  const { t } = createI18n('en');
  const text = '$& $` {p0} <script>lyrics</script>';
  assert.equal(t('ui.set_to_s_so_the_lines_stay', [text]), `Set to ${text} s so the lines stay in order`);
  assert.throws(() => t('ui.set_to_s_so_the_lines_stay'), /Missing parameter/);
});
test('locale labels stay on their own engine, with lyric language and IDs unchanged', () => {
  const a = createEngine('0.0.0'), b = createEngine('0.0.0');
  const ids = [...a.order('layout')];
  createI18n('en').applyLabels(a); createI18n('ko').applyLabels(b);
  assert.equal(a.registry('layout').center.name, LOCALES.en.effects.layout.center);
  assert.equal(b.registry('layout').center.name, LOCALES.ko.effects.layout.center);
  assert.deepEqual(a.order('layout'), ids); assert.deepEqual(b.order('layout'), ids);
  assert.equal(a.defaultProject().lang, 'auto');
  assert.equal(createI18n('id-ID').locale.code, 'id');
});
test('late export errors use the explicitly selected engine language', async () => {
  const engine = createEngine('0.0.0'); createI18n('en').applyLabels(engine);
  (engine as unknown as LegacyFacade).Renderer = class { frame() { throw new Error('Unexpected rendering'); } };
  // Overflow is rejected before rendering any frames or allocating a ZIP.
  const plan = { duration: 70000, fps: 1 };
  await assert.rejects((engine as unknown as LegacyFacade).exportPNGZip({ plan, project: engine.defaultProject() }), /ZIP.*too large/);
});

test('locale word order keeps line/cut and variation arguments correctly associated', () => {
  assert.equal(createI18n('en').t('ui.layout_of_cut_on_line', [3, 5]), 'Layout of cut 5 on line 3');
  assert.equal(createI18n('ko').t('ui.variation', [2, 7]), '7개 중 2번째 안');
});
