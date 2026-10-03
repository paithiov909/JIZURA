import type {EffectOptions, TextRange} from './types.js';
import type {ResolvedFont, ResolvedStyle} from './core/style.js';
import type {Box, Glyph} from './canvas/geometry.js';

export type EffectGroup = 'layout' | 'enter' | 'exit' | 'hold' | 'decor';
export type ParameterValue = number | boolean | string;
export type ParameterSchema = Readonly<{description: string; unit?: string} & (
  {type: 'number'; default: number; min: number; max: number; integer?: boolean} |
  {type: 'boolean'; default: boolean} |
  {type: 'enum'; default: string; values: readonly string[]}
)>;
export type EffectSchema = Readonly<Record<string, ParameterSchema>>;
export type SchemaParams<S extends EffectSchema> = keyof S extends never ? Readonly<Record<string, never>> : {readonly [K in keyof S]:
  S[K] extends {type: 'number'} ? number : S[K] extends {type: 'boolean'} ? boolean :
  S[K] extends {values: readonly (infer V extends string)[]} ? V : never};
export type EffectMetadata = Readonly<{
  group: EffectGroup; id: string; name: string; description: string; tags: readonly string[];
  schema: EffectSchema; autoSelect: false; layer?: 'back' | 'front';
}>;
declare const customBrand: unique symbol;
// Only the factory creates authentic executable declarations. JSON contains data only.
export type CustomEffect<G extends EffectGroup> = Readonly<{
  group: G; id: string; seed?: number; params?: Readonly<Record<string, ParameterValue>>;
  [customBrand]: G;
}>;
export type CustomEffectFactory<G extends EffectGroup, S extends EffectSchema> = {
  (options?: EffectOptions<SchemaParams<S>>): CustomEffect<G>;
  readonly metadata: EffectMetadata;
};
export type EffectContext<P> = Readonly<{
  width: number; height: number; text: string; emphasis: readonly TextRange[];
  font: ResolvedFont; style: ResolvedStyle; seed: number; params: P;
  /** Stateless value in [0,1), keyed by effect seed and nonnegative integer index. */
  random: (index: number) => number;
}>;
export type TextPlacement = Readonly<{x: number; y: number; size: number; track?: number; sx?: number; sy?: number}>;
export type LayoutContext<P> = EffectContext<P> & Readonly<{
  measureText: (options: {size: number; track?: number}) => Readonly<{width: number; height: number}>;
  fitText: (options: {maxWidth: number; maxHeight: number; maxSize?: number; track?: number}) => number;
}>;
export type FrameEffectContext<P> = EffectContext<P> & Readonly<{
  localFrame: number; seconds: number; durationInFrames: number; fps: number;
  pIn: number; pOut: number; holdAmount: number;
}>;
export type GlyphTransform = Readonly<{dx?: number; dy?: number; scale?: number; rotation?: number; alpha?: number; hide?: boolean}>;
export type MotionContext<P> = FrameEffectContext<P> & Readonly<{
  progress: number; glyph: Glyph; glyphIndex: number; itemIndex: number;
}>;
export type DecorContext<P> = FrameEffectContext<P> & Readonly<{ctx: CanvasRenderingContext2D; box: Box | null}>;
type DefinitionBase<S extends EffectSchema> = Readonly<{
  id: string; name: string; description: string; tags: readonly string[]; schema: S;
}>;
export type LayoutEffectDefinition<S extends EffectSchema> = DefinitionBase<S> & Readonly<{
  layout: (context: LayoutContext<SchemaParams<S>>) => readonly TextPlacement[];
}>;
export type MotionEffectDefinition<G extends 'enter' | 'exit' | 'hold', S extends EffectSchema> = DefinitionBase<S> & Readonly<{
  group: G; transform: (context: MotionContext<SchemaParams<S>>) => GlyphTransform | null;
}>;
export type DecorEffectDefinition<S extends EffectSchema> = DefinitionBase<S> & Readonly<{
  layer: 'back' | 'front'; draw: (context: DecorContext<SchemaParams<S>>) => void;
}>;
export type {ResolvedFont, ResolvedStyle};
