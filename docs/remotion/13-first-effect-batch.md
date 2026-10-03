# 段階13：最初の小さな移植群

状態：未着手。前提：[12の結果](12-port-validation.md)と[11で確定した対象](11-effect-catalog.md)。
次段階：[14：レビュー体験の統合](14-review-loop.md)。

## 開始時に読むもの

- [AGENTS.md](../../AGENTS.md)、[root README](../../README.md)、[作業一覧](README.md)、
  [初期計画](PLAN.md)、[拡張計画](EXTENSION-PLAN.md)、本メモ、09〜12の結果。
- [API](API.md)、[package README](../../remotion-jizura/README.md)、12で作成した追加/検証手順。
- [旧layouts](../../effects/core/layouts.ts)、[旧animation](../../effects/core/animation.ts)、
  [旧decor](../../effects/core/decor.ts)、対象ごとの`effects/packs/`、
  [カタログfixture](../../tests/baseline/v1/registry.json)。

## 目的・成果物

共通手順を使って4〜6effectを追加し、公開型・catalog・例・検証・目視記録まで揃える。
最初の移植群の結果から、以降の作業単位と不足する共通処理を評価する。

## 対象の確定表

11の担当が、対象ID/group、公開名、原型の特徴、依存、比較条件をここへ追記する。
この表と11の結果が未記入なら、13の前提は未達。初期7effectは新規移植数へ数えない。
対象は4〜6effectで、少なくとも新layout・文字運動・decorを含める。

## 作業

1. 前提コードと確定表を確認し、対象ごとに旧sourceの数式・seed・共通依存を調べる。
   人間が識別する見た目・動きの特徴を短く記述する。
2. 09の定義/helperを使い、公開コードをpackage内へ移す。必要な共通修正はこの群の範囲に留める。
   似た表現の統合やparameter化は11の選定方針に従い、旧公開名の互換は要求しない。
3. 時間、geometry、乱数、alpha、cleanupをRemotion向けに適合し、旧sourceとの差を記録する。
   参照source・旧baselineを変更して新実装を正当化しない。
4. paramsの意味/範囲、metadata、比較例を追加し、auto選択への参加を明示する。
   既存の固定レビュー例は明示指定で維持し、候補追加による自動選択差は別に記録する。
5. 12のケースを単独/組み合わせへ適用し、代表frameと動画を目視する。
   bbox・clip・長文・縦長等の例外は意図と不具合を区別し、残る制約を記録する。
6. 実装・検証・見た目レビューの状態をeffectごとに記録し、API/catalog/READMEを同期する。
7. 公開entryから外部consumerで新layout/motion/decorを含む例を実描画する。
8. 共通手順で詰まった点と次の移植群の候補を記録する。次の群の実装は行わない。

## 完了条件・検証

- 確定した4〜6effectが描画・公開型・metadata・例へ接続されている。
- 単独と組み合わせで、原型の特徴、可読性、入退場と境界、長文/縦長を確認する。
- 同seed/frame、逆順seek、再mount、cache再生成、代表compositionの並列描画で再現性を確認する。
- `npm run check:remotion`、12のfocused実browser/render checks、既存固定例の回帰、外部consumer。
  build経路変更時はroot/spike checks、ローカルリンク、`git diff --check`。
- 動画・画像・設定と実測/目視記録を確認でき、意図した変更と未確認を明記する。
- 対象変更が必要なら理由と11/本メモを同期し、数を満たすため未実装を完了扱いにしない。

## 範囲外

確定表以外の移植、全fx/背景/カメラ追加、全旧互換、パッケージ構造・配布の大きな変更。

## 結果・引き継ぎ

未着手。effect別の変更・特徴・旧との差・checks・目視・制約と、共通手順の改善点を追記する。
14へ追加候補、調整可能parameter、実描画の例、局所修正時の注意を渡す。
