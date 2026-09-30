import type { FontMetadata, Plan, Project, AEPlan, ExportRange } from './types.ts';
import type { LegacyFacade, LegacyValue } from './legacy-types.ts';
export default function install(J: LegacyFacade): void {
J.AE_MAP = {
  layout: { lowerThird: 'center', corners: 'mixed', staircase: 'mixed', zigzag: 'wave', arcTop: 'ring', spiral: 'ring', gridCells: 'labels', dropCap: 'mixed', justified: 'tile', frameBox: 'center', bubble: 'pill', subtitleBar: 'center', ticker: 'marquee', splitScreen: 'diag', mirror: 'stack', sideways: 'vcols', edgeFrame: 'marquee', perspective: 'stack', hanko: 'vcols', genkou: 'vcols', panels: 'diag', filmstrip: 'labels', quote: 'center', ruler: 'gloss', searchBar: 'type', chat: 'labels', notification: 'pill', ticket: 'pill',
    rain: 'tile', hanging: 'scatter', orbit: 'ring', tunnel: 'tile', wordCloud: 'scatter', bounceLine: 'mixed', elastic: 'condensed', crossBands: 'diag', stickerBomb: 'labels', neon: 'center', keycaps: 'labels', bubbles: 'scatter', slotMachine: 'labels', flipBoard: 'labels', credits: 'type', zoomRepeat: 'stack', splitHalves: 'stack', columnsBig: 'vcols', circleWords: 'ring', dotMatrix: 'type', depthStack: 'stack', typeSpecimen: 'stack', kanjiFocus: 'huge', halfVertical: 'vcols', curtain: 'center', equalizer: 'mixed', tape: 'diag' },
  enter: { riseMask: 'drop', dropMask: 'drop', slideL: 'wipe', slideR: 'wipe', slideWhole: 'stretch', flipX: 'spin', flipY: 'spin', domino: 'spin', fold: 'pop', unroll: 'wipe', strokeDraw: 'assemble', outlineFill: 'blur', splitJoin: 'slice', vSlice: 'slice', shutter: 'wipe', iris: 'zoom', diagWipe: 'wipe', blinds: 'slice', checker: 'flicker', randomOrder: 'flicker', bounceBig: 'drop', squashDrop: 'drop', rubber: 'stretch', glitchIn: 'scramble', echoIn: 'zoom', whip: 'stretch', skewIn: 'stretch', trackIn: 'blur', trackOut: 'blur', blurStagger: 'blur', fadeStagger: 'blur', waveIn: 'pop', spiralIn: 'spin', zoomOut: 'zoom', resolve: 'scramble', magnet: 'assemble', inkBleed: 'blur', neonOn: 'flicker', cursorSweep: 'type', stamp: 'zoom' },
  exit: { sinkMask: 'fall', riseOut: 'drift', slideOutL: 'stretch', slideOutR: 'stretch', flipOutX: 'shrink', flipOutY: 'fall', foldOut: 'shrink', squash: 'shrink', trackOutWide: 'blur', collapse: 'shrink', zoomThrough: 'blur', zoomFar: 'shrink', spinOut: 'scatter', twist: 'shrink', waveOut: 'scatter', blurOutStagger: 'blur', undraw: 'blur', outlineOut: 'blur', irisClose: 'shrink', diagWipeOut: 'wipe', blindsClose: 'slice', checkerOut: 'glitch', splitApart: 'slice', vSliceDrop: 'fall', melt: 'fall', dissolve: 'drift', backspace: 'wipe', scrambleOut: 'glitch', glitchDissolve: 'glitch', echoOut: 'blur', whipOut: 'stretch', gravity: 'fall', popOut: 'scatter', burn: 'drift', sweepCover: 'wipe', shatterLite: 'explode' },
  hold: { float: 'drift', sway: 'wave', pulse: 'breathe', shimmer: 'still', colorRun: 'still', rotateSlow: 'drift', trackBreathe: 'breathe', skewWobble: 'wave', beatHop: 'wave', hWave: 'wave', heartbeat: 'breathe', orbitSmall: 'jitter', jelly: 'breathe', scanBand: 'glitchtick', noiseDrift: 'drift', tilt: 'drift', zoomSlow: 'drift', stretchPulse: 'breathe', glitchJump: 'glitchtick', echoTrail: 'drift' },
  decor: { crosshair: 'brackets', cropMarks: 'brackets', reticle: 'rings', radar: 'rings', progressRing: 'rings', timecodeBar: 'barcode', rulerEdge: 'grid', dimension: 'leaders', indexNum: 'counter', dateStamp: 'barcode', qrBlock: 'barcode', glitchRects: 'bars', concentricSquares: 'shapes', triangleSpin: 'shapes', lineBurst: 'sparks', plusGrid: 'grid', guides: 'grid', waveLine: 'waveform', spiralLine: 'rings', halftonePatch: 'shapes', checkerStrip: 'stripes', beatRing: 'rings', orbitDots: 'dots', constellation: 'sparks', confetti: 'shapes', petals: 'shapes', rainStreaks: 'slash', snow: 'dots', lightLeak: 'blobs', bokeh: 'blobs', speedCorner: 'slash', risingParticles: 'sparks', twinkle: 'sparks', brushStroke: 'bars', tapePieces: 'bars', scribbleCircle: 'rings', scribbleUnder: 'slash', crossOut: 'slash', highlightMark: 'bars', heartsStars: 'shapes', watermarkKanji: 'counter', verticalStrip: 'leaders', romajiLine: 'leaders', bracketsJP: 'brackets', seal: 'shapes' },
  fx: { rgbSplit: 'chroma', smear: 'slice', vhsRoll: 'slice', trackingNoise: 'slice', waveWarp: 'slice', pixelDrift: 'slice', tileShift: 'block', gridRepeat: 'block', mirrorFlash: 'block', strobe: 'invert', blackFrame: 'invert', whiteFrame: 'flash', filmBurn: 'flash', lightSweep: 'flash', panelWipe: 'flash', zoomPunch: 'zoom', whipBlur: 'zoom', posterize: 'mosaic', hueShift: 'chroma', irisTrans: 'zoom', doors: 'slice', blindsTrans: 'slice', splitSlide: 'slice', crtOff: 'flash' },
};
// The plan goes to the After Effects panel as-is (version 2): the panel builds every key it implements and
// picks the closest counterpart itself (from the exported metadata / J.AE_MAP) for anything it lacks.
J.planForAE = (plan: Plan, project: Project, range?: ExportRange | null): AEPlan => {
  const clean: AEPlan = JSON.parse(JSON.stringify(plan, (k: LegacyValue, v: LegacyValue) => (k === 'energy' || k === 'buffer' || k === 'peaks' ? undefined : v)));
  clean.version = 2;
  clean.width = J.outputSize(project)[0]; clean.height = J.outputSize(project)[1];
  clean.extra = project.extra === true; clean.wa = project.wa !== false;
  if (J.setOn) for (const s of J.SET_ORDER as Array<'horror' | 'typo' | 'kinetic'>) clean[s] = J.setOn(project, s);
  clean.fonts = {};
  for (const [role, keys] of Object.entries(plan.style.fonts as Record<string, string[]>)) clean.fonts[role] = keys.map((k: LegacyValue) => J.FONTS[k] ? J.FONTS[k].label : k);
  clean.fontTable = Object.fromEntries(Object.entries(J.FONTS as Record<string, FontMetadata>).map(([k, f]) => [k, { label: f.label, family: f.family.replace(/"/g, ''), weight: f.weight, kind: f.kind }]));
  // lyric language: the face each key is drawn with in the browser for this plan (the panel maps keys → AE fonts per language)
  clean.lang = plan.lang || 'ja';
  if (J.setLang && J.faceOf && clean.lang !== 'ja') {
    J.setLang(clean.lang);
    for (const k of Object.keys(clean.fontTable)) { const f = J.faceOf(k); clean.fontTable[k].langFamily = f.family.replace(/"/g, ''); clean.fontTable[k].langWeight = f.weight; }
  }
  // モーフ has no After Effects counterpart yet: build it as the closest transition (an ink-blob dissolve)
  for (const c of clean.cuts || []) if (c.morph && !c.trans) { c.trans = 'inkBlob'; c.transDur = c.morph.dur; c.transP = {}; c.webMorph = true; }
  // 行の範囲だけ: keep the cuts / events inside [t0, t1] and move them to start at 0.
  // audioOffset tells the AE panel to slide the song layer left by t0 so it stays in sync.
  if (range) {
    const sp = J.exportSpan(plan, range), t0 = sp.t0, t1 = t0 + sp.dur, eps = 1e-3;
    const sh = (o: LegacyValue) => { o.start -= t0; o.end -= t0; return o; };
    clean.cuts = clean.cuts.filter((c: LegacyValue) => c.end > t0 + eps && c.start < t1 - eps).map((c: LegacyValue) => { if (c.companion) sh(c.companion); return sh(c); });
    clean.events = (clean.events || []).filter((e: LegacyValue) => e.t >= t0 - 1 && e.t < t1).map((e: LegacyValue) => Object.assign(e, { t: e.t - t0 }));
    for (const l of clean.lines || []) { sh(l); if (l.visEnd != null) l.visEnd -= t0; }   // all lines stay (cut.line indexes them)
    clean.duration = sp.dur; clean.audioOffset = t0; clean.range = { t0, t1 };
  }
  return clean;
};

}
