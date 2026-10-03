import {getEffectCatalog, type CatalogEntry, type CatalogParameter, type EffectMetadata} from 'remotion-jizura';
import {blur} from '@remotion/effects/blur';
import {offsetLines, glyphWave, boxRule} from '../custom/effects.tsx';

const example = (metadata: EffectMetadata, uses: string[], movements: string[], constraints: string[]): CatalogEntry => ({
  group: metadata.group, id: metadata.id, name: metadata.name, description: metadata.description,
  kind: metadata.group === 'layout' ? 'layout' : metadata.group === 'decor' ? 'decor' : 'motion',
  origin: 'caller-example', status: 'implemented', autoSelect: false, tags: [...metadata.tags, ...uses],
  moods: ['calm'], movements, uses, conditions: ['横長640×360', '日本語短文', 'caller定義のimport'], constraints,
  suitability: {status: 'hypothesis', reason: '段階09の小さな実利用例から付けた用途候補。単独比較ではなく3定義の組み合わせ例。'},
  provenance: {description: 'source', sources: ['examples/custom/effects.tsx'], evidence: ['docs/remotion/09-custom-effects.md']},
  parameters: Object.fromEntries(Object.entries(metadata.schema).map(([key, field]) => [key, {
    ...field, ...(field.type === 'number' ? {bounds: 'input'} : {}), default: {kind: 'fixed', value: field.default}, usage: 'effective',
  }])) as Record<string, CatalogParameter>, ...(metadata.layer ? {layer: metadata.layer} : {}),
  visual: {route: 'custom', candidate: 'baseline', frame: 24, composition: 'CustomEffects', video: 'dist/remotion/stage09/custom.mp4'},
});
const standard = blur({radius: 4}).definition;
const blurParameters = Object.fromEntries(Object.entries(standard.schema).map(([key, field]): [string, CatalogParameter] => {
  if (field.type === 'number' && typeof field.default === 'number' && field.min !== undefined && field.max !== undefined)
    return [key, {type: 'number', min: field.min, max: field.max, bounds: 'editor', required: true,
      description: '画像ぼかしの半径。schemaの0〜100はeditor範囲、実行時は有限numberが必須。', unit: 'px',
      default: {kind: 'fixed', value: field.default}, usage: 'effective'}];
  if (field.type === 'boolean') return [key, {type: 'boolean', description: field.description ?? key,
    default: {kind: 'fixed', value: field.default}, usage: 'effective'}];
  throw new Error(`Unknown blur schema: ${key}`);
}));
const blurEntry: CatalogEntry = {group: 'image', id: standard.type, name: '標準blur', description: 'Remotion標準のGaussian画像ぼかし。文字単位ではなく画像全体に作用する。',
  kind: 'image', origin: 'standard-image', status: 'implemented', autoSelect: false, backend: 'webgl2',
  tags: ['calm', '画像加工'], moods: ['calm'], movements: ['ぼかし'], uses: ['画像加工', '柔らかい切り替え'],
  conditions: ['歌詞とdecor', '背景込みScene', '独立画像', 'CanvasImage', '単一HtmlInCanvas', 'WebGL2', '@remotion/effects'],
  constraints: ['標準packageのfactoryをimportする。JIZURAのCut宣言ではない。', '単一HtmlInCanvasと対応Chrome/flagが必要。固定実測はsoftware WebGL2 swangle。', 'radiusは必須。editor既定40と比較例の4pxは異なる。'],
  suitability: {status: 'hypothesis', reason: 'ぼかしを使う用途の候補。強いぼかしは文字の可読性を下げる。'},
  provenance: {description: 'source', sources: ['https://www.remotion.dev/docs/effects/blur', '@remotion/effects@4.0.532/blur'],
    evidence: ['docs/remotion/10-remotion-effects.md']}, parameters: blurParameters,
  visual: {route: 'image-effects', candidate: 'standard', frame: 24, composition: 'ImageEffects', video: 'dist/remotion/stage10/image-effects.mp4'},
};
// These caller definitions and the standard peer are deliberately outside the package catalog.
export const exampleCatalog: readonly CatalogEntry[] = [...getEffectCatalog(),
  example(offsetLines.metadata, ['静かな保持', '本文配置'], ['静止', '縦offset'], ['本文全体を1placementで配置。centerの再分割やsubtitleは使わない。']),
  example(glyphWave.metadata, ['静かな保持'], ['波', '逐字'], ['12px/0.8Hzの比較例。高振幅で可読性は変わる。']),
  example(boxRule.metadata, ['控えめな装飾'], ['下線'], ['現在frameの論理boxに追従。回転/clipの厳密な可視boxではない。']), blurEntry];
export const searchExamples = [
  {label: '静かな保持', query: {uses: ['静かな保持']}},
  {label: '短いキメ', query: {uses: ['短いキメ']}},
  {label: '控えめな装飾', query: {uses: ['控えめな装飾']}},
] as const;
