# 段階02：パッケージ雛形とRemotion例

状態：完了（2026-10-02、空SceneのStudio表示・PNG/MP4実書き出し）。前提：[段階01](01-api-contract.md)の仕様と結果が作業ツリーにあること。
次段階：[03：ScenePlan](03-scene-plan.md)。

## 開始時に読むもの

- [AGENTS.md](../../AGENTS.md)、[ルートREADME](../../README.md)、[作業一覧](README.md)、[共通計画](PLAN.md)。
- [段階01](01-api-contract.md)の結果と[確定API](API.md)。
- [ルートpackage.json](../../package.json)、[tsconfig.json](../../tsconfig.json)、
  [.gitignore](../../.gitignore)、[既存BUILD.md](../v1x/BUILD.md)。

## 目的と成果物

`remotion-jizura/`を作り、独立パッケージ用の開発・型検査・ビルドと、
空のSceneを表示するRemotion例を用意する。parser・時間配分・effectは後続段階で実装する。

## 作業

1. 共通計画の配置をもとに最小構成を作る。npm workspaceを第一候補として、
   単一ルートロックファイルで旧参照ビルドと共存させる。
2. React・Remotionの採用バージョンを公式資料で確認し、peer dependencyと開発依存、
   Remotion関連パッケージ間のバージョン整合を記録する。旧 `VERSION` は流用しない。
3. TSXを扱う専用TS設定、公開entry・型・exports、ビルド出力を整える。
   旧TS設定の検査範囲を維持する。生成出力・動画・レポートの無視設定を追加する。
4. Scene・Cutの最小外形と空のCompositionを作る。未実装機能を成功したように振る舞わせず、
   この段階の例は空Sceneに限定する。参照エンジン全体を初期化しない。
5. 新パッケージの型検査、契約テスト、ビルド、Studio起動、静止画・動画書き出しの
   コマンドを選び、実装済みコマンドをパッケージREADMEと結果欄に記録する。
   後続で追加するコマンドは予定として区別する。
6. 公開対象にexamples・tests・参照ソース・依存・生成レポートが入らない設定にする。
   パッケージ外importを必要とする構成を導入しない。

## 完了条件と検証

- クリーンな依存解決から専用型検査・ビルドが通り、Studioで空Sceneを表示できる。
- 空Sceneの静止画を書き出し、Canvas・サイズの最小接続を確認する。
- 公開内容のdry-runを確認する。新しいコマンド、出力先、フォント・ブラウザ等の必要環境が明記される。
- ルートmanifest・lockfile・設定・ビルド経路を変更するため、`npm run check`、
  `npm run spike:build`、`npm run spike:test` を実行する。
- `git diff --check` と追加した文書のローカルリンクを確認する。
- 実際のコマンドを段階03以降へ引き継ぐ。APIの外形を実装したことと、動作を実装したことを区別する。

## 段階01からの確定事項（2026-10-02）

段階01は文書のみ完了。公開値・型はAPI.mdに従う。空Sceneもduration必須。
font未使用ならフォント準備は不要。APIの全動作やfactory実effectを実装済みと扱わない。
新コマンド・採用版の検証は本段階で行う。

## 結果・引き継ぎ

2026-10-02：完了。現在の `remotion` ブランチで実施。段階01の文書11ファイルは
開始時から未コミットで存在した。その内容と移植元・baselineを保持して作業した。

### 決定と実装範囲

- npm workspace `remotion-jizura/` と単一ルート `package-lock.json` を採用。
  新package versionは `0.1.0-alpha.0`。旧 `VERSION` は流用しない。
