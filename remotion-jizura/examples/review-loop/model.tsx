import {center, mixed, pop, wipe, slideLeft, drift, shrink, breathe, jitter, brackets, resolveScene,
  searchEffects, sliceGlitch, type JizuraCutProps, type JizuraSceneProps} from 'remotion-jizura';
import {glyphWave, boxRule} from '../custom/effects.tsx';
import {exampleCatalog} from '../catalog/entries.tsx';

// Development input, not a public project format. Caller code is imported above.
export type LoopCut = {id: string; cut: JizuraCutProps; caller?: {wave: {seed: number; amplitude: number; cycles: number}; rule: {seed: number; thickness: number; accent: boolean}}};
export type LoopInput = {version: 1; name: string; scene: Omit<JizuraSceneProps, 'children' | 'onInspect'>;
  cuts: LoopCut[]; image: {cutId: string; fromLocal: number; toLocal: number; target: 'lyrics' | 'scene';
    blurRadius: number; amount: number; displacement: number; bands: number; rate: number; seed: number}};
export const loopConfig = {width: 640, height: 360, fps: 24};
export const loopDuration = 288;
const layout = center({seed: 101, params: {sx: 1, track: 0.08, sub: false, under: false, accent: false, ox: 0, oy: 0}});
const timing = (from: number, seed: number) => ({from, seed, durationInFrames: 72, enterDurationInFrames: 18, exitDurationInFrames: 16});
export const originalInput: LoopInput = {
  version: 1, name: 'original',
  scene: {durationInFrames: loopDuration, seed: 20260922, motionFps: null, background: '#16324F',
    font: {family: 'Noto Sans JP', weight: 700, style: 'normal'},
    style: {fontSize: 64, track: 0.08, lead: 1.4, emphasisColor: '#FFD166',
      palette: {bg: '#16324F', fg: '#EEEEEE', sub: '#7193A1', accent: '#16F4D4', accent2: '#FFD166', ink: '#091625', dim: '#375362'}}},
  cuts: [
    {id: 'quiet', cut: {...timing(0, 1234), text: '静かな*夜*を越え', layout, enter: wipe({seed: 201}), exit: drift({seed: 301}), hold: null, decor: []},
      caller: {wave: {seed: 401, amplitude: 3, cycles: 0.35}, rule: {seed: 501, thickness: 2, accent: true}}},
    {id: 'arrival', cut: {...timing(72, 2345), text: '新しい*朝*が来た', layout, enter: pop({seed: 202}), exit: drift({seed: 302}), hold: breathe({seed: 402}), decor: []}},
    {id: 'rise', cut: {...timing(144, 3456), text: '*希望*を胸に',
      layout: mixed({seed: 103, params: {mode: 'wave', rotAmp: 4, smallK: 0.5, accentIdx: 2}}),
      enter: slideLeft({seed: 203}), exit: shrink({seed: 303}), hold: jitter({seed: 403, params: {amount: 0.3}}),
      decor: [brackets({seed: 503, params: {pad: 12, stroke: 1.5, accent: true}})]}},
    {id: 'finale', cut: {...timing(216, 4567), text: '今こそ*光*へ', layout, enter: slideLeft({seed: 204}), exit: shrink({seed: 304}),
      hold: jitter({seed: 404, params: {amount: 0.65}}), decor: [brackets({seed: 504, params: {pad: 14, stroke: 2.2, accent: true}})]}},
  ],
  image: {cutId: 'finale', fromLocal: 0, toLocal: 36, target: 'scene', blurRadius: 1.5, amount: 0.35,
    displacement: 0.035, bands: 16, rate: 12, seed: 604},
};
export const cloneInput = (input: LoopInput): LoopInput => JSON.parse(JSON.stringify(input));
export const reviews = [
  {id: 'arrival-slower', cutId: 'arrival', frames: [72, 102], before: 'enterDurationInFrames=18', after: '30', intent: '入場をゆっくりに。本文が揃うまでの時間を延ばす。', anchor: 84},
  {id: 'rise-center', cutId: 'rise', frames: [144, 216], before: 'mixed/wave/rotAmp4', after: 'center/sx1/track0.08', intent: '大小と回転を抑え、中央の1行配置へ差し替える。', anchor: 180},
  {id: 'finale-window', cutId: 'finale', frames: [216, 252], before: 'scene [0,36)', after: 'lyrics [0,12)', intent: '画像加工は入場直後だけ。背景を加工対象から外す。', anchor: 240},
] as const;
export type ReviewId = typeof reviews[number]['id'];
export function applyReview(input: LoopInput, id: ReviewId): LoopInput {
  const next = cloneInput(input);
  if (id === 'arrival-slower') {const target = next.cuts.find(c => c.id === 'arrival')!; target.cut = {...target.cut, enterDurationInFrames: 30};}
  else if (id === 'rise-center') {const target = next.cuts.find(c => c.id === 'rise')!; target.cut = {...target.cut, layout};}
  else if (id === 'finale-window') {next.image.target = 'lyrics'; next.image.toLocal = 12;}
  else throw new Error(`Unknown review: ${id}`);
  next.name = input.name === 'original' || input.name === id ? id : 'edited'; return next;
}
export const loopVariants: Record<string, LoopInput> = {original: originalInput,
  ...Object.fromEntries(reviews.map(r => [r.id, applyReview(originalInput, r.id)])),
  revised: {...reviews.reduce((input, r) => applyReview(input, r.id), originalInput), name: 'revised'}};

