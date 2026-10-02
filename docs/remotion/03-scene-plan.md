# 段階03：parser・時間配分・ScenePlan

状態：未着手。前提：[段階02](02-package-scaffold.md)の実装・コマンドが作業ツリーにあること。
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

未実施。日付・状態、データ型・乱数・検証規則の判断、変更ファイル、実行チェック、
テスト用定義と実装の区別、計測を接続する入口、未検証事項を記入し、[作業一覧](README.md)を更新する。
