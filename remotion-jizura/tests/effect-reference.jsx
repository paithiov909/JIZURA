// Development-only adapter. Retained sources are installed independently;
// adaptations are limited to the new font/Style/seed/bbox/cache contracts.
import installUtil from '../../engine/util.ts';
import installFonts from '../../ui/services/fonts.js';
import installText from '../../engine/text.ts';
import installAnimation from '../../effects/core/animation.ts';
import installLayouts from '../../effects/core/layouts.ts';
import installDecor from '../../effects/packs/decor.ts';
import installDecorB from '../../effects/packs/decorB.ts';
import {h, sid} from '../src/core/random.ts';
import {fontCSS} from '../src/canvas/fonts.ts';
import {evaluateFrame} from '../src/core/frame.ts';
import {centerText} from '../src/canvas/center.ts';

export function referenceRuntime(font) {
  const groups = {layout: 'LAYOUTS', enter: 'ENTER', exit: 'EXIT', hold: 'HOLD', decor: 'DECOR'};
  const J = {registerBaseline(group, id, def) {(this[groups[group]] ??= {})[id] = def;},
    registerBaselineAll(group, defs) {for (const [id, def] of Object.entries(defs)) this.registerBaseline(group, id, def);}};
  installUtil(J); installFonts(J); installText(J); installAnimation(J); installLayouts(J); installDecor(J); installDecorB(J);
  J.FONTS.fixture = {family: '"Noto Sans JP"', weight: font.weight, fb: 'sans-serif'};
  J.fontCSS = (_, px) => fontCSS(font, px);
  const get = J.glyphs.get.bind(J.glyphs);
  J.glyphs.get = (font, ch, px) => {
    const glyph = get(font, ch, px); delete glyph.frags;
    glyph.pieces.forEach((piece, index) => {piece.id = h(sid(ch), glyph.res, index + 1); piece.frags = null;});
    return glyph;
  };
  return J;
}
export function drawReference(canvas, plan, frame) {
  const state = evaluateFrame(plan.prepared, frame), ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!state.sceneActive) return null;
  if (plan.prepared.background !== null) {ctx.fillStyle = plan.prepared.background; ctx.fillRect(0, 0, canvas.width, canvas.height);}
  if (state.activeCutIndex === null) return null;
  const cut = plan.cuts[state.activeCutIndex].prepared, geometry = plan.cuts[state.activeCutIndex].geometry;
  const J = referenceRuntime(cut.font);
  // Explicit newlines are retained, and each line uses the old reflow algorithm.
  const oldSplit = J.splitLines;
  J.splitLines = (text, max) => text.split('\n').map(line => oldSplit(line, max)).join('\n');
  const reflow = centerText(cut, canvas.width, canvas.height);
  const oldFit = J.fitSize;
  J.fitSize = (...args) => Math.min(oldFit(...args), cut.style.fontSize ?? Infinity);
  const oldLayout = J.layoutText;
  J.layoutText = it => oldLayout({...it, lead: cut.style.lead});
  const oldDraw = J.drawItem;
  J.drawItem = (env, it) => {
    const previous = it.charFn;
    return oldDraw(env, {...it, charFn: (i, ...args) => {
      const c = previous?.(i, ...args) ?? {}, index = reflow.indices[i];
      return {...c, color: cut.emphasis.some(e => index >= e.start && index < e.end) ? cut.style.emphasisColor : it.color};
    }});
  };
  for (const [group, id, effect] of [['ENTER', 'pop', cut.enter], ['ENTER', 'wipe', cut.enter], ['HOLD', 'breathe', cut.hold], ['EXIT', 'drift', cut.exit]]) {
    const old = J[group][id].apply;
    J[group][id].apply = (env, it, ...args) => {it.seed = effect?.itemSeed ?? 0; return old(env, it, ...args);};
  }
  const referenceCut = {text: cut.text, lineText: cut.lineText, params: {...cut.layout.params, font: 'fixture'}, seed: cut.seed,
    dur: state.durationSeconds, inDur: state.enterSeconds, outDur: state.exitSeconds,
    enter: state.applyEnter ? cut.enter.id : 'cut', hold: cut.hold?.id ?? 'still', exit: cut.exit?.id ?? 'cut'};
  const env = {ctx, W: canvas.width, H: canvas.height, sc: cut.style.palette, st: {fonts: {body: ['fixture']}}, fx: {}, fps: plan.prepared.fps,
    cut: referenceCut, lt: state.evaluationSeconds, ltb: state.evaluationSeconds, pIn: state.pIn, pOut: state.pOut, step: state.step, pass: 'main', scale: 1};
  env.draw = it => oldDraw(env, it); // subtitle is separate, no main emphasis
  env.rect = (x, y, w, h, c, a = 1) => {ctx.globalAlpha = a; ctx.fillStyle = c; ctx.fillRect(x, y, w, h); ctx.globalAlpha = 1;};
  env.line = (pts, c, lw = 1, a = 1) => {ctx.globalAlpha = a; ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.lineJoin = 'miter'; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(...pts[0]); for (const p of pts.slice(1)) ctx.lineTo(...p); ctx.stroke(); ctx.globalAlpha = 1;};
  // Determine THIS frame's bbox on an isolated canvas before back decor.
  const probe = document.createElement('canvas'); probe.width = canvas.width; probe.height = canvas.height;
  const bb = J.LAYOUTS.center.render({...env, ctx: probe.getContext('2d'), draw: () => {}, rect: () => {}, line: () => {}});
  const fallback = geometry.box ?? J.centerBB(env, null), chosen = bb ?? fallback;
  const decor = layer => {
    for (const effect of cut.decor) if (effect.layer === layer) {
      // New env.cut each draw prevents both old WeakMaps retaining prior frames.
      ctx.save(); J.DECOR[effect.id].draw({...env, cut: {...referenceCut}}, chosen, {...effect.params, seed: effect.seed}); ctx.restore();
    }
  };
  decor('back'); const box = J.LAYOUTS.center.render(env); decor('front');
  return {box, text: J.splitLines(cut.text, canvas.width < canvas.height ? 5 : 11), glyphs: J.layoutText({text: reflow.text, font: 'fixture', size: geometry.items[0].size, track: cut.layout.params.track, lead: cut.style.lead})};
}
