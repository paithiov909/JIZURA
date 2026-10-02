# 段階07：利用例・書き出し・外部利用検証

状態：完了（2026-10-03、PartA/PartB・Player・実書き出し・外部consumer）。前提：[段階06](06-effect-port.md)のeffectと比較記録が作業ツリーにあること。
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

2026-10-03：完了。現在の `remotion` ブランチで実施。開始時は作業ツリーがクリーンで、
01〜06のコード・結果が存在した。公開props・exports・候補7effect・seed/時間/parameter契約を変更していない。
全体の固定条件・実測・制約は[VALIDATION.md](VALIDATION.md)にまとめた。

### 追加・修正内容

- `examples/lyrics.tsx` のPartA/PartBと120frameのLyricsDemoをStudio/Playerで共用。
  PartAは手動分割＋強調付き3Cut/各20frame、PartBはbreathe・seed889/721の背面/前面decor。
  Scene seed20260922、PartA cutSeed1234を既定とし、fontSrc/seed/cutSeedを入力で変更できる。
- `examples/player/` と `player:remotion` を追加。Player4.0.532をdev依存として明示し、root lockfileを維持。
  noEmitの例で `.tsx` importを許可し、公開buildは従来の `.js` importを維持。
- 1秒遅延fontの実Playerで準備前に再生が進む不具合を再現し、
  `src/react/JizuraScene.tsx` にPlayerのbuffer待機を接続した。
  描画後、失敗、StrictMode cleanup、再mountで待機を一度だけ解放する。
  export待機は既存経路を保持し、実PNG/動画回帰を確認した。
- 少ない指定・全group/seed固定・部分parameter固定・無効化・明示時間配置、font準備、
  対応effectと制約、再実行・pack/consumer手順をpackage READMEへ追加。
- `tests/scene-entry.jsx` / `scene-browser.mjs`、`studio-validation.mjs`、
  `consumer-validation.mjs` を追加。後者はtarball、root公開entry/型、11frameの実外部描画を検証する。
- `tests/effect-browser.mjs` のmode別PNG取得を修正。inputProps変更時に
  selectCompositionも再実行し、古いfixedの解決済みpropsを再利用しない。
  automatic/partial/disabled/seedDifferent/repeatedの5PNGがfixedと異なることを追加検証した。
  06当時の283参照frame・固定例の比較証拠は有効で、当時のmode名付きPNGはmode反映の証拠としない。
- 文書：本メモ、VALIDATION、作業一覧、PLAN、API実装注記、ルート/パッケージREADME、
  06への検証訂正注記。過去の段階結果とbaseline/参照実装は保持。

### 実行コマンドと結果

| コマンド | 結果 |
| --- | --- |
| `npm run check:remotion` | strict型検査、ESM/型build、41件Node契約成功。Node fontはmock |
| `node remotion-jizura/tests/scene-browser.mjs` | 実Playerのseek/再mount/複数Scene/seed変更・復元/遅延font/再生/失敗cleanup成功。全120frame×concurrency1/2の240PNGと独立直描画が全画素一致 |
| 同Remotion still/動画 | Cut/Scene境界・最終frame・110→3→110を比較。H.264/CRF1/yuv444p、640×360/24fps/120frame/5秒、全decode・frame識別成功。最大channel差127、frame平均差最大0.892535。PNG一致と圧縮差を区別 |
| `npm run studio:remotion -- --port=3107 --no-open --public-dir=../dist/remotion/stage04/assets` / `node remotion-jizura/tests/studio-validation.mjs` | 実Studioの13frame・繰り返しseekが直描画/PNGと画素差0、ready=true・handle0。実画面を取得・目視 |
| `npm run player:remotion -- --host=127.0.0.1 --port=3108 --strictPort` / `node /tmp/jizura-stage07-player-page.mjs` | 通常React Player例を実配信・ready・寸法・font・初回画面を確認。frame80のharness画面も目視 |
| `npm exec --workspace remotion-jizura -- vite build --config examples/player/vite.config.mjs` | Player production bundle成功、生成物は無視対象 |
| `node remotion-jizura/tests/consumer-validation.mjs` | 実tarball57ファイル・105import確認。repo外consumerの公開entry/strict型検査・境界11PNGが全画素一致。workspaceリンクなし |
| `node remotion-jizura/tests/effect-browser.mjs` | 283参照frame画素差0、修正後の5mode PNG・固定例61並列PNG/短い動画・cache/seek回帰成功 |
| `node remotion-jizura/tests/canvas-browser.mjs` / `node remotion-jizura/tests/frame-browser.mjs` | 04の4subset画素差0、font/cleanupと05の整数境界/Sequence/seek/50PNG/動画回帰成功 |
| `npm run check` / `npm run spike:build` / `npm run spike:test` | 旧4種build・syntax/catalog・日英AE mockとspike成功。Adobe実機ではない |
| `node --check`（scene-browser/consumer-validation/studio-validation/effect-browser） / `python3 /tmp/jizura-stage07-doc-check.py` / `git diff --check` | mjs構文成功、Markdown14ファイル183ローカルリンク欠落0、追跡/未追跡ファイルの空白エラー0 |

専用checkはsandboxのspawnSync tsc EPERMを避け通常実行環境で成功した。
比較font/Chrome/依存と生成証拠、外部consumer pathは[検証記録](VALIDATION.md)を参照。
Studio/Playerサーバーは確認後停止した。生成資産とdependenciesはcommit対象外。

### 制約と次の入口

検証は同一Chrome154・固定Noto Sans JP・640×360/24fpsとexact peer版の範囲。
他OS/browser/font/version、長時間/高解像度性能、手操作全UI、Adobe互換性は未検証。
Playerは初回font/plan準備でpauseする。Studioは現在のexample登録形式ではdefault propsの
ソース保存を利用できず、CLI/Player入力またはソース編集を使う。
全effect・audio/BPM/LRC・overlap/transition・npm公開・Pages/Releaseは実施していない。

次は[VALIDATION.md](VALIDATION.md)の制約を起点に、追加環境比較・callerのfont preload例・
次のeffect群のどれを優先するか別途決める。追加実装は別依頼を待つ。
