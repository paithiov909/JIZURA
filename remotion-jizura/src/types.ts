import type * as React from "react";

export type Seed = number; // 整数 0..4294967295。文字列や丸め・暗黙の変換は不可
export type Color = string; // #RGB または #RRGGBB のみ。解決時に #RRGGBB に正規化
export type TextRange = Readonly<{start: number; end: number}>;
export type ParsedChunk = Readonly<{
  text: string;
  emphasis: readonly TextRange[];
  source: Readonly<{line: number; cut: number; lineText: string}>;
}>;
export type ParseLinesOptions = Readonly<{numCuts?: "auto"}>;

export type FontSpec = Readonly<{
  family: string; // 単一家族名。CSSのfallbackリストではない
  weight?: number; // 整数 1..1000、既定700
  style?: "normal" | "italic"; // 既定normal
  src?: string; // FontFaceで読み込むURL。省略時は利用側で登録済みのface
}>;
export type JizuraStyle = Readonly<{
  palette?: Readonly<{
    bg?: Color; fg?: Color; sub?: Color; accent?: Color;
    accent2?: Color; ink?: Color; dim?: Color;
  }>;
  fontSize?: number; // design px。指定時も領域へ収める上限
  track?: number; // em
  lead?: number; // em
  emphasisColor?: Color;
}>;

export type EffectDeclaration<G extends string, I extends string, P> = Readonly<{
  group: G; id: I; seed?: Seed; params?: Readonly<Partial<P>>;
}>;
export type CenterParams = {
  sx: number; track: number; sub: boolean; under: boolean;
  accent: boolean; ox: number; oy: number;
};
export type NoParams = Readonly<Record<string, never>>;
export type DecorParams = {
  n: number; right: boolean; low: boolean; accent: boolean;
  corner: boolean; big: boolean; mode: "count" | "index";
  from: number; to: number; v: number; r: number;
};
export type CenterEffect = EffectDeclaration<"layout", "center", CenterParams>;
export type PopEffect = EffectDeclaration<"enter", "pop", NoParams>;
export type WipeEffect = EffectDeclaration<"enter", "wipe", NoParams>;
export type DriftEffect = EffectDeclaration<"exit", "drift", NoParams>;
export type BreatheEffect = EffectDeclaration<"hold", "breathe", NoParams>;
export type KasumiEffect = EffectDeclaration<"decor", "kasumi", DecorParams>;
export type CheckerStripEffect = EffectDeclaration<"decor", "checkerStrip", DecorParams>;
export type LayoutInput = "center" | CenterEffect;
export type EnterInput = "pop" | "wipe" | PopEffect | WipeEffect | null;
export type ExitInput = "drift" | DriftEffect | null;
export type HoldInput = "breathe" | BreatheEffect | null;
export type DecorInput = "kasumi" | "checkerStrip" | KasumiEffect | CheckerStripEffect;
export type EffectOptions<P> = Readonly<{seed?: Seed; params?: Readonly<Partial<P>>}>;

export type JizuraCutProps = Readonly<{
  text: string | ParsedChunk;
  seed?: Seed;
  from?: number;
  durationInFrames?: number;
  enterDurationInFrames?: number;
  exitDurationInFrames?: number;
  layout?: LayoutInput;
  enter?: EnterInput;
  exit?: ExitInput;
  hold?: HoldInput;
  decor?: readonly DecorInput[];
  treat?: null; bg?: null; cam?: null; fx?: null; trans?: null;
  font?: FontSpec;
  style?: JizuraStyle;
}>;
export type JizuraSceneProps = Readonly<{
  durationInFrames: number;
  width?: number; height?: number;
  seed?: Seed;
  font?: FontSpec;
  style?: JizuraStyle;
  background?: Color | null;
  motionFps?: number | null;
  children?: React.ReactNode;
}>;
