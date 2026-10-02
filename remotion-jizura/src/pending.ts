import {unimplemented} from './core/error.js';
import type {
  ParseLinesOptions, ParsedChunk, EffectOptions, CenterParams, DecorParams, NoParams,
  CenterEffect, PopEffect, WipeEffect, DriftEffect, BreatheEffect, KasumiEffect, CheckerStripEffect,
} from './types.js';

export function parseLines(_raw: string, _options?: ParseLinesOptions): readonly ParsedChunk[] {
  return unimplemented('parseLines');
}
export function center(_options?: EffectOptions<CenterParams>): CenterEffect { return unimplemented('center'); }
export function pop(_options?: EffectOptions<NoParams>): PopEffect { return unimplemented('pop'); }
export function wipe(_options?: EffectOptions<NoParams>): WipeEffect { return unimplemented('wipe'); }
export function drift(_options?: EffectOptions<NoParams>): DriftEffect { return unimplemented('drift'); }
export function breathe(_options?: EffectOptions<NoParams>): BreatheEffect { return unimplemented('breathe'); }
export function kasumi(_options?: EffectOptions<DecorParams>): KasumiEffect { return unimplemented('kasumi'); }
export function checkerStrip(_options?: EffectOptions<DecorParams>): CheckerStripEffect { return unimplemented('checkerStrip'); }
