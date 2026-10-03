// Development inputs, not accepted regression baselines or a project format.
import type {CenterParams, DecorParams, MixedParams, BracketsParams} from '../src/types.js';

export type PortCase = {
  id: string; kind: 'text' | 'image'; preset: string; reason: string;
  text: string; width: number; height: number; fps: number;
  duration: number; from: number; enter: number; exit: number;
  seed: number; background: string | null; motionFps: number | null;
  mixed?: Partial<MixedParams>; jitterAmount?: number; brackets?: Partial<BracketsParams>; extraFrames?: number[];
  layout?: Partial<CenterParams>; decor?: Partial<DecorParams>;
  custom?: {offset: number; amplitude: number; cycles: number; thickness: number; accent: boolean};
  image?: {mode: 'glitch' | 'standard' | 'combined' | 'reverse'; target: 'lyrics' | 'image'; amount: number; radius: number};
  video: boolean; legacy: boolean; parallel?: boolean;
};
const base: Omit<PortCase, 'id' | 'preset' | 'reason'> = {
  kind: 'text', text: '新しい*朝*が来た', width: 640, height: 360, fps: 24,
  duration: 30, from: 1, enter: 6, exit: 8, seed: 0,
  background: '#16324F', motionFps: null, video: false, legacy: true,
};
const c = (id: string, preset: string, reason: string, extra: Partial<PortCase> = {}): PortCase => ({...base, id, preset, reason,
  enter: ['pop', 'wipe', 'combined', 'custom'].includes(preset) ? 6 : 0,
  exit: ['drift', 'combined', 'custom'].includes(preset) ? 8 : 0, ...extra});
