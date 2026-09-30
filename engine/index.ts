import install01Util from './util.ts';
import install02Fonts from '../src/02_fonts.js';
import install02bLang from '../src/02b_lang.js';
import install03Text from './text.ts';
import install04Styles from './styles.ts';
import install05Anim from '../src/05_anim.js';
import install05bRegistry from '../src/05b_registry.js';
import install06Layouts from '../src/06_layouts.js';
import install07Decor from '../src/07_decor.js';
import install08Planner from './planner.ts';
import install08bOmakase from '../src/08b_omakase.js';
import install09Render from './renderer.ts';
import install10Audio from '../src/10_audio.js';
import install11Export from '../src/11_export.js';
import install11pBgcamb from '../src/11p_bgcamB.js';
import install11pDecor from '../src/11p_decor.js';
import install11pDecorb from '../src/11p_decorB.js';
import install11pEnter from '../src/11p_enter.js';
import install11pEnterb from '../src/11p_enterB.js';
import install11pExit from '../src/11p_exit.js';
import install11pExitb from '../src/11p_exitB.js';
import install11pFxb from '../src/11p_fxB.js';
import install11pHorror1 from '../src/11p_horror1.js';
import install11pHorror2 from '../src/11p_horror2.js';
import install11pHorror3 from '../src/11p_horror3.js';
import install11pKinetic1 from '../src/11p_kinetic1.js';
import install11pKinetic2 from '../src/11p_kinetic2.js';
import install11pKinetic3 from '../src/11p_kinetic3.js';
import install11pLayoutsa from '../src/11p_layoutsA.js';
import install11pLayoutsb from '../src/11p_layoutsB.js';
import install11pLayoutsc from '../src/11p_layoutsC.js';
import install11pLayoutsd from '../src/11p_layoutsD.js';
import install11pLooks from '../src/11p_looks.js';
import install11pStyles from '../src/11p_styles.js';
import install11pTreattrans from '../src/11p_treattrans.js';
import install11pTypo1 from '../src/11p_typo1.js';
import install11pTypo2 from '../src/11p_typo2.js';
import install11pTypo3 from '../src/11p_typo3.js';
import install11qSets from '../src/11q_sets.js';
import installAEPlan from './ae-plan.ts';
import installProject from './project.ts';
import type { Engine } from './types.ts';
import type { LegacyFacade } from './legacy-types.ts';

// Capture CORE_ORDER before expression packs register; labels/UI run afterwards.
const stages: ReadonlyArray<readonly [string, (engine: LegacyFacade) => void]> = [
  ['01_util', install01Util],
  ['02_fonts', install02Fonts],
  ['02b_lang', install02bLang],
  ['03_text', install03Text],
  ['04_styles', install04Styles],
  ['05_anim', install05Anim],
  ['05b_registry', install05bRegistry],
  ['06_layouts', install06Layouts],
  ['07_decor', install07Decor],
  ['08_planner', install08Planner],
  ['08b_omakase', install08bOmakase],
  ['09_render', install09Render],
  ['10_audio', install10Audio],
  ['11_export', install11Export],
  ['ae-plan', installAEPlan],
  ['11p_bgcamB', install11pBgcamb],
  ['11p_decor', install11pDecor],
  ['11p_decorB', install11pDecorb],
  ['11p_enter', install11pEnter],
  ['11p_enterB', install11pEnterb],
  ['11p_exit', install11pExit],
  ['11p_exitB', install11pExitb],
  ['11p_fxB', install11pFxb],
  ['11p_horror1', install11pHorror1],
  ['11p_horror2', install11pHorror2],
  ['11p_horror3', install11pHorror3],
  ['11p_kinetic1', install11pKinetic1],
  ['11p_kinetic2', install11pKinetic2],
  ['11p_kinetic3', install11pKinetic3],
  ['11p_layoutsA', install11pLayoutsa],
  ['11p_layoutsB', install11pLayoutsb],
  ['11p_layoutsC', install11pLayoutsc],
  ['11p_layoutsD', install11pLayoutsd],
  ['11p_looks', install11pLooks],
  ['11p_styles', install11pStyles],
  ['11p_treattrans', install11pTreattrans],
  ['11p_typo1', install11pTypo1],
  ['11p_typo2', install11pTypo2],
  ['11p_typo3', install11pTypo3],
  ['11q_sets', install11qSets],
  ['project', installProject],
];
export const INITIALIZATION_ORDER = Object.freeze(stages.map(([name]) => name));

/** An independent engine instance; no editor, global J, or source concatenation. */
export function createEngine(version: string): Engine {
  const engine: LegacyFacade = { APP_VERSION: version };
  for (const [, install] of stages) install(engine);
  return engine as Engine;
}
