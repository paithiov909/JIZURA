import ja from './locales/ja.ts';
import { formatMessage } from './format.ts';
import en from './locales/en.ts';
import zhHant from './locales/zh-Hant.ts';
import zhHans from './locales/zh-Hans.ts';
import ko from './locales/ko.ts';
import id from './locales/id.ts';
import vi from './locales/vi.ts';
import type { LocaleCode, LocaleDictionary, MessageKey } from './types.ts';
import type { LegacyFacade } from '../engine/legacy-types.ts';
export type { LocaleCode, LocaleDictionary, MessageKey } from './types.ts';

export const LOCALES: Readonly<Record<LocaleCode, LocaleDictionary>> = { ja, en, 'zh-Hant': zhHant, 'zh-Hans': zhHans, ko, id, vi };
export const EDITIONS = Object.values(LOCALES);
export const PUBLIC_BASE = 'https://852wa.github.io/JIZURA/';

export function resolveLocale(language: string): LocaleCode {
  return EDITIONS.find(locale => locale.code === language || locale.htmlLang === language)?.code ?? 'ja';
}

/** Each engine/editor owns its language; lyric language and saved IDs are independent. */
export function createI18n(language: string) {
  const locale = LOCALES[resolveLocale(language)];
  function t(key: MessageKey, values: readonly unknown[] = []): string {
    return formatMessage(locale.messages[key], `${locale.code}/${key}`, values);
  }
  function applyLabels(engine: LegacyFacade): void {
    engine.i18n = { locale, t };
    for (const [group, labels] of Object.entries(locale.effects)) {
      const registry = engine.registry(group);
      for (const [key, name] of Object.entries(labels)) if (registry[key]) registry[key].name = name;
    }
    for (const [key, [name, desc]] of Object.entries(locale.styles)) {
      if (engine.STYLES[key]) Object.assign(engine.STYLES[key], { name, desc });
    }
    for (const [key, name] of Object.entries(locale.moods)) if (engine.MOODS[key]) engine.MOODS[key].name = name;
    engine.SAMPLE_LYRICS = locale.sampleLyrics;
  }
  function applyDocument(document: Document): void {
    const walker = document.createTreeWalker(document.body, 128 /* SHOW_COMMENT */);
    while (walker.nextNode()) {
      const comment = walker.currentNode;
      if (!comment.nodeValue?.startsWith('i18n:')) continue;
      const next = comment.nextSibling;
      if (!next || next.nodeType !== 3) throw new Error(`Missing i18n text node: ${comment.nodeValue}`);
      // Decode authored HTML entities as text, never parse translation as markup.
      const decoder = document.createElement('textarea');
      decoder.innerHTML = t(comment.nodeValue.slice(5) as MessageKey);
      next.nodeValue = decoder.value;
    }
    document.querySelectorAll<HTMLElement>('[data-i18n-attrs]').forEach(element => {
      for (const binding of element.dataset.i18nAttrs!.split(' ')) {
        const colon = binding.indexOf(':');
        element.setAttribute(binding.slice(0, colon), t(binding.slice(colon + 1) as MessageKey));
      }
    });
    const nav = document.createElement('label'); nav.className = 'lang-switch';
    const label = document.createElement('span'); label.className = 'sr-only'; label.textContent = locale.languageLabel;
    const select = document.createElement('select'); select.setAttribute('aria-label', locale.languageLabel);
    for (const edition of EDITIONS) {
      const option = document.createElement('option');
      option.value = (locale.folder ? '../' : '') + (edition.folder ? edition.folder + '/' : '') + 'index.html';
      option.lang = edition.htmlLang; option.textContent = edition.nativeName; option.selected = edition.code === locale.code;
      select.append(option);
    }
    // pagehide already flushes the baseline autosave; flush immediately as well
    // so a pending edit cannot be lost when following a different locale route.
    select.addEventListener('change', () => {
      const engine = (document.defaultView as unknown as { J?: LegacyFacade })?.J;
      engine?.uiApi?.flushSave();
      if (select.value) document.defaultView!.location.href = select.value;
    });
    nav.append(label, select); document.querySelector('.bar .acts')?.before(nav);
  }
  return { locale, t, applyLabels, applyDocument };
}
