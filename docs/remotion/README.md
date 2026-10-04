# Remotion向けパッケージの作業入口

## 目的と現在地

2026-10-02に、このブランチの目的を旧JIZURAのv1.x移行から、
Remotion内のcanvasへJIZURAのリリックモーションを直接描画する独立パッケージの開発へ変更した。
移植元の整理は完了した。`remotion-jizura/` に独立パッケージの叩き台を作り、
7effectでRemotionのプレビュー・書き出し・外部利用を検証した。
同日に初期開発の共通計画と7段階の引き継ぎメモを作成した。
同日の段階01で[API契約](API.md)を確定した。段階02で[パッケージ雛形](../../remotion-jizura/README.md)と
Remotion依存を追加し、空SceneのStudio表示・PNG・MP4書き出しを確認した。
段階03でparser・時間配分・seed・宣言/parameter検証・計測前計画と計測サービス境界を実装した。
段階04で実フォント・文字計測と静止Canvas描画を接続し、Studio・PNG・参照pixel比較を確認した。
段階05でCut選択・進行/量子化評価を接続し、境界PNG・Sequence・逆順取得・短い動画を確認した。
段階06で7effectを接続し、参照283frameの画素差0と実PNG/動画・seek/cache再生成を確認した。
段階07でPartA/PartB・Player・外部tarballを検証し、初期7段階を完了した。
[全体の検証記録と制約](VALIDATION.md)・[利用手順](../../remotion-jizura/README.md)を参照。

2026-10-03に次の方針を採用した。AIがRemotionコードを組み、人間がデザイン・モーションを
見て直すフローに向け、表現の拡充・選択・局所調整・再現を優先する。
[拡張計画](EXTENSION-PLAN.md)と08〜14のメモを作成した。2026-10-04に14も実施し、08〜14の実装・技術検証は完了。
14の1080p画素差とユーザーレビュー未確認は別途引き継ぐ。
旧版の完全互換は目標にせず、LRC/audio解析/拍スナップは利用側のツールで扱う。
AE/CEP連携は対象外。大きなrepository構造・導入・配布の決定は後段へ置く。

## 各スレッドの作業入口

[初期計画](PLAN.md)と[API](API.md)は01〜07の仕様・実績を残す。
今後は[拡張計画](EXTENSION-PLAN.md)と担当メモを読み、08→14の順に別スレッドへ引き継ぐ。
前段階の結果が必要なため、同時実装・自動スレッド作成は想定しない。

| 段階 | 作業メモ | 前提 | 状態 |
| --- | --- | --- | --- |
| 08 | [既存7effectの最小レビュー環境](08-review-workbench.md) | 初期01〜07 | 完了（比較9案・保存/復元・実Player/Studio/PNG/動画、ユーザー目視は未確認） |
| 09 | [独自effect・構成確認API](09-custom-effects.md) | 08完了 | 完了（公開独自3例・構成確認・実Player/PNG/外部consumer、ユーザー目視は未確認） |
| 10 | [Remotion標準effects接続の試作](10-remotion-effects.md) | 09完了 | 完了（HtmlInCanvas接続・独自slice・実Player/Studio/PNG/動画/外部consumer、ユーザー目視は未確認） |
| 11 | [選択カタログ・移植候補の整理](11-effect-catalog.md) | 10完了、09のmetadata | 完了（12件検索/実表示・旧860件照合/分類・13の5件確定・外部consumer、ユーザー目視は未確認） |
| 12 | [共通の移植・検証手順](12-port-validation.md) | 11完了、09/10の実測 | 完了（23case/実PNG・7動画・並列/回帰比較・失敗診断、ユーザー目視は未確認） |
| 13 | [最初の小さな移植群](13-first-effect-batch.md) | 12完了、11の対象確定 | 完了（新5件・21case/149PNG・外部consumer・17件catalog、ユーザー目視は未確認） |
| 14 | [AI生成コードからのレビュー体験](14-review-loop.md) | 13完了 | 完了（4Cut/12秒・3修正/保存復元・100PNG一致/実Studio/動画、1080p微差未解決・ユーザー目視未確認） |

初期開発の結果：

| 段階 | 作業メモ | 前提 | 状態 |
| --- | --- | --- | --- |
| 01 | [API仕様の確定](01-api-contract.md) | 共通計画・移植元の整理 | 完了（API文書・結果記録） |
| 02 | [パッケージ雛形とRemotion例](02-package-scaffold.md) | 01完了 | 完了（空Scene・実書き出し） |
| 03 | [parser・時間配分・ScenePlan](03-scene-plan.md) | 02完了 | 完了（Node契約・計測stub） |
| 04 | [フォント準備と静止Canvas描画](04-static-canvas.md) | 03完了 | 完了（実フォント・静止PNG・pixel比較、フォント失敗診断を追補） |
| 05 | [Remotionのframeと描画の接続](05-remotion-frames.md) | 04完了 | 完了（frame評価・境界/Sequence・実書き出し） |
| 06 | [少数effectの移植](06-effect-port.md) | 05完了 | 完了（7effect・参照画素差0・実書き出し） |
| 07 | [利用例・書き出し・外部利用検証](07-scene-validation.md) | 06完了 | 完了（PartA/PartB・Player・120frame・外部tarball） |

新しいスレッドには、段階番号と対応するメモを指定する。開始依頼の例：

```text
remotionブランチの段階08を実施してください。
AGENTS.md、README.md、docs/remotion/README.md、docs/remotion/PLAN.md、
docs/remotion/EXTENSION-PLAN.md、docs/remotion/08-review-workbench.mdを読み、
前提の実装と結果を確認したうえで、指定された範囲だけを進めてください。
完了後は作業メモの結果欄とdocs/remotion/README.mdの状態を更新してください。
```

09以降は番号・メモのパスを置き換え、担当メモに指定した前段階の結果も読む。
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

## 次の作業

初期01〜07と拡張08〜14の実装・技術検証は完了。
[14の結果](14-review-loop.md)と[統合レビュー例](../../remotion-jizura/examples/review-loop/README.md)を次の入口にする。
17件catalogからの選定理由、4Cut/12秒のコード、局所3修正、同じJSONのPlayer/Studio/render往復、
100代表PNGの一致、2動画、遅延font/性能実測を確認した。
ユーザーdesign/motion承認、1080p swangleの文字端微差と画像有効時の性能は未解決/未確認。

次はoriginal/revised動画のユーザーレビューと高解像度の切り分けを優先し、必要なUXと次の小移植群を選ぶ。
decor/rings・dots、enter/slideRの方向統合は精査候補。vcolsは縦組metrics/約物/maskを先に調べる。
候補の採用/実装、次の段階番号、導入/配布方式は今回決定していない。
[PORTING](PORTING.md)、[候補資料](EFFECT-CANDIDATES.md)、[拡張計画](EXTENSION-PLAN.md)から別途scopeを決める。
過去の検証記録と制約はその時点の実績として保持する。

[整理記録](CLEANUP.md)・[ルートREADME](../../README.md)
