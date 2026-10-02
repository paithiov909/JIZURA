# JIZURA — Remotion向けcanvasパッケージの開発

この `remotion` ブランチでは、既存JIZURAのエフェクトを移植し、
[Remotion](https://www.remotion.dev/) 内のcanvasへリリックモーションを直接描画する
独立したパッケージを開発します。移植元の整理は完了し、初期開発の7段階を計画しました。
実装先は `remotion-jizura/`、パッケージ名は仮に `remotion-jizura` とします。
[公開API](docs/remotion/API.md)は段階01で確定しました。段階02以降で実装を進め、
少数のエフェクトを使ってRemotionでの描画・書き出しを検証します。
段階02で[パッケージ雛形](remotion-jizura/README.md)と空Scene例を作成し、Studio表示・
PNG・短いMP4書き出しを確認しました。歌詞・effect描画は後続段階で実装します。

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
