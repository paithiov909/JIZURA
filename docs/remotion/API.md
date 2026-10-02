# remotion-jizura 初期API契約

決定日：2026-10-02。対象：`remotion` ブランチの段階01〜07。
この文書は実装仕様であり、実装・型検査・描画の成功記録ではない。
パッケージ、依存、対応バージョン、検証コマンドは[段階02の結果](02-package-scaffold.md)に記録。
段階03までに公開型・空Scene・parser・7factoryの宣言検証・計画/seed/parameter補完を実装済み。
段階04で実フォント準備・glyph/item/box計測と静止描画、段階05で整数Cut選択・進行/量子化評価を実装した。
段階06でcenter/pop/wipe/drift/breathe/kasumi/checkerStripの実描画を接続した。
検証結果は[段階03の結果](03-scene-plan.md)、[段階04の結果](04-static-canvas.md)、[段階05の結果](05-remotion-frames.md)、[段階06の結果](06-effect-port.md)を参照。
初期実装の契約はこの文書を優先し、変更時は理由と影響するメモを更新する。

## 公開境界と型

公開値は `JizuraScene`、`JizuraCut`、`parseLines`、下記7個のfactory、
`JizuraError`。以下のprops・入力・宣言型も公開する。
ScenePlan、registry、計測・描画サービス、PRNGは非公開。
root entryから利用でき、パッケージ外の型・実装をimportしない。

```ts
type Seed = number; // 整数 0..4294967295。文字列や丸め・暗黙の変換は不可
type Color = string; // #RGB または #RRGGBB のみ。解決時に #RRGGBB に正規化
type TextRange = Readonly<{start: number; end: number}>;
type ParsedChunk = Readonly<{
  text: string;
  emphasis: readonly TextRange[];
  source: Readonly<{line: number; cut: number; lineText: string}>;
}>;
type ParseLinesOptions = Readonly<{numCuts?: "auto"}>;
declare function parseLines(raw: string, options?: ParseLinesOptions): readonly ParsedChunk[];

type FontSpec = Readonly<{
  family: string; // 単一家族名。CSSのfallbackリストではない
  weight?: number; // 整数 1..1000、既定700
  style?: "normal" | "italic"; // 既定normal
  src?: string; // FontFaceで読み込むURL。省略時は利用側で登録済みのface
}>;
type JizuraStyle = Readonly<{
  palette?: Readonly<{
    bg?: Color; fg?: Color; sub?: Color; accent?: Color;
    accent2?: Color; ink?: Color; dim?: Color;
  }>;
  fontSize?: number; // design px。指定時も領域へ収める上限
  track?: number; // em
  lead?: number; // em
  emphasisColor?: Color;
}>;

type EffectDeclaration<G extends string, I extends string, P> = Readonly<{
  group: G; id: I; seed?: Seed; params?: Readonly<Partial<P>>;
}>;
type CenterParams = {
  sx: number; track: number; sub: boolean; under: boolean;
  accent: boolean; ox: number; oy: number;
};
type NoParams = Readonly<Record<string, never>>;
type DecorParams = {
  n: number; right: boolean; low: boolean; accent: boolean;
  corner: boolean; big: boolean; mode: "count" | "index";
  from: number; to: number; v: number; r: number;
};
type CenterEffect = EffectDeclaration<"layout", "center", CenterParams>;
type PopEffect = EffectDeclaration<"enter", "pop", NoParams>;
type WipeEffect = EffectDeclaration<"enter", "wipe", NoParams>;
type DriftEffect = EffectDeclaration<"exit", "drift", NoParams>;
type BreatheEffect = EffectDeclaration<"hold", "breathe", NoParams>;
type KasumiEffect = EffectDeclaration<"decor", "kasumi", DecorParams>;
type CheckerStripEffect = EffectDeclaration<"decor", "checkerStrip", DecorParams>;
type LayoutInput = "center" | CenterEffect;
type EnterInput = "pop" | "wipe" | PopEffect | WipeEffect | null;
type ExitInput = "drift" | DriftEffect | null;
type HoldInput = "breathe" | BreatheEffect | null;
type DecorInput = "kasumi" | "checkerStrip" | KasumiEffect | CheckerStripEffect;
type EffectOptions<P> = Readonly<{seed?: Seed; params?: Readonly<Partial<P>>}>;
declare function center(options?: EffectOptions<CenterParams>): CenterEffect;
declare function pop(options?: EffectOptions<NoParams>): PopEffect;
declare function wipe(options?: EffectOptions<NoParams>): WipeEffect;
declare function drift(options?: EffectOptions<NoParams>): DriftEffect;
declare function breathe(options?: EffectOptions<NoParams>): BreatheEffect;
declare function kasumi(options?: EffectOptions<DecorParams>): KasumiEffect;
declare function checkerStrip(options?: EffectOptions<DecorParams>): CheckerStripEffect;

type JizuraCutProps = Readonly<{
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
type JizuraSceneProps = Readonly<{
  durationInFrames: number;
  width?: number; height?: number;
  seed?: Seed;
  font?: FontSpec;
  style?: JizuraStyle;
  background?: Color | null;
  motionFps?: number | null;
  children?: React.ReactNode;
}>;
```

