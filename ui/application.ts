import type { Engine } from '../engine/types.ts';
import { createI18n, type LocaleCode } from '../i18n/index.ts';
import installEditor from './editor.js';
import type { EditorAPI, EditorHost } from './types.ts';

export interface EditorApplication {
  readonly engine: Engine;
  readonly locale: LocaleCode;
  readonly editor: EditorAPI;
  readonly host: EditorHost;
}

declare global {
  interface Window { jizuraApp?: EditorApplication }
}

/** Shared hosted/offline/CEP initialization. Install the selected adapter only
 * after this call. The compatibility J.uiApi.editor and this API are identical;
 * no wrapper duplicates mutations or changes user-activation timing. */
export function createEditorApplication(engine: Engine, locale: LocaleCode, options: { offline?: boolean } = {}): EditorApplication {
  const i18n = createI18n(locale);
  i18n.applyLabels(engine);
  i18n.applyDocument(document, options);
  const host = installEditor(engine);
  if (!host) throw new Error('The editor requires the application document');
  return Object.freeze({ engine, locale, editor: host.editor, host });
}
