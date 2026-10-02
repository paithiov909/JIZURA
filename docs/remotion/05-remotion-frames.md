# 段階05：Remotionのframeと描画の接続

状態：未着手。前提：[段階04](04-static-canvas.md)の実フォント・静止描画が作業ツリーにあること。
次段階：[06：effect移植](06-effect-port.md)。

## 開始時に読むもの

- [AGENTS.md](../../AGENTS.md)、[ルートREADME](../../README.md)、[作業一覧](README.md)、[共通計画](PLAN.md)。
- 段階01〜04の結果、[確定API](API.md)、パッケージREADME。
- [renderer.ts](../../engine/renderer.ts)、[基本layoutのmainDraw](../../effects/core/layouts.ts)。
- 採用Remotion版の `useCurrentFrame`、`useVideoConfig`、Sequence、描画待機の公式資料。

## 目的と成果物

Sceneのローカルframeから有効Cutと進行を計算し、Canvas描画をRemotionへ接続する。
実effect移植に先立ち、時間・frame取得順・描画完了の契約を検証する。

## 作業

1. 整数frameでSceneとCutの範囲を判定し、Cutローカルframeを求める。
   秒への変換、enter・hold・exitの進行、量子化は段階01の仕様に従う。
2. 外側Sequenceのローカル時間をそのまま使う。Sequence開始frameを二重加算しない。
   Sceneの範囲外、明示配置の空白、Cut境界で前frameの文字が残らないようにする。
3. 確定済みplanとframeを渡す描画entryを用意する。
   item変形は毎frameの作業用データへ適用し、planに蓄積しない。
4. frame更新後のCanvas描画が書き出しのframe取得前に完了することを確認する。
   資源準備、描画待機、cleanupとReact再評価を接続し、独自の実時間再生時計を作らない。
5. Cutごとに異なる静止文字を使い、時間による表示切り替えを例で示す。
   動きをテスト用定義で検証する場合は、JIZURA effectの移植結果と区別する。
6. 任意frameの直接取得、順序変更、cache再生成、複数Scene、再mountで再現性を確認する。

## 完了条件と検証

- 先頭、境界直前・直後、最後、1frame Cut、空白区間を実Remotionの静止画で確認する。
- `0 → 30 → 10 → 30`等の非連続・逆順取得で同じframeの結果が一致する。
- 外側Sequenceの開始位置を変えても、同じSceneローカルframeは同じ描画になる。
- 短い書き出しでCanvas更新遅延や前frame残留がない。
- 専用型検査・focusedテスト・ビルド、実Remotion描画、`git diff --check`。
  ビルド経路の変更には共通計画の既存チェックも行う。
- 比較は固定フォント・同一ブラウザで行い、プレビューと書き出しの証拠を分ける。

## 段階01からの確定事項（2026-10-02）

整数frameで先にactiveを決め、motionFps（既定null）はCut内評価秒だけに適用する。
API.mdの入退場進行・hold強度・1frame・D2・Sequence境界のケースを確認する。
Scene範囲外は背景もclearする。plan・item・bboxを前frameから変形蓄積しない。

## 結果・引き継ぎ

未実施。日付・状態、時間・描画完了・cacheの判断、変更ファイル、実行コマンド、
frame順と比較結果、実環境と出力先、未検証事項、effectを接続する入口を記入し、
[作業一覧](README.md)を更新する。
