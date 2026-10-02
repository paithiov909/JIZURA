# 段階01：API仕様の確定

状態：完了（2026-10-02、文書のみ）。前提：移植元の整理が完了していること。
成果物：[確定API](API.md)。
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

2026-10-02：完了。現在のremotionブランチで実施。開始時の作業ツリーはclean。
パッケージ作成・依存追加・ソース変更・後段階の実装は行っていない。

### 決定と調査根拠

- 公開型、7factory、既定値・許可入力・code/path付きエラー、未対応groupのnull限定をAPI.mdに定義。
- 既存plannerのparseLyricsはLRC等を扱い、chunkTextはIntl/fallbackで結果が変わる。
  初期parseLinesはscript分類fallbackを固定し、autoのみ対応。強調を語の集合から
  code point出現範囲へ置き換え、日本語2行の正確な3Cut例を記録した。
- plannerの通常入退場秒式を整数化し、D-1予算で静止1frameを確保する。
  rendererは量子化秒でCutを選択するため、新版は整数境界で先にCutを選ぶ。
  motionFps既定null、指定時はCut内時刻のみ量子化。旧版との差を明示した。
- utilのhash/FNV-1a/mulberry32を保持し、Scene既定20260922、宣言indexとgroup/slotでseed分離。
  明示paramsは完全な自動候補の生成後に上書きし、false/0を維持する。
  旧単一stream/history抽選との一致は要求しない。
- centerのfontをFontSpecへ分離して既定faceを固定し、明示trackの優先順位を記録した。
  FontSpecは全置換、paletteはkey別merge、強調はglyph色だけを変更する。
- 旧fontsサービスはロード失敗を隠して継続し、初期化時にDOMへ触れる。
  新版はface準備を計測前の資源境界へ分離し、失敗をE_FONTとして扱う。
- kasumi/backとcheckerStrip/frontのID・layer、decorParamsの共有schemaを調査。
  getBBは前frameのWeakMapを読むため、現在frame boxまたはplan静止boxへ変更する契約を採用。
  この差を段階06の比較項目に追加した。移植元コード・baselineは保存した。
- exit driftはglyph分解とshatterを使う。fontsの採取順counterとtext/fontsのseedを
  keyに含めないfragments cacheは再現性を妨げるため、componentの安定hash、
  seed別cache、0seed保持を契約に追加した。数式とcache/識別子変更の比較を分離する。
- Remotion公式Sequence/useCurrentFrame/useVideoConfig/delayRenderを2026-10-02に確認。
  ローカルframe・設定取得・render待機とpreview準備の違いを仕様へ反映。
  採用バージョンの再確認と実環境検証は段階02以降で行う。

### 変更ファイル

- 新規：docs/remotion/API.md。
- 更新：ルートREADME.md、docs/remotion/PLAN.md、docs/remotion/README.md、本メモ。
- 参照リンクと確定事項を同期：docs/remotion/02-package-scaffold.md、03-scene-plan.md、
  04-static-canvas.md、05-remotion-frames.md、06-effect-port.md、07-scene-validation.md。

### 実際の確認

- `python3 /tmp/jizura-stage01-doc-check.py`：変更Markdown11ファイルのfence外の
  ローカルリンク132件を相対パスで解決し、欠落0（exit 0）。一時チェッカーはrepo外に保存。
- `git diff --check`：exit 0、空白エラーなし。新規API.mdは未追跡のため、同ファイルを
  `git diff --no-index --check /dev/null docs/remotion/API.md`でも検査した。
  後者はexit 1（新規ファイルの差分あり）、診断出力0件で空白エラーなし。
- `git status --short --branch`：remotionのまま。変更は上記文書11ファイルのみ。

実装・型検査・契約テスト・画像/動画比較・Remotion/Adobe実行は本段階では実施していない。
参照コードの読解と公式資料の確認は、将来パッケージの互換性証拠ではない。

### 制約と次の入口

初期実装を止めるAPI未決事項はなし。数値numCuts・全effect・grapheme組版・旧Style等は初期範囲外。
fontロード・文字計測・短いCutのdecor・bbox差・pixel比較は未実装/未検証。
[段階02](02-package-scaffold.md)はAPI.mdの公開境界と空Scene契約から着手し、
workspace・採用バージョン・パッケージversion・検証コマンドを決める。
段階03以降の前提実装はまだ存在しない。
