# 段階01：API仕様の確定

状態：未着手。前提：移植元の整理が完了していること。
次段階：[02：パッケージ雛形](02-package-scaffold.md)。

## 開始時に読むもの

- [AGENTS.md](../../AGENTS.md)、[ルートREADME](../../README.md)、[作業一覧](README.md)、[共通計画](PLAN.md)。
- [engine/index.ts](../../engine/index.ts)、[planner.ts](../../engine/planner.ts)、
  [renderer.ts](../../engine/renderer.ts)、[text.ts](../../engine/text.ts)、[util.ts](../../engine/util.ts)。
- [effectの型](../../effects/types.ts)、[基本layout](../../effects/core/layouts.ts)、
  [基本animation](../../effects/core/animation.ts)、[フォントサービス](../../ui/services/fonts.js)。

## 目的と成果物

共通計画の作業案を、実装者が判断を引き継げるAPI契約へまとめる。
成果物は `docs/remotion/API.md`（この段階で新規作成）と本メモの判断記録。
型の例は文書内へ記載する。この段階ではパッケージ、依存、実装用ソースを作らない。

## 作業

1. Scene・Cut・parser・effect factoryの公開型、既定値、許可入力、エラーを定義する。
   Scene seedの固定値、Cut seedの位置による導出、effect別seedの優先順位も確定する。
2. 文字列と構造化chunkの型を決める。`/`、`*…*`、空行、改行、空白、
   エスケープ、不正な強調、Unicode、空入力、`numCuts`の意味を整理する。
   スケッチの日本語2行について、正確な返却データ例を示す。
3. 順次配置と明示配置を定義し、混在・重複・範囲外・不足frameを検証する規則を決める。
   全duration指定時の余り、空Scene、非時系列宣言、無効な数値の扱いも明示する。
4. enter・hold・exitの既定時間と進行、短いCut（1frameを含む）の動作を決める。
   既存量子化の扱いを調べ、frame境界判定とeffect評価時刻を区別する。
5. 未指定・無効化・明示ID・明示parameter・未対応グループを区別する。
   グループごとの型、decor配列の順序と重複、明示seed、未指定値の補完を定義する。
6. フォント指定、Styleの最小構造、上書きのマージ規則、強調の描画規則、
   基底背景と背景effect、描画サイズとCSS表示サイズを定義する。
7. ScenePlanの責務を整理する。フォント計測前に決められる事項と計測後の確定を分け、
   childrenの収集範囲、Canvas生成境界、計画とframe評価の非公開型案を示す。
8. PartA・PartBの使用例、全固定・全無効・部分固定の例と境界ケースの期待結果を記載する。
   判断が共通計画を変える場合は、共通計画と後続メモを同期する。

## 完了条件と確認

- 実装者がAPI名やseed・時間規則を再考せず着手できる。
- 少なくとも60frameの均等配分、明示durationと自動配分の混在、明示配置の空白、
  1frame Cut、不足frame、不正effect、decor無効化、強調chunkの期待結果がある。
- 移植済みとみなせない仕様・将来対応事項を明示する。初期実装を止める未決定事項を残さない。
- 文書のローカルリンクと `git diff --check` を確認する。実装・描画テストは実行対象ではない。
- 完了後、作業一覧にAPI文書へのリンクを追加し、段階02以降の開始時参照を実ファイルへ更新する。

## 結果・引き継ぎ

未実施。完了時に日付・状態、APIの決定と理由、変更ファイル、実際の確認結果、
残る制約、次段階の参照先を記入し、[作業一覧](README.md)の状態も更新する。
