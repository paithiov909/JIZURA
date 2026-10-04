# JIZURA — Remotion向けcanvasパッケージの開発

この `remotion` ブランチでは、既存JIZURAのエフェクトを移植し、
[Remotion](https://www.remotion.dev/) 内のcanvasへリリックモーションを直接描画する
独立したパッケージを開発します。移植元の整理は完了し、初期開発の7段階を計画しました。
実装先は `remotion-jizura/`、パッケージ名は仮に `remotion-jizura` とします。
[公開API](docs/remotion/API.md)は段階01で確定しました。段階02以降で実装を進め、
少数のエフェクトを使ってRemotionでの描画・書き出しを検証します。
段階02で[パッケージ雛形](remotion-jizura/README.md)と空Scene例を作成し、Studio表示・
PNG・短いMP4書き出しを確認しました。段階03でparser・時間配分・seed・宣言検証と計画を実装しました。
段階04で実フォントの準備・計測と静止歌詞描画を実装し、日本語PNGと参照画像比較を確認しました。
段階05で整数frameのCut切り替え・進行評価を接続し、境界・Sequence・非連続取得と
短い書き出しを検証しました。段階06で7effectを移植し、参照283frameの画素差0と
実RemotionのPNG・動画、非連続seek・cache再生成を確認しました。
段階07でPartA/PartBの120frame例、Player、tarballの外部利用まで検証し、初期7段階を完了しました。
[利用手順](remotion-jizura/README.md)と[検証結果・制約](docs/remotion/VALIDATION.md)を参照してください。

次は、AIが組んだコードを人間が見て直す制作フローに向け、表現の拡充・選択・レビュー体験を整えます。
[拡張計画](docs/remotion/EXTENSION-PLAN.md)に08〜14の7タスクを用意しました。
[08：既存7effectの最小レビュー環境](docs/remotion/08-review-workbench.md)を実装し、
比較9案・局所変更と復元・保存入力からのPNG/短い動画・Studio保存を検証しました。
[09：独自effect・構成確認API](docs/remotion/09-custom-effects.md)では、利用側のlayout/motion/decor定義、
解決済み構成取得、実Player・22 PNG・外部tarball利用を検証しました。
[10：Remotion標準effects接続の試作](docs/remotion/10-remotion-effects.md)では、HtmlInCanvasで
標準blurと独自sliceをJIZURAへ接続し、独立画像・実Player/Studio/PNG/動画・外部tarballを検証しました。
[11：選択カタログ・移植候補の整理](docs/remotion/11-effect-catalog.md)では、12件の検索・実Player一覧、
旧860部品の登録照合・分類と最初の移植5件を確定し、公開検索APIの外部tarball利用を確認しました。
[12：共通の移植・検証手順](docs/remotion/12-port-validation.md)では、理由付き23case、
実PNG/短い動画・並列比較・失敗診断と[追加手順](docs/remotion/PORTING.md)を整備しました。
[13：最初の小さな移植群](docs/remotion/13-first-effect-batch.md)では、mixed/slideLeft/shrink/jitter/bracketsを
明示指定専用で追加し、21case149PNG・動画・外部tarball・17件catalogと既存回帰を検証しました。
[14：AI生成コードからのレビュー体験](docs/remotion/14-review-loop.md)では、4Cut・12秒の統合例、
3局所修正・比較・保存/復元、100PNG一致・実Studio保存・2動画・font/性能実測を確認しました。
08〜14の実装・技術検証は完了。[統合例の手順](remotion-jizura/examples/review-loop/README.md)を入口に、
次は動画のユーザーレビューと1080pの文字端差/画像処理性能を切り分け、次の群・UXを別途選びます。
旧版の完全互換は目標にせず、LRC・音声解析・拍スナップは利用側のワークフローで扱います。
AE/CEP連携は対象外。大きなプロジェクト構造・導入・配布の決定は後段に置きます。

## 移植元の入口

| 場所 | 内容 |
| --- | --- |
| `effects/core/`, `effects/packs/` | 基本エフェクトと既存パックの描画・動作実装 |
| `effects/index.ts`, `effects/registry.ts`, `effects/types.ts` | 明示的な登録順、ID、メタデータ、コールバックの型 |
| `engine/renderer.ts` | canvas描画とフレーム処理 |
| `engine/planner.ts`, `engine/project.ts`, `engine/text.ts`, `engine/util.ts` | 歌詞、プロジェクト、タイミング、固定シードの計画処理 |
| `tests/baseline/v1/`, `tests/engine/`, `tests/effects/` | 元の挙動を比較するJSON・PNG・契約テスト |
| `docs/EXPRESSION_PACKS.md` | 既存エフェクトの構成と追加方法 |

`ui/`・`src/`・`i18n/` は旧ブラウザアプリ、`ae/`・`cep/`・`app/` はAE/CEPの実装資料です。
`build/`・`dev/`・`tools/`・`vendor/` は既存コードを再ビルド・比較検証するために残しています。
`cep/packaging/` は手書きの配布テンプレートです。生成済みの配布物ではありません。

## 作業資料

- [現在の目的と参照マップ](docs/remotion/README.md)
- [初期開発の共通計画](docs/remotion/PLAN.md)・[段階01：API仕様](docs/remotion/01-api-contract.md)
- [表現拡充・レビュー体験の計画と08〜14](docs/remotion/EXTENSION-PLAN.md)
- [今回の整理と検証記録](docs/remotion/CLEANUP.md)
- [このブランチの作業指示](AGENTS.md)
- [以前のv1.x移行計画・タスク結果](docs/v1x/README.md)
- [旧JIZURAの利用ガイド](docs/legacy/README.md)・[変更履歴](docs/legacy/CHANGELOG.md)

以前のブラウザ・AE・CEP製品への移行計画は、このブランチの実装計画としては終了しています。
過去の判断、検証結果、未検証事項は参照資料として保存しています。

## 既存コードの検証

Node 26.10.0（`.node-version`）とPython 3を使います。

```sh
npm ci
npm run test:engine
npm run test:effects
npm run check
```

最後のコマンドは旧JIZURAの4種類のビルドとAEモック検証を含みます。
新しいRemotionパッケージのテストではありません。詳細は[既存ビルド手順](docs/v1x/BUILD.md)を参照してください。
出力は無視対象の `dist/` に置きます。ルートの生成HTML、AE JSX、CEP ZIP、生成メタデータは削除済みです。

[MIT License](LICENSE)。残した外部コードのライセンスは[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)を参照してください。
