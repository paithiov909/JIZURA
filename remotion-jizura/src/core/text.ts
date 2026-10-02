import type {ParsedChunk, ParseLinesOptions, TextRange} from '../types.js';
import {autoChunks, type Token} from './scripts.js';
import {fail, freeze, integer, keys, record} from './validation.js';

export function validText(raw: unknown, path: string, limit = 100000): string {
  if (typeof raw !== 'string') return fail('E_TEXT', path, 'Expected a string.');
  const text = raw.replace(/\r\n?/g, '\n');
  if (/[\uD800-\uDFFF]/u.test(text) ||
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text)) return fail('E_TEXT', path, 'Invalid Unicode or control character.');
  if ([...raw].length > limit) return fail('E_INPUT', path, 'Text exceeds the code point limit.');
  return text;
}
function normalize(tokens: readonly Token[]): Token[] {
  const out: Token[] = [];
  for (const token of tokens) {
    if (/\s/.test(token.ch) && token.ch !== '\n') {
      if (!out.length || out[out.length - 1].ch === '\n') continue;
      if (out[out.length - 1].ch === ' ') {
        const prev = out.pop()!;
        out.push({ch: ' ', marked: prev.marked || token.marked});
      } else out.push({ch: ' ', marked: token.marked});
    } else {
      if (token.ch === '\n' && out[out.length - 1]?.ch === ' ') out.pop();
      out.push({...token});
    }
  }
  if (out[out.length - 1]?.ch === ' ') out.pop();
  // Single Cut retains internal LF, but trims outer whitespace as a whole.
  let start = 0, end = out.length;
  while (start < end && /\s/.test(out[start].ch)) start++;
  while (end > start && /\s/.test(out[end - 1].ch)) end--;
  return out.slice(start, end);
}
function read(text: string, manual: boolean, path: string): {parts: Token[][]; all: Token[]; hasBoundary: boolean} {
  const parts: Token[][] = [[]], all: Token[] = [];
  let marked = false, markedContent = false, hasBoundary = false;
  const a = [...text];
  for (let i = 0; i < a.length; i++) {
    let ch = a[i];
    if (ch === '\\') {
      ch = a[++i];
      if (!['*', '/', '\\'].includes(ch)) fail('E_TEXT', path, 'Unknown or trailing escape.');
    } else if (ch === '*') {
      if (marked && !markedContent) fail('E_TEXT', path, 'Emphasis must contain non-whitespace text.');
      marked = !marked; markedContent = false; continue;
    } else if (ch === '/') {
      if (!manual) fail('E_TEXT', path, 'Use parseLines for Cut boundaries, or escape the slash.');
      hasBoundary = true; parts.push([]); continue;
    }
    if (ch === '\n' && marked) fail('E_TEXT', path, 'Emphasis cannot cross a line.');
    if (marked && !/\s/.test(ch)) markedContent = true;
    const token = {ch, marked}; parts[parts.length - 1].push(token); all.push(token);
  }
  if (marked) fail('E_TEXT', path, 'Unclosed emphasis.');
  return {parts: parts.map(normalize), all: normalize(all), hasBoundary};
}
const body = (tokens: readonly Token[]) => tokens.map(t => t.ch).join('');
function ranges(tokens: readonly Token[]): TextRange[] {
  const out: {start: number; end: number}[] = [];
  tokens.forEach((token, i) => {
    if (!token.marked) return;
    const prev = out[out.length - 1];
    if (prev?.end === i) prev.end = i + 1;
    else out.push({start: i, end: i + 1});
  });
  return out;
}
export function parseLines(raw: string, options?: ParseLinesOptions): readonly ParsedChunk[] {
  const text = validText(raw, 'raw');
  if (options !== undefined) {
    const o = record(options, 'options'); keys(o, ['numCuts'], 'options');
    if (o.numCuts !== undefined && o.numCuts !== 'auto') fail('E_NUM_CUTS', 'options.numCuts', 'Only auto is supported.');
  }
  const out: ParsedChunk[] = [];
  text.split('\n').forEach((line, index) => {
    if (!line.trim()) return;
    const path = `raw.lines[${index}]`, parsed = read(line.trim(), true, path);
    const chunks = parsed.hasBoundary ? parsed.parts : autoChunks(parsed.all);
    chunks.forEach((tokens, cut) => {
      if (!tokens.length) fail('E_TEXT', path, 'Empty Cut.');
      if (tokens.length > 10000) fail('E_INPUT', path, 'Oversized Cut.');
      out.push({text: body(tokens), emphasis: ranges(tokens), source: {line: index, cut, lineText: body(parsed.all)}});
      if (out.length > 1000) fail('E_INPUT', 'raw', 'Too many Cuts.');
    });
  });
  return freeze(out);
}
export type CutText = Readonly<{text: string; lineText: string; emphasis: readonly TextRange[]; source?: ParsedChunk['source']}>;
export function resolveText(value: unknown, path: string): CutText {
  if (typeof value === 'string') {
    const parsed = read(validText(value, path), false, path).all;
    if (!parsed.length) return fail('E_TEXT', path, 'Empty Cut.');
    if (parsed.length > 10000) return fail('E_INPUT', path, 'Oversized Cut.');
    return freeze({text: body(parsed), lineText: body(parsed), emphasis: ranges(parsed)});
  }
  const v = record(value, path, 'E_TEXT'); keys(v, ['text', 'emphasis', 'source'], path, 'E_TEXT');
  const text = validText(v.text, `${path}.text`, 10000);
  if (!text || text !== v.text || body(normalize([...text].map(ch => ({ch, marked: false})))) !== text) fail('E_TEXT', `${path}.text`, 'Expected normalized, nonempty text.');
  const source = record(v.source, `${path}.source`, 'E_TEXT');
  keys(source, ['line', 'cut', 'lineText'], `${path}.source`, 'E_TEXT');
  const lineText = validText(source.lineText, `${path}.source.lineText`);
  if (!lineText || lineText !== source.lineText || body(normalize([...lineText].map(ch => ({ch, marked: false})))) !== lineText) fail('E_TEXT', `${path}.source.lineText`, 'Expected normalized line text.');
  // Text positions are part of the text contract, rather than frame numbers.
  for (const key of ['line', 'cut']) {
    if (!Number.isSafeInteger(source[key]) || (source[key] as number) < 0) fail('E_TEXT', `${path}.source.${key}`, 'Expected a nonnegative safe integer.');
  }
  if (!Array.isArray(v.emphasis)) fail('E_TEXT', `${path}.emphasis`, 'Expected ranges.');
  const emphasis: {start: number; end: number}[] = [], pending: {start: number; end: number; index: number}[] = [], n = [...text].length;
  for (const [i, range] of (v.emphasis as unknown[]).entries()) {
    const r = record(range, `${path}.emphasis[${i}]`, 'E_TEXT');
    keys(r, ['start', 'end'], `${path}.emphasis[${i}]`, 'E_TEXT');
    if (!Number.isSafeInteger(r.start) || !Number.isSafeInteger(r.end) || (r.start as number) < 0 ||
        (r.end as number) > n || (r.start as number) >= (r.end as number)) fail('E_TEXT', `${path}.emphasis[${i}]`, 'Invalid code point range.');
    pending.push({start: r.start as number, end: r.end as number, index: i});
  }
  pending.sort((a, b) => a.start - b.start || a.end - b.end);
  for (const r of pending) {
    const prev = emphasis[emphasis.length - 1];
    if (prev && r.start < prev.end) fail('E_TEXT', `${path}.emphasis[${r.index}]`, 'Ranges must be disjoint.');
    if (prev?.end === r.start) prev.end = r.end;
    else emphasis.push({start: r.start, end: r.end});
  }
  return freeze({text, lineText, emphasis, source: {line: integer(source.line, path), cut: integer(source.cut, path), lineText}});
}
