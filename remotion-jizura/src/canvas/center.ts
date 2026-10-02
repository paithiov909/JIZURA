// Center reflow/fit from effects/core/layouts.ts. Explicit line breaks remain
// boundaries; token objects carry original code-point emphasis through reflow.
import {clamp} from '../effects/math.js';
import type {PreparedCut, PreparedScene} from '../core/scene-plan.js';
import {isHira, latinText} from '../core/scripts.js';
import {layoutGlyphs, type Advance, type CutGeometry, type Glyph, type StaticItem, type Box} from './geometry.js';
type Token = {ch: string; index: number};
const trim = (a: Token[]) => {while (a.length && /\s/.test(a[0].ch)) a.shift(); while (a.length && /\s/.test(a[a.length - 1].ch)) a.pop(); return a;};
function splitLine(a: Token[], max: number): Token[][] {
  if (a.length <= max) return [a];
  const text = a.map(t => t.ch).join('');
  if (latinText(text)) {
    const words: Token[][] = []; let current: Token[] = [];
    for (const t of trim([...a])) {if (/\s/.test(t.ch)) {if (current.length) words.push(current); current = [];} else current.push(t);}
    if (current.length) words.push(current);
    if (words.length <= 1) return [a];
    const total = words.reduce((s, w) => s + w.length, 0) + words.length - 1;
    const lines = Math.min(words.length, Math.ceil(total / max)), ideal = total / lines;
    const len = (i: number, j: number) => words.slice(i, j).reduce((s, w) => s + w.length, 0) + j - i - 1;
    const memo = new Map<string, {cost: number; cuts: number[]}>();
    const best = (i: number, l: number): {cost: number; cuts: number[]} => {
      if (l === 1) return {cost: (len(i, words.length) - ideal) ** 2, cuts: []};
      const key = `${i},${l}`, cached = memo.get(key); if (cached) return cached;
      let result = {cost: Infinity, cuts: [] as number[]};
      for (let j = i + 1; j <= words.length - l + 1; j++) {const sub = best(j, l - 1), cost = (len(i, j) - ideal) ** 2 + sub.cost; if (cost < result.cost) result = {cost, cuts: [j, ...sub.cuts]};}
      memo.set(key, result); return result;
    };
    const cuts = [0, ...best(0, lines).cuts, words.length];
    return cuts.slice(0, -1).map((start, i) => words.slice(start, cuts[i + 1]).flatMap((w, j) => j ? [{ch: ' ', index: w[0].index - 1}, ...w] : w));
  }
  const lines = Math.ceil(a.length / max), per = a.length / lines, out: Token[][] = []; let start = 0;
  for (let l = 1; l < lines; l++) {
    const target = Math.round(per * l); let best = target, score = -1;
    for (let k = Math.max(start + 1, target - 3); k <= Math.min(a.length - 1, target + 3); k++) {
      const prev = a[k - 1].ch, next = a[k].ch; let s = 3 - Math.abs(k - target);
      if (isHira(prev) && !isHira(next)) s += 3;
      if (/[、。，．,.!?！？…‥・「」『』（）()【】〈〉《》〔〕［］\[\]'"“”‘’ー〜～:：;；\-—―]/.test(prev) || prev === ' ' || prev === '　') s += 5;
      if ('ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ'.includes(next) || 'ーっ、。'.includes(next)) s -= 6;
      if (s > score) {score = s; best = k;}
    }
    out.push(trim(a.slice(start, best))); start = best;
  }
  out.push(trim(a.slice(start))); return out;
}
export function centerText(cut: PreparedCut, width: number, height: number): {text: string; indices: number[]} {
  let index = 0;
  const lines = cut.text.split('\n').flatMap(line => {const tokens = [...line].map(ch => ({ch, index: index++})); index++; return splitLine(tokens, width < height ? 5 : 11);});
  return {text: lines.map(l => l.map(t => t.ch).join('')).join('\n'), indices: lines.flatMap(l => l.map(t => t.index))};
}
export function itemBox(item: StaticItem, glyphs: readonly Glyph[] = item.glyphs): Box | null {
  const visible = glyphs.filter(g => g.ch !== ' ' && g.ch !== '　');
  if (!visible.length || item.size <= 0.5) return null;
  return {x0: item.x + Math.min(...visible.map(g => (g.x - g.w / 2) * item.sx)),
    x1: item.x + Math.max(...visible.map(g => (g.x + g.w / 2) * item.sx)),
    y0: item.y + Math.min(...visible.map(g => (g.y - g.h / 2) * item.sy)),
    y1: item.y + Math.max(...visible.map(g => (g.y + g.h / 2) * item.sy)), cx: item.x, cy: item.y};
}
export function measureCenterCut(cut: PreparedCut, scene: PreparedScene, advance: Advance): CutGeometry {
  const p = cut.layout.params, {text, indices} = centerText(cut, scene.width, scene.height);
  const reflowed = {...cut, text}, track = p.track as number, sx = p.sx as number;
  const probe = layoutGlyphs(reflowed, 100, track, advance);
  const size = Math.min(100 * Math.min(scene.width * 0.84 / Math.max(1, probe.width * sx), scene.height * 0.5 / Math.max(1, probe.height)), scene.height * 0.33, cut.style.fontSize ?? Infinity);
  const glyphs = layoutGlyphs(reflowed, size, track, advance).glyphs.map((g, i) => ({...g, codePointIndex: indices[i], color: cut.emphasis.some(e => indices[i] >= e.start && indices[i] < e.end) ? cut.style.emphasisColor : p.accent ? cut.style.palette.accent : cut.style.palette.fg}));
  const item = {text, font: cut.font, size, track, lead: cut.style.lead, x: scene.width / 2 + (p.ox as number) * scene.width,
    y: scene.height / 2 + (p.oy as number) * scene.height, sx, sy: 1, glyphs};
  const subSize = clamp(scene.height * 0.026, 16, 34);
  const subtitle = p.sub && cut.lineText !== cut.text ? {text: cut.lineText, font: cut.font, size: subSize, track: 0.22, lead: 1.2,
    x: item.x, y: 0, sx: 1, sy: 1, glyphs: layoutGlyphs({...cut, text: cut.lineText, emphasis: [], style: {...cut.style, lead: 1.2}}, subSize, 0.22, advance).glyphs} : undefined;
  return {items: [item], box: itemBox(item), ...(subtitle ? {subtitle} : {})};
}
