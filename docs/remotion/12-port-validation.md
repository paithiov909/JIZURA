# 段階12：共通の移植・検証手順

状態：未着手。前提：[11の結果](11-effect-catalog.md)、09の定義と10の実測。
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

未着手。追加手順とsource、確定command、検証実績、目視、基準画像の扱い、制約を追記する。
13へそのまま使えるケース/harnessとレビュー記録templateを渡す。

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
