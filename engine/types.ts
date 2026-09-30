import type { UtilityAPI } from './utility-types.ts';
export type EffectGroup = 'layout' | 'enter' | 'exit' | 'hold' | 'decor' | 'treat' | 'bg' | 'cam' | 'fx' | 'trans';
export type LyricLanguage = 'ja' | 'en' | 'zh-Hant' | 'zh-Hans' | 'ko';
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type Parameters = Record<string, JsonValue>;
export interface Effects {
  motion: number; glitch: number; chroma: number; decor: number; density: number; texture: number;
  flash: boolean; onTwos: boolean; koma: number; hud: 'auto' | 'on' | 'off';
  bgSwitch: number; hideNo: boolean; hideTime: boolean;
}
export interface Timing {
  bpm: number; offset: number; snap: boolean; tail: number; lineTimes: Record<string, number>;
  lineScale: number; useAudioLength?: boolean; beatOffset?: number;
}
export interface UserFont { key: string; label: string; family: string; weight: number }
export interface Project {
  version: 1; timingOrder: 2; themeId: string | null; title: string; artist: string; lyrics: string;
  style: string; mood: string | null; extra: boolean; wa: boolean; horror: boolean; typo: boolean; kinetic: boolean;
  lang: 'auto' | LyricLanguage; keyBg: 'off' | 'green' | 'black'; unify: boolean; typeset: boolean;
  centerDir: 'tb' | 'lr'; centerFree: boolean; seed: number; aspect: string; res: number; fps: number;
  fx: Effects; enabled: Record<EffectGroup, Record<string, boolean>>; timing: Timing;
  overrides: Record<string, LineOverride>; locks: { tech: Record<string, boolean>; params: Record<string, boolean> };
  colors: Record<string, string | boolean>; fonts: Record<string, string>; userFonts?: UserFont[];
  exportRange?: { from: number; to: number } | null; appVersion?: string; audioName?: string;
  includeAudio?: boolean;
}
export interface CutSnapshot extends Pick<Cut, 'layout' | 'enter' | 'exit' | 'hold' | 'params' | 'decor' | 'treat' | 'treatP' | 'cam' | 'camP' | 'scheme' | 'seed' | 'bg' | 'bgP' | 'inDur' | 'outDur' | 'trans' | 'transP' | 'transDur' | 'morph' | 'weightGrow'> {
  utext: string; kime: boolean; recap: boolean; twinParams: Parameters | null;
  events: Array<Omit<PlanEvent, 't'> & { dt: number }>;
}
export interface LineOverride {
  layout?: string; enter?: string; exit?: string; hold?: string; treat?: string; bg?: string; cam?: string;
  trans?: string; decor?: string[]; seed?: number; lockedSeed?: number; lock?: boolean;
  single?: boolean; cuts?: number; lockedCuts?: CutSnapshot[];
  cutTech?: Record<string, Partial<Record<EffectGroup, string>>>;
  cutLayouts?: Record<string, string>; cutTime?: Record<string, number>; cutQuiet?: Record<string, boolean>;
}
export interface ParsedLine {
  text: string; note: string | null; impact: boolean; emph: string[]; manual: string[] | null;
  gapBefore: boolean; src: number; lrc: number | null; interlude?: boolean; secs?: number | null;
}
export interface ParsedLyrics { lines: ParsedLine[]; meta: Record<string, string> }
export interface PlanLine extends Omit<ParsedLine, 'manual' | 'gapBefore'> {
  index: number; start: number; end: number; visEnd: number; chunks: string[] | null; seed: number;
}
export interface Zone { x: number; y: number; w: number; h: number; side: string }
export interface Cut {
  index?: number; text: string; lineText: string; line: number; start: number; end: number; dur: number; seed: number;
  layout: string; enter: string; hold: string; exit: string; inDur: number; outDur: number;
  params: Parameters; decor: Array<Parameters & { id: string }>; scheme: number;
  treat: string; treatP: Parameters; bg: string; bgP: Parameters; cam: string; camP: Parameters;
  trans?: string | null; transP?: Parameters; transDur?: number; morph?: { dur: number } | null;
  companion?: Cut; zone?: Zone | null; words?: string[]; weightGrow?: boolean; webMorph?: boolean;
}
export interface ColorScheme {
  bg: string; fg: string; sub: string; accent: string; accent2: string; ink: string;
  dim: string; ghostA: string; ghostB: string; grad?: string[]; paper?: boolean; swap?: boolean;
}
export interface Style {
  name: string; desc: string; schemes: ColorScheme[];
  fonts: Record<string, string[]>; texture: { grain: number; paper: number; scan: number };
  ghost: number; hud: boolean; bias?: Record<string, Record<string, number>>;
}
export interface PlanEvent { t: number; type: string; amp: number; dur: number }
export interface Plan {
  version: 1; generator: 'JIZURA'; appVersion: string; title: string; artist: string;
  W: number; H: number; fps: number; duration: number; seed: number; styleKey: string; style: Style;
  fx: Effects; lines: PlanLine[]; cuts: Cut[]; events: PlanEvent[]; beats: number[]; hud: boolean;
  keyBg: 'green' | 'black' | null; centerFree: boolean; zones: Zone[] | null;
  typeset: boolean; unify: boolean; lang: LyricLanguage;
  evOwner?: WeakMap<PlanEvent, Cut>;
  energy?: Float32Array | null; energyRate?: number;
}
export interface FontMetadata {
  label: string; family: string; weight: number; kind: string; langFamily?: string; langWeight?: number;
}
export interface AEPlan extends Omit<Plan, 'version'> {
  version: 2; width: number; height: number; extra: boolean; wa: boolean;
  horror: boolean; typo: boolean; kinetic: boolean; fonts: Record<string, string[]>;
  fontTable: Record<string, FontMetadata>; audioOffset?: number; range?: ExportRange;
}
export interface ExportRange { t0: number; t1: number }
export interface ExportSpan { t0: number; dur: number }
export interface AudioAnalysis {
  duration?: number; beats?: number[]; bpm?: number; energy?: Float32Array; energyRate?: number;
}
export interface FrameOptions {
  scale?: number; transparent?: boolean; layer?: 'front' | 'back'; fast?: boolean;
  noHud?: boolean; noPost?: boolean; noTrans?: boolean; noGhost?: boolean; glyphLog?: unknown[];
}
export interface TextItem {
  text: string; font: string; size: number; track?: number; sx?: number; sy?: number;
  lead?: number; align?: 'left' | 'right' | 'center'; vertical?: boolean;
}
export interface Glyph {
  ch: string; i: number; li: number; ci: number; n: number; x: number; y: number;
  w: number; h: number; r90: boolean; vx: number; vy: number; fs: number;
}
export interface GlyphLayout extends Array<Glyph> { W: number; H: number; N: number }
export interface Renderer {
  frame(context: CanvasRenderingContext2D, plan: Plan, time: number, options?: FrameOptions): void;
}
export interface RandomStream {
  (): number;
  range(lo: number, hi: number): number; int(lo: number, hi: number): number;
  pick<T>(values: T[]): T; chance(probability: number): boolean;
  wpick<T>(values: Array<{ w: number; v: T } | [T, number]>): T;
}
export interface EffectDefinition {
  name: string; pack?: string; ae?: string; special?: boolean; w?: number; tags?: string[];
  [key: string]: unknown;
}
/** Strict consumer boundary. Internal effect/item slots are transitional. */
export interface Engine extends UtilityAPI {
  resolveStyle(project: Project): Style;
  layoutText(item: TextItem): GlyphLayout;
  measure(item: TextItem): { w: number; h: number; lay: GlyphLayout };
  fitSize(text: string, font: string, maxW: number, maxH: number, options?: Partial<TextItem>): number;
  typesetLine(characters: string[]): Array<{ f: number; gap: number; adv: number }>;
  setTypeset(enabled: boolean): void;
  defaultProject(): Project;
  mergeProject(input: unknown): Project;
  parseLyrics(raw: string): ParsedLyrics;
  lineSnapshot(plan: Plan, lineIndex: number): CutSnapshot[] | null;
  parseOrderV1(raw: string): number[] | null;
  plan(project: Project, audio?: AudioAnalysis | null): Plan;
  planForAE(plan: Plan, project: Project, range?: ExportRange | null): AEPlan;
  exportSpan(plan: Plan, range?: ExportRange | null): ExportSpan;
  designSize(aspect: string): [number, number]; outputSize(project: Project): [number, number];
  cutAt(plan: Plan, time: number): Cut | null;
  rng(seed: number): RandomStream;
  h(a: number, b?: number, c?: number, d?: number, e?: number): number;
  sid(text: string): number;
  registry(group: EffectGroup): Record<string, EffectDefinition>;
  order(group: EffectGroup): string[];
  register(group: EffectGroup, key: string, definition: EffectDefinition, pack?: string): EffectDefinition;
  GROUP_KEYS: EffectGroup[]; CORE_ORDER: Partial<Record<EffectGroup, string[]>>;
  STYLE_ORDER: string[]; STYLES: Record<string, Style>; FONTS: Record<string, FontMetadata>;
  Renderer: new () => Renderer;
}
