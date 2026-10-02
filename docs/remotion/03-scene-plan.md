# 段階03：parser・時間配分・ScenePlan

状態：完了（2026-10-02、Node契約・計測stubまで）。前提：[段階02](02-package-scaffold.md)の実装・コマンドが作業ツリーにあること。
次段階：[04：静止Canvas描画](04-static-canvas.md)。

## 開始時に読むもの

- [AGENTS.md](../../AGENTS.md)、[ルートREADME](../../README.md)、[作業一覧](README.md)、[共通計画](PLAN.md)。
- [段階01](01-api-contract.md)・段階02の結果、[確定API](API.md)、パッケージREADME。
- [planner.ts](../../engine/planner.ts)、[util.ts](../../engine/util.ts)、
  [types.ts](../../engine/types.ts)、[effectの型](../../effects/types.ts)。

## 目的と成果物

Reactから独立したparser、整数frameによる配置、seed導出、effect宣言の検証と計画を実装する。
実effectとフォント依存の配置は後続段階で接続する。

## 作業

1. API仕様どおりの `parseLines` を実装する。手動境界、強調、元行位置を保ち、
   自動分割が時間やseedに依存しないようにする。
2. 順次配置・明示配置、端数配分、無効なframe値・重複・範囲外・不足時間の検証を実装する。
3. Scene・Cut・effectのseed優先順位とグループ別乱数を実装する。
   参照乱数のアルゴリズムと新しい乱数配分の違いを記録する。
4. 宣言の検証とplan解決の境界を作る。未対応ID・別グループのfactory・不正parameterを検出する。
   実effectがない部分のテストは明示したテスト用定義を使い、移植済みと報告しない。
5. フォント計測サービスを受け取れる境界を用意し、計測前の計画データと計測後の確定を分ける。
   ScenePlanには時刻・解決済みeffect・parameter等を保持し、描画による書き換えを防ぐ。
6. Sceneの宣言収集に接続する。直下Cut・配列・Fragmentの順序と空の子を仕様どおり扱い、
   非対応の子を検出する。任意の関数コンポーネントを直接呼び出して展開しない。

## 完了条件と検証

- 段階01の入力例・境界ケースについて実装結果が一致する。
- 明示effect・parameter・seedが保持され、未指定値だけが補完される。
- 同じ入力から同じ計画を得られ、decor固定が別グループの乱数に影響しない。
- 計画処理を再実行しても結果が変わらず、別Sceneの状態が漏れない。
- 型検査・focused契約テスト・ビルドを、段階02で記録したコマンドで実行する。
- `git diff --check`。ルートのビルド経路を変更した場合は共通計画の既存チェックも実行する。
- この段階の計測stubやテスト用effectの成功は、実フォント・実effect・描画の証拠として扱わない。

## 段階01からの確定事項（2026-10-02）

parseLinesはscript分類fallback固定でIntlを使わず、数値numCutsを拒否する。
API.mdの正確な3Cut例・code point範囲・escape・上限を契約テストにする。
時間はD-1の入退場予算、非時系列宣言の元index保持、group別seedとparameter補完順まで
仕様どおり実装する。ID候補をテストする定義と実effectを区別する。

## 段階02からの実装入口（2026-10-02）

`remotion-jizura/`がnpm workspaceとして存在し、専用TSX設定とESM公開entryがある。
ルートで `npm run typecheck:remotion`、`npm run test:remotion`、`npm run build:remotion`、
`npm run check:remotion` を使う。Studio/still/renderはパッケージREADME参照。
`src/types.ts`がAPIの公開型、`src/pending.ts`がparser/factoryの未実装エラー。
`src/core/empty-scene.ts`は空Scene検証だけで、seed/font/Style/motionFpsとCutは未解決。
本段階でこれらの仮エラーを正式な検証・計画へ置き換え、`src/react/JizuraScene.tsx`に
宣言収集を接続する。Cutの実描画を成功扱いせず、フォント・描画の接続は04以降へ渡す。
雛形テストの「未実装」期待値は、対応部分の実装時に正式な契約ケースへ更新する。

## 結果・引き継ぎ

2026-10-02：完了。現在の `remotion` ブランチで実施。開始時の作業ツリーはcleanで、
段階01・02の実装と結果が存在した。公開型・依存・root lockfile・参照ソース・baselineは変更なし。

### 実装と判断

- [text.ts](../../remotion-jizura/src/core/text.ts)が公開 `parseLines` とCut本文検証を担当。
  CR/LF・空白・escape・手動境界・code point強調範囲・source・入力上限を実装。
  構造化本文は再parseせず、範囲をコピー・sortし、重複を拒否、隣接を統合する。
- [scripts.ts](../../remotion-jizura/src/core/scripts.ts)がutilの文字分類とplannerのscript fallback、
  chunkText、必要なsplitLines分岐を移植。Intlを呼ばず、tokenごとの強調を分割/結合へ追従。
  長いLatin単語は保持しdash後だけ分割。自動chunk内には内部空白がなく、Latinの
  splitWords分岐はここでは不要。静止組版での改行処理は04で追加する。
- [timing.ts](../../remotion-jizura/src/core/timing.ts)が順次/明示配置、先頭からの端数配分、
  safe integer加算、混在・重複・範囲外・不足時間を検証。明示配置のsort後も宣言indexを保存。
  入退場は旧秒式を丸め、明示値を確保してD-1予算で自動値を比例縮小する。
- [random.ts](../../remotion-jizura/src/core/random.ts)は旧numeric hash・UTF-16 FNV-1a・
  mulberry32の数値演算を保持。API version 1のCut/group/slot/params/item seed導出を実装。
  旧plannerの単一stream・history抽選との差はAPI.mdどおり。frame時刻で乱数を消費しない。
