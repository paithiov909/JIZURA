import type {CatalogEntry, CatalogParameter, CatalogQuery} from './catalog-types.js';
import {freeze} from './core/validation.js';
import {sliceGlitch} from './effects/slice-glitch.js';

const seeded = {kind: 'seeded'} as const;
const number = (min: number, max: number, description: string, unit?: string, integer = false): CatalogParameter =>
  ({type: 'number', min, max, bounds: 'input', integer, description, unit, default: seeded, usage: 'effective'});
const boolean = (description: string): CatalogParameter => ({type: 'boolean', description, default: seeded, usage: 'effective'});
const centerParams = {
  sx: number(0.25, 4, '文字幅の倍率。', 'scale'), track: number(0, 1, '文字間隔。', 'em'),
  ox: number(-0.25, 0.25, '中央からの横移動。', 'canvas width'), oy: number(-0.25, 0.25, '中央からの縦移動。', 'canvas height'),
  sub: boolean('分割前のlineTextと本文が異なる場合に元の行を小さく添える。'), under: boolean('本文の下線。'), accent: boolean('強調色以外の本文をアクセント色にする。'),
};
const decorParams = {
  n: number(1, 3, '共有parameter。', undefined, true), v: number(0, 5, '共有variant。', undefined, true),
  right: boolean('左右の選択。'), low: boolean('上下の選択。'), accent: boolean('アクセント色の選択。'),
  corner: boolean('共有parameter。'), big: boolean('共有parameter。'),
  mode: {type: 'enum', values: ['count', 'index'], description: '共有parameter。', default: seeded, usage: 'effective'} as CatalogParameter,
  from: number(0, 20, '共有parameter。', undefined, true), to: number(30, 999, '共有parameter。', undefined, true),
  r: {...number(0, 1, '共有parameter。'), exclusiveMax: true},
};
function decorSchema(effective: Record<string, string>): Record<string, CatalogParameter> {
  return Object.fromEntries(Object.entries(decorParams).map(([key, value]) => [key, {...value,
    usage: key in effective ? 'effective' : 'ignored', description: effective[key] ?? '受理する旧共有値。このeffectの描画には使用しない。'}]));
}
const visual = (candidate: string, frame: number) => ({route: 'review', candidate, frame,
  composition: 'ReviewWorkbench', video: `dist/remotion/stage08/${candidate}.mp4`} as const);
