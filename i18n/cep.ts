import ja from './cep/ja.ts';
import en from './cep/en.ts';
import { formatMessage } from './format.ts';
export type CEPMessageKey = keyof typeof ja;
export type CEPDictionary = { [K in CEPMessageKey]: string };
export const CEP_MESSAGES: Readonly<Record<'ja' | 'en', CEPDictionary>> = { ja, en };

/** Adobe's panel distribution intentionally supports two UI languages. */
export function createCEPI18n(language: string) {
  const locale = language === 'en' ? 'en' : 'ja';
  return { t: (key: CEPMessageKey, values: readonly unknown[] = []) => formatMessage(CEP_MESSAGES[locale][key], `${locale}/${key}`, values) };
}
