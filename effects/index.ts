import install05Anim from './core/animation.ts';
import install05bRegistry from './core/registry.ts';
import install06Layouts from './core/layouts.ts';
import install07Decor from './core/decor.ts';
import install11pBgcamb from './packs/bgcamB.ts';
import install11pDecor from './packs/decor.ts';
import install11pDecorb from './packs/decorB.ts';
import install11pEnter from './packs/enter.ts';
import install11pEnterb from './packs/enterB.ts';
import install11pExit from './packs/exit.ts';
import install11pExitb from './packs/exitB.ts';
import install11pFxb from './packs/fxB.ts';
import install11pHorror1 from './packs/horror1.ts';
import install11pHorror2 from './packs/horror2.ts';
import install11pHorror3 from './packs/horror3.ts';
import install11pKinetic1 from './packs/kinetic1.ts';
import install11pKinetic2 from './packs/kinetic2.ts';
import install11pKinetic3 from './packs/kinetic3.ts';
import install11pLayoutsa from './packs/layoutsA.ts';
import install11pLayoutsb from './packs/layoutsB.ts';
import install11pLayoutsc from './packs/layoutsC.ts';
import install11pLayoutsd from './packs/layoutsD.ts';
import install11pLooks from './packs/looks.ts';
import install11pStyles from './packs/styles.ts';
import install11pTreattrans from './packs/treattrans.ts';
import install11pTypo1 from './packs/typo1.ts';
import install11pTypo2 from './packs/typo2.ts';
import install11pTypo3 from './packs/typo3.ts';
import install11qSets from './sets.ts';
import type { EffectStage } from './types.ts';

export const CORE_EFFECT_STAGES: readonly EffectStage[] = [
  ['05b_registry', install05bRegistry],
  ['05_anim', install05Anim],
  ['06_layouts', install06Layouts],
  ['07_decor', install07Decor],
];
export const PACK_STAGES: readonly EffectStage[] = [
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
];
export const SET_STAGES: readonly EffectStage[] = [
  ['11q_sets', install11qSets],
];
