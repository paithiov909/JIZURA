// Independent case-specific geometry gates: expected equations use retained
// util/classification and measured advances, never the new motion/layout helpers.
import {referenceRuntime} from './effect-reference.jsx';
import {bracketGeometry} from '../dist/effects/decor.js';
const check = (value, label) => {if (!value) throw new Error(`Batch geometry: ${label}`);};
const close = (actual, expected, label) => check(Math.abs(actual - expected) < 1e-8, `${label}: ${actual} != ${expected}`);
export function batchGates(plan, work, motions) {
  if (!work.cut) return [];
  const effects = [work.cut.prepared.layout, work.cut.prepared.enter, work.cut.prepared.exit, work.cut.prepared.hold, ...work.cut.prepared.decor];
  if (!effects.some(e => ['mixed','slideLeft','shrink','jitter','brackets'].includes(e?.id))) return [];
  const cut = work.cut.prepared, staticItems = work.cut.geometry.items, state = work.state;
  const J = referenceRuntime(cut.font), passed = [];
  close(state.step, Math.floor(state.evaluationSeconds * 24 + 1e-6), 'jitter step from quantized seconds');
  if (cut.layout.id === 'mixed') {
    const chars = [...cut.text].map((ch, index) => ({ch, index})).filter(c => !/\s/.test(c.ch));
    const rows = chars.length > 9 ? 2 : 1, per = Math.ceil(chars.length / rows), p = cut.layout.params;
    check(staticItems.length === chars.length, 'mixed item count');
    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
      const row = chars.slice(rowIndex * per, (rowIndex + 1) * per).map(({ch, index}, j) => {
        const i = rowIndex * per + j;
        let k = J.isKanji(ch) ? 1 : J.isKata(ch) ? 0.88 : J.isLatin(ch) ? 0.8 : J.isPunct(ch) ? 0.42 : p.smallK + J.r(cut.seed, i, 3) * 0.14;
        if (J.isSmallKana(ch)) k *= 0.8;
        return {ch, index, i, k, w: J.metrics.adv('fixture', ch) * k * 0.96};
      });
      const sumW = row.reduce((s, c) => s + c.w, 0), W = plan.prepared.width, H = plan.prepared.height;
      const base = Math.min(W * 0.86 / sumW, H * (rows > 1 ? 0.3 : 0.4), (cut.style.fontSize ?? Infinity) / Math.max(...row.map(c => c.k)));
      let x = W / 2 - sumW * base / 2;
      row.forEach((c, j) => {
        const it = staticItems[c.i], glyph = it.glyphs[0], size = c.k * base;
        close(it.size, size, 'mixed size'); close(it.x, x + c.w * base / 2, 'mixed advance/center');
        let y = H / 2 + base * 0.38 + (rowIndex - (rows - 1) / 2) * base * 1.05 - size / 2 + J.rs(cut.seed, c.i, 5) * base * 0.06;
        if (p.mode === 'stair') y += (j - (row.length - 1) / 2) * base * 0.12;
        if (p.mode === 'wave') y += Math.sin(j * 1.1) * base * 0.1;
        close(it.y, y, 'mixed row baseline'); close(it.rot, J.rs(cut.seed, c.i, 6) * p.rotAmp, 'mixed rotation');
        check(glyph.codePointIndex === c.index, 'mixed emphasis index');
        const color = cut.emphasis.some(e => c.index >= e.start && c.index < e.end) ? cut.style.emphasisColor
          : c.i === p.accentIdx % chars.length && !J.isKanji(c.ch) ? cut.style.palette.accent : cut.style.palette.fg;
        check(glyph.color === color, 'mixed emphasis precedence'); x += c.w * base;
      });
    }
    passed.push('mixed rows/size/advance/position/rotation/emphasis');
  }
  work.items.forEach((it, itemIndex) => {
    const base = staticItems[itemIndex], chars = motions[itemIndex].chars;
    let size = base.size, track = base.track;
    if (state.applyHold && cut.hold?.id === 'breathe') {size *= 1 + 0.035 * Math.sin(state.evaluationSeconds * Math.PI * 2 * 0.9) * state.holdAmount; track += 0.03 * Math.sin(state.evaluationSeconds * Math.PI * 2 * 0.6) * state.holdAmount;}
    if (state.applyExit && cut.exit?.id === 'shrink') {
      const e = state.pOut ** 3; size *= 1 - e * 0.96; track -= e * 0.2;
      close(it.size, size, 'shrink item size'); close(it.track, track, 'shrink track'); close(it.x, base.x, 'shrink center x'); close(it.y, base.y, 'shrink center y');
      // Expected local glyph centers include the new track, not glyph-only scaling.
      for (const li of new Set(base.glyphs.map(g => g.li))) {
        const line = base.glyphs.filter(g => g.li === li), widths = line.map(g => g.w / base.size * size);
        let x = -(widths.reduce((a, b) => a + b, 0) + (line.length - 1) * track * size) / 2;
        line.forEach((g, i) => {close(it.glyphs[g.i].x, x + widths[i] / 2, 'shrink glyph center'); x += widths[i] + track * size;});
      }
      passed.push('shrink item center/size/track/glyph centers/alpha');
    }
    for (const g of base.glyphs) {
      const observed = chars[g.i] ?? {};
      let dx = 0, dy = 0, rotation = 0, alpha = 1, hidden = false;
      if (state.applyEnter && cut.enter?.id === 'slideLeft') {
        const d = base.glyphs.length > 1 ? g.i / (base.glyphs.length - 1) * 0.5 : 0, q = Math.min(1, Math.max(0, (state.pIn - d) / 0.5));
        hidden = q <= 0;
        if (q > 0 && q < 1) {dx -= 0.85 * base.size * (1 - q) ** 5; alpha *= Math.min(1, q * 1.6) ** 1.6;}
        check(!!observed.hide === hidden, 'slide hide'); passed.push('slide stagger/outQuint/alpha');
      }
      if (state.applyHold && cut.hold?.id === 'jitter') {
        const amplitude = base.size * 0.025 * state.holdAmount * cut.hold.params.amount;
        if (amplitude >= 0.2) {
          const seed = J.h(cut.hold.seed, (base.index ?? 0) + 1, 7) | 0;
          dx += J.rs(seed, state.step, g.i, 1) * amplitude; dy += J.rs(seed, state.step, g.i, 2) * amplitude;
          rotation += J.rs(seed, state.step, g.i, 3) * 4 * state.holdAmount;
        }
        passed.push('jitter step/seed/threshold/amount');
      }
      if (state.applyExit && cut.exit?.id === 'shrink') alpha *= 1 - state.pOut ** 6;
      // Only these cases use pop; its formula has its own prior reference gate.
      if (cut.enter?.id !== 'pop') {
        close(observed.dx ?? 0, dx, 'glyph dx'); close(observed.dy ?? 0, dy, 'glyph dy');
        close(observed.rot ?? 0, rotation, 'glyph rotation'); close(observed.a ?? 1, alpha, 'glyph alpha');
      }
    }
  });
  for (const effect of cut.decor.filter(e => e.id === 'brackets')) {
    const env = {W: plan.prepared.width, H: plan.prepared.height, lt: state.evaluationSeconds, pOut: state.pOut};
    // Both real current box and null are checked, even if a short Cut never opens.
    for (const box of [work.box, null]) {
      const bb = box ?? {x0: env.W * 0.35, x1: env.W * 0.65, y0: env.H * 0.4, y1: env.H * 0.6};
      const geo = bracketGeometry(env, box, effect.params.pad);
      const e = J.E.outExpo(J.clamp(env.lt / 0.35)) * (1 - state.pOut ** 3), pad = effect.params.pad + (bb.y1 - bb.y0) * 0.12;
      close(geo.e, e, 'brackets open/close'); close(geo.pad, pad, 'brackets padding');
      close(geo.corners[0][1][0], (bb.x0 + bb.x1) / 2 + (bb.x0 - pad - (bb.x0 + bb.x1) / 2) * e, 'brackets left');
      close(geo.corners[3][1][1], (bb.y0 + bb.y1) / 2 + (bb.y1 + pad - (bb.y0 + bb.y1) / 2) * e, 'brackets bottom');
    }
    passed.push('brackets current/null box/pad/open/close');
  }
  return [...new Set(passed)];
}
