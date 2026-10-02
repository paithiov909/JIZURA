# 段階02：パッケージ雛形とRemotion例

状態：未着手。前提：[段階01](01-api-contract.md)の仕様と結果が作業ツリーにあること。
次段階：[03：ScenePlan](03-scene-plan.md)。

## 開始時に読むもの

- [AGENTS.md](../../AGENTS.md)、[ルートREADME](../../README.md)、[作業一覧](README.md)、[共通計画](PLAN.md)。
- 段階01の結果と、その段階で作成する `docs/remotion/API.md`。
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

## 結果・引き継ぎ

未実施。日付・状態、採用バージョン・workspace判断・パッケージ初期バージョン、
変更ファイル、実行コマンドと結果、実際に表示・取得した静止画、未検証事項、
次段階の入口を記入し、[作業一覧](README.md)の状態も更新する。