- [declarations.ts](../../remotion-jizura/src/effects/declarations.ts)が7factoryの入力コピー・検証、
  候補順・等確率選択・seed導出・parameter補完を担当。centerのfont用chance/pickと
  decorの旧seed用intを消費し、完全bag生成後に明示paramsを上書き。0/false/seed0を保持。
  **宣言/parameter計画用catalogであり、実effectのruntime registryではない。**
  render/apply/drawコールバックは存在せず、7effectが移植済みという意味ではない。
- [style.ts](../../remotion-jizura/src/core/style.ts)はFontSpec全置換、palette key別merge、
  色正規化、Style入力検証を実装。centerのtrackはparams→Style→autoの順で解決し、
  `trackSource`と`explicitParams`をplanへ残す。Scene基底背景はScene.palette.bgを使う。
- [scene-plan.ts](../../remotion-jizura/src/core/scene-plan.ts)の `prepareScene` はReact非依存。
  `PreparedScene/PreparedCut`へ本文・時刻・font/Style・effect/seed/paramsを確定し、
  callerのデータを凍結せず、新しいplanを再帰的にfreezeする。Scene本文の入力合計も
  100000 code pointsまで（文字列は構文を含む入力、ParsedChunkは本文）として検証する。
  入力エラーはScene→children→宣言順Cut→時間集合、Cut内はAPIの指定順で報告する。
- [collect-cuts.ts](../../remotion-jizura/src/react/collect-cuts.ts)が直下Cut・配列・Fragmentを
  深さ優先で収集。空の子を無視し、DOM/Sequence/portal/任意コンポーネントを拒否。
  任意コンポーネントを呼ばない。React 19の非列挙key getterを読まず、keyを計画から除外する。
  `JizuraScene`は `prepareSceneFromProps` 経由で接続済み。

### 計測後の入口

`finalizeScene(prepared, service)` は `MeasurementService<T>` の `prepareFonts(scene)` を
awaitした後、時間順の `measureCut(cut, scene)` をawaitする。`ScenePlan<T>`は
`prepared` と各Cutの `prepared/geometry` を保持する。geometryはglyph/item/boxを
含められる有限数・文字列・boolean・null・配列・plain objectだけのデータ。
循環参照・DOM等を拒否し、サービスのcacheを変更/凍結せずコピーして再帰的にfreezeする。
公開root entryにplan・PRNG・計測サービスはexportしない。

04はこのサービスを実フォント準備/計測へ接続し、geometryの具体型と静止描画を実装する。
現時点で空Sceneは背景描画を維持。非空Sceneは入力と計画を解決後、
`E_INPUT/path=canvas` で未実装の描画境界を明示する。文字を黙って省略した成功にはしない。
04でこの仮エラーを静止描画へ置き換える。frame評価・コマ打ちの計算/描画接続は05へ残す。

### 変更ファイル

- 新規core：`validation.ts`、`random.ts`、`scripts.ts`、`text.ts`、`style.ts`、`timing.ts`、`scene-plan.ts`。
- 新規：`src/effects/declarations.ts`、`src/react/collect-cuts.ts`。
- 更新：公開entry、JizuraScene/Cut、error。不要になった `pending.ts` と `core/empty-scene.ts` を削除。
- テスト：`text.test.mjs`、`scene-plan.test.mjs`、`planning-types.tsx` を追加。
  scaffoldテストとpublic-typesを実装済み契約へ更新。
- 文書：本メモ、作業一覧、共通計画、APIの実装状態、04の入口、ルート/パッケージREADME。

### 実際の確認

| コマンド/確認 | 結果・証拠の範囲 |
| --- | --- |
| `npm run typecheck:remotion` | strict TS/TSX成功。公開型と内部計測後geometryのreadonly型を確認 |
| `npm run test:remotion` | buildとNode契約を実行。最終成功は下記check内の25件 |
| `npm run check:remotion` | 型検査・ESM/declaration build・Node契約 **25件すべて成功** |
| テスト内の参照比較 | retained utilのhash/UTF-16/PRNG、center.planのparameter生成順、script fallbackの13本文ケースと一致。描画callbackは実行しない |
| React Scene接続 | 最小Remotion context fixtureのSSRで空canvasと非空Sceneの未描画エラーを確認。Studio/Player/ブラウザ表示の証拠ではない |
| 計測後plan | 明示した計測stubで準備→計測の順、準備失敗時の計測禁止、深いcopy/freeze、再生成・別Sceneとの分離を確認 |
| `python3 /tmp/jizura-stage03-check.py` / `git diff --check` | Markdown7ファイル88ローカルリンクの欠落0、公開ソース38importの相対参照はpackage内のみ、tracked差分と新規12ファイルの空白エラー0 |

通常sandboxでの最初のbuildは `spawnSync tsc EPERM` で失敗したため、許可された
sandbox外実行で同じnpmコマンドを検証した。buildスクリプト自体は変更していない。
rootのビルド経路は変更していないため `npm run check` とspikeチェックは今回再実行していない。
生成ESM/declarationは無視対象の `remotion-jizura/dist/` のみ。

### 制約と次の入口

実フォント準備・計測・glyph/box・静止歌詞描画・effect描画・frame評価・非連続seek・
Studio/Player表示・PNG/MP4書き出しは今回の検証対象外。計測stubや旧parameter比較は
それらの描画互換性の証拠ではない。Adobe/CEP実機の検証も行っていない。
公開API契約の変更なし。ScenePlanのgeometryを具体化する入口は `MeasurementService<T>`。
[段階04](04-static-canvas.md)で実サービス、フォント待機、静止描画を接続する。
依存追加・publish・release・pushは行っていない。
