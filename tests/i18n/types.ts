import { createI18n } from '../../i18n/index.ts';
const i18n = createI18n('en');
i18n.t('ui.loop');
// @ts-expect-error Unknown keys must fail at the typed boundary.
i18n.t('ui.nonexistent');

// @ts-expect-error Browser messages exclude the Adobe-only panel dictionary.
i18n.t('cep.build_stopped');
