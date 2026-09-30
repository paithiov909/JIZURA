import type { EffectGroup, RandomStream, ColorScheme, Style } from '../engine/types.ts';

/** Per-effect parameter bags and item extensions are preserved during migration.
 * Metadata and registration are strict; these algorithm-local slots are dynamic. */
export type EffectValue = any;
export type AECompatibility =
  | { kind: 'implementation'; id: string }
  | { kind: 'fallback'; id: string; reason: string };
export type Mood = 'glitch' | 'calm' | 'pop' | 'graphic' | 'editorial' | 'emotional' | 'horror';
export interface EffectEnvironment {
  W: number; H: number; ctx: CanvasRenderingContext2D; sc: ColorScheme;
  st: Style; cut: EffectValue; fx: EffectValue; lt: number; ltb: number;
  pIn: number; pOut: number; step: number; pass: 'main' | 'A' | 'B';
  scale: number; allowFilter: boolean;
  [key: string]: EffectValue;
}
export interface EffectMetadata {
  name: string; tags: Mood[]; w: number; aeSupport: AECompatibility;
  pack?: string; special?: boolean; set?: 'typo' | 'kinetic' | 'horror';
  extra?: boolean; wa?: boolean;
}
export interface GroupCallbacks {
  layout: { fits(n: number): boolean; plan(rng: RandomStream, cut: EffectValue, st: Style): EffectValue;
    render(env: EffectEnvironment): EffectValue };
  enter: { apply(env: EffectEnvironment, item: EffectValue, progress: number, timing: EffectValue): void };
  exit: GroupCallbacks['enter']; hold: GroupCallbacks['enter'];
  decor: { layer: 'back' | 'front'; draw(env: EffectEnvironment, box: EffectValue, params: EffectValue): void };
  treat: { apply(env: EffectEnvironment, item: EffectValue, params: EffectValue): void };
  bg: { draw(env: EffectEnvironment, params: EffectValue): void };
  cam: { get(env: EffectEnvironment, params: EffectValue): EffectValue };
  fx: { draw(ctx: CanvasRenderingContext2D, event: EffectValue, progress: number, info: EffectValue): void };
  trans: { draw(ctx: CanvasRenderingContext2D, previous: CanvasImageSource, next: CanvasImageSource,
    progress: number, info: EffectValue): void };
}
export type EffectDefinition<G extends EffectGroup = EffectGroup> = EffectMetadata & GroupCallbacks[G] & {
  [key: string]: unknown;
};
/** The frozen baseline has implicit tags/weights and renderer-built-in FX.
 * Only migrated modules can use this bridge; new packs use EffectDefinition. */
export type BaselineDefinition<G extends EffectGroup = EffectGroup> =
  { name: string; tags?: string[]; w?: number; pack?: string; special?: boolean } &
  Partial<GroupCallbacks[G]> & { [key: string]: EffectValue };
export type BaselineDefinitions<G extends EffectGroup> = Record<string, BaselineDefinition<G>>;
export interface RegistryAPI {
  registry(group: EffectGroup): Record<string, BaselineDefinition>;
  order(group: EffectGroup): string[];
  register<G extends EffectGroup>(group: G, id: string, def: EffectDefinition<NoInfer<G>>, pack?: string): EffectDefinition<G>;
  effectSupport(group: EffectGroup, id: string): AECompatibility | undefined;
}
export interface EffectRuntime extends RegistryAPI {
  registerBaseline<G extends EffectGroup>(group: G, id: string, def: BaselineDefinition<G>, pack?: string): BaselineDefinition<G>;
  registerBaselineAll<G extends EffectGroup>(group: G, defs: BaselineDefinitions<G>, pack?: string, order?: string[]): void;
  [key: string]: EffectValue;
}
export type EffectStage = readonly [name: string, install: (engine: EffectRuntime) => void];
export interface PackContext {
  /** Rendering helpers remain engine-specific; registration is always checked. */
  engine: EffectRuntime;
  register<G extends EffectGroup>(group: G, id: string, def: EffectDefinition<NoInfer<G>>): EffectDefinition<G>;
}
export interface EffectPack { id: string; install(context: PackContext): void }
