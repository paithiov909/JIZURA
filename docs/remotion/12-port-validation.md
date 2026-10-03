# 段階12：共通の移植・検証手順

状態：完了（2026-10-03、共通harness・実装/技術検証。ユーザーのdesign/motion確認は未実施）。前提：[11の結果](11-effect-catalog.md)、09の定義と10の実測。
次段階：[13：最初の移植群](13-first-effect-batch.md)。

## 開始時に読むもの

- [AGENTS.md](../../AGENTS.md)、[root README](../../README.md)、[作業一覧](README.md)、
  [初期計画](PLAN.md)、[拡張計画](EXTENSION-PLAN.md)、本メモ、08〜11の結果。
- [API](API.md)、[初期検証](VALIDATION.md)、[06の比較adapter説明](06-effect-port.md)、
  [package README](../../remotion-jizura/README.md)。
- [effect cases](../../remotion-jizura/tests/effect-cases.js)、
  [effect browser checks](../../remotion-jizura/tests/effect-browser.mjs)、
  [scene browser checks](../../remotion-jizura/tests/scene-browser.mjs)、
  [consumer checks](../../remotion-jizura/tests/consumer-validation.mjs)。

## 目的・成果物

新effectを追加する際の定義・ケース・比較・目視・結果記録を共通化する。
既存7effectと独自例/標準fxで仕組みを実行し、13が使える文書・commandを作る。

## 作業

1. effect定義、metadata、例、parameter検証、ケース、結果記録の追加手順を文書化する。
   09/11の形式を使い、13の候補に必要な拡張箇所を具体的に示す。
2. ケース駆動のharnessを整える。短文/長文、強調/改行、Latin混在、横長/縦長、透明、
   最短Cut/通常Cut、入場/保持/退場、seed/parameter端点を、種類に応じて選べるようにする。
   全組み合わせの総当たりは避け、代表ケースとその理由を記録する。
3. 型/契約、再現性、描画成立、見た目の評価を分離する。
   大きく飛び出す等の意図した表現を、一律のbbox制限や全frame可視条件で失敗にしない。
4. 代表frame、短い動画、設定/環境/計画、比較画像を一括取得する。
   順方向/逆順seek、再mount、cache再生成、少なくとも1つの並列render比較を実行する。
5. 比較を3種類に分ける：旧sourceを使う参考比較、採用した新実装の回帰比較、別条件の目視評価。
   旧一致を必須にしない。差の理由とadapter補正を残し、同じ実装同士の一致だけで正しさを主張しない。
6. inputProps変更ではCompositionを再解決し、parameter変更が実描画へ届く確認を入れる。
   比較対象が空/同じ誤入力でも成功してしまう検証を防ぐ。
7. 実装結果と見た目のレビュー状態を別々に記録するtemplateを作る。
   担当agentの目視、ユーザー確認、採用した回帰基準の条件/理由を区別する。
   source内のケース・必要な小さい参照fixtureと、distの生成証拠を分け、baseline一括更新は設けない。
8. 既存7effectと09/10の独自例を使って手順を実行し、失敗時の再現・診断方法を確認する。

## 完了条件・検証

- ケース追加で代表frame/動画/JSON等を取得でき、追試commandとasset前提がある。
- layout、motion、decor、実動する画像fxそれぞれの検証例がある。10で接続不成立ならその制約を反映する。
- 不正parameterや意図的に変えた描画を検出する確認を行い、harnessが成功だけ返す状態でない。
- 古いmode propsの再利用を検出でき、データ・実画像・目視評価の対応を確認する。
- `npm run check:remotion`、harnessのfocused実browser/Remotion検証、変更した既存検証の回帰。
  build経路変更時はroot/spike checks、ローカルリンク、`git diff --check`。
- command、追加手順、出力形式、固定環境、許容差、未確認条件が文書に残る。

## 範囲外

13の新effect移植、全旧effectのrender、全OS/browser比較、大規模CI設計、レビューの自動承認。
画像生成だけで人間のレビューが完了したと記録しない。

## 結果・引き継ぎ

2026-10-03：現在の`remotion`ブランチで段階12を実施した。開始時はAGENTS.mdに
hostの低concurrency指示の未コミット差分があり、そのまま保持した。08〜11の実装・結果と固定fontを確認。
13の新5件、本体API/exports、依存/lockfile、build設定、参照source・baseline、初期PLAN/VALIDATIONは変更していない。

### 確定した手順・変更ファイル