function builtin(group: CatalogEntry['group'], id: string, name: string, description: string,
  moods: string[], movements: string[], uses: string[], constraints: string[], parameters: Record<string, CatalogParameter>, frame: number): CatalogEntry {
  const kind = group === 'layout' ? 'layout' : group === 'decor' ? 'decor' : 'motion';
  return {group, id, name, description, kind, origin: 'builtin', status: 'implemented', autoSelect: true,
    tags: [...moods, ...movements, ...uses], moods, movements, uses, conditions: ['横長640×360', '日本語短文', '明示seed'], constraints,
    suitability: {status: 'hypothesis', reason: '原型と固定レビュー例から編集者が付けた用途候補。別font・長文・縦長での適性保証ではない。'},
    provenance: {description: 'source', sources: [group === 'layout' ? 'src/canvas/center.ts' : group === 'decor' ? 'src/effects/decor.ts' : 'src/effects/motion.ts'],
      evidence: ['docs/remotion/06-effect-port.md', 'docs/remotion/08-review-workbench.md']},
    parameters, visual: visual(id, frame), ...(group === 'decor' ? {layer: id === 'kasumi' ? 'back' : 'front'} : {})};
}
const entries: CatalogEntry[] = [
  builtin('layout', 'center', '中央 / center', '計測した歌詞を中央へ配置し、長さに応じて行分割する。',
    ['calm', '静か'], ['静止'], ['読みやすい本文', '静かな保持'], ['sub/under/accentは本文に付随する描画。subは元の行と本文が異なる場合のみ。'], centerParams, 24),
  builtin('enter', 'pop', '逐字ポップ / pop', '文字ごとの遅延、拡大と小さな回転で入場する。',
    ['pop', '快活'], ['逐字', '拡大'], ['短いキメ', '入場'], ['強度・速度parameterはない。Cutの入場frame数で調整する。'], {}, 6),
  builtin('enter', 'wipe', 'ワイプ / wipe', '横clipと追従する帯で本文を開く。方向はseedで決まる。',
    ['graphic', '整然'], ['横移動', 'clip'], ['短いキメ', '入場'], ['帯を含む。強度parameterはなく入場frame数を使用する。'], {}, 6),
  builtin('exit', 'drift', '破片ドリフト / drift', '文字を小さな破片に分け、seedに応じた方向へ散らして消す。',
    ['emotional', '余韻'], ['破片', '拡散'], ['退場', '切り替え'], ['破片cacheを使う。論理bboxは破片の厳密な可視境界ではない。'], {}, 52),
  builtin('hold', 'breathe', '呼吸 / breathe', '保持中の文字sizeと文字間隔を周期的に変える。',
    ['calm', '静か'], ['呼吸', '周期'], ['静かな保持'], ['size3.5%とtrack0.03emの式は固定。振幅・速度parameterはない。'], {}, 24),
  builtin('decor', 'kasumi', '霞 / kasumi', '背面の丸い帯を少しずつ開き、ゆっくり漂わせる。',
    ['calm', '静か'], ['漂い', '帯'], ['控えめな装飾', '背面'], ['固定paletteでは暗い。薄さ・コントラストは組み合わせ次第。'],
    decorSchema({n: '帯数は2+(n%2)。n=1/3は3本、n=2は2本。', right: '帯ごとの移動方向を反転。'}), 24),
  builtin('decor', 'checkerStrip', 'チェッカー帯 / checkerStrip', '歌詞boxを避けた隅で市松の帯を流す。',
    ['graphic', '快活'], ['横移動', '市松'], ['装飾', '隅'], ['空間が足りないとalphaを下げる。端に触れる表現で常に非重複とは限らない。'],
    decorSchema({v: 'v%3が0/1/2なら2/3/1行。1は先細り、2は破線付き。', right: '隅の左右優先と流れる方向。', low: '隅の上下優先。', accent: 'アクセント色を使用。背景contrastでfallbackする。'}), 24),
];
// The native descriptor owns the fixed defaults/bounds, including disabled.
const slice = sliceGlitch({}).definition;
const sliceParams = Object.fromEntries(Object.entries(slice.schema).map(([key, field]): [string, CatalogParameter] => {
  if (field.type === 'number' && field.min !== undefined && field.max !== undefined && typeof field.default === 'number') return [key, {type: 'number', min: field.min, max: field.max, bounds: 'input',
    integer: field.integer, default: {kind: 'fixed', value: field.default}, description: field.description ?? key, usage: 'effective'}];
  if (field.type === 'boolean') return [key, {type: 'boolean', default: {kind: 'fixed', value: field.default}, description: field.description ?? key, usage: 'effective'}];
  throw new Error(`Unsupported slice schema: ${key}`);
}));
entries.push({group: 'image', id: slice.type, name: '画像スライス / sliceGlitch', kind: 'image', origin: 'native-image',
  description: '画像全体を水平帯へ分けて横ずれさせる。透明alphaを保持し端をwrapする。', status: 'implemented', autoSelect: false,
  moods: ['glitch'], movements: ['横ずれ', '帯'], tags: ['glitch', '画像加工', '短いキメ'], uses: ['短いキメ', '画像加工'],
  conditions: ['歌詞とdecor', '背景込みScene', '独立画像', 'CanvasImage', '単一HtmlInCanvas', '2d'], backend: '2d',
  constraints: ['通常DOM canvasへ直接effectsは付けられない。HtmlInCanvasは対応Chromeとflagが必要。',
    'frame/fps/seedはcallerが渡す。Cutのfx宣言ではない。'],
  suitability: {status: 'hypothesis', reason: '短いキメへの利用候補。連続強度の可読性は別途レビューが必要。'},
  provenance: {description: 'source', sources: ['src/effects/slice-glitch.ts'], evidence: ['docs/remotion/10-remotion-effects.md']},
  parameters: sliceParams, visual: {route: 'image-effects', candidate: 'glitch', frame: 24, composition: 'ImageEffects', video: 'dist/remotion/stage10/image-effects.mp4'}});

const catalog = freeze(entries);
/** Package implementations only; caller examples are supplied explicitly to searchEffects. */
export function getEffectCatalog(): readonly CatalogEntry[] {return catalog;}
/** Deterministic case-insensitive substring search. All fields/tokens must match; no ranking. */
export function searchEffects(query: CatalogQuery = {}, source: readonly CatalogEntry[] = catalog): readonly CatalogEntry[] {
  const lower = (s: string) => s.normalize('NFKC').toLowerCase();
  const contains = (values: readonly string[], wanted: readonly string[] = []) => wanted.every(w => values.some(v => lower(v) === lower(w)));
  return Object.freeze(source.filter(e => {
    const haystack = lower([e.id, e.name, e.description, ...e.tags, ...e.moods, ...e.movements, ...e.uses, ...e.conditions, ...e.constraints].join(' '));
    return (!query.group || e.group === query.group) && (!query.name || lower(`${e.id} ${e.name}`).includes(lower(query.name))) &&
      contains(e.tags, query.tags) && contains(e.uses, query.uses) && contains(e.conditions, query.conditions) &&
      lower(query.text ?? '').split(/\s+/).filter(Boolean).every(t => haystack.includes(t));
  }));
}
