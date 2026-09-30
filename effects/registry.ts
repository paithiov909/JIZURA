import type { EffectGroup } from '../engine/types.ts';
import type { AECompatibility, BaselineDefinition, EffectDefinition, EffectRuntime, EffectPack, RegistryAPI } from './types.ts';
import { AE_IMPLEMENTATIONS } from './ae-implementations.ts';

export const GROUPS = {
  layout: ['LAYOUTS', 'LAYOUT_ORDER'], enter: ['ENTER', 'ENTER_ORDER'], hold: ['HOLD', 'HOLD_ORDER'], exit: ['EXIT', 'EXIT_ORDER'],
  decor: ['DECOR', 'DECOR_ORDER'], treat: ['TREAT', 'TREAT_ORDER'], bg: ['BG', 'BG_ORDER'], cam: ['CAMERA', 'CAMERA_ORDER'],
  fx: ['FXE', 'FXE_ORDER'], trans: ['TRANS', 'TRANS_ORDER'],
} as const;
// Chromium 88 does not provide Object.hasOwn.
const owns = (object: object, key: PropertyKey): boolean => Object.prototype.hasOwnProperty.call(object, key);
const strictEntries = new WeakMap<RegistryAPI, Set<string>>();
const moods = new Set(['glitch', 'calm', 'pop', 'graphic', 'editorial', 'emotional', 'horror']);
const callbacks: Record<EffectGroup, string[]> = { layout: ['fits', 'plan', 'render'], enter: ['apply'], hold: ['apply'],
  exit: ['apply'], decor: ['draw'], treat: ['apply'], bg: ['draw'], cam: ['get'], fx: ['draw'], trans: ['draw'] };

function validate(group: EffectGroup, id: string, def: BaselineDefinition, support: AECompatibility, baseline: boolean): void {
  const fail = (reason: string): never => { throw new Error(`${group}.${id}: ${reason}`); };
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(id)) fail('stable ID must be alphanumeric camelCase');
  if (!def || typeof def.name !== 'string' || !def.name.trim()) fail('name is required');
  if (!baseline || def.tags !== undefined) {
    if (!Array.isArray(def.tags) || def.tags.some(tag => !moods.has(tag))) fail('tags must be an array of known moods');
  }
  if (!baseline || def.w !== undefined) {
    if (typeof def.w !== 'number' || !Number.isFinite(def.w) || def.w < 0) fail('finite nonnegative w is required');
  }
  if (def.set !== undefined && !['typo', 'kinetic', 'horror'].includes(def.set)) fail('unknown set');
  for (const flag of ['special', 'extra', 'wa']) if (def[flag] !== undefined && typeof def[flag] !== 'boolean') fail(`${flag} must be boolean`);
  for (const key of callbacks[group]) {
    if (baseline && ((group === 'fx' && def.builtin) || (group === 'layout' && def.special && key === 'fits'))) continue;
    if (typeof def[key] !== 'function') fail(`${key} callback is required`);
  }
  if (group === 'decor' && !['back', 'front'].includes(def.layer)) fail('decor layer is required');
  if (!support || !['implementation', 'fallback'].includes(support.kind) || typeof support.id !== 'string') fail('AE implementation or fallback declaration is required');
  if (!AE_IMPLEMENTATIONS[group].includes(support.id)) fail(`unknown AE implementation ${support.id}`);
  if (support.kind === 'implementation' && support.id !== id) fail('AE implementation ID must match effect ID; declare a fallback for substitution');
  if (support.kind === 'fallback' && (typeof support.reason !== 'string' || !support.reason.trim())) fail('AE fallback reason is required');
  if (!baseline && def.ae !== undefined && def.ae !== support.id) fail('ae conflicts with the AE declaration');
}