- [PORTING.md](PORTING.md)に定義→型/parameter→catalog→case→比較→目視→引き継ぎの追加手順、
  command/asset前提/判定/失敗診断を記録。[PORT-REVIEW-TEMPLATE.md](PORT-REVIEW-TEMPLATE.md)に
  実装、技術検証、担当agent目視、ユーザー確認、回帰基準の採否を分けた記録形式を追加した。
- `remotion-jizura/tests/port-cases.ts`：23個の理由付きscalar入力。7単独effect、組み合わせ、
  短/長/Latin/改行・強調/横長/縦長/透明/D1/seed0・uint32上端/params端点/量子化、
  09のcaller3定義と10のnative slice/標準blur/順序/独立画像を選択する。総当たりではない。
- `tests/port-model.tsx` / `port-composition.tsx`：import済みfactoryへの接続とcase別のmetadata。
  Scene終了frameをclampしないComposition時間を採用。画像triggerは同じCutのfrom/end/seedに従う。
  独立画像はgapでも原画像を保持しchainだけを無効化する。
- `tests/port-entry.jsx`：実Playerと同じemitted runtimeの直接Canvas、旧adapter参考比較、
  prepared/計測geometry/frame state/current box/glyph色・index/位置/advance/item中心・track/motionsを採取。
  順/逆seek、cache破棄、StrictMode再mount、font/handle cleanup、input edit/restore、
  背景のみとのanchor差・gap/Scene終了clear・Canvas alpha/transformを確認する。
  mixed/shrink/jitter/bracketsの固有期待式を追加する位置を示し、公開caller型は拡張していない。
- `tests/port-metrics.mjs` / `port-validation.mjs` / `port.test.mjs`：画素/空/古いpropsのgate、
  caseごとのPNG/比較画像/選択動画/入力/環境/計画JSON/レビューJSONの一括出力。
  input.json再読込→selectComposition再実行→解決props照合→edited PNGの有意差/復元を確認し、
  古いCompositionへ新inputPropsだけを渡す実PNGもnegative gateへ通す。
  全runを新規ignored directoryへ保存し、baseline更新commandは設けない。
- 文書：上記2新文書、本メモ、root/package README、docs/remotion/README、EXTENSION-PLAN、13の入口。
  技術証拠とユーザーの採用を分ける。case IDはharness専用で公開Cut IDではない。

### 実行command・結果

すべてrepo rootから。新しいcommandは`node remotion-jizura/tests/port-validation.mjs`。
詳細なoptionと前提は[共通手順](PORTING.md)。重いchecksは重ねず、Chromeは同時に1browserだけ所有した。

| command | 実測結果・範囲 |
| --- | --- |
| `npm run check:remotion` | 最終strict TS/TSX、ESM/d.ts build、59/59 Node契約成功（既存57＋gate/case2）。fontのNode契約はmock/stubで、下記の実fontと区別 |
| `node remotion-jizura/tests/port-validation.mjs --list` | 23caseの種類・選定理由を表示 |
| `node remotion-jizura/tests/port-validation.mjs` | 全23case成功。代表162 PNG（153件raw完全一致、画像9件はraw最大1、全件alpha差0/premultiplied差0）、edited23PNG、旧source参考105frameすべて画素差0。全caseの逆seek/remount/cache/不変plan/edit復元、gap/clearと可視anchor、built-in/caller/native invalid paramsを確認 |
| 同commandの並列/動画 | combined全33frameのconcurrency1/2を順次取得しraw差0。7本の640×360または360×640、24fps、32frame/約1.33秒H264 CRF1/yuv444pをconcurrency1で取得しffprobe/全decode成功。lossyであり全動画frameのPNG照合ではない |
| `node remotion-jizura/tests/port-validation.mjs --case=center,pop,drift,combined,multiline-tall,custom,image-combined --compare-to=/home/paithiov909/Documents/JIZURA/dist/remotion/stage12/run-TIYWRS` | 同環境・同case入力/解決構成を照合し54PNGすべてraw差0。7動画を再取得し、filmstripを動画の正確な代表frame選択へ変更した範囲を確認。sampleFramesをJSONへ保存し空tileを避ける。並列33frameも再確認 |
| `node remotion-jizura/tests/port-validation.mjs --case=center --stills-only --inject=parameter` | 期待したexit1、Invalid numeric parameter。診断run-9hxDJX |
| 同commandの`--inject=empty` | 期待したexit1、Empty/blank anchor。診断run-a1ufx1 |
| 同commandの`--inject=pixels` | 期待したexit1、意図した20×20赤い描画の400pixel差/最大233を検出。expected/actual PNGと指標を保存。診断run-d17pJe |
| 同commandの`--inject=stale-props` | 期待したexit1、古いComposition propsを検出。旧propsの実PNG対edited previewの不一致を先に確認。診断run-885zFF |
| `JIZURA_EFFECT_COMPARE_ONLY=1 node remotion-jizura/tests/effect-browser.mjs` | 既存adapterのfocused回帰、283旧参照frame画素差0、seed差/seed0、量子化、seek/cache/StrictMode/複数Scene/cleanup成功。旧PNG/MP4 export部分は省略 |
| `node --check`（port-validation.mjs / port-metrics.mjs / port.test.mjs） / `python3 /tmp/jizura-stage12-doc-check.py` / `git diff --check` | 構文成功、既存AGENTS差分を含む変更/未追跡16fileの空白、Markdown25本のlocal link411件を確認。欠落・空白エラー0。一時checkerはrepoへ追加しない |

