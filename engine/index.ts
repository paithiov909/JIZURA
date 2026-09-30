import { CORE_EFFECT_STAGES, PACK_STAGES, SET_STAGES } from '../effects/index.ts';
import type { EffectRuntime } from '../effects/types.ts';
import install01Util from './util.ts';
import install02Fonts from '../src/02_fonts.js';
import install02bLang from '../src/02b_lang.js';
import install03Text from './text.ts';
import install04Styles from './styles.ts';
import install08Planner from './planner.ts';
import install08bOmakase from '../src/08b_omakase.js';
import install09Render from './renderer.ts';
import install10Audio from '../src/10_audio.js';
import install11Export from '../src/11_export.js';
import installAEPlan from './ae-plan.ts';
import installProject from './project.ts';
import type { Engine } from './types.ts';

// Capture CORE_ORDER before expression packs register; labels/UI run afterwards.
const stages: ReadonlyArray<readonly [string, (engine: EffectRuntime) => void]> = [
  ['01_util', install01Util],
  ['02_fonts', install02Fonts],
  ['02b_lang', install02bLang],
  ['03_text', install03Text],
  ['04_styles', install04Styles],
  ...CORE_EFFECT_STAGES,
  ['08_planner', install08Planner],
  ['08b_omakase', install08bOmakase],
  ['09_render', install09Render],
  ['10_audio', install10Audio],
  ['11_export', install11Export],
  ['ae-plan', installAEPlan],
  ...PACK_STAGES,
  ...SET_STAGES,
  ['project', installProject],
];
export const INITIALIZATION_ORDER = Object.freeze(stages.map(([name]) => name));

/** An independent engine instance; no editor, global J, or source concatenation. */
export function createEngine(version: string): Engine {
  const engine = { APP_VERSION: version } as unknown as EffectRuntime;
  for (const [, install] of stages) install(engine);
  return engine as unknown as Engine;
}
