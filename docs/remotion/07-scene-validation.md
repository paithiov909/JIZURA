# 段階07：利用例・書き出し・外部利用検証

状態：未着手。前提：[段階06](06-effect-port.md)のeffectと比較記録が作業ツリーにあること。
次段階：初期開発の結果をもとに、拡張対象を別途決める。

## 開始時に読むもの

- [AGENTS.md](../../AGENTS.md)、[ルートREADME](../../README.md)、[作業一覧](README.md)、[共通計画](PLAN.md)。
- 段階01〜06の結果、[確定API](API.md)、パッケージREADMEとexamples。
- 採用Remotion版の静止画・動画書き出し、並列実行、公開依存に関する公式資料。

## 目的と成果物

PartA・PartB相当の例で初期到達点を確認し、利用者が再現できる手順と検証結果を残す。
この段階ではnpm公開、Pages、Release、新しいeffect群の実装を行わない。

## 作業

1. 共通計画のPartA・PartBと、Sequenceで接続した120frameのCompositionを実行可能にする。
   parserの強調情報、時間配分、breathe、独立seedのkasumi・checkerStripを確認する。
2. 自動選択、全固定、部分固定、無効化、明示時間配置を短い利用例で示す。
   API変更があれば共通計画と仕様・利用文書へ反映する。
3. Studioでプレビューし、先頭・Scene/Cut境界・最終frameを静止画として取得する。
   短い動画を書き出し、サイズ・fps・frame数・境界での残留を確認する。
4. 非連続frame取得、再mount、複数Scene、同じseedでの再実行、並列書き出しを比較する。
   seed変更は計画データと代表画像で評価し、すべてのframeの差を必須にはしない。
5. 公開内容を確認し、無視対象の場所へパッケージをローカルpackする。
   リポジトリ外の一時consumerへtarballとpeer dependenciesを導入し、公開entryと型から
   例を描画する。ソースへのworkspaceリンクだけでは外部利用成功としない。
6. パッケージ外の参照import、開発専用export、examples/test/生成レポートの混入がないことを確認する。
   利用手順・対応effect・制約・必要フォント・各検証の再実行コマンドをREADMEへまとめる。
7. 検証で判明した初期範囲内の問題を修正し、必要なチェックを再実行する。
   全体の結果は `docs/remotion/VALIDATION.md`（この段階で作成）へ記録する。

## 完了条件と検証

- PartA・PartB相当の宣言が動き、少ない指定・部分固定・整数frame制御・再現性を確認できる。
- 固定環境で再書き出し・並列書き出しの同じframeが一致する。
  実測差が残る場合は理由と影響を示し、到達点未達の項目を完了扱いにしない。
- 動画のサイズ・fps・frame数をツール等で確認し、プレビューと実書き出しの結果を区別する。
- 一時consumerで公開パッケージをimportし、型検査・実描画が通る。
- 専用型検査・契約テスト・ビルド・描画比較・外部利用チェックを実行する。
  ビルド経路の変更があればルートcheck・spikeチェックも行う。
- ドキュメントのローカルリンクと `git diff --check` を確認する。
- PNG/動画/tarball/consumer/レポートは無視対象へ置き、依存・配布資産をコミットしない。

## 段階01からの確定事項（2026-10-02）

PartAのparse結果は3Cut・各20frame、利用側でNoto Sans JP 700を準備する。
全固定/全無効/部分固定・境界ケースはAPI.mdを基準とする。
旧planner抽選との一致、effect比較、実Remotionの再現性・外部利用を別項目として報告する。

## 段階06からの実装入口（2026-10-03）

7候補がすべて描画に接続済み。`EffectSamples` のmode（fixed/partial/automatic/disabled/
seedDifferent/repeated）、offset、motionFpsを利用できる。PartA/PartB統合は本段階の作業。
`npm run check:remotion` は41件Node契約、`node remotion-jizura/tests/effect-browser.mjs` は
参照283frame・全61並列PNG・MP4/Sequence/seek/cache再生成の回帰入口。
固定font・環境・adapterの差・出力は[06の結果](06-effect-port.md)を参照する。

centerは明示改行を保持して各行へreflowを適用する。自動track/sx/offset/sub/underも描画するため、
完全な静止例ではmotion/decor無効化に加えてcenter.paramsを固定する。
公開sourceから参照ソースをimportしない。font準備・計測geometryはScene所有、glyph cacheは
Canvas所有でcleanup/seed分離済み。Player・外部pack consumer・他環境fontは未検証。

## 結果・引き継ぎ

未実施。日付・状態、最終APIと対応effect、変更ファイル、正確な実行コマンドと結果、
描画・動画・外部consumerの証拠、環境と資源条件、残る制約を記入する。
`VALIDATION.md`へのリンクを作業一覧へ追加し、各段階の状態を実績に合わせて更新する。
次の拡張候補は根拠付きで提案するにとどめ、別の依頼なしに実装しない。
