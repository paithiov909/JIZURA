import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'acorn';
import { repo } from '../vite.config.mts';
import { EDITIONS, LOCALES } from '../i18n/index.ts';
import { validateDictionaries } from '../i18n/validate.ts';
import { CEP_MESSAGES } from '../i18n/cep.ts';
import { createEngine } from '../engine/index.ts';
import type { LegacyFacade } from '../engine/legacy-types.ts';

validateDictionaries();
const jaMessages = { ...LOCALES.ja.messages, ...CEP_MESSAGES.ja };
const keys = new Set(Object.keys(jaMessages));
const jaKeys = Object.keys(CEP_MESSAGES.ja).sort();
if (JSON.stringify(jaKeys) !== JSON.stringify(Object.keys(CEP_MESSAGES.en).sort())) throw new Error('Missing CEP translation keys');
for (const key of jaKeys as Array<keyof typeof CEP_MESSAGES.ja>) {
  const placeholders = (text: string) => [...text.matchAll(/\{p\d+\}/g)].map(match => match[0]).sort().join(',');
  if (!CEP_MESSAGES.en[key] || placeholders(CEP_MESSAGES.en[key]) !== placeholders(CEP_MESSAGES.ja[key])) throw new Error('Incomplete CEP translation: ' + key);
}
const used = new Set<string>();
function checkKey(key: string): void {
  if (!keys.has(key)) throw new Error('Unknown translation key: ' + key);
  used.add(key);
}
const body = await readFile(path.join(repo, 'ui/body.html'), 'utf8');
for (const match of body.matchAll(/<!--i18n:([^>]+)-->/g)) checkKey(match[1]!);
for (const match of body.matchAll(/data-i18n-attrs="([^"]+)"/g)) for (const binding of match[1]!.split(' ')) checkKey(binding.slice(binding.indexOf(':') + 1));
function visit(node: unknown): void {
  if (!node || typeof node !== 'object') return;
  const item = node as Record<string, any>;
  if (item.type === 'CallExpression' && item.callee.type === 'Identifier' && item.callee.name === 'translate') {
    if (item.arguments[0]?.type !== 'Literal' || typeof item.arguments[0].value !== 'string') throw new Error('Translation calls require a literal key');
    const key = item.arguments[0].value as keyof typeof jaMessages; checkKey(key);
    const expected = [...jaMessages[key].matchAll(/\{p(\d+)\}/g)].map(match => Number(match[1]));
    const count = expected.length ? Math.max(...expected) + 1 : 0;
    const actual = item.arguments[1];
    if (count && (actual?.type !== 'ArrayExpression' || actual.elements.length !== count)) throw new Error(`${key}: expected ${count} parameters`);
    if (!count && actual) throw new Error(`${key}: unexpected parameters`);
  }
  for (const value of Object.values(item)) if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') visit(value);
}
for (const file of ['ui/editor.js', 'ui/services/export.js', 'cep/cep.js']) visit(parse(await readFile(path.join(repo, file), 'utf8'), { ecmaVersion: 2021, sourceType: 'module' }));
const unused = [...keys].filter(key => !used.has(key));
if (unused.length) throw new Error('Unused translation keys: ' + unused.join(', '));
// Extension contributors must supply new labels before the supported build passes.
globalThis.document = { createElement: () => ({ getContext: () => ({ measureText: () => ({ width: 100 }) }) }) } as unknown as Document;
const engine = createEngine('0.0.0');
for (const group of engine.GROUP_KEYS) {
  const expected = engine.order(group).slice().sort();
  const actual = Object.keys(LOCALES.ja.effects[group]).sort();
  if (JSON.stringify(expected) !== JSON.stringify(actual)) throw new Error(`Effect catalog changed: ${group}; add locale labels`);
}
if (JSON.stringify([...engine.STYLE_ORDER].sort()) !== JSON.stringify(Object.keys(LOCALES.ja.styles).sort())) throw new Error('Style catalog changed; add locale labels');
if (JSON.stringify(Object.keys((engine as unknown as LegacyFacade).MOODS).sort()) !== JSON.stringify(Object.keys(LOCALES.ja.moods).sort())) throw new Error('Mood catalog changed; add locale labels');
console.log(`i18n validated: ${EDITIONS.length} browser locales, ${Object.keys(LOCALES.ja.messages).length} browser keys, ${jaKeys.length} CEP keys in ja/en, all effect/style/mood labels`);