初期対応ID集合は段階06で全7候補を移植・比較済み。
段階02は空Sceneだけ、03〜05は段階メモに従う部分実装とし、テスト用effectを
公開の対応IDとして扱わない。未実装の指定を黙って成功させない。
他グループは初期型を `null` のみに絞る。将来はgroupごとのID・宣言型を追加する。
factoryの名前は `drift` をexitに予約し、旧holdの同名IDを公開しない。

## Sceneと宣言収集

- SceneはRemotionのComposition/Player内で使う。Remotion contextなしはエラー。
  `durationInFrames`はScene自身の長さとして必須で、Remotion設定から補わない。
  幅・高さは各々省略時に `useVideoConfig()` の値を使い、fpsもそこから取得する。
  幅・高さは正のsafe integer、durationは正のsafe integer、fpsは正の有限数。
- Scene seedの既定値は旧projectに合わせて **20260922**。
  children省略、空配列、空Fragmentは空Sceneとして許す。
- 宣言収集は直下の `JizuraCut`、入れ子の配列、Fragmentのみを深さ優先で辿る。
  `null`、`undefined`、booleanは無視する。文字列、数値、DOM要素、Sequence、
  portal、任意コンポーネントはエラー。FragmentのpropsはchildrenとReact keyのみ許す。
  keyはReactの管理用で、時間・seedには使わない。
- Cutは宣言専用でCanvasもDOMも生成しない。childrenは不可、Scene外で単独使用はエラー。
  Cutを返す独自コンポーネントをSceneの中へ置かず、呼び出し側でCut配列を作る。
- Sceneごとに1つの出力Canvasと独立した描画サービスを持つ。
  Sceneの範囲外は毎回clearし、基底背景も描かない。Sceneの自動延長や
  Composition/Sequence durationの書き換えはしない。

