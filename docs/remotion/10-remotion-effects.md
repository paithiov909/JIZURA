# 段階10：Remotion標準effects接続の試作

状態：未着手。前提：[09の結果](09-custom-effects.md)。
次段階：[11：カタログと移植候補](11-effect-catalog.md)。

## 開始時に読むもの

- [AGENTS.md](../../AGENTS.md)、[root README](../../README.md)、[作業一覧](README.md)、
  [初期計画](PLAN.md)、[拡張計画](EXTENSION-PLAN.md)、本メモ、08/09の結果。
- [API](API.md)、[package README](../../remotion-jizura/README.md)、
  [Scene canvas](../../remotion-jizura/src/react/JizuraScene.tsx)、
  [旧画面効果](../../effects/packs/fxB.ts)、[旧renderer](../../engine/renderer.ts)。
- 採用Remotion版の公開型・公式[Effects](https://www.remotion.dev/docs/effects)、
  [createEffect](https://www.remotion.dev/docs/create-effect)、[HTML-in-canvas](https://www.remotion.dev/docs/html-in-canvas)。

## 目的・成果物

画像加工をRemotionの`effects`配列で扱う実試作と、JIZURAの独自canvasとの接続方式を評価する。
Cutを発火の指定元としつつ適用対象を分ける設計を試す。全fxの移植はしない。

## 作業

1. 現在の独自canvasと標準effects対応componentの境界を確認し、公開APIで可能な接続案を比較する。
   普通のcanvasへeffects propsを付けただけで対応としない。Remotion内部APIに依存しない。
2. まず標準の画像加工1つで、JIZURA描画に加工がかかる最小例を試す。
   直接接続が成立しない場合は、対応component単体の動作と試した接続の制約を別々に記録する。
3. JIZURAらしいスライスグリッチまたは時間変化するRGB分離の独自effectを1つ作る。
   既存標準effectとの違いと採用理由を記録する。類似標準effectの再実装だけを成果にしない。
4. 同じ独自effectを標準対応の画像/動画等へ適用し、歌詞に依存しないことを実描画で確認する。
   09の文字用effect APIへ無理に合わせず、公開名・schemaを区別する。
5. 時間の基準、Cut境界での開始/終了、seed、無効化、適用順を決める。
   歌詞のみと背景込みの合成は適用先の違いとして扱い、どこまで実測したかを記録する。
6. 代表parameterのStudio編集とコード保存可否を試し、seek・再mount・書き出しを比較する。
7. 採用方式、必要依存、alpha/描画待機/性能の制約を記録し、公開可能な最小範囲をAPI.mdへ反映する。
   必要依存を追加する場合は採用版を揃えroot lockfileを使う。大きな構造/配布変更は行わない。

## 完了条件・検証

- 独自画像加工1つが標準effectsとして動き、実PNG/短い動画、型検査を確認できる。
- JIZURA接続について、実動する方式か、不成立の再現・理由・次の代替案が残る。
  不成立でも調査成果は引き継ぐが、接続を成功と記録せず11〜14の前提を同期する。
- alpha、複数effectの順序、無効化、Sequenceのローカルframe、同じseed/frame・逆順取得を確認する。
- Studio/Playerと実renderの差、必要backend/browser設定、1080pの代表処理時間を記録する。
  GPU経路の画素許容差は実測理由を伴って決める。
- `npm run check:remotion`、新例のfocused実browser checks。公開export変更時は外部consumer。
  build経路変更時はroot/spike checks、文書リンクと`git diff --check`。

## 範囲外

全fx・camera/bg/treat群の移植、過去frame蓄積型の残像、複雑なtransition、独自GPU基盤。
14のレビュー例は、接続の実測に応じて実動する方式を使う。

## 結果・引き継ぎ

未着手。接続案と採否、時間/適用先の契約、独自effect、実測、未達・制約を追記する。
11へ画像加工候補の分類、12へalpha/順序/時間の検証ケース、14へ実動する組み合わせを渡す。

## 段階09からの入口（2026-10-03）

09の公開値はdefineLayoutEffect/defineMotionEffect/defineDecorEffect/resolveScene、
Scene.onInspect。詳細は[APIの追補](API.md#段階09の拡張契約2026-10-03)。
decorはlibraryがsave/restoreするCanvas2Dの図形描画で、画像effectではない。
Sceneは引き続き通常DOM canvas。内部ref・全画素加工・標準effects propsは公開していない。
10ではこの境界を前提に採用版の公開APIで接続を試す。独自文字motionのschemaへ
画像fxを押し込めない。新しい出力callback等が必要なら09の契約を明示的に拡張する。
実例は[custom README](../../remotion-jizura/examples/custom/README.md)、
実描画入口は `node remotion-jizura/tests/custom-browser.mjs`。
