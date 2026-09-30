import type { LocaleDictionary } from './types.ts';
import { EDITIONS } from './index.ts';

function sameKeys(expected: object, actual: object, location: string): void {
  const wanted = Object.keys(expected).sort(), found = Object.keys(actual).sort();
  const missing = wanted.filter(key => !found.includes(key));
  const extra = found.filter(key => !wanted.includes(key));
  if (missing.length || extra.length) throw new Error(`${location}: missing [${missing.join(', ')}]; extra [${extra.join(', ')}]`);
}
const placeholders = (text: string): string => [...text.matchAll(/\{p\d+\}/g)].map(match => match[0]).sort().join(',');

/** Also runs on the JS caller keys: TypeScript alone cannot check legacy JS. */
export function validateDictionaries(locales: readonly LocaleDictionary[] = EDITIONS): void {
  const baseline = EDITIONS[0]!;
  sameKeys(Object.fromEntries(EDITIONS.map(locale => [locale.code, true])), Object.fromEntries(locales.map(locale => [locale.code, true])), 'locales');
  if (new Set(locales.map(locale => locale.folder)).size !== locales.length) throw new Error('Duplicate locale route');
  for (const locale of locales) {
    sameKeys(baseline.messages, locale.messages, locale.code + '/messages');
    for (const key of Object.keys(baseline.messages) as Array<keyof typeof baseline.messages>) {
      const text = locale.messages[key];
      if (typeof text !== 'string' || !text.length) throw new Error(`${locale.code}/${key}: empty translation`);
      if (locale.code !== 'ja' && /[\u3040-\u30ff]/.test(text)) throw new Error(`${locale.code}/${key}: untranslated Japanese copy`);
      if (placeholders(text) !== placeholders(baseline.messages[key])) throw new Error(`${locale.code}/${key}: mismatched parameters`);
    }
    sameKeys(baseline.effects, locale.effects, locale.code + '/effects');
    for (const group of Object.keys(baseline.effects) as Array<keyof typeof baseline.effects>) {
      sameKeys(baseline.effects[group], locale.effects[group], locale.code + '/' + group);
      for (const [id, name] of Object.entries(locale.effects[group])) if (!name) throw new Error(`${locale.code}/${group}/${id}: empty label`);
    }
    sameKeys(baseline.styles, locale.styles, locale.code + '/styles');
    for (const [id, pair] of Object.entries(locale.styles)) if (pair.length !== 2 || pair.some(value => !value)) throw new Error(`${locale.code}/styles/${id}: incomplete copy`);
    sameKeys(baseline.moods, locale.moods, locale.code + '/moods');
    for (const [id, name] of Object.entries(locale.moods)) if (!name) throw new Error(`${locale.code}/moods/${id}: empty label`);
    for (const field of ['htmlLang', 'nativeName', 'title', 'description', 'languageLabel', 'sampleLyrics'] as const) if (!locale[field]) throw new Error(`${locale.code}/${field}: empty copy`);
  }
}
