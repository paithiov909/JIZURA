# Remotion向けパッケージの作業入口

## 目的と現在地

2026-10-02に、このブランチの目的を旧JIZURAのv1.x移行から、
Remotion内のcanvasへJIZURAのリリックモーションを直接描画する独立パッケージの開発へ変更した。
移植元の整理は完了した。次に `remotion-jizura/` に独立パッケージの叩き台を作り、
少数のエフェクトでRemotionのプレビューと書き出しを検証する。
同日に初期開発の共通計画と7段階の引き継ぎメモを作成した。
現時点でパッケージ実装やRemotion依存は追加していない。

## 各スレッドの作業入口

[共通計画](PLAN.md)が到達点、APIの作業案、時間・seed・描画の契約、検証方針をまとめる。
各段階は別のスレッドで、次の順に実施する。前段階の結果が必要なため、同時実装は想定しない。

| 段階 | 作業メモ | 前提 | 状態 |
| --- | --- | --- | --- |
| 01 | [API仕様の確定](01-api-contract.md) | 共通計画・移植元の整理 | 未着手（開始可能） |
| 02 | [パッケージ雛形とRemotion例](02-package-scaffold.md) | 01完了 | 未着手 |
| 03 | [parser・時間配分・ScenePlan](03-scene-plan.md) | 02完了 | 未着手 |
| 04 | [フォント準備と静止Canvas描画](04-static-canvas.md) | 03完了 | 未着手 |
| 05 | [Remotionのframeと描画の接続](05-remotion-frames.md) | 04完了 | 未着手 |
| 06 | [少数effectの移植](06-effect-port.md) | 05完了 | 未着手 |
| 07 | [利用例・書き出し・外部利用検証](07-scene-validation.md) | 06完了 | 未着手 |

新しいスレッドには、段階番号と対応するメモを指定する。開始依頼の例：

```text
remotionブランチの段階01を実施してください。
AGENTS.md、README.md、docs/remotion/README.md、docs/remotion/PLAN.md、
docs/remotion/01-api-contract.mdを読み、指定された範囲だけを進めてください。
完了後は作業メモの結果欄とdocs/remotion/README.mdの状態を更新してください。
```

段階02以降は番号・メモのパスを置き換え、前段階の結果も読む。
同じ作業ツリーで引き継ぐ場合は現在の差分を確認し、別の作業ツリーでは前提の変更が
取り込まれていることを確認する。メモを読むだけで実装が存在すると判断しない。

## 参照順

1. `engine/index.ts`：エンジンの生成と初期化順。
2. `engine/renderer.ts`：canvasのフレーム描画。`engine/text.ts` の文字計測や
   `engine/planner.ts` の計画処理と合わせて依存関係を確認する。
3. `effects/index.ts` と `effects/types.ts`：グループ、登録順、コールバックの契約。
4. `effects/core/` と `effects/packs/`：移植対象の実装。
5. `tests/baseline/v1/registry.json` とプロジェクト・プラン・PNG：ID、順序、選択結果、描画の比較資料。
6. [エフェクトの追加契約](../EXPRESSION_PACKS.md)と[旧エンジン移行結果](../v1x/04-engine-modules.md)：
   既存の公開境界と動的な内部状態の制約。

## 残す資料の位置づけ

- `engine/`・`effects/` と比較テストを移植元の中心として残す。
- ブラウザUI、i18n、WebMCP、AE/CEP、既存ビルドや検証ツールは、現時点では
  依存関係や元の挙動を調べる資料として残す。将来のパッケージにすべて含めるという意味ではない。
- [旧移行計画](../v1x/README.md)の01–07の結果と、その後の未実施タスクを区別する。
  モックの成功は実機AEの互換性の証明ではない。
- 旧製品の多言語READMEと変更履歴は `docs/legacy/` にまとめる。
- `VERSION` とルートの `package.json` は旧アプリの参照ビルド用。
  新パッケージ名は仮称 `remotion-jizura`、パッケージのバージョンは段階02で決める。

## 最初の作業

[段階01](01-api-contract.md)で公開API、`parseLines`の戻り値、時間指定、無効化、seed、
フォント・Styleの扱いを確定する。共通計画内の作業案を出発点にし、判断と未解決事項を記録する。
各段階の終了時は実際に行った検証を結果欄へ記録する。過去の整理の検証結果とは区別する。

[整理記録](CLEANUP.md)・[ルートREADME](../../README.md)
