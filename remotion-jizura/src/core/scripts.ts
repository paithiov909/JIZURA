// Script classification and fallback chunking ported from engine/util.ts,
// engine/planner.ts and effects/core/layouts.ts. Deliberately no Intl.Segmenter.
export const isKanji = (c: string) => /[㐀-鿿豈-﫿々〆ヶ]/.test(c);
export const isHira = (c: string) => /[ぁ-ゟ]/.test(c);
export const isKata = (c: string) => /[゠-ヿㇰ-ㇿｦ-ﾟ]/.test(c);
export const isSmallKana = (c: string) => 'ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ'.includes(c);
export const isPunct = (c: string) => /[、。，．,.!?！？…‥・「」『』（）()【】〈〉《》〔〕［］\[\]'"“”‘’ー〜～:：;；\-—―]/.test(c);
export const isLatin = (c: string) => /[A-Za-z0-9]/.test(c);
const WORDCH = /[A-Za-z\u00c0-\u024f0-9\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]/;
const wordLike = (t: string) => /^[A-Za-z\u00c0-\u024f0-9\uac00-\ud7af'’.,!?‐–—-]+$/.test(t) && WORDCH.test(t);
export const latinText = (t: string) => {
  const s = t.replace(/\s/g, '');
  return !!s && (s.match(/[A-Za-z\u00c0-\u024f\u1e00-\u1eff]/g) || []).length / [...s].length >= 0.6;
};
const segType = (s: string): string => {
  if (/^\s+$/.test(s)) return 'S';
  if ([...s].every(isPunct)) return 'P';
  if ([...s].some(isKanji)) return 'K';
  if ([...s].every(c => isHira(c) || c === 'ー')) return 'H';
  if ([...s].every(c => isKata(c) || c === 'ー')) return 'T';
  if (/[A-Za-z0-9]/.test(s)) return 'L';
  return 'O';
};
export type Token = Readonly<{ch: string; marked: boolean}>;
const text = (a: readonly Token[]) => a.map(t => t.ch).join('');
const trim = (a: Token[]) => {
  let start = 0, end = a.length;
  while (start < end && /\s/.test(a[start].ch)) start++;
  while (end > start && /\s/.test(a[end - 1].ch)) end--;
  return a.slice(start, end);
};

// Long automatic chunks contain no internal spaces: the Latin word branch
// stays whole, so splitWords is not needed here. Measurement may add it in 04.
function splitLong(a: Token[], maxPer: number): Token[][] {
  if (a.length <= maxPer || latinText(text(a))) return [a];
  const nLines = Math.ceil(a.length / maxPer), per = a.length / nLines;
  const out: Token[][] = []; let start = 0;
  for (let l = 1; l < nLines; l++) {
    const target = Math.round(per * l); let best = target, bestScore = -1;
    for (let k = Math.max(start + 1, target - 3); k <= Math.min(a.length - 1, target + 3); k++) {
      const prev = a[k - 1].ch, next = a[k].ch;
      let score = 3 - Math.abs(k - target);
      if (isHira(prev) && !isHira(next)) score += 3;
      if (isPunct(prev) || prev === ' ' || prev === '　') score += 5;
      if (isSmallKana(next) || 'ーっ、。'.includes(next)) score -= 6;
      if (score > bestScore) { bestScore = score; best = k; }
    }
    out.push(trim(a.slice(start, best))); start = best;
  }
  out.push(trim(a.slice(start))); return out;
}
export function autoChunks(tokens: Token[]): Token[][] {
  const segs: Token[][] = []; let current: Token[] = [], ct = '';
  for (const token of tokens) {
    const t = segType(token.ch);
    if (current.length && t !== ct && !(ct === 'K' && t === 'H')) { segs.push(current); current = []; }
    current.push(token); ct = t;
  }
  if (current.length) segs.push(current);
  const chunks: Token[][] = [];
  let cur: {a: Token[]; k: string; hasH: boolean} | null = null;
  const close = () => { if (cur && trim(cur.a).length) chunks.push(trim(cur.a)); cur = null; };
  for (const sg of segs) {
    const t = segType(text(sg));
    if (t === 'S') { close(); continue; }
    if (t === 'P') {
      if (cur) cur.a.push(...sg);
      else if (chunks.length) chunks[chunks.length - 1].push(...sg);
      else cur = {a: [...sg], k: 'P', hasH: false};
      continue;
    }
    if (!cur) { cur = {a: [...sg], k: t, hasH: t === 'H'}; continue; }
    if (t === 'H') {
      if (sg.length <= 3 || (cur.k !== 'H' && !cur.hasH) || (cur.k === 'H' && cur.a.length + sg.length <= 4)) {
        cur.a.push(...sg); cur.hasH = true; continue;
      }
      close(); cur = {a: [...sg], k: 'H', hasH: true}; continue;
    }
    if ((t === 'K' && cur.k === 'K' && !cur.hasH && cur.a.length + sg.length <= 6) ||
        (t === 'T' && cur.k === 'T') || (t === 'L' && cur.k === 'L')) { cur.a.push(...sg); continue; }
    close(); cur = {a: [...sg], k: t, hasH: false};
  }
  close();
  const out: Token[][] = [];
  for (const c of chunks) {
    if (c.length > 10 && wordLike(text(c))) {
      let start = 0;
      for (let i = 0; i < c.length - 1; i++) {
        if (/[-‐–—]/.test(c[i].ch)) { out.push(c.slice(start, i + 1)); start = i + 1; }
      }
      out.push(c.slice(start));
    } else if (c.length > 10) out.push(...splitLong(c, Math.ceil(c.length / Math.ceil(c.length / 8))));
    else out.push(c);
  }
  for (let i = out.length - 1; i > 0; i--) {
    if (out[i].length === 1 && !isKanji(out[i][0].ch)) {
      const prev = out[i - 1], last = prev[prev.length - 1].ch;
      if (WORDCH.test(last) && WORDCH.test(out[i][0].ch) && !/[-‐–—]/.test(last)) {
        const gap = tokens.slice(tokens.indexOf(prev[prev.length - 1]) + 1, tokens.indexOf(out[i][0]));
        prev.push({ch: ' ', marked: gap.some(token => token.marked)});
      }
      prev.push(...out[i]); out.splice(i, 1);
    }
  }
  return out.length ? out : [tokens];
}