型チェック後の初回sandbox buildは既知のspawnSync tsc EPERM、browser serverはlisten EPERM。
同commandを許可された通常環境で実行した成功結果を採用した。Viteの既存use-client warningは残る。
root/spike buildと外部tarball/Studio checksは今回実行していない。本体/公開export/build経路の変更はなく、
既存のconsumer/Studio証拠へ新しい検証済み範囲を加えたとは主張しない。
Markdown local linksと未追跡を含む空白、mjs構文、git diff --checkも上記の範囲で成功した。

### 環境・取得経路と診断で分かった限界

Node26.10.0、React19.3.0、Remotion/effects4.0.532、HeadlessChrome154/Linux x64、24fps、
preview DPR2、HtmlInCanvas pixelDensity1。Noto Sans JP700/normal、SHA256
`c2f3b4d463500a2ddcd3849cded1fceeb9fd6d1c32e6cbecd568453ba50fc68f`。
sizeは640×360、long-wide800×320、portrait360×640。通常D30、最短D1、from1、seed/paramsはcase.json。

文字は従来のGL既定（gl:null）、画像は必要なsoftware WebGL2 swangleを別browserへ順次適用する。
初期試行のswangle kasumi seed0/frame16で逆seekに360pixel/最大50の差が出て、
PNG経由の観測でも残った。同caseのGL既定条件では解消した。
backend由来が疑われるが完全な原因分離は未実施。swangle文字の再現性を保証しない。
描画元への繰り返しgetImageData後の復元にも1936pixel/最大2の差が出たため、
保存PNGをdecodeしたCPU witnessで画素診断する。heuristicの説明はChromium sourceと切り分けからの推定。
本体変更、一般許容差、旧baseline更新で吸収していない。

Canvas PNG→screenshotの丸めは10の条件を使用し、初期swangle透明custom frame4でも
2pixel/raw最大1・alpha差0/premultiplied差0を実測した。この取得経路だけへ適用する。
最終23caseの文字PNGはすべてraw差0、画像9sampleは上記丸め条件を満たした。
同render同士の過去run/並列比較は透明・画像でもraw差0を要求する。
公開Player/直接Canvasは同じemitted runtimeへ揃え、src/distの別font所有権・独自WeakMapを混ぜない。

### 生成証拠・目視と基準の扱い

全case証拠はignored `dist/remotion/stage12/run-TIYWRS/`、最終7caseの回帰と正確なfilmstripは
`dist/remotion/stage12/run-iSs5X2/`。result.json、case/input/edited-input/browser.json、
prepared/計測/当該framegeometry、preview/export/legacy/edited/stale negative PNG、comparison.png、
MP4/filmstrip、source/環境/font hash、review.jsonを保持する。
このrun-TIYWRSを同環境の**技術的な回帰比較用candidate**として選んだ理由は、
独立gap/clear/有意差gate、旧source105比較、各種再現性を通ったため。
54frame再比較でも一致したが、ユーザーのdesign承認や採用済みsource baselineとは扱わない。
sourceはcase・手順・template、生成証拠はdist。新しい小fixtureの採用と一括baseline更新は行っていない。

