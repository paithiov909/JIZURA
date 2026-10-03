import type {EffectSchema} from '../custom-types.js';
// Bounds shared by executable validation and discovery metadata. Mixed defaults
// are generated from its effect seed; these schema defaults are placeholders.
export const batchSchemas: Readonly<Record<string, EffectSchema>> = {
  mixed: {mode: {type: 'enum', values: ['line', 'stair', 'wave'], default: 'line', description: '行内の縦リズム。'},
    rotAmp: {type: 'number', min: 0, max: 20, default: 0, unit: 'degrees', description: 'seed回転の最大角度。'},
    smallK: {type: 'number', min: 0.25, max: 1, default: 0.5, description: 'ひらがな等の基準比率。seedで0〜0.14を加える。'},
    accentIdx: {type: 'number', min: 0, max: 9999, integer: true, default: 0, description: '空白を除いたindexを文字数で剰余。漢字には適用しない。強調色が優先。'}},
  jitter: {amount: {type: 'number', min: 0, max: 4, default: 1, description: '旧fx.motionに相当する変位倍率。0で無効。回転は旧4度×hold量、閾値0.2px。'}},
  brackets: {pad: {type: 'number', min: 0, max: 64, default: 18, unit: 'px', description: '基本余白。box高さの12%を加える。'},
    stroke: {type: 'number', min: 0.5, max: 12, default: 2.2, unit: 'px', description: '枠の線幅。'},
    accent: {type: 'boolean', default: false, description: 'アクセント色を使用。falseは本文色。'}},
};