- npm registryで採用時の公開版を確認：React/React DOMと各型19.3.0、
  Remotion/CLIと推移的なRemotion関連packageは4.0.532。
  React・React DOM・Remotionはexact peer dependencyと開発依存を両方記載。
  対応宣言は実際に検証したこの組み合わせに限定した。
  [React公式版一覧](https://react.dev/versions)、[RemotionのReact 19対応](https://www.remotion.dev/docs/react-19)、
  [Remotion関連版の整合](https://www.remotion.dev/docs/browser-bundler)、
  [useVideoConfig](https://www.remotion.dev/docs/use-video-config)、[CLI](https://www.remotion.dev/docs/cli)を確認。
- 専用strict TS/TSX設定、NodeNextのESM `.js`/`.d.ts` 出力、root exportsを作成。
  root `tsconfig.json` の旧検査範囲は変更なし。CommonJS entryは設けていない。
- `src/types.ts`はAPI.mdの公開型を写したもの。値の公開境界も揃えたが、実動作は
  空Sceneだけ。未実装parser/factory、Cut children、seed/font/Style/motionFps指定は
  `E_INPUT`とpath付きでthrowする。単独Cut・不正childrenは `E_CHILD`。
  これは正式入力仕様の変更ではなく、段階02の一時的な未実装エラー。
- 空Sceneは必須duration、Remotionからの幅/高さ/fps、明示design寸法、背景色/透明、
  範囲外clear、空配列/Fragmentを扱う。Canvas属性にDPRを掛けずCSSで親へ表示。
  フォント・旧engine初期化・非同期資源は不要。空背景更新はlayout effectで同期実行。
  Cutの時間・文字・effectのframe評価と描画待機は03〜06で実装する。
- 例は空Composition `EmptyScene`（640×360、24fps、24frame、背景#16324F）だけ。
  source path aliasに頼らず、build済み公開entryからimportする。
  Studio/still/renderコマンドは先にbuildし、rootラッパーはCLI追加引数を転送する。
  Studio監視中にdist全体を消すと一時的にentryが失われるため、buildは既存entryを
  保ってcompileし、成功後にTSのemit一覧にない古い出力だけを除去する。

### 変更ファイル

- root：`package.json`、`package-lock.json`、`.gitignore`、`README.md`。
- 新規package：`package.json`、`LICENSE`、`README.md`、`tsconfig.json`、
  `tsconfig.build.json`、`scripts/build.mjs`。
- source：`src/index.ts`、`types.ts`、`pending.ts`、`core/error.ts`、`core/empty-scene.ts`、
  `canvas/empty-frame.ts`、`react/JizuraScene.tsx`、`react/JizuraCut.tsx`。
- development：`examples/index.tsx`、`tests/scaffold.test.mjs`、`tests/public-types.tsx`。
- 引き継ぎ：本メモ、作業一覧、共通計画、API文書の実装状態注記、03のコマンド/入口。
  01・04〜07の開始時から存在する文書差分は保持した。

### コマンドと実際の検証

すべてrepo rootから実行。Node26.10.0、npm11.19.1、Chrome154.0.8037.97。
採用依存と全コマンド・出力先は[パッケージREADME](../../remotion-jizura/README.md)にも記載。

| 実行 | 結果 |
| --- | --- |
| `npm ci --cache /tmp/jizura-remotion-npm-cache --fetch-retries=0 --fetch-timeout=15000` | clean install成功、269 package追加、audit脆弱性0。sandbox内ではesbuild実行EPERMのため通常環境で再実行 |
| `npm run check:remotion` | 専用型検査、公開propsのcompile-only正例/不正例、build、5件のNode雛形契約テスト成功。最終再実行はsandboxのspawnSync EPERMを避け通常環境で実施 |
| `npm run typecheck:remotion` | 最終source・example・consumer型検査成功。例の型解決はsrcへmappingして未buildのcloneでも検査可能 |
| `npm pack --workspace remotion-jizura --dry-run --json --cache /tmp/jizura-remotion-npm-cache` | prepack build成功、19ファイル。dist JS/型、README、LICENSE、manifestのみ。examples/tests/source/依存/レポートなし |
| `npm run studio:remotion -- --port=3102 --no-open` | 起動・bundle成功。headless Chromeで `/EmptyScene` の実Studio表示を取得し目視確認 |
| `npm run build:remotion`（Studio起動中） | 再build・Studio再bundle成功。一時entry解決エラーなし、表示を再取得して確認 |
| `node dist/remotion/studio-check.mjs` | 一時検証用（非公開/無視対象）。viewport1280×800、DPR2でもCanvas属性640×360、CSS100%、背景pixel `[22,50,79,255]`、画面エラーなし |
| `npm run still:remotion -- --browser-executable=/usr/bin/google-chrome` | frame0 PNG実書き出し成功。ffmpeg raw RGBA確認で640×360全pixelがopaque #16324F |
| `npm run render:remotion -- --browser-executable=/usr/bin/google-chrome` | H.264 MP4実書き出し成功。ffprobeで640×360、24fps、24frame、1秒、ffmpegで全decode成功 |
| `npm run check` | 旧typecheck/i18n/engine/effects、4種build、syntax/output/effect catalog、日英AE mock成功 |
| `npm run spike:build` / `npm run spike:test` | 成功。Node VM + AE object-model mock。Adobe実機検証ではない |
| package source import境界確認 | 相対importはpackage内、外部はReact/Remotionのみ。公開コードは移植元への参照なし |
| 文書local link / `git diff --check` | Markdown13ファイル138リンク、欠落0。新規18ファイルも別途空白検査成功 |

描画証拠（すべて無視対象）：`dist/remotion/studio.png`、`studio-result.json`、
`still.png`、`empty.mp4`、`output-result.json`。
pack一覧は `/tmp/jizura-stage02-pack.json`、旧検証logは
`/tmp/jizura-stage02-reference-check.log`。生成物・依存はcommit対象外。
Studioは表示記録取得後に停止した。再起動は上記コマンドを使う。

### 制約と次の入口

API契約の変更なし。parser・配分・seed・effect宣言の検証/補完、font準備・計測、
文字・実effect描画、非同期待機、非連続frameや複数Sceneの再現性、外部consumerは未実装/未検証。
透明・寸法overrideの解決はNode契約までで、この段階の実PNG/MP4はopaque既定寸法の空Scene。
Studioはheadless Chromeによる実表示・screenshotで確認し、手操作の全UIやPlayer統合は未検証。
AE/CEP実機、旧Chromiumは実行していない。旧検証成功はRemotion互換性の証明ではない。
公開entryでのworkspace内利用は確認したが、packを外部consumerへinstallする検証は07へ残す。
公開・push・releaseは行っていない。

[段階03](03-scene-plan.md)は `src/pending.ts` のparse/factory stubと
`src/core/empty-scene.ts` の仮エラーを正式なparser・検証・PreparedSceneへ置き換えるところから開始。
`src/types.ts`の公開型を保持し、`src/react/JizuraScene.tsx`に宣言収集を接続する。
`npm run check:remotion` を基準に、雛形の未実装テストを正式契約テストへ更新する。
