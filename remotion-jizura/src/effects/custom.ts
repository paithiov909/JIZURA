import type {CustomEffectFactory, DecorEffectDefinition, EffectGroup, EffectMetadata, EffectSchema,
  LayoutEffectDefinition, MotionEffectDefinition, ParameterValue, LayoutContext, MotionContext, DecorContext, ParameterSchema} from '../custom-types.js';
import {fail, freeze, keys, record, seed} from '../core/validation.js';
import {h} from '../core/random.js';

export type CustomRuntime = Readonly<{
  key: number; metadata: EffectMetadata;
  layout?: (context: LayoutContext<Readonly<Record<string, ParameterValue>>>) => readonly import('../custom-types.js').TextPlacement[];
  transform?: (context: MotionContext<Readonly<Record<string, ParameterValue>>>) => import('../custom-types.js').GlyphTransform | null;
  draw?: (context: DecorContext<Readonly<Record<string, ParameterValue>>>) => void;
}>;
// Weak associations carry code outside serializable plans. No ID-based global registry.
const runtimes = new WeakMap<object, CustomRuntime>();
let identity = 0; // resource identity only; never included in seeds or inspection data
export const customRuntime = (value: object): CustomRuntime | undefined => runtimes.get(value);
export function attachCustom(value: object, runtime: CustomRuntime): void {runtimes.set(value, runtime);}
export function customParams(value: unknown, schema: EffectSchema, path: string, defaults = false): Record<string, ParameterValue> {
  const v = value === undefined ? {} : record(value, path, 'E_EFFECT');
  keys(v, Object.keys(schema), path, 'E_EFFECT');
  const out: Record<string, ParameterValue> = {};
  for (const [key, spec] of Object.entries(schema)) {
    const p = v[key] === undefined ? defaults ? spec.default : undefined : v[key];
    if (p === undefined) continue;
    const valid = spec.type === 'number' ? typeof p === 'number' && Number.isFinite(p) && p >= spec.min && p <= spec.max && (!spec.integer || Number.isSafeInteger(p))
      : spec.type === 'boolean' ? typeof p === 'boolean' : typeof p === 'string' && spec.values.includes(p);
    if (!valid) fail('E_EFFECT', `${path}.${key}`, 'Parameter does not match its schema.');
    Object.defineProperty(out, key, {value: p, enumerable: true});
  }
  return out;
}
function define(group: EffectGroup, input: unknown): CustomEffectFactory<EffectGroup, EffectSchema> {
  const v = record(input, 'definition', 'E_EFFECT');
  const callback = group === 'layout' ? 'layout' : group === 'decor' ? 'draw' : 'transform';
  keys(v, ['id', 'name', 'description', 'tags', 'schema', callback, ...(group === 'decor' ? ['layer'] : group === 'layout' ? [] : ['group'])], 'definition', 'E_EFFECT');
  for (const key of ['id', 'name', 'description']) if (typeof v[key] !== 'string' || !(v[key] as string).trim()) fail('E_EFFECT', `definition.${key}`, 'Expected nonempty text.');
  if (!/^[A-Za-z][A-Za-z0-9._-]{0,127}$/.test(v.id as string)) fail('E_EFFECT', 'definition.id', 'Invalid effect ID.');
  if (!Array.isArray(v.tags) || v.tags.length > 32 || v.tags.some(t => typeof t !== 'string' || !t.trim())) fail('E_EFFECT', 'definition.tags', 'Expected up to 32 nonempty tags.');
  if (typeof v[callback] !== 'function') fail('E_EFFECT', `definition.${callback}`, 'Expected a synchronous callback.');
  if (group === 'decor' && v.layer !== 'back' && v.layer !== 'front') fail('E_EFFECT', 'definition.layer', 'Expected back or front.');
  const source = record(v.schema, 'definition.schema', 'E_EFFECT'), schema: Record<string, ParameterSchema> = {};
  if (Object.keys(source).length > 64) fail('E_EFFECT', 'definition.schema', 'At most 64 parameters.');
  for (const [key, entry] of Object.entries(source)) {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(key) || ['__proto__', 'prototype', 'constructor'].includes(key)) fail('E_EFFECT', `definition.schema.${key}`, 'Invalid parameter key.');
    const path = `definition.schema.${key}`, s = record(entry, path, 'E_EFFECT');
    keys(s, ['type', 'default', 'description', 'unit', ...(s.type === 'number' ? ['min', 'max', 'integer'] : s.type === 'enum' ? ['values'] : [])], path, 'E_EFFECT');
    if (!['number', 'boolean', 'enum'].includes(s.type as string) || typeof s.description !== 'string' || !s.description.trim() || (s.unit !== undefined && typeof s.unit !== 'string')) fail('E_EFFECT', path, 'Invalid schema metadata.');
    if (s.type === 'number' && (typeof s.min !== 'number' || typeof s.max !== 'number' || !Number.isFinite(s.min) || !Number.isFinite(s.max) || s.min > s.max || (s.integer !== undefined && typeof s.integer !== 'boolean'))) fail('E_EFFECT', path, 'Invalid numeric bounds.');
    if (s.type === 'enum' && (!Array.isArray(s.values) || !s.values.length || s.values.some(x => typeof x !== 'string') || new Set(s.values).size !== s.values.length)) fail('E_EFFECT', path, 'Invalid enum values.');
    if (s.default === undefined) fail('E_EFFECT', `${path}.default`, 'Default is required.');
    schema[key] = {...s, ...(s.type === 'enum' ? {values: [...s.values as string[]]} : {})} as ParameterSchema;
  }
  customParams({}, schema, 'definition.schema', true);
  const metadata = freeze({group, id: v.id as string, name: v.name as string, description: v.description as string,
    tags: [...v.tags as string[]], schema, autoSelect: false as const, ...(group === 'decor' ? {layer: v.layer as 'back' | 'front'} : {})});
  const runtime = Object.freeze({key: ++identity, metadata, [callback]: v[callback]}) as CustomRuntime;
  const factory = (options?: unknown) => {
    const o = options === undefined ? {} : record(options, metadata.id, 'E_EFFECT'); keys(o, ['seed', 'params'], metadata.id, 'E_EFFECT');
    const declaration = freeze({group, id: metadata.id, ...(o.seed === undefined ? {} : {seed: seed(o.seed, `${metadata.id}.seed`)}),
      ...(o.params === undefined ? {} : {params: customParams(o.params, metadata.schema, `${metadata.id}.params`)})});
    attachCustom(declaration, runtime); return declaration;
  };
  Object.defineProperty(factory, 'metadata', {value: metadata, enumerable: true});
  return Object.freeze(factory) as CustomEffectFactory<EffectGroup, EffectSchema>;
}
export function defineLayoutEffect<const S extends EffectSchema>(definition: LayoutEffectDefinition<S>): CustomEffectFactory<'layout', S> {
  return define('layout', definition) as CustomEffectFactory<'layout', S>;
}
export function defineMotionEffect<const G extends 'enter' | 'exit' | 'hold', const S extends EffectSchema>(definition: MotionEffectDefinition<G, S>): CustomEffectFactory<G, S> {
  const value = record(definition, 'definition', 'E_EFFECT');
  if (!['enter', 'exit', 'hold'].includes(value.group as string)) fail('E_EFFECT', 'definition.group', 'Expected enter, exit or hold.');
  return define(definition.group, definition) as CustomEffectFactory<G, S>;
}
export function defineDecorEffect<const S extends EffectSchema>(definition: DecorEffectDefinition<S>): CustomEffectFactory<'decor', S> {
  return define('decor', definition) as CustomEffectFactory<'decor', S>;
}
export function customRandom(s: number): (index: number) => number {
  return index => {if (!Number.isSafeInteger(index) || index < 0) fail('E_EFFECT', 'random.index', 'Expected a nonnegative integer.'); return h(s, index, 901) / 4294967296;};
}