担当agentは最終7本の動画からsampleFrames通り採取したfilmstrip、custom/image-combinedの
preview/export/edited比較、portrait・bounds-highの比較PNGを目視した。
逐字pop、保持、driftの破片退出、朝/希望の強調、caller waveとrule、画像の帯ずれ/blur、
gap/透明背景、edit後の配置差/加工無効化を確認した。bounds-highのsx4/track1はfitで小さく扁平になり、
可読性が低い。端点入力の技術成立であって推奨presetではない。強いblurの読みやすさも採用判断へ残す。
連続再生による鑑賞・ユーザーのdesign/motion承認・全case全frame目視は未実施。
review.jsonは目視したartifact/所見を追記し、user=unconfirmed、regression=candidateを保持する。

### 次の着手先

13は[PORTING.md](PORTING.md)と[13の確定表/入口](13-first-effect-batch.md)を使い、
mixed→slideLeft→shrink→jitter→bracketsの5件だけを実装する。
mixedの個別glyph geometry、shrinkのitem中心/track、jitter step、brackets null/current boxの
case固有期待式と旧adapterを追加する。共通harnessの診断値だけで正しさを保証しない。
未確認：別font/OS/GPU、swangle文字、全parameter総当たり、長尺/1080p性能、ユーザー採用。

## 段階09の検証入口（2026-10-03）

公開定義/宣言・prepared/measured構成は[API追補](API.md#段階09の拡張契約2026-10-03)。
`tests/custom.test.mjs` はschema/ID/不正出力と計測stubを区別し、
`node remotion-jizura/tests/custom-browser.mjs` は2実Player・22実PNG、snapshot変更、
局所変更/復元、同IDの関数差し替え、逆seek、再mount、font cleanupを確認する。
`node remotion-jizura/tests/custom-consumer.mjs` は実tarballの外部型/22PNGと旧11PNG。
生成例・環境/hashはignored `dist/remotion/stage09/`、定義は
[examples/custom](../../remotion-jizura/examples/custom/README.md)。これらは09のfocused
harnessで、共通ケース形式や移植baselineではない。12で共通化する。

## 段階10の画像検証入口（2026-10-03）

`node remotion-jizura/tests/image-effects-browser.mjs` はnative slice/標準blur、
HtmlInCanvasのJIZURA接続、独立CanvasImage、alpha/順序/無効化/Cut境界/Sequence/
逆seek/再mountを確認し、45PNG・5秒MP4・1080pを取得する。
`image-effects-studio.mjs` は稼働Studioのnative保存backend→source→reload→別bundle PNG。
`image-effects-consumer.mjs` は実tarball外部型/7native PNGと旧11PNG。

直接Canvas PNG対Chromium screenshotはraw26/45件完全一致、残りRGB最大差1、
全件alpha差0・丸めたpremultiplied RGB差0。取得時のunpremultiply丸め差なので、
同一render同士の外部consumer比較は引き続きraw画素差0を使う。
一般GPU許容差へ広げず、条件/画素差/alpha/premultipliedを別々に残す。
標準blurはsoftware WebGL2 swangle、sliceは2d、HtmlInCanvasはpixelDensity1/単一wrapper。
1080p37msはslice+toDataURLの中央値で、純effect適用や実時間preview fpsの証拠ではない。
出力はdist/remotion/stage10、前提と限界は[10の結果](10-remotion-effects.md)。

## 段階11からの入口（2026-10-03）

[分類と固定5件](EFFECT-CANDIDATES.md)、[catalog API](API.md#段階11のcatalogsearch契約2026-10-03)、
[検索・比較例](../../remotion-jizura/examples/catalog/README.md)を使う。
`node remotion-jizura/scripts/inventory-legacy.mjs`で旧860件のorder/fixture照合と
注釈・case分類を再生成する。reportはdist、sourceはscripts/legacy-catalog-rules.mjs。
`tests/catalog-validation.mjs`がmetadata重複/欠落/default/範囲を検出する。
catalogは型/schemaの説明であり、実行は元factoryの境界で行う。

12では既存7件と09/10例だけで共通harnessを実行し、13の新5件は実装しない。
選定済みmixedは09の全文placementでは表現できず、shrinkはglyph scaleだけでitem中心/trackを再現できない。
13で限定した内部geometry/item変形経路を足す方針を採用したため、12では
glyph/emphasis配置、item中心・spacing、最短Cut/phase端点、jitterのstep再現、
decorのnull/current boxを検出するcase追加箇所を用意する。公開caller schemaを先に広げない。
標準blurのeditor範囲と実行検証、旧共有bagのignored値、native画像target/backendを区別する。