export function buildLoopCuts(input: LoopInput): JizuraCutProps[] {
  return input.cuts.map(({cut, caller}) => caller ? {...cut,
    hold: glyphWave({seed: caller.wave.seed, params: {amplitude: caller.wave.amplitude, cycles: caller.wave.cycles}}),
    decor: [boxRule({seed: caller.rule.seed, params: {thickness: caller.rule.thickness, accent: caller.rule.accent}})]} : cut);
}
const keys = (value: object, allowed: string[], label: string) => {
  if (Object.keys(value).some(k => !allowed.includes(k))) throw new Error(`Unknown ${label} key`);
};
export function validateLoopInput(input: LoopInput, config = loopConfig): LoopInput {
  if (!input || input.version !== 1 || typeof input.name !== 'string' || !Array.isArray(input.cuts) || input.cuts.length !== 4) throw new Error('Expected version1 input with four Cuts');
  keys(input, ['version', 'name', 'scene', 'cuts', 'image'], 'input');
  if (input.scene.durationInFrames !== loopDuration || input.scene.width !== undefined || input.scene.height !== undefined || input.scene.font?.src !== undefined) throw new Error('Keep duration288 and use the Composition dimensions / shared fontSrc');
  // This example preloads this exact face, not an arbitrary/fallback family.
  if (input.scene.font?.family !== 'Noto Sans JP' || input.scene.font.weight !== 700 || input.scene.font.style !== 'normal') throw new Error('Use Noto Sans JP700/normal');
  if (new Set(input.cuts.map(c => c.id)).size !== 4 || input.cuts.some(c => typeof c.id !== 'string' || !c.id)) throw new Error('Cut labels must be unique');
  if (input.cuts.map(c => c.id).join(',') !== 'quiet,arrival,rise,finale') throw new Error('Keep the four review labels and declaration order');
  for (const c of input.cuts) {
    keys(c, ['id', 'cut', 'caller'], 'Cut label');
    if (c.cut.font !== undefined) throw new Error('Use the shared Scene font');
    if (c.caller) {
      keys(c.caller, ['wave', 'rule'], 'caller');
      keys(c.caller.wave, ['seed', 'amplitude', 'cycles'], 'wave');
      keys(c.caller.rule, ['seed', 'thickness', 'accent'], 'rule');
      if (c.cut.hold !== null || c.cut.decor?.length !== 0) throw new Error('Caller slot needs hold=null and decor=[]');
    }
  }
  const snapshot = resolveScene(input.scene, config, buildLoopCuts(input));
  const im = input.image;
  keys(im, ['cutId', 'fromLocal', 'toLocal', 'target', 'blurRadius', 'amount', 'displacement', 'bands', 'rate', 'seed'], 'image');
  const cut = input.cuts.find(c => c.id === im.cutId);
  if (!cut || !Number.isSafeInteger(im.fromLocal) || !Number.isSafeInteger(im.toLocal) || im.fromLocal < 0 || im.toLocal <= im.fromLocal || im.toLocal > cut.cut.durationInFrames!) throw new Error('Invalid Cut-local image window');
  if (!['lyrics', 'scene'].includes(im.target) || !Number.isFinite(im.blurRadius) || im.blurRadius < 0 || im.blurRadius > 100) throw new Error('Invalid image target/blur radius');
  sliceGlitch({amount: im.amount, displacement: im.displacement, bands: im.bands, rate: im.rate, seed: im.seed});
  // Native parameter validation is also performed by the imported factory.
  if (snapshot.cuts.length !== 4) throw new Error('Expected four resolved Cuts');
  return input;
}
export const selectionBrief = '静かな夜から朝、希望が弾み、最後の光で短いキメ。';
export const selectionSteps = [
  {cutId: 'quiet', query: {uses: ['静かな保持']}, chosen: ['center', 'example.glyphWave', 'example.boxRule'], reason: '中央本文と3pxのcaller wave、2pxのruleで小さな動き。'},
  {cutId: 'arrival', query: {uses: ['短いキメ']}, chosen: ['pop', 'breathe', 'drift'], reason: '逐字popで朝を示し、保持と破片退出は既存部品を明示指定。'},
  {cutId: 'rise', query: {text: 'mixed'}, chosen: ['mixed', 'slideLeft', 'shrink', 'jitter', 'brackets'], reason: '新部品を明示追加。大小のリズムと弱いjitter、細い枠。'},
  {cutId: 'finale', query: {group: 'image' as const}, chosen: ['center', 'slideLeft', 'shrink', 'jitter', 'brackets', 'io.jizura.sliceGlitch', 'dev.remotion.effects.blur'], reason: 'centerへ戻して読みやすさを確保し、画像加工は冒頭36frameのみ。'},
].map(step => ({...step, candidates: searchEffects(step.query, exampleCatalog).map(e => ({group: e.group, id: e.id, name: e.name}))}));