export const portCases: readonly PortCase[] = [
  c('center', 'center', 'Short emphasized text; static placement anchor.', {video: true}),
  c('pop', 'pop', 'Enter start/mid/end; hidden start is intentional.', {video: true}),
  c('wipe', 'wipe', 'Clipping and bar; zero seed direction.'),
  c('drift', 'drift', 'Fragment exit, punctuation and cache regeneration.', {text: '*朝霧* i!。', video: true}),
  c('breathe', 'breathe', 'Item size/spacing during hold.'),
  c('kasumi', 'kasumi', 'Back layer, intentional edge contact.'),
  c('checker', 'checker', 'Front layer, current logical box.'),
  c('combined', 'combined', 'All seven together; serial/parallel and phase boundaries.', {video: true, parallel: true, seed: 1234}),
  c('long-wide', 'combined', 'Long text/reflow, Latin digits and emphasis.', {width: 800, height: 320, text: '新しい朝が来た*希望の朝だ今日も* ABC 123'}),
  c('multiline-tall', 'combined', 'Explicit newline, emphasis indices and portrait metrics.', {width: 360, height: 640, text: '朝\n*希望*の朝だ', background: null, video: true}),
  c('latin', 'center', 'Latin word boundaries and spaces.', {text: 'one two *three four* five six'}),
  c('one-frame', 'combined', 'D1 must retain a static frame; no forced phase visibility.', {duration: 1, enter: 0, exit: 0}),
  c('bounds-low', 'checker', 'Layout/active decor lower endpoints; edge position is intentional.', {layout: {sx: 0.25, track: 0, ox: -0.25, oy: -0.25}, decor: {v: 0, right: false, low: false, accent: false}}),
  c('bounds-high', 'kasumi', 'Layout upper endpoints and active decor count/direction.', {seed: 4294967295, layout: {sx: 4, track: 1, ox: 0.25, oy: 0.25}, decor: {n: 3, right: true}}),
  c('quantized', 'combined', 'Same/adjacent step and explicit motionFps on twos.', {motionFps: 12, seed: 999}),
  c('custom', 'custom', 'Caller layout/motion/decor; current/null box.', {legacy: false, background: null, video: true, custom: {offset: -0.06, amplitude: 12, cycles: 0.8, thickness: 4, accent: true}}),
  c('custom-low', 'custom', 'Caller schema low endpoints incl. zero motion.', {legacy: false, custom: {offset: -0.2, amplitude: 0, cycles: 0, thickness: 1, accent: false}}),
  c('custom-high', 'custom', 'Caller schema high endpoints on portrait mixed-script lines.', {legacy: false, width: 360, height: 640, text: '*朝* ABC\nかな！？', custom: {offset: 0.2, amplitude: 40, cycles: 3, thickness: 12, accent: true}}),
  ...(['glitch', 'standard', 'combined', 'reverse'] as const).map(mode => c(`image-${mode}`, 'center', 'Native slice / standard blur; transparent lyrics, order and Cut-local trigger.', {
    kind: 'image', legacy: false, background: null, video: mode === 'combined',
    image: {mode, target: 'lyrics', amount: 0.65, radius: 4},
  })),
  c('image-independent', 'center', 'Same native factory on a separate image; full amount endpoint.', {kind: 'image', legacy: false, image: {mode: 'glitch', target: 'image', amount: 1, radius: 0}}),
  c('mixed', 'mixed', 'Two glyphs and original size rhythm with emphasis.', {text: '*朝*だ', video: true}),
  c('mixed-nine', 'mixed', 'Nine glyphs stay on one row; script, punctuation, small kana.', {text: '朝あアABC！ゃ夜'}),
  c('mixed-ten', 'mixed', 'Ten glyphs switch to two rows and stair mode.', {text: '朝あアABC！ゃ夜光', mixed: {mode: 'stair', rotAmp: 0}}),
  c('mixed-sixteen', 'mixed', 'Sixteen glyphs with wave baseline and explicit emphasis.', {text: '朝あアABC！ゃ夜光空海*春夏秋冬*', mixed: {mode: 'wave'}}),
  c('mixed-portrait', 'mixed', 'Long portrait; whitespace/newline removal keeps emphasis indices.', {width: 360, height: 640, text: '朝 かな ABC！？\n*希望の夜*が明ける今日', video: true}),
  c('mixed-low', 'mixed', 'Latin/space and lower bounds; seed zero.', {text: 'A *b* C？', mixed: {mode: 'line', rotAmp: 0, smallK: 0.25, accentIdx: 0}}),
  c('mixed-high', 'mixed', 'Upper bounds, small kana, repeated emphasis and uint32 seed.', {text: 'かなゃ*朝朝*かな', seed: 4294967295, mixed: {mode: 'wave', rotAmp: 20, smallK: 1, accentIdx: 9999}}),
  c('slideLeft', 'slideLeft', 'Explicit enter timing and last glyph stagger.', {enter: 8, video: true}),
  c('slide-single', 'slideLeft', 'One glyph has no stagger.', {text: '*朝*', enter: 4}),
  c('slide-multiline', 'slideLeft', 'Multiple lines and original glyph traversal.', {text: '朝ABC\n*希望*かな', enter: 12, width: 360, height: 640}),
  c('batch-one-frame', 'batch', 'All new effects at D1: static text, no forced decor.', {text: '*朝*だ', duration: 1, enter: 0, exit: 0}),
  c('shrink', 'shrink', 'Item-center shrink plus breathe spacing; exit start/mid/end.', {exit: 10, video: true}),
  c('jitter', 'jitter', 'Step-indexed motion and hold ramp.', {video: true, extraFrames: [7, 8, 9, 10]}),
  c('jitter-high', 'jitter', 'Upper displacement bound on portrait/multiline text.', {jitterAmount: 4, width: 360, height: 640, text: '朝ABC\n*希望*かな'}),
  c('jitter-zero', 'jitter', 'Zero motion amount; invariant hold geometry.', {jitterAmount: 0}),
  c('jitter-quantized', 'jitter', 'Same/adjacent quantized steps, reverse seeks and parallel.', {motionFps: 12, seed: 4294967295, extraFrames: [7, 8, 9, 10], parallel: true}),
  c('brackets', 'brackets', 'Current box, original defaults, front layer and closing.', {exit: 8, video: true}),
  c('brackets-low', 'brackets-pop', 'Null box at hidden enter and low pad/stroke, transparent.', {enter: 6, background: null, brackets: {pad: 0, stroke: 0.5, accent: false}}),
  c('brackets-high', 'brackets-pop', 'High pad/stroke on portrait and moving current box.', {enter: 6, exit: 8, width: 360, height: 640, text: '朝\n*希望*の朝だ', brackets: {pad: 64, stroke: 12, accent: true}}),
  c('batch', 'batch', 'All five plus per-item geometry/alpha/seeds; serial/parallel.', {enter: 8, exit: 10, text: '新しい*朝*ABC！', seed: 1234, video: true, parallel: true}),
  c('mixed-breathe-shrink', 'mixed-breathe-shrink', 'Mixed items with original breathe and shrinking item centers.', {exit: 10, text: '新しい*朝*ABC！？'}),

];
export function getPortCase(id: string): PortCase {
  const value = portCases.find(entry => entry.id === id);
  if (!value) throw new Error(`Unknown port case: ${id}`);
  return value;
}
export const sceneDuration = (spec: PortCase) => spec.from + spec.duration + 1;
export const anchorFrame = (spec: PortCase) => spec.from + Math.floor(spec.duration / 2);
export function representativeFrames(spec: PortCase): number[] {
  return [...new Set([spec.from - 1, spec.from, spec.from + Math.floor(spec.enter / 2), spec.from + spec.enter,
    anchorFrame(spec), spec.from + spec.duration - spec.exit, spec.from + spec.duration - 1,
    spec.from + spec.duration, sceneDuration(spec), ...(spec.extraFrames ?? [])])].sort((a, b) => a - b);
}
