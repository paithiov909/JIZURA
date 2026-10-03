# 段階14：AI生成コードからのレビュー体験

状態：未着手。前提：[13の結果](13-first-effect-batch.md)。
次の作業：今回の実測をもとに次の移植群・UX改善を別途選ぶ。

## 開始時に読むもの

- [AGENTS.md](../../AGENTS.md)、[root README](../../README.md)、[作業一覧](README.md)、
  [初期計画](PLAN.md)、[拡張計画](EXTENSION-PLAN.md)、本メモ、08〜13の結果。
- [API](API.md)、[package README](../../remotion-jizura/README.md)、
  08の比較例、09の構成確認、10の実動接続、11のcatalog、12の検証手順、13の新effect例。

## 目的・成果物

短いCompositionで、候補選択→コード生成→描画→レビュー指示→局所修正→比較→復元を通す。
AIにも人間にも分かる利用手順と、実際の操作・描画で確認した体験を残す。

## 作業

1. 3〜5Cut・10〜20秒程度の例を作る。歌詞/時間は明示し、音声解析・LRC処理を内蔵しない。
   既存7effect、新effect、利用側でimportする独自effectを使う。10の画像fxは実動した方式で組み合わせる。
2. 「静かな場面から最後のキメへ」等のbriefから、catalogを使って候補を選びコードを作る手順を示す。
   実装agentの生成コードを例にできる。人間が選択した事実やAIの成功率は測っていなければ記録しない。
3. 対象Cut、frame/区間、元設定、変更意図を添えるレビュー形式を用意する。
   感想を「入場を遅く」「装飾を控えめに」「別layoutへ」等の操作へ結び付ける。
4. 3種類以上の固定したレビュー指示を実行し、変更前後を同条件で比較する。
   parameter変更、effect差し替え、画像加工の適用範囲変更を含める。
   10でJIZURA接続が不成立なら画像加工は実動例で独立確認し、その制約を結果へ残す。
5. 09の構成確認情報と保存設定をレビュー成果へ添える。変更対象以外が保たれ、旧設定へ戻せることを確認する。
   実行関数をJSONへ保存しない。独自effectは利用側のimportと入力設定の組で再現する。
6. 08の不便を実測した範囲で改善する。候補表示、比較、seek/loop、設定編集/保存、font preloadを対象とする。
   Studioのコード保存を採用するなら実際の保存・reload・再描画まで確認する。
   専用の大きな編集UIは作らず、動く最小の往復経路を優先する。
7. 新effectでレビューに不足したparameterだけを調整し、意味・既定値・範囲と回帰を記録する。
8. 実行command、変更差分、PNG/動画、設定/構成情報、目視評価、残る課題を一つの手順へまとめる。
   次の群の優先順位を提案するが、公開/導入方式やその実装は決定しない。

## 完了条件・検証

- briefから選択理由・実コード・比較artifactへ辿れ、3つ以上の局所修正を実行できる。
- 固定した別Cutの代表frameが維持され、設定復元後に元のframeを再現できる。
- Studio/Playerで実際に操作し、代表frameと短い動画をrenderして表示との対応を確認する。
- 比較対象の入力/解決propsが確実に更新され、構成情報と実画像が対応する。
- 同一固定環境で640×360の回帰に加え1080p・縦長の代表例を確認し、プレビュー/書き出し時間を記録する。
  font preloadの効果は遅延fontまたは初回Scene境界で実測し、未確認ならその範囲を示す。
- `npm run check:remotion`、12のharnessと変更範囲の実browser checks。公開export変更時は外部consumer。
  build経路変更時はroot/spike checks、ローカルリンク、`git diff --check`。
- 担当agentの目視・操作とユーザーの確認を区別する。利用者の満足を未測定のまま断定しない。

## 範囲外

専用AIサービス、skill/plugin/MCPの導入方式決定、長い曲の制作アプリ、旧UI、AE/CEP、公開/配布。
今回の結果は、次の移植群・必要なUX改善・性能検証の判断材料とする。

## 結果・引き継ぎ

未着手。統合例、レビュー指示と修正範囲、checks、画像/動画、操作・目視・時間、未解決を追記する。
08〜14の到達点、未達/未確認、次の具体候補を拡張計画・作業一覧へ追記し、過去の検証記録を保持する。

## 段階10の実動接続引き継ぎ（2026-10-03）

JIZURAを単一の公開HtmlInCanvas（pixelDensity1）で包む方式が実動した。
歌詞/decorのみはScene.background=null、背景込みは背景付きSceneを包み、
wrapper外の背景/DOMは加工対象外。Cut時間/seed/local frameの画像fx発火は
resolveSceneを使うcaller側sidecarで、Cut.fx指定を新設していない。
HTML-in-Canvas flag、software WebGL2 blurのswangle、nesting拒否の条件を守る。
Studio literal displacementのnative保存backend・再読み込み・別renderは検証済み。
amount等computed値のGUI保存全般やUI Saveボタン確認は未実施。
[実例](../../remotion-jizura/examples/image-effects/README.md)と[10の結果](10-remotion-effects.md)を入口にする。
