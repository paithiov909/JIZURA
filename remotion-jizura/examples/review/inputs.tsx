import {center, pop, wipe, drift, breathe, kasumi, checkerStrip} from 'remotion-jizura';
import type {JizuraCutProps, DecorParams} from 'remotion-jizura';

// Development inputs only. IDs are example labels, not new JizuraCut props.
export type ReviewCut = {id: string; cut: JizuraCutProps};
export type ReviewInput = {name: string; cuts: ReviewCut[]};
export type ReviewProps = {input?: ReviewInput; candidate?: string; fontSrc?: string};
const decorParams: DecorParams = {n: 2, right: true, low: false, accent: true,
  corner: false, big: false, mode: 'count', from: 0, to: 60, v: 2, r: 0.4};
const fixed = (seed: number, from: number): JizuraCutProps => ({
  text: '新しい*朝*が来た', seed, from, durationInFrames: 60,
  enterDurationInFrames: 12, exitDurationInFrames: 16,
  layout: center({seed: 123, params: {sx: 1, track: 0.08, ox: 0, oy: 0,
    sub: false, under: false, accent: false}}),
  enter: pop({seed: 456}), exit: drift({seed: 789}), hold: breathe({seed: 321}),
  decor: [kasumi({seed: 889, params: decorParams}), checkerStrip({seed: 721, params: decorParams})],
  style: {palette: {fg: '#EEEEEE', accent: '#16F4D4', accent2: '#FFAA55'}, emphasisColor: '#FFAA55'},
  treat: null, bg: null, cam: null, fx: null, trans: null,
});
const combined: ReviewInput = {name: 'combined', cuts: [
  {id: 'target', cut: fixed(1234, 0)}, {id: 'reference', cut: fixed(5678, 60)},
]};
const single = (name: string): ReviewInput => ({name, cuts: combined.cuts.map(({id, cut}) => ({id,
  cut: id === 'reference' ? cut : {...cut,
    enterDurationInFrames: name === 'pop' || name === 'wipe' ? 12 : 0,
    exitDurationInFrames: name === 'drift' ? 16 : 0,
    enter: name === 'pop' ? pop({seed: 456}) : name === 'wipe' ? wipe({seed: 456}) : null,
    exit: name === 'drift' ? drift({seed: 789}) : null,
    hold: name === 'breathe' ? breathe({seed: 321}) : null,
    decor: name === 'kasumi' ? [kasumi({seed: 889, params: decorParams})]
      : name === 'checkerStrip' ? [checkerStrip({seed: 721, params: decorParams})] : [],
  },
}))});
const edited: ReviewInput = {name: 'edited', cuts: combined.cuts.map(({id, cut}) => ({id,
  cut: id === 'reference' ? cut : {...cut, enterDurationInFrames: 20, exitDurationInFrames: 10,
    layout: center({seed: 123, params: {sx: 1.15, track: 0.12, ox: -0.04, oy: 0.04,
      sub: false, under: true, accent: false}}),
    style: {palette: {fg: '#C3E8FF', accent: '#FF6688', accent2: '#FFD166'}, emphasisColor: '#FFD166'},
    decor: [kasumi({seed: 889, params: {...decorParams, n: 1, right: false, big: true}}),
      checkerStrip({seed: 721, params: {...decorParams, low: true, v: 4}})],
  },
}))};
export const reviewInputs: Record<string, ReviewInput> = Object.fromEntries([
  ...['center', 'pop', 'wipe', 'drift', 'breathe', 'kasumi', 'checkerStrip'].map(name => [name, single(name)]),
  ['combined', combined], ['edited', edited],
]);
