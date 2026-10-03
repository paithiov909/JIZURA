import type {EffectGroup, ParameterValue} from './custom-types.js';

/** Discovery data, never executable declarations or an automatic registry. */
export type CatalogParameter = Readonly<{
  description: string; unit?: string; usage: 'effective' | 'ignored'; required?: boolean;
  default: Readonly<{kind: 'fixed'; value: ParameterValue} | {kind: 'seeded'}>;
} & (
  {type: 'number'; min: number; max: number; bounds: 'input' | 'editor'; integer?: boolean; exclusiveMax?: boolean} |
  {type: 'boolean'} | {type: 'enum'; values: readonly string[]}
)>;
export type CatalogEntry = Readonly<{
  group: EffectGroup | 'image'; id: string; name: string; description: string;
  kind: 'layout' | 'motion' | 'decor' | 'image';
  origin: 'builtin' | 'caller-example' | 'native-image' | 'standard-image';
  status: 'implemented'; autoSelect: boolean;
  tags: readonly string[]; moods: readonly string[]; movements: readonly string[];
  uses: readonly string[]; conditions: readonly string[]; constraints: readonly string[];
  /** Suitability is an editorial hypothesis, separate from observed mechanics. */
  suitability: Readonly<{status: 'hypothesis'; reason: string}>;
  provenance: Readonly<{description: 'source'; sources: readonly string[]; evidence: readonly string[]}>;
  parameters: Readonly<Record<string, CatalogParameter>>;
  visual: Readonly<{route: 'review' | 'custom' | 'image-effects' | 'batch'; candidate: string; frame: number;
    composition: string; video: string}>;
  layer?: 'back' | 'front'; backend?: '2d' | 'webgl2';
}>;
export type CatalogQuery = Readonly<{
  text?: string; name?: string; group?: CatalogEntry['group'];
  tags?: readonly string[]; uses?: readonly string[]; conditions?: readonly string[];
}>;