`useCurrentFrame()`の値は外側Sequenceからのローカルframeである。
Sceneはその値をそのまま使い、外側の開始位置を加算しない。
これは[公式Sequence仕様](https://www.remotion.dev/docs/sequence)と
[frame仕様](https://www.remotion.dev/docs/use-current-frame)に沿う。
初期検証は通常速度・整数frameを対象とし、速度変更・trim・loopの統合検証は範囲外。
採用Remotion版で[設定取得](https://www.remotion.dev/docs/use-video-config)を段階02で再確認する。

## テキストとparser

### 正規化と構造

1. `raw`は文字列のみ。CRLFと単独CRをLFへ変換する。Unicode正規化は行わない。
   孤立surrogateと、LF・TAB以外のC0制御文字はエラー。
2. 入力行の番号は先頭空行を含む **0始まり**。各行をtrimし、空行を無視する。
   空行による時間・gap・間奏は作らない。
3. エスケープと強調を読み、本文と範囲を作る。本文の横方向空白の連続
   （TAB・全角空白等、正規表現 `\s` のうちLF以外）はASCII空白1個へまとめ、
   各Cutの前後をtrimする。範囲もこの正規化後の本文へ写像する。
4. `source.lineText`はその行の正規化済み本文。強調マーカーを除き、
   手動境界は空白を加えず除く（境界前後に実在する空白は通常の正規化対象）。
   `source.cut`は行内の0始まり出力順。sourceの位置は元の文字offsetではない。
5. emphasisのstart/endはCut本文の **Unicode code point** 単位の半開区間。
   空・重複・範囲外は禁止、隣接範囲は統合する。分割で強調が跨がる場合は各Cutへ
   交差範囲を写像する。繰り返す同じ語のうち、マークした出現だけが強調される。

`ParsedChunk`を直接渡す場合も同じ形と範囲を検証する。本文・lineTextは正規化済みで、
line/cutは非負safe integer。既に本文なので再度 `/` や `*` を構文として読まない。
単一Cutの文字列は同じ空白・強調・エスケープ規則で読むが、LFはCut内の改行として残す。
文字列Cutの非エスケープ `/` はエラー（分割したい場合はparseLinesを使う）。
構造化textとlineTextもLFを許す。全行が空白だけのCutはエラー。
Cut文字列にはsourceを付けず、内部のlineTextは自分の本文とする。

### 構文と分割

- `\*`、`\/`、`\\`だけをエスケープとして許す。不明なescape・末尾の `\` はエラー。
  JS/TSの文字列リテラルでは、parserへ渡すbackslash自体のエスケープが別途必要。
- `*…*`は空でない強調。ネスト・未閉鎖・空強調 `**`・空白だけの強調はエラー。
  強調はparseLinesの行/LFを跨げない。`*希望/朝*`は許し、両Cutの本文を強調する。
  手動境界を跨ぐ強調も、本文正規化後に空ならエラー。
- 非エスケープ `/`がある行は、それを唯一のCut境界とする。各部分を再自動分割しない。
  `/朝`、`朝/`、`朝//夜`、`朝/ /夜`は空Cutとしてエラー。
- `numCuts`の既定は `"auto"`。数値指定は初期版では **非対応** とし、公開型はautoのみ。
  型を通らない入力も実行時に `E_NUM_CUTS` とする。正数でも受理しない。
  手動境界と各行の数値割当の相互作用を持ち込まず、まずautoを実装する。
- autoは既存[planner](../../engine/planner.ts)の `segments` の **script分類fallback** と
  `chunkText` を移植する。`Intl.Segmenter`は呼ばない。`segType`、utilの文字分類、
  漢字→ひらがな継続条件、chunkの結合、長いchunkの分割、末尾1文字の結合を保持する。
  長いchunkの `splitLines` は[layouts](../../effects/core/layouts.ts)の同関数とLatin判定を使う。
  `phraseChunks`は適用しない。実装をパッケージ内へ分離し、本文へのoffsetを保持する。
  chunk境界の空白は捨て、chunk内部は正規化済み空白を保持する。
  新parserはLRC・BPM・コメント・metadata・`|`注釈・末尾 `!`・間奏構文を認識しない。
  `#`、`[ti:...]`、`!`等は本文として残る。
- 最大は入力全体100000 code points、1出力Cut10000 code points、1Scene/parse結果1000Cut。
  超過はエラー。長い手動Cutを勝手に切り直さない。空入力は `[]`。

Intl/ICUの辞書差を避け、autoを本文だけの関数にするためfallbackを固定した。
これは旧ブラウザのIntl有効時との意図的な差で、旧parserとの全結果一致を要求しない。
code point処理は旧textと一致するが、結合文字・ZWJ絵文字をgraphemeとして扱う保証はない。
Unicode全文字の組版・禁則・双方向処理は初期範囲外。

### 正確な返却例

共通計画のテンプレートリテラル（先頭と末尾にLFあり）について、
`parseLines("\n新しい/朝が来た\n*希望*の朝だ\n", {numCuts: "auto"})`の期待値は：

```json
[
  {"text":"新しい","emphasis":[],"source":{"line":1,"cut":0,"lineText":"新しい朝が来た"}},
  {"text":"朝が来た","emphasis":[],"source":{"line":1,"cut":1,"lineText":"新しい朝が来た"}},
  {"text":"希望の朝だ","emphasis":[{"start":0,"end":2}],"source":{"line":2,"cut":0,"lineText":"希望の朝だ"}}
]
```

fallbackのsegmentは2行目について `希望の`・`朝だ`、chunkTextの漢字chunk結合で
5 code pointsの `希望の朝だ` が1Cutになる。先頭LFを省けばsource.lineは0・1になる。
`parseLines("*朝/夜*")`は `朝` と `夜` の2Cut、それぞれemphasis `[0,1)`。
エスケープしたslashを含む `朝\/夜` は `朝/` と `夜` の2Cut（manualではなくauto分割）。

## 時間配分とframe評価

frame値はすべてsafe integer。fromは0以上、Scene/Cut durationは1以上。
NaN・Infinity・小数・文字列・負数・0duration・加算のsafe integer超過はエラー。

| モード | 決定と規則 |
| --- | --- |
| 順次 | 全Cutでfrom省略。duration指定Cutを先に確保し、残りを未指定Cut数で整数除算。余りを未指定Cutの宣言順で1ずつ配る。その後、全Cutを宣言順に詰めて配置 |
| 全duration指定の順次 | 合計がScene以下なら許可。余りは末尾の空白。Sceneを延長しない |
| 明示 | 1つでもfromがあれば全Cutでfromとduration必須。宣言は非時系列でも許す。planではfrom昇順に安定sortし、seed用の宣言indexは保持 |
| 空Scene | 有効なScene durationがあれば許可。範囲内は基底背景のみ |

未指定durationの各Cutに1frame以上必要。残りがその個数未満ならエラー。
明示配置は `[from, from + duration)` がScene内で、互いに重ならないこと。
終了と次の開始が同じframeは重複ではない。fromの混在や暗黙の補完は不可。
明示配置の先頭・途中・末尾の空白は基底背景のみ。
active判定はSceneもCutも整数frameの半開区間。最後の有効frameはend-1。

### enter・hold・exit

Cut durationをD、fpsをFとする。既定時間は旧plannerの通常経路を整数frameへ変換する。
秒→frameは `Math.round(seconds * F)` とし、有効effectの候補時間は最低1frame。

- enterが非null：`round(clamp((D/F)*0.36, 0.12, 0.6)*F)`。
- exit driftが非null：`round(clamp((D/F)*0.38, 0.25, 0.7)*F)`。
- null側は0。`enterDurationInFrames`/`exitDurationInFrames`は0以上の明示上書き。
  null側に0以外を指定するとエラー。0ならeffect IDを保持してもapplyは省略し即時動作。
- 静止姿勢を1frame確保するため、enter+exitの予算は **D-1**。
  明示時間は変更せず先に確保する。明示時間の合計が予算を超える場合はエラー。
  自動時間の合計が残予算を超える場合は比例縮小し、floorの余りを小数部の大きい順、
  同値はenter→exitへ配る。自動時間は縮小後0を許す。D=1では自動時間は両方0。
- Cutローカルframeをlとし、通常の評価秒は `t=l/F`、`dur=D/F`。
  inDur=enterFrames/F、outDur=exitFrames/F。
  `pIn = inDur === 0 ? 1 : clamp(t/inDur)`。
  `pOut = outDur === 0 ? 0 : clamp((t-(dur-outDur))/outDur)`。
  旧mainDrawどおり、enterはpIn<1の間、exitはpOut>0の間にapplyする。
  pOut=1の仮想frameを追加しない。endで文字・装飾ごと消去する。
- holdの引数は進行率ではなく強度：`clamp((t-inDur*0.85)/0.25)*(1-pOut)`。
  nullではapplyしない。breatheのsinと字間変化の式はそのまま移植する。
  初期centerは主item1つ、item間staggerは0。pop内部の文字別delayは式を保持する。
- 適用順はenter→hold→exit。毎frameで元のitemを複製し、変形を蓄積しない。

旧plannerの秒時間・0.92倍上限から、整数化と1静止frame確保へ変更した。
1frame Cutは明示effect IDも保持しつつ入退場を省略し、文字を1frame表示する。
短いCutのdecorはそれぞれ固有の秒ベース入場を保持するため、完成姿が見える保証はない。
motionFps省略時の時間規則で静止frameを確保する。

### コマ打ち

`motionFps`の既定は `null`（毎frame）。指定する場合は0より大きくF以下の有限数。
旧「on twos」相当は24fps Compositionで `motionFps={12}` を明示する。
Cutを **量子化前** のframeで選択し、Cutローカル時間だけを
`floor((l/F)*motionFps + 1e-6)/motionFps`へ量子化する。
ltとltbはこの同じ秒、stepは `floor(t*24 + 1e-6)`（量子化後のt）とする。
旧rendererのグローバル時刻量子化・Cut選択・24Hz上限のflicker時計との違いを記録する。
nullならt=l/F。境界判定に浮動小数やepsilonを使わない。
量子化を選んだ短いCutでは姿勢の繰り返しや入場が見えない場合がある。
いずれも終了境界で前Cutを描き続けない。

## effect選択・parameter・seed

### 指定の意味

| グループ | 省略/undefined | 無効化 | 明示指定 |
| --- | --- | --- | --- |
| layout | center | 不可 | center文字列または宣言 |
| enter | pop、wipeの登録順から等確率選択 | nullで即時表示 | IDまたは対応factory宣言 |
| exit | drift | nullでendで消去 | 同上 |
| hold | breathe | nullで静止 | 同上 |
| decor | 1個選択：kasumi、checkerStripの順で等確率 | 空配列 `[]` | ID/宣言の配列（最大16個） |
| treat/bg/cam/fx/trans | 無効 | null | 初期版では受理しない |

単一effectの `false`、空文字、`"auto"`、旧 `"cut"`/`"still"`/`"none"`等はエラー。
decorのnull・単一文字列・配列内nullもエラー。同一IDの複数指定を許す。
decorは背面→文字（centerのsub/underを含む）→前面の順に描き、
同じlayer内では配列順を保つ。layerはeffect固有で、配列順で前後layerを反転しない。
現在の候補はkasumi=back、checkerStrip=front。
重み・旧history・mood・effect適合抽選は初期版では導入しない。

factoryは入力検証後に宣言のコピーだけを返す。PRNG・DOM・フォント・Canvasにアクセスしない。
呼び出し側のオブジェクトを変更せず、明示false/0を欠損として扱わない。
手書きの同じ宣言も受理する。未知のkey・group違い・ID違い・不正型はエラー。
ID文字列は `{group, id}` と等価。seed/paramsはそのグループのplan時に解決する。
旧パラメータbagを無検証で受け付けない。初期schemaは次のとおり。

| params | 受理範囲・補完 |
| --- | --- |
| center.sx | 有限 0.25..4。補完は旧候補 `[1,1,1,1.25,1.45,0.78]` |
| center.track | 有限 0..1 em。補完は旧range(0.02,0.14) |
| center.sub/under/accent | boolean。旧chance(0.45/0.3/0.18) |
| center.ox/oy | 有限 -0.25..0.25、W/H比。補完は旧range(-0.05,0.05)/(-0.06,0.06) |
| pop/wipe/drift/breathe | 空paramsのみ。運動の数式内の定数は公開parameterにしない |
| decor.n | 整数1..3、旧rng.int(1,3) |
| decor.right/low/accent/corner/big | boolean。旧chance(0.5/0.5/0.4/0.5/0.4) |
| decor.mode | count/index、旧rng.pickの同順 |
| decor.from/to | 整数0..20 / 30..999、旧rng.intの同範囲 |
| decor.v/r | 整数0..5 / 有限0以上1未満、旧rng.int(0,5) / rng() |

decorには両候補で使わない旧共有parameterも残し、旧decorParamsとの比較を容易にする。
seedはparams内ではなく宣言のトップレベルに置く。旧比較adapterでP.seedへ写す。
centerの旧params.fontはFontSpecへ分離する。body/display/serifの役割は同じ解決済みfontへ
写し、旧center.planのfont選択で消費する `chance` と `pick` も候補1個で呼んでから
sx以下を生成する。各生成器の乱数呼出順は旧コードの順を維持する。
補完時はまず完全な候補bagを生成し、その上に明示paramsをshallow mergeする。
1つのparameterの固定によって、他の自動parameterの乱数位置をずらさない。

### seed導出（契約version 1）

`h`、`sid`、`rng`は[util](../../engine/util.ts)の数値hash、UTF-16 FNV-1a、mulberry32を
そのままパッケージ内へ移植する。引数省略は旧hどおり0として扱う。
乱数をframe評価で順次消費せず、plan時にparamsを確定する。

```text
S = Scene.seed ?? 20260922
C = Cut.seed ?? h(S, declarationIndex + 1, sid("cut"))
selectionSeed(g) = h(C, sid(g), sid("select"))
effectSeed(g, id, slot) = declaredEffectSeed ?? h(C, sid(g), sid(id), slot + 1)
parameterSeed = h(effectSeed, sid("params"))
itemSeed = h(effectSeed, mainItemIndex + 1, 7)
```

selectionはそのgroup専用のrng(selectionSeed)のpick1回だけ。
slotは単一groupで0、decorで **配列index**（自動decorも0）。
paramsはrng(parameterSeed)で生成する。decorの旧P.seedにはeffectSeedをそのまま渡し、
旧decorParamsのseed用int(1,1e9)は比較可能な呼出順保持のため消費して捨てる。
enter/hold/exit apply直前には各effectのitemSeedをitem.seedへ渡す。
effect明示seedは抽選を変更せず、そのeffectの補完・運動乱数だけを固定する。

明示Cut seedはScene seed・位置から独立。同じdecor IDの重複はslotで分離する。
配列への挿入・並べ替えは未指定decor seedを変える。
明示effect seedなら移動してもparamsは同じ（同layerの重なり順は変わる）。
decorの固定・数・順序がenter等の抽選やparamsを変えない。
前のCut/別Sceneの履歴、React key、mount順、frame取得順は乱数へ含めない。
旧plannerの単一streamとhistoryを持つ抽選と一致する契約ではない。

## フォント・Style・Canvas

### フォントと計測

familyはtrim後の空文字、comma、引用符、backslash、制御文字を許さない。
font省略時は `{family: "Noto Sans JP", weight: 700, style: "normal"}`。
初期版はフォントの自動ネット取得・バイナリ同梱をしない。
利用側で一致するFontFace/@font-faceを登録するか、srcを指定する。
srcは空でないURL（相対URLも許しdocument.baseURI基準）。RemotionのstaticFileの戻り値を使える。
同じfamily/weight/styleに異なるsrcを登録する競合はエラー。同一資源の非同期loadだけは共有可。
ロード完了・face存在を確認してからScene内の全本文を計測する。
`document.fonts.check()`だけでfallback成功を採用せず、対象faceの登録/load結果を確認する。
失敗・未登録・タイムアウトは `E_FONT` とし、旧fontsサービスのcatchして継続する挙動は移植しない。
元フォントにないglyphのfallbackまでは初期版では検出できない。比較文字を収録した固定faceを用いる。
参考：[FontFaceSet.check](https://developer.mozilla.org/en-US/docs/Web/API/FontFaceSet/check)、
[FontFaceSet.loadとglyph coverageの制約](https://developer.mozilla.org/en-US/docs/Web/API/FontFaceSet/load)。

Cut.fontは **全置換**。family必須、weight/style省略は700/normal、Scene.src等を引き継がない。
Styleはpaletteをkeyごとにmergeし、その他はCutの定義済みkey→Scene→既定値の順。
undefinedは欠損、nullは禁止。明示0/falseは上書き値として保持する。
FontSpec、Style、paletteには未知keyを許さない。CSSPropertiesとは別の描画設定である。

| Style項目 | 既定・適用規則 |
| --- | --- |
| palette | bg=#111111、fg=#FFFFFF、sub=#B8B8B8、accent=#F5A50C、accent2=#16F4D4、ink=#111111、dim=#333333 |
| fontSize | 未指定ならcenter旧fitSizeとH*0.33の小さい方。指定は正の有限pxで、その値も上限に加える |
| track | 未指定ならcenterで生成。段階04の歴史的静止subsetでは0.06。指定は有限0..1 em |
| lead | 未指定ならcenter/静止描画とも1.2。指定は有限0.5..4 em |
| emphasisColor | 未指定なら最終palette.accent |

center.params.trackが明示ならStyle.trackより優先する。
Style.trackの明示があれば自動生成trackを上書きする。
それ以外はcenterの生成値を使う。この「明示」の情報を解決済みplanに残す。
Styleとfontを先に解決してから計測し、centerの自動改行にもemphasis範囲を追従させる。
centerは明示改行を境界として保持し、各行に旧splitLines/splitWordsを適用する。
段階06で「単一Cut文字列は改行を保持」の契約を優先し、旧splitLinesの複数行全体の再分割とは区別した。
palette.bgはdecorの明暗判定用で、CutごとにSceneの基底背景を塗り直す指定ではない。
強調はglyphのfillをemphasisColorに変更するだけ。文字サイズ・font・時間・seedを変えない。
旧plannerの「強調が抽選の重みを変える」挙動は採用しない。

### driftのglyph分解とcache

exit driftは `pieces: true, shatter: true` で、文字の連結成分とpolygon断片が必要。
段階04では静止glyph/boxまで、段階06でfontsサービスのdecompose/fragmentsと
textのdrawPieces/fragListを必要な範囲だけ移植する。単なるglyph全体のfadeで代替しない。
旧 `_pid` の採取順依存と `pc.frags`/`glyph.frags` のseedを無視するcacheは保持しない。

- 連結成分の順序は旧コードの面積降順。同面積は元のraster走査順。
- fragments乱数の旧pc.idには安定キー `h(sid(ch), resolutionBucket, pieceIndex + 1)` を渡す。
  pieceIndexはそのglyph内の上記順序で0始まり。分割数・polygon・運動の数式は保持する。
- cacheは解決font資源・glyph文字・resolutionBucket・itemSeedを含むkeyで分離する。
  tint/spriteの識別子もこのkeyとpiece/fragment indexから作り、採取順counterへ依存しない。
- seed=0を保持する。旧 `it.seed || 1` はnull/undefinedのみを補う形へ変更する。
- 旧pixel比較では同じcomponentキーとseedを渡すadapter条件を記録する。
  旧counter/最初のseedのcache状態との一致は要求せず、運動式の差と分けて報告する。

### 背景と解像度

Scene.background省略時はSceneの解決済みpalette.bg。nullなら透明、色なら全域を塗る。
`bg={null}`は背景effectなしであり、この基底背景の値に影響しない。
空Scene・時間の空白にもScene基底背景を使う。
Canvas属性width/heightをdesign解像度とし、devicePixelRatioは掛けない。
CSSはwidth/height=100%、display=blockで親領域へ表示する。親の縦横比を利用側で合わせる。
SceneにはCSS style、className、内部Canvas ref等を初期公開しない。
CSSによる拡縮は座標・計測・seedを変えず、Remotionの出力サイズも変更しない。
毎回identity transformでclearし、保存/復元とblend・alpha・clipの初期化を行う。

旧decor.ts/decorB.tsの `getBB` はWeakMapに前frameのboxを保存する。
この履歴cacheは移植せず、**当該frameのbox、なければplanの静止box** を使う。
boxを旧helperと同じ範囲へclampして渡す。1frame目へ直接seekしても結果が同じになるための差である。
planの静止boxは同じcenter設定を入退場・holdなしで評価して求める。
紙・grain・chroma・HUD・camera等の旧renderer機能は初期版に含めない。

## 非公開の計画と描画境界

次の型は責務の例。内部配置は各段階で決めてよいが、公開exportにしない。

```ts
type PreparedScene = Readonly<{
  width: number; height: number; fps: number; durationInFrames: number;
  // 正規化本文、宣言index、整数配置、時間、解決font/Style、effect/seed/params
  cuts: readonly PreparedCut[];
}>;
type ScenePlan = Readonly<{
  prepared: PreparedScene;
  // font準備後に、glyph位置、改行対応、静止item、静止boxを確定
  cuts: readonly MeasuredCut[];
}>;
// CanvasはReact外の計測・描画サービスが所有。planはDOM/React要素を保持しない。
// 型名PreparedCut/MeasuredCutはこの文書で固定する公開契約ではない。
type FrameState = Readonly<{
  activeCutIndex: number | null; localFrame: number | null;
  evaluationSeconds: number | null; pIn: number; pOut: number; holdAmount: number;
}>;
```

計測前（段階03）：入力・childrenの検証、parser、時間配分、seed、group検証、
effect IDとparams生成、font/Style解決を行う。計測stubによる成功を実描画と扱わない。
計測後（04〜06）：fontが準備できた時だけglyph advance、字間、改行、サイズfit、
静止boxを確定する。05で整数frameからFrameStateへ接続し、06で実effectを接続する。
評価・描画はplanを書き換えず、frame用item/charFns/clip等を作る。
Sceneごとの計測cacheは資源・サイズ・font・Styleの変更で失効する。
cacheの破棄・再作成、非連続frame、複数Scene、再mount、並列取得で結果を変えない。

書き出しでは資源準備と当該frameのCanvas更新完了まで取得を待たせる。
失敗はrenderを失敗させ、cleanupで待機handleを残さない。Studio/Playerでは
準備完了まで空Canvasを表示し、エラーを可視化して未準備の計測結果を表示しない。
[公式delayRender資料](https://www.remotion.dev/docs/delay-render)のとおり、
render待機だけではpreviewの準備を制御できない。採用版のhookと待機APIを04/05で検証する。
import時・factory呼出時にDOM生成/待機を行わず、実時間時計を作らない。

## エラー契約

`JizuraError extends Error`にreadonly `code: string`、`path: string`を持たせる。
同期入力エラーはparse/factory/Sceneの解決時にthrow、font等の非同期失敗も同じcode/pathで
previewへ表示し書き出しを失敗させる。messageの日本語/英語文言は固定しない。
pathは `raw`、`options.numCuts`、`children[2]`、`cuts[0].decor[1].params.v` 等。
複数不正はこの順で最初を報告：Scene→children→Cut（宣言順）→時間集合→font/計測。
Cut内はtext→数値/seed→font/Style→effect（layout, enter, exit, hold, decor, treat, bg, cam, fx, trans）。
フォント不要の全検証を済ませてから非同期資源を開始する。

| code | 対象 |
| --- | --- |
| E_INPUT | 不正型、必須値欠損、未知key、上限超過、Scene contextなし |
| E_TEXT | 不正構文/escape/Unicode/強調範囲、空Cut |
| E_NUM_CUTS | auto以外 |
| E_CHILD | 非対応children、Scene外Cut |
| E_NUMBER | frame/seed/サイズ/fps等の不正数値 |
| E_TIMING | モード混在、重複、範囲外、不足frame、入退場予算超過 |
| E_EFFECT | 未対応ID/group、group不一致、不正parameter/無効化 |
| E_STYLE | 不正font/Style/色（ロード前の形検証） |
| E_FONT | face未登録/load失敗/競合/timeout |

## 使用例と受け入れケース

以下は段階07完了後の利用形。今は実行できない。
利用側でNoto Sans JP 700を登録済みとする（未登録ならE_FONT）。

```tsx
import {Sequence} from "remotion";
import {
  JizuraScene, JizuraCut, parseLines, center, pop, drift, breathe,
  kasumi, checkerStrip,
} from "remotion-jizura";

const PartA = ({durationInFrames}: {durationInFrames: number}) => {
  const cuts = parseLines(`
新しい/朝が来た
*希望*の朝だ
`, {numCuts: "auto"});
  return <JizuraScene width={1920} height={1080} durationInFrames={durationInFrames}>
    {cuts.map((cut, index) => <JizuraCut key={index} text={cut} seed={index + 1234} />)}
  </JizuraScene>;
};
const PartB = () => <JizuraScene width={1920} height={1080} durationInFrames={60}>
  <JizuraCut text="喜びに胸を開け" hold="breathe"
    decor={[kasumi({seed: 889}), checkerStrip({seed: 721})]} />
</JizuraScene>;
const MyComp = () => <>
  <Sequence durationInFrames={60}><PartA durationInFrames={60} /></Sequence>
  <Sequence from={60} durationInFrames={60}><PartB /></Sequence>
</>;

// 全固定：自動parameterを残さず、未対応groupも無効。フォント・paletteは上記既定。
const Fixed = () => <JizuraScene durationInFrames={60} seed={10}>
  <JizuraCut text="固定" seed={20} enterDurationInFrames={12} exitDurationInFrames={12}
    layout={center({seed: 30, params: {
      sx: 1, track: 0.06, sub: false, under: false, accent: false, ox: 0, oy: 0,
    }})}
    enter={pop({seed: 40})} exit={drift({seed: 50})} hold={breathe({seed: 60})}
    decor={[]} treat={null} bg={null} cam={null} fx={null} trans={null} />
</JizuraScene>;

// 全無効：layoutは必須なので固定し、入退場・hold・decor等を無効化。
const Disabled = () => <JizuraScene durationInFrames={60} background={null}>
  <JizuraCut text="静止" layout={center({params: {
    sx: 1, track: 0.06, sub: false, under: false, accent: false, ox: 0, oy: 0,
  }})} enter={null} exit={null} hold={null} decor={[]}
    treat={null} bg={null} cam={null} fx={null} trans={null} />
</JizuraScene>;

// 部分固定：ID・sxとdecor seedだけ固定。centerの他params、入退場等は補完。
const Partial = () => <JizuraScene durationInFrames={60}>
  <JizuraCut text="部分固定" layout={center({params: {sx: 1}})}
    decor={[kasumi({seed: 889})]} />
</JizuraScene>;
```

| 入力/操作 | 期待結果（後続契約テストの基準） |
| --- | --- |
| Scene60、duration未指定7Cut | duration `[9,9,9,9,8,8,8]`、from `[0,9,18,27,36,44,52]` |
| Scene60、duration `[10,undefined,11,undefined]` | `[10,20,11,19]`、from `[0,10,30,41]` |
| Scene60、全duration `[10,20]` | `[0,10)`・`[10,30)`、frame30..59は基底背景 |
| Scene60、明示宣言順 `(from30,dur10)`、`(from5,dur10)` | seed indexは0・1のまま、描画順は5→30、空白は0..4/15..29/40..59 |
| Scene60、空Cut一覧 | 全60frame基底背景。frame-1/60は透明clear |
| 24fps、D60、既定pop/drift | enter14frame、exit17frame、frame14でpIn=1、frame43でpOut=0、frame59でpOut=16/17、frame60は不在 |
| 24fps、D1、非nullの既定effect | 自動enter/exit=0、l=0で文字静止表示、l=1で消去。decor完成姿の保証なし |
| 24fps、D2、既定pop/drift | 候補3/6、予算1を縮小してenter0/exit1。l=0は文字静止、l=1でpOut=0、endで消去 |
| D1でenterDurationInFrames=1 | D-1=0を超えE_TIMING |
| Scene6へduration未指定7Cut / 明示duration合計61 | E_TIMING |
| fromが1Cutだけ指定 / 明示fromのみ / 重複範囲 | E_TIMING |
| from=60,duration=1をScene60へ | E_TIMING（範囲外） |
| duration=0/1.5/NaN、seed=-1/2**32 | E_NUMBER |
| layout=null、enter="unknown"、enterにkasumi宣言 | E_EFFECT、代替effectへ置換しない |
| decor=[] / decor=null / decor=[null] | 無装飾 / E_EFFECT / E_EFFECT |
| cam=null / cam="push" | 無効 / E_EFFECT |
| center({params:{sx:1,under:false}}) | 1/falseを保持、他paramsを旧順の生成器から補完 |
| Cut seed固定、Scene seed変更/宣言位置変更 | Cutのeffect選択・paramsは同じ |
| decor配列変更、同じCut seed | enter等は同じ。未指定decor seedは配列slotに従う |
| 重複kasumi、seed省略 / 両方seed889 | slot別seed / 同paramsの装飾2回（合成alphaが変わる） |
| *希望*の朝だ、同じ語が他にも出現 | 指定範囲 `[0,2)`だけemphasisColor、時間・seedは不変 |
| 空raw / numCuts=2 / *朝 / ** / 朝//夜 | [] / E_NUM_CUTS / E_TEXT / E_TEXT / E_TEXT |
| Scene.style.palette.fg=赤、Cutでaccent=青 | fgは赤、accentは青、他keyは既定を維持 |
| Scene.fontにsrc、Cut.font={family:"別face"} | Cutはweight700/normal、Scene.srcを継承しない |
| Sequence from60、親frame70 | Scene frame10。開始位置を加算しない |
| motionFps12、24fps、Cut from5、Scene frame5/6/7 | activeは即座に新Cut、評価秒0/0/1/12 |
| 同frameを0→30→10→30、plan/cacheを再生成 | 同環境・同fontの同frameは同じ。前frameのbbox履歴に依存しない |

## 保留の範囲

初期実装を止めるAPI未決事項はない。全effect、数値numCuts、grapheme組版、
フォント役割/多種font抽選、既存Styleセット、Cut重複・transition・音声解析・BPM/LRC、
追加effect登録API、rendererの紙/ノイズ等は将来拡張である。
Remotion/Reactの採用版・workspace・パッケージversion・コマンド・固定フォントファイルと
ライセンス・画像比較の許容差は担当段階02/04/06で記録する。APIの入力意味は再決定しない。
旧plan/baselineを改変せず、抽選差、時間差、フォントadapter、bbox差を個々のeffect比較と分けて検証する。
