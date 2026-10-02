// Development fixtures shared by the canvas comparison and executable example.
export const fixedLayout = {group: 'layout', id: 'center', seed: 123, params: {sx: 1, track: 0.08, ox: 0, oy: 0, sub: false, under: false, accent: false}};
const motion = (group, id, seed = 123) => ({group, id, seed});
const kasumi = seed => motion('decor', 'kasumi', seed);
const checker = seed => motion('decor', 'checkerStrip', seed);
const base = {text: '新しい*朝*が来た', layout: fixedLayout, enter: null, hold: null, exit: null, decor: []};
export const effectCases = {
  disabled: base,
  center: {...base, text: {text: '新しい朝', emphasis: [{start: 0, end: 1}], source: {line: 0, cut: 0, lineText: '新しい朝が来た希望の朝だ'}}, layout: {...fixedLayout, params: {...fixedLayout.params, sx: 1.25, ox: -0.03, oy: 0.06, under: true, sub: true, accent: true}}},
  reflow: {...base, text: '新しい朝が来た*希望の朝だ今日も* ABC 123'},
  latin: {...base, text: 'one two *three four* five six'},
  multiline: {...base, text: '朝\n*希望*の朝だ'},
  pop: {...base, enter: motion('enter', 'pop', 0)},
  wipe: {...base, enter: motion('enter', 'wipe', 0)},
  wipeReverse: {...base, enter: motion('enter', 'wipe', 1)},
  breathe: {...base, hold: motion('hold', 'breathe')},
  drift: {...base, text: '*朝霧* i!。', exit: motion('exit', 'drift', 0)},
  kasumi: {...base, decor: [kasumi(0)]},
  checkerStrip: {...base, decor: [checker(721)]},
  checkerLines: {...base, decor: [{...checker(0), params: {v: 2, right: false, low: true}}]},
  checkerTaper: {...base, decor: [{...checker(1), params: {v: 1, right: true, low: false}}]},
  fixed: {...base, enter: motion('enter', 'pop'), hold: motion('hold', 'breathe'), exit: motion('exit', 'drift'), decor: [kasumi(889), checker(721)]},
  partial: {text: '喜びに*胸*を開け', hold: 'breathe', decor: [kasumi(889), checker(721)]},
  automatic: {text: '希望の*朝*'},
  seedDifferent: {...base, enter: motion('enter', 'pop', 999), exit: motion('exit', 'drift', 999), hold: 'breathe', decor: [kasumi(999), checker(999)]},
  repeated: {...base, enter: motion('enter', 'wipe'), exit: motion('exit', 'drift'), hold: 'breathe', decor: [checker(2), kasumi(0), kasumi(889), checker(3), kasumi(0)]},
};
