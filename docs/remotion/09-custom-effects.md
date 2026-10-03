# 段階09：独自effect・構成確認API

状態：未着手。前提：[08の結果](08-review-workbench.md)。
次段階：[10：標準effects接続](10-remotion-effects.md)。

## 開始時に読むもの

- [AGENTS.md](../../AGENTS.md)、[root README](../../README.md)、[作業一覧](README.md)、
  [初期計画](PLAN.md)、[拡張計画](EXTENSION-PLAN.md)、本メモ、08の結果。
- [API](API.md)、[初期検証](VALIDATION.md)、[package README](../../remotion-jizura/README.md)。
- [公開型](../../remotion-jizura/src/types.ts)、[宣言](../../remotion-jizura/src/effects/declarations.ts)、
  [ScenePlan](../../remotion-jizura/src/core/scene-plan.ts)、[描画](../../remotion-jizura/src/canvas/effect-frame.ts)、
  [計測](../../remotion-jizura/src/canvas/service.ts)、[外部consumer検証](../../remotion-jizura/tests/consumer-validation.mjs)。
- [旧追加契約](../EXPRESSION_PACKS.md)は参考とし、新APIにAE宣言や旧global facadeを持ち込まない。

## 目的・成果物

利用側のTSファイルで定義/importしたeffectをScene/Cutへ適用できる最小公開APIと、
レビュー・再現に必要な解決済み構成の確認APIを実装する。API名・型はこの段階で決める。

## 作業

1. 08の不便を起点に定義・宣言・実行の境界を決め、API.mdへ決定を記録する。
   group/ID、parameter型・既定値・検証、metadata、seed、時間/進行度、glyph/geometryの責務を決める。
2. 文字の配置を作るlayout、文字を変形するmotion、図形を描くdecorの独自例を各1つ作る。
   小さい例に留め、旧カタログの追加移植は13へ渡す。計測・描画helperはこれらに必要な範囲を公開する。
3. importした定義を局所的に使用できる仕組みを実装する。全Scene共有の可変global登録を前提にしない。
   ID競合、異なるgroup、不正params、cleanup、独自effectの自動抽選への参加/不参加を明示する。
4. 調整の意味・範囲を記述できるschema/metadataの最小形を決める。
   Studioのschemaとの共有は検討するが、全parameterのGUI化や検索実装は11/14へ残す。
5. 解決済みのCut時間・effect ID・seed・params・font/Styleを取得する最小APIを作る。
   async font計測前後の境界、serializableな情報と関数/Canvas等の資源の分離を決める。
   内部ScenePlan全体の無制限公開やJSONから任意コードを実行する形式は設けない。
6. 固定した別Cut/effectに変更が波及しない条件と、省略seed/候補追加の影響を文書化する。
   新しい識別子が必要ならここで追加し、React keyとの役割を区別する。
7. 公開型・README・08の例を同期し、package外の参照sourceをimportしない状態を保つ。

## 完了条件・検証

- 公開entryだけから、独自layout/motion/decorを定義・適用して実PNGを得られる。
- 解決済み構成と表示が対応し、取得結果の変更が内部planを変えない。
- 不正宣言とID競合が適切に検出され、別Scene・再mount・cache再生成で状態が漏れない。
- 同じseed/frame、逆順seek、局所parameter更新・復元、2Sceneで独自例の再現性を確認する。
- `npm run check:remotion`、focused実browser検証、tarball外部consumerで型検査と実描画。
  API変更に伴う既存テスト変更の理由を記録し、意図しない退行を隠さない。
- 旧7effectの既存回帰例を確認し、API差・意図した見た目の差をAPI.mdと結果へ記録する。

## 範囲外

配布plugin管理、外部effectの動的取得、旧registry全移植、標準画像fx、旧JSON互換、全group対応。
拡張APIの設計で後続範囲が変わる場合は理由と対応案をメモへ反映する。

## 段階08からの入口（2026-10-03）

[08の結果](08-review-workbench.md)と[レビュー例の手順](../../remotion-jizura/examples/review/README.md)を読む。
`examples/review/inputs.tsx` / `ReviewWorkbench.tsx`のtarget/reference 2Cutを利用する。
全seed・center/decor paramsを固定したcombined→edited→combinedの保存JSON、
frame6/24/52とreference84/112、9動画、環境/hash対応はignored `dist/remotion/stage08/`。
再生成は`node remotion-jizura/tests/review-browser.mjs`。新APIによる局所修正・復元の比較入口とする。

08は例側だけの変更で公開APIを追加していない。`id`はReact key/開発ラベル、
`candidate`/`input`は例のprops、JSONは公開プロジェクト形式ではない。
動きの強度/速度は現factoryの空paramsで調整できない。decor.v/r等の意味を確認できる
metadata、計測前後の解決済み構成、明示seedと安定した識別の関係が09の検討材料。
Player選択・Studio保存・JSON編集は自動同期されず、全入力の転記が必要。
初期candidateを含むリテラルdefault propsでStudio保存backendは動くが、
`reviewInputs.combined`のようなcomputed値は保存できない。保存入口は
`examples/studio-entry.tsx` / `StudioRoot.tsx`。Saveボタンの手操作とユーザーのdesign承認は未確認。

## 結果・引き継ぎ

未着手。確定した公開値/型、独自例の場所、構成取得のタイミング、checks/実描画、制約を追記する。
10へ画像加工との境界、11へmetadata、12へ定義/ケース形式と検証入口を渡す。
