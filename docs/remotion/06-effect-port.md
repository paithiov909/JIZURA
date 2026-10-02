# 段階06：少数effectの移植

状態：未着手。前提：[段階05](05-remotion-frames.md)のframe描画が作業ツリーにあること。
次段階：[07：利用・書き出し検証](07-scene-validation.md)。

## 開始時に読むもの

- [AGENTS.md](../../AGENTS.md)、[ルートREADME](../../README.md)、[作業一覧](README.md)、[共通計画](PLAN.md)。
- 段階01〜05の結果、`docs/remotion/API.md`、パッケージREADME。
- [基本layout](../../effects/core/layouts.ts)、[基本animation](../../effects/core/animation.ts)、
  [decor](../../effects/packs/decor.ts)、[decorB](../../effects/packs/decorB.ts)、
  [planner](../../engine/planner.ts)、[effectの型](../../effects/types.ts)。
- [effect追加契約](../EXPRESSION_PACKS.md)、[registry baseline](../../tests/baseline/v1/registry.json)。

## 目的と成果物

center、pop、wipe、drift（exit）、breathe、kasumi、checkerStripを第一候補として移植する。
指定を尊重し、未指定部分だけを再現可能に補う体験を実際のeffectで成立させる。

## 作業

1. 各候補の依存を調べ、必要な共通ヘルパー・描画順・parameter生成を特定する。
   移植元の場所と移植先、ID、seed・時刻・Styleへの依存を対応表にする。
2. 基礎動作（即時表示、静止、装飾なし）とcenterから接続する。
   候補effectの数式、文字別の変形、clip、前面・背面layerを移植する。
3. `decorParams`等の生成処理を分離し、parameterはplan時に確定する。
   kasumi・checkerStrip factoryは設定宣言だけを返し、乱数・DOM・描画を呼ばない。
4. 明示ID・parameter・seedを維持し、未指定部分だけ補完する。
   対応済みeffectだけを自動選択対象に登録し、必要な重み・適合条件を明記する。
5. 単一decor、複数decor、前面・背面の順序、同じIDの複数指定を仕様どおりに扱う。
   全固定・部分固定・無効化・seed違いの例を作る。
6. 旧実装へ同じ解決済みparameter・フォント・時刻を渡せる比較経路を作る。
   旧plannerの抽選結果との一致は別項目にし、移植effectの比較を混同しない。
7. 各effectの単独比較を行った後、組み合わせたframeを比較する。
   候補変更が必要なら理由を記録し、共通計画・使用例・後続メモを同期する。

## 完了条件と検証

- 各候補の移植・比較状態と依存が明記され、未移植effectが抽選されない。
- effect単独と組み合わせを、入場中・hold中・退出中・Cut境界の複数frameで比較する。
- 固定した指定が再計画で維持され、decorの変更が無関係なenter選択に影響しない。
- 任意frame取得・再mount・複数Sceneで実effectの結果が再現する。
- 専用型検査・契約テスト・ビルド、実ブラウザ/Remotion比較、`git diff --check`。
- 参照ソースを変更せず、既存baselineを再生成・上書きしない。
  必要な小さな新fixtureは別の場所へ出所付きで追加し、生成レポートは無視対象に置く。
- 差分は実測で記録し、フォント・アンチエイリアス・量子化等の理由は根拠を添える。
  大きな差を許容値の拡大だけで解消しない。

## 結果・引き継ぎ

未実施。日付・状態、effect対応表、保持した契約と変更理由、変更ファイル、
チェックと各effectの実描画比較結果、環境・画像保存先、未解決差分、段階07の入口を記入し、
[作業一覧](README.md)を更新する。
