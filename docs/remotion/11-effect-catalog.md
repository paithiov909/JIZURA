# 段階11：選択カタログ・移植候補の整理

状態：未着手。前提：[10の結果](10-remotion-effects.md)と09のmetadata契約。
次段階：[12：共通移植・検証手順](12-port-validation.md)。

## 開始時に読むもの

- [AGENTS.md](../../AGENTS.md)、[root README](../../README.md)、[作業一覧](README.md)、
  [初期計画](PLAN.md)、[拡張計画](EXTENSION-PLAN.md)、本メモ、08〜10の結果。
- [API](API.md)、[package README](../../remotion-jizura/README.md)、09のmetadataと10の適用境界。
- [旧登録順](../../effects/index.ts)、[カタログfixture](../../tests/baseline/v1/registry.json)、
  [pack契約](../EXPRESSION_PACKS.md)、[旧部品説明](../legacy/README.md)、`effects/core/`・`effects/packs/`。

## 目的・成果物

実装済みeffectを雰囲気・動き・用途・条件から探せるカタログと、全体の移植候補・依存分類を作る。
AIが読めるmetadataと、人間が見られる08の比較例を対応させる。最初の移植群をここで選ぶ。

## 作業

1. 実装済み7effectと09/10の例へ、ID/種類/説明、雰囲気、動き、用途、制約、params情報を付ける。
   必須情報と任意情報、説明の出所を決める。未確認の適性は仮説とし、保証表現にしない。
2. 実装済みeffectを取得/絞り込みできる軽量な仕組みを作る。名前、tag、group、用途条件を扱う。
   未移植候補は別statusとし、選択して実行可能なeffectに混入させない。
3. metadataから08の例・代表動画へ移れる一覧を用意する。AI向けには型/schemaと検索例を記録する。
   自然言語検索サービスや専用MCP、埋め込み検索、配布skillは追加しない。
4. 旧通常カタログをgroup/ID単位で漏れなく集計し、文字配置/文字運動/描画/画像加工/複数入力に分類する。
   元ID→候補公開名/統合先、共通依存、実装・比較状態を管理できる形式を決める。
   機械集計reportはdistへ置き、追跡するのは分類注釈・選定理由などのsource資料とする。
   全860部品の詳細な目視・依存精査は不要。粗い分類と精査済み項目を区別する。
5. 13の最初の移植群を4〜6effectに固定し、対象・順序・原型の特徴・必要helperを記録する。
   出発候補はmixed/vcols、slideL、shrink、jitter、brackets。09/10の実測と依存に応じて入れ替え可能。
   同じ方式だけに偏らず、少なくとも新layout、文字運動、decorを含める。
6. 似た部品の統合、標準effectsの利用、後回しにする群を理由付きで整理し、13のメモへ確定表を追記する。

## 完了条件・検証

- 実装済みeffectの全件に必要metadataがあり、重複ID・不正params説明・欠落を検出できる。
- 「静かな保持」「短いキメ」「控えめな装飾」など3つ以上の検索例で、候補と視覚例を確認できる。
  一意の正解をテストで強制せず、候補理由と目視で分かった限界を残す。
- 旧カタログのgroup/IDが漏れなく集計され、未調査と移植済み・統合候補を区別できる。
- 13が対象を再選定せず着手できる4〜6effectの確定表と依存・確認点がある。
- `npm run check:remotion`とmetadata/searchのfocused checks、一覧の実表示・ローカルリンク。
  公開export変更は外部consumer、build経路変更はroot/spike checks、`git diff --check`。

## 範囲外

旧おまかせ・重み/history/mood抽選の再現、全effect実装、全候補の詳細翻訳、導入/配布方式の決定。
今回のcatalogの新候補を、既存の省略指定による自動選択へ無条件に追加しない。

## 結果・引き継ぎ

未着手。metadata/search契約、一覧/分類source、集計command、目視範囲、選定理由を追記する。
12へケース分類と対象、13へ確定した移植群、14へ候補選択の入口を渡す。

## 段階09のmetadata引き継ぎ（2026-10-03）

独自factory.metadataはgroup/id/name/description/tags/schema/autoSelect=false、
decorはlayerを持つ。schemaはnumber（有限min/max、任意integer）、boolean、enum、
必須default/descriptionと任意unit。snapshotへ独自metadataを含む。
組み込み7effectの意味metadata・検索・視覚リンクは未追加で、この段階で補う。
checkerStripのvはv%3で行数、kasumiのnは2+(n%2)で帯数となる。r等、各effectが
使わない旧共有paramsもあるため、全keyを実効的な調整値と説明しない。
組み込み候補への自動参加や候補順の変更は09では行っていない。
[API追補](API.md#段階09の拡張契約2026-10-03)と
[独自定義](../../remotion-jizura/examples/custom/effects.tsx)を形式の入口にする。
