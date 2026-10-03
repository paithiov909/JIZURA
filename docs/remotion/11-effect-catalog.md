# 段階11：選択カタログ・移植候補の整理

状態：完了（2026-10-03、実装・技術検証。ユーザーのdesign/motion確認は未実施）。前提：[10の結果](10-remotion-effects.md)と09のmetadata契約。
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

2026-10-03：現在の`remotion`ブランチで段階11を実施した。
開始時はクリーン、origin/remotionより4commit先行。08〜10のsource・結果・固定font/画像/動画を確認した。
全旧effectの移植や段階12/13のharness・新effectは実装していない。参照source、baseline、
初期PLAN/VALIDATION、package version/依存/lockfileを維持した。

### 確定契約と成果物

- 公開追加はgetEffectCatalog/searchEffectsとCatalogEntry/CatalogParameter/CatalogQuery。
  [API追補](API.md#段階11のcatalogsearch契約2026-10-03)へ契約を記録した。
  packageの8件（旧7件＋native slice）、caller側例の12件（独自3件＋標準blur）を分ける。
  status=implementedとorigin/kind/groupで実行境界を示し、catalog自体はコードを持たない。
  未移植候補のreportを公開取得・検索に混入させない。旧7件の自動候補/順序/seedは維持した。
- 説明は実装sourceから、動作の証拠は06/08/09/10の結果へ対応する。
  雰囲気・用途はhypothesisとし、font/条件を問わない適性やユーザー承認としない。
  必須metadataとscalar schema、seeded/fixed default、input/editor bounds、ignored値を区別する。
  kasumiはn/rightだけ、checkerStripはv/right/low/accentだけが描画に有効。
  標準blur radiusのeditor default40と必須の有限入力/比較例4pxも区別した。
- 検索はNFKC・case-insensitive substring、text token/各filterはAND、tag/use/conditionは完全一致、順序維持。
  自然言語ranking・factory lookup・可変global登録は設けない。
  [一覧](../../remotion-jizura/examples/catalog/README.md)へ用途3例、実Player、比較例、代表動画を接続した。
  09の3entryは同じ組み合わせ例、画像2entryの動画はcombined例であることを表示する。
  Viteの開発middlewareで既存ignored動画を供給し、静的bundleへ生成assetを混ぜない。
- [分類sourceと選定資料](EFFECT-CANDIDATES.md)から通常860件を集計。
  group/ID/順序/name/pack/specialをfixtureへ照合し、order外のtitle/interludeは別記した。
  主分類は文字配置184、文字運動286、描画294、画像加工69、複数入力27。
  source精査15件/粗分類845件、移植済み7/13確定5/統合候補2/標準候補1/延期260/未調査585。
  callback中の直接J.member参照は補助hintで、完全な依存解析とは扱わない。
- 13の対象をmixed、slideLeft（旧slideL）、shrink、jitter、bracketsの5件・この順で確定した。
  [13の表](13-first-effect-batch.md#対象の確定表)へ原型/helper/caseを追記。
  vcolsは縦組metrics/約物/outline列で延期。slideWholeはitem全体の運動なのでslideLへ安易に統合しない。
  mixedとshrinkは09の全文placement/glyph scaleだけでは表現できないため、
  13で限定した内部geometry/item変形経路を足す方針を12/13へ渡した。公開caller型は先に拡張していない。

### 変更ファイル

- package：`src/catalog-types.ts`、`src/catalog.ts`、`src/index.ts`。
- 例：`examples/catalog/entries.tsx`、`CatalogPlayer.tsx`、`media.mjs`、`README.md`、
  `examples/player/main.tsx`/`vite.config.mjs`、`examples/review/ReviewPlayer.tsx`、
  `examples/image-effects/ImageEffectsPlayer.tsx`。リンク先の初期候補を受け取るだけで既定選択は維持した。
- 集計：`scripts/inventory-legacy.mjs`、`legacy-catalog-rules.mjs`。
- checks：`tests/catalog.test.mjs`、`catalog-types.tsx`、`catalog-validation.mjs`、
  `catalog-entry.jsx`、`catalog-browser.mjs`、既存`consumer-validation.mjs`/`scaffold.test.mjs`。
  既存厳密export一覧へ新2値を追加し、deep/internal import拒否は保持した。
- 文書：root/package README、API、作業一覧、EXTENSION-PLAN、本メモ、EFFECT-CANDIDATES、12/13/14。

### 実行command・証拠

| command | 結果・範囲 |
| --- | --- |
| `npm run typecheck:remotion` / `npm run check:remotion` | strict型/build、57/57 Node契約成功（新catalog4件）。旧font計測ケースはstub。group/schema型、不正宣言、catalog全8件のparameter範囲/default/鍵、検索、重複/欠落のnegative gateを確認 |
| 新`node remotion-jizura/scripts/inventory-legacy.mjs` | 860件すべてfixture/order一致、重複・未分類・古い注釈IDを検出、通常と特殊2件の分離成功。計測呼出0。集計結果はdist |
| 新`node remotion-jizura/tests/catalog-browser.mjs` | 実Chrome/Playerでmetadata12件、用途3検索、group/名前検索、12件の代表frame、再選択/復元、対応説明を確認。同じbrowserで元の08/09/10例を直接描いた12PNGとraw全画素一致。9動画URLのHTTP200/MIMEとファイルbyte一致 |
| `node remotion-jizura/tests/consumer-validation.mjs` | 実tarballをrepo外へinstall（symlinkなし）、新catalog型/検索とdeep import拒否、旧例11実Remotion PNGが段階07 hashと一致。73packed files/160importsを確認。実consumerのmetadata8件を別Node確認でlocal catalogと全JSON一致 |
| `npm run check` | 保持した旧sourceの型/i18n/engine/effect、4target build、出力/日英registry、AE object-model mock。Adobe/CEP実機の証拠ではない |
| `npm run spike:build` / `npm run spike:test` | 保持spike build、Node VM/AE object-model mock。実機検証ではない |
| `npm exec --workspace remotion-jizura -- vite build --config examples/player/vite.config.mjs --outDir ../../../dist/remotion/stage11/player` | 最終Player入口/catalog routeを含むproduction bundle成功。動画は同梱しない。既存use-client/chunk-size warningのみ |
| `node --check`（追加/変更mjs6本） / `python3 /tmp/jizura-stage11-doc-check.py` / `git diff --check` | 変更30ファイル（未追跡を含む）の空白、Markdown11本のローカルリンク192件、mjs構文成功。欠落/空白エラー0 |

sandbox内checkは既知のspawnSync tsc EPERMで停止し、許可された通常環境で同commandを再実行した。
Ubuntuの再起動で進行中browser/consumer/root/spikeのprocessを失ったため、完了reportの有無を確認し、
未完了commandを単独・順番に再実行した。Viteの既存use-client warning、npmの既存install-scripts noticeは残る。

旧保存text PNG対今回swangle browserの比較では10件に差があり、最大8683画素/最大channel52
（drift破片）、画像2件は差0。以前の文字チェックはgl指定なし、今回の画像対応browserはswangleで
取得条件が異なるため、backend由来が考えられるが、差の原因を完全には分離していない。
旧証拠を上書きせずinformationalな比較として記録し、許容差を新設しない。
同じbrowser/条件でcatalogと元の例を比較するraw差0を今回の接続gateにした。
初回の巨大Buffer不一致出力を伴う試行はexit137で強制終了。原因の確定はできないが、
大きなassert差分の展開を避けてboolean/hash/画素差指標へ修正後、単独実行で完了した。

### 実表示・目視と検索理由

Node26.10.0、React19.3.0、Remotion4.0.532、Chrome154/Linux、640×360/24fps、
DPR2、swangle、Noto Sans JP700/normal。font SHA256は
`c2f3b4d463500a2ddcd3849cded1fceeb9fd6d1c32e6cbecd568453ba50fc68f`。
生成JSON/24比較PNG・UI screenshots/ログはignored `dist/remotion/stage11/`。
動画は08〜10の既存生成物9本を再利用し、新movieやbaselineは作っていない。

- 静かな保持：center/breathe/offsetLines/glyphWave。静止配置と小さい周期運動を候補として出す。
  全textの動きの少なさを保証せず、waveの高振幅/長文の可読性は別評価。
- 短いキメ：pop/wipe/sliceGlitch。逐字入場、帯clip、画像横ずれの別原理を比較できる。
  入場phaseと画像eventは同じ実行APIではなく、画像の適用target/flag条件を表示する。
- 控えめな装飾：kasumi/boxRule。薄い背面帯とbox下の細いrule。
  kasumiは固定paletteでは暗く端に触れ、boxRuleのthicknessを上げれば控えめとは限らない。

担当agentは一覧のbreathe/pop/kasumi/native slice画面、既存08の9案frame6/24/52 contact sheetを目視。
用途と表示説明の対応、popの逐字差、kasumiの暗さ、画像wrapperの透明背景を確認した。
白いpage背景で画像例の白い本文が埋もれたため、Player外側へ濃いpreview背景を付けた。
元Scene/画像のalphaは変更しない。連続動画の全速鑑賞、ユーザーのdesign/motion承認は未実施。

### 制約と次の着手先

全860件の詳細目視・dependency精査/描画、全OS/font/aspect、候補適性のユーザー確認は未実施。
media routeはVite開発専用で、生成物がない場合は再生成が必要。標準effectやcaller例は明示importする。
catalog sourceの視覚pathはrepo例の対応資料で、外部packageへassetを配布する契約ではない。

12は[11からの入口](12-port-validation.md#段階11からの入口2026-10-03)から共通harnessを作る。
混在glyph/強調、item中心とtrack、step、null/current box、画像target/backendをcaseとして扱う。
13は固定5件、14は[一覧の選択入口](../../remotion-jizura/examples/catalog/README.md)を使用する。

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

## 段階10の画像effect引き継ぎ（2026-10-03）

sliceGlitchはnative createEffect/EffectDescriptorで、09の文字用factory.metadataとは別。
公開typeはio.jizura.sliceGlitch、schemaはRemotion InteractivitySchema。parameterは
amount/displacement/bands/seed/frame/fps/rate/標準disabled。
通常JIZURA canvasを単一HtmlInCanvasで包む接続が実動し、CanvasImageにも同factoryを適用した。
画像加工の適用先（歌詞/decorだけ、Scene背景込み、独立画像）、HTML-in-Canvas flagと
2d/WebGL2 backend条件を分類条件へ含める。全旧fxがこの方式で移植済みとは扱わない。
標準blur/chromaticAberration等を新しい文字effectとして重複登録しない。
[10の結果](10-remotion-effects.md)・[API](API.md#段階10の画像effects契約2026-10-03)が根拠。
