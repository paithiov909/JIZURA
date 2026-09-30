import type ja from './locales/ja.ts';

export type LocaleCode = 'ja' | 'en' | 'zh-Hant' | 'zh-Hans' | 'ko' | 'id' | 'vi';
export type MessageKey = keyof typeof ja.messages;
type Labels<T> = { [K in keyof T]: string };
export interface LocaleDictionary {
  code: LocaleCode;
  folder: string;
  htmlLang: string;
  nativeName: string;
  title: string;
  description: string;
  languageLabel: string;
  messages: Labels<typeof ja.messages>;
  effects: { [G in keyof typeof ja.effects]: Labels<typeof ja.effects[G]> };
  styles: { [K in keyof typeof ja.styles]: readonly [string, string] };
  moods: Labels<typeof ja.moods>;
  sampleLyrics: string;
}