export function installRegistry(J: EffectRuntime): void {
  const strict = new Set<string>();
  strictEntries.set(J, strict);
  const supports = new Map<EffectGroup, Map<string, AECompatibility>>();
  J.GROUP_KEYS = Object.keys(GROUPS) as EffectGroup[];
  for (const group of J.GROUP_KEYS as EffectGroup[]) {
    const [registry, order] = GROUPS[group];
    J[registry] = {}; J[order] = []; supports.set(group, new Map());
  }
  J.registry = group => {
    if (!owns(GROUPS, group)) throw new Error(`unknown group ${group}`);
    return J[GROUPS[group][0]];
  };
  J.order = group => {
    if (!owns(GROUPS, group)) throw new Error(`unknown group ${group}`);
    return J[GROUPS[group][1]];
  };
  J.effectSupport = (group, id) => supports.get(group)?.get(id);
  const add = (group: EffectGroup, id: string, def: BaselineDefinition, support: AECompatibility, pack?: string, baseline = false): BaselineDefinition => {
    const registry = J.registry(group), order = J.order(group);
    if (owns(registry, id)) throw new Error(`${group}.${id}: duplicate ID`);
    if (pack !== undefined && (typeof pack !== 'string' || !pack.trim())) throw new Error(`${group}.${id}: pack name is required`);
    validate(group, id, def, support, baseline);
    // Original core definitions have no pack field; preserve exported metadata.
    if (pack !== undefined) def.pack = pack;
    if (!baseline && support.kind === 'fallback') def.ae = support.id;
    registry[id] = def;
    if (!baseline) strict.add(`${group}.${id}`);
    supports.get(group)!.set(id, Object.freeze({ ...support }));
    if (!def.special) order.push(id);
    return def;
  };
  J.register = <G extends EffectGroup>(group: G, id: string, def: EffectDefinition<G>, pack = def?.pack || 'core'): EffectDefinition<G> => {
    const result = add(group, id, def, def?.aeSupport, pack) as EffectDefinition<G>;
    // Apply existing random-pick rules to packs installed after engine creation.
    if (J.SETS) {
      if (!result.set && J.SETS[pack]) result.set = pack as 'typo' | 'kinetic' | 'horror';
      if (!result.set && !J.BASE_PACKS.includes(pack)) result.extra = true;
      if (J.WA[group]?.includes(id)) result.wa = true;
    }
    return result;
  };
  J.registerBaseline = <G extends EffectGroup>(group: G, id: string, def: BaselineDefinition<G>, pack?: string) => add(group, id, def, { kind: 'implementation', id }, pack, true) as BaselineDefinition<G>;
  J.registerBaselineAll = (group, defs, pack, order) => {
    for (const id of Object.keys(defs)) J.registerBaseline(group, id, defs[id], pack);
    if (order) {
      const actual = J.order(group);
      if (actual.length !== order.length || order.some(id => !actual.includes(id)) || new Set(order).size !== order.length)
        throw new Error(`${group}: explicit order does not match registered effects`);
      actual.splice(0, actual.length, ...order);
    }
  };
  J.registerAll = <G extends EffectGroup>(group: G, defs: Record<string, EffectDefinition<G>>, pack?: string): void => {
    for (const id of Object.keys(defs)) J.register(group, id, defs[id], pack);
  };
  J.taggedWith = (group: EffectGroup, mood: string) => J.order(group).filter(id => J.registry(group)[id]?.tags?.includes(mood));
}

/** A pack belongs to the source graph. Add its installer to effects/index.ts. */
export function defineEffectPack(pack: EffectPack): EffectPack {
  if (!pack || typeof pack.id !== 'string' || !pack.id.trim() || typeof pack.install !== 'function') throw new Error('pack id and installer are required');
  return pack;
}
export function installEffectPack(engine: EffectRuntime | RegistryAPI, pack: EffectPack): void {
  pack.install({ engine: engine as EffectRuntime, register: (group, id, def) => engine.register(group, id, def, pack.id) });
}
export interface EffectValidationReport {
  effects: number; implementations: number;
  fallbacks: Array<{ group: EffectGroup; id: string; target: string; reason: string }>;
}
/** Revalidate after set marking and AE fallback-map extensions. */
export function validateEffects(engine: RegistryAPI): EffectValidationReport {
  const report: EffectValidationReport = { effects: 0, implementations: 0, fallbacks: [] };
  for (const group of Object.keys(GROUPS) as EffectGroup[]) {
    const registry = engine.registry(group), order = engine.order(group);
    if (new Set(order).size !== order.length || order.some(id => !owns(registry, id))) throw new Error(`${group}: invalid ordered registry`);
    for (const [id, def] of Object.entries(registry)) {
      const support = engine.effectSupport(group, id)!;
      const baseline = !strictEntries.get(engine)?.has(`${group}.${id}`);
      validate(group, id, def, baseline ? support : def.aeSupport, baseline);
      if (!baseline && JSON.stringify(support) !== JSON.stringify(def.aeSupport)) throw new Error(`${group}.${id}: AE declaration changed after registration`);
      if (!def.special && !order.includes(id)) throw new Error(`${group}.${id}: missing from order`);
      report.effects++;
      if (support.kind === 'implementation') report.implementations++;
      else report.fallbacks.push({ group, id, target: support.id, reason: support.reason });
    }
  }
  return report;
}
