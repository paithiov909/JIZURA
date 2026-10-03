# 段階13：最初の小さな移植群

状態：完了（2026-10-03、実装・技術検証。ユーザーのdesign/motion確認は未実施）。前提：[12の結果](12-port-validation.md)と[11で確定した対象](11-effect-catalog.md)。
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

段階11で5件を確定した。詳細は[選定資料](EFFECT-CANDIDATES.md)と
[注釈source](../../remotion-jizura/scripts/legacy-catalog-rules.mjs)。12の完了後にこの順序で着手する。
全5件を段階13で実装した。初期7件は新規移植数に含めない。対象の再選定は不要。

| 順序 | 旧group/ID | 公開factory名 | 特徴・必要処理 | 主な確認 |
| --- | --- | --- | --- | --- |
| 1 | layout/mixed | mixed | scriptによる大小、1/2行、seed回転。glyph advance/個別size/位置/強調index/box | 2/9/10/16字、kana/kanji/Latin/約物/改行/space、縦長 |
| 2 | enter/slideL | slideLeft | 逐字stagger0.5、outQuint、dx=-0.85×size、alpha | 1/複数行、progress0/1、最短Cut、明示入場frame |
| 3 | exit/shrink | shrink | item中心基準のinCubic収縮とtrack減少、alpha=1-e² | glyph中心/spacing、breathe/mixed組み合わせ、exit境界 |
| 4 | hold/jitter | jitter | step-indexed seed変位と回転、hold量 | 同step/隣step、0強度、motionFps、逆seek、並列render |
| 5 | decor/brackets | brackets | boxの4隅、0.35秒展開、exit閉鎖、front layer | null/current box、pad/stroke端点、透明・縦長 |

mixedは旧fontBig/fontSmallを単一の解決fontへ適応する。原型の大小リズムを優先する。
09のTextPlacementは全文を各placementに描くためそのまま使えず、13で限定した内部geometry経路を追加する。
shrinkはglyph自身のscaleだけでitemのglyph中心やtrackが縮まらないため、限定した内部item変形経路を使う。
必要なら12のcase拡張箇所を使い、差の理由/旧参考画像を残す。callerの公開layout/motion型を先に広げない。
新5件は明示指定専用。既存7件のCANDIDATES・候補順・省略seedを維持し、catalogのautoSelect=falseを付ける。
parameter名/型/範囲は13で実装・検証して確定する。vcolsは縦組metrics/約物/outline列のため延期。

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

2026-10-03：現在の`remotion`ブランチで固定5件を実装した。開始時のtreeはクリーン、
08〜12のsource/結果・段階12のcandidate run-TIYWRSと固定fontを確認した。
14の統合例/編集UX、次の移植群、依存/version/lockfile/配布方式は変更していない。
参照source・旧fixture・初期PLAN/VALIDATIONの過去証拠を保持した。

### 確定した実装と原型との差

| effect | 実装・確認した特徴 | 適応・注意 |
| --- | --- | --- |
| mixed | script大小、advance0.96、9字まで1行/10字から2行、line/stair/wave、seed回転。2/9/10/16字・長文/縦長・space/newline・強調index | fontBig/fontSmallを単一Cut fontへ統合。Style.fontSizeで各行を縮小し各glyphをcap。空白/改行を除去して元emphasisへ写像。Style.track/leadは配置へ使わない |
| slideLeft（旧slideL） | glyph stagger0.5、outQuint、dx=-0.85×size、alpha=clamp(q×1.6)^1.6、端点hide/static。1文字・複数行・明示入場frame・D1 | 原型はcoreでなくeffects/packs/enter.ts。mixedは1文字1itemなのでitem間staggerなし、旧mixed同様の同時入場 |
| shrink | breathe後のitem size×(1-0.96p³)、track-0.2p³、alpha=1-p⁶。item中心を固定しglyph中心/spacingも再計測 | mixedは各文字の中心へ縮小、全文中央へ集約しない。内部trackの負値を許す。公開callerのglyph scaleでは代用しない |
| jitter | step/item seed/glyph/channel hash、size2.5%×hold量×amount、旧回転4度×hold量、0.2px閾値、0無効化 | 旧fx.motionをamountへ公開。24Hzの既存stepを利用、motionFpsの量子化と独立に時間を持たない。seed0を保持 |
| brackets | front、現在boxの4隅、0.35秒展開/退出閉鎖、nullは旧中央fallback。pad/stroke/accent | pad18/stroke2.2を編集可能にし固定default。静止box/前frameを参照しない。大きいpad/strokeと縦長は端でclipされる。論理boxは回転/clipを含まない |

公開factory/型/ID、paramsの意味・範囲・生成順は[API追補](API.md#段階13の明示effect追加2026-10-03)。
新5件はautoSelect=false、既存CANDIDATES/順序/省略seed/生成parameterは維持した。
受理IDを自動候補から分離し、新IDも独自定義によるshadowを拒否する。
既定catalog13件、caller/標準例を含む一覧17件。`batch` routeの実Player/Studio Compositionと
[公開利用例](../../remotion-jizura/examples/batch/README.md)へ接続した。
公開TextPlacement/GlyphTransformは拡張せず、mixedの内部glyph item/index/rotation、
shrinkのitem再計測、motionのitem別seedを追加した。resolveScene/onInspectのshapeは維持する。

### 変更ファイル

- 公開型/解決/情報：`remotion-jizura/src/types.ts`、`index.ts`、`catalog-types.ts`、`catalog.ts`、
  `effects/declarations.ts`、新`effects/batch-schema.ts`、`core/scene-plan.ts`、`core/scripts.ts`。
- 計測/描画：新`src/canvas/mixed.ts`、`geometry.ts`、`service.ts`、`effect-frame.ts`、
  `src/effects/motion.ts`、`math.ts`、`decor.ts`。
- 例：新`examples/batch/FirstEffectBatch.tsx`/`README.md`、`StudioRoot.tsx`、`player/main.tsx`、
  `catalog/CatalogPlayer.tsx`/`media.mjs`/`README.md`。
- inventory：`remotion-jizura/scripts/legacy-catalog-rules.mjs`/`inventory-legacy.mjs`。選定注釈へ実装/比較evidenceを追加、stage11の生成物を保つ任意outputを追加。
- tests：新`batch.test.mjs`/`batch-types.tsx`/`batch-gates.jsx`/`batch-consumer.mjs`、
  `port-cases.ts`/`port-model.tsx`/`port-entry.jsx`/`port-validation.mjs`、`effect-reference.jsx`、
  `catalog.test.mjs`/`catalog-validation.mjs`/`catalog-entry.jsx`/`catalog-browser.mjs`、
  `consumer-validation.mjs`/`scaffold.test.mjs`。
- 文書：root/package README、本メモ、作業一覧、EXTENSION-PLAN、API、PORTING、EFFECT-CANDIDATES、14の入口。

### 実行commandと証拠

repo rootから順次実行し、重いbuild/Chromeを重ねない。Nodeのfont/metric stubと実Chromium・実tarballを分ける。
新commandは`node remotion-jizura/tests/batch-consumer.mjs`。
共通commandへ`--output=dist/remotion/stage13`を追加し、毎回新規runへ保存する。

| command | 実行結果・範囲 |
| --- | --- |
| `npm run check:remotion` | strict TS/TSX/ESM/d.ts build、64/64 Node契約成功。新5件のfactory/metadata範囲、shadow拒否、旧slide/jitter callback、item shrink/spacing、不変planを含む。Node metric/fontはstub/mock |
| `node remotion-jizura/tests/port-validation.mjs --list` | 既存23＋新21、全44caseの選定理由を確認 |
| `node remotion-jizura/tests/port-validation.mjs --case=mixed,mixed-nine,mixed-ten,mixed-sixteen,mixed-portrait,mixed-low,mixed-high,slideLeft,slide-single,slide-multiline,batch-one-frame,shrink,jitter,jitter-zero,jitter-quantized,brackets,brackets-low,brackets-high,batch,mixed-breathe-shrink --output=dist/remotion/stage13` | run-P58Sfwの20case/143代表PNG、全件Player/direct対export raw差0。edited20PNG/復元・逆seek・StrictMode再mount/cache再生成/不変plan、可視anchor/gap/Scene終了clear、Canvas状態/font/handle cleanup、stale propsの実PNG negative gate成功 |
| 同runの並列/動画/旧参考 | jitter-quantizedとbatchの各33frameをconcurrency1/2で比較しraw差0。7本32frame/約1.33秒動画をconcurrency1で生成しffprobe/全decode。旧source参考143比較のうち134件raw差0。brackets-low4sampleは最大1137pixel/255、high5sampleは最大3992pixel/223。新pad/strokeと旧固定18/2.2の意図した差であり、一般許容差やbaseline更新で隠さない |
| `node remotion-jizura/tests/batch-consumer.mjs` | repo外/tmpへ実tarball install、workspace linkなし、公開型/deep import拒否/packed内部・peer imports170件、新例6案×5frameの30PNGをlocal Remotionとraw差0、旧LyricsDemo11PNG回帰。6本60frame/2.5秒動画とfilmstripをconcurrency1で生成し全decode。reportはstage13/batch-consumer-result.json |
| `node remotion-jizura/tests/catalog-browser.mjs` | 最終17entryのmetadata/3用途query/名前・groupfilter/選択・seek、実Player17PNG対同条件の元例raw差0。14動画URLは生成fileとbyte一致。新例Player時間を60frameへ合わせた最終状態で再実行成功。stage13/catalog/catalog-result.jsonへ保存 |
| `JIZURA_EFFECT_COMPARE_ONLY=1 node remotion-jizura/tests/effect-browser.mjs` | 既存7effectの283旧参照frame raw差0。seed0/差、量子化、逆seek/Sequence/StrictMode/複数Scene/再mount/cache/cleanup回帰。PNG/MP4 export部分は省略 |
| `node remotion-jizura/tests/port-validation.mjs --case=center,pop,wipe,drift,breathe,kasumi,checker,combined,one-frame,quantized,custom,image-combined --stills-only --compare-to=/home/paithiov909/Documents/JIZURA/dist/remotion/stage12/run-TIYWRS --output=dist/remotion/stage13` | 既存12case/84PNGの過去run回帰が全件raw差0。preview対exportは81件raw差0、画像3件は既存取得丸め条件raw最大1/alpha差0/premultiplied差0。旧参考69sample差0、combined並列33frame差0、独自/画像例のseek/edit復元/cleanup成功。run-AlXDU2 |
| `node remotion-jizura/tests/port-validation.mjs --case=mixed,slideLeft,shrink,jitter,jitter-quantized,brackets,batch --stills-only --compare-to=/home/paithiov909/Documents/JIZURA/dist/remotion/stage13/run-P58Sfw --output=dist/remotion/stage13` | 新7caseの独立run57PNGもraw差0。並列2compositionを再確認。jitter/quantized/batchはhold量1・pIn1・pOut0に固定した異stepで実画素変化を検出。run-VMzdPU |
| `node remotion-jizura/scripts/inventory-legacy.mjs --output=dist/remotion/stage13` | 旧860件のgroup/ID/order/name/pack/specialをfixtureへ照合、measure呼出0、新5件の実装/evidence注釈付きreport。旧選定分類を保持 |

`node remotion-jizura/tests/port-validation.mjs --case=jitter-high --stills-only --output=dist/remotion/stage13`
は追加上端amount4の縦長/複数行case成功、6PNG raw差0、旧参考6sampleも差0、
保持量を固定したstep間の実画素変化/逆seek/edit復元を確認した（run-cObviH）。
新caseは計21、代表PNGは20case143＋上端6の149件、旧参考149sampleの140件raw差0。

- `npm run check`：保存したroot型/i18n/engine/effect契約、web/offline/AE/CEPの4target build、
  出力検査、日英registry、日英AE object-model mock成功。Adobe/CEP実機の証拠ではない。
- `npm run spike:build` / `npm run spike:test`：保存spike build、Node VM/muxer/AE model mock成功。
- 最終`npm run check:remotion`：上端caseと60frame catalog Playerを含む型/build/64契約を再確認。
- `node --check`（変更/新規mjs11本）、`python3 /tmp/jizura-stage13-doc-check.py`、`git diff --check`：
  構文・変更/未追跡source48本の末尾空白・Markdown31本のlocal link446件を確認。
  link欠落・末尾空白・diffエラーは0件。
- packed/emitted JS/d.tsの最終byte照合：実install済consumerの74本が現在のlocal出力と全件byte一致。
  stage13/packed-byte-check.jsonへ保存し、内部/peer imports170件のconsumer証拠と合わせて確認した。

最終root/spikeとconsumer/本体の結果を区別し、Studioの新例登録は型/実renderで確認したが
Studio UI・Save/reloadは今回実行していない。新例の本番Player build全体を別commandで実行したとは主張しない。
初回sandbox buildは既知のspawnSync tsc EPERMで止まり、許可された通常環境の同command成功を採用した。
初期Node catalog gateは旧8件/route集合から新13件/batchへ同期して再実行した。
Viteの既存use-client warning、npmのesbuild install-script noticeは残る。
Studio実操作/保存、別OS/font/GPU、Adobe/CEP実機を今回確認したとは主張しない。


### 目視・条件と残る限界

新20caseの主証拠はignored `dist/remotion/stage13/run-P58Sfw/`。
case/input/edited-input/browser JSON、prepared/静止geometry/frame state/motions/gates、
preview/export/legacy/edit/stale PNG、comparison、review.mp4/filmstrip、環境/font/hashを保持する。
同runのreview.jsonへ担当agentの目視artifact/所見を記入、user=unconfirmed、regression=candidateを保持。
source baselineの新規採用・一括更新は行っていない。

担当agentは公開60frame combined動画のfilmstripとcatalogのmixed画面、batch/mixed-portrait/slideLeft/shrink/jitter/bracketsの動画filmstripと
mixed-high/brackets-highのcomparisonを目視した。大小・行のリズム、希望/朝の強調、
逐字入場、中心固定の収縮、枠展開/閉鎖、edit後の配置差を確認した。
brackets-highはpad64/stroke12のため縦長の端で枠がclipされ、editedのcenter offsetでは本文も端へ触れる。
端点の技術成立であり推奨presetではない。mixed-highのrotAmp20も可読性の採用判断を要する。
連続全速再生による鑑賞、全case/全frame目視、ユーザーdesign/motion承認は未実施。

固定条件：Node26.10.0、React19.3.0、Remotion4.0.532、HeadlessChrome154/Linux x64、24fps、
preview DPR2、文字GL既定、画像回帰のみswangle、Noto Sans JP700/normal、SHA256
`c2f3b4d463500a2ddcd3849cded1fceeb9fd6d1c32e6cbecd568453ba50fc68f`。
640×360と360×640、通常D30/最短D1、from1、seed/paramsはcase.json。
MP4はH264 CRF1/yuv444pのlossy、透明は合成される。PNG画素一致と全frame decodeを別に記録する。
別font/OS/GPU、swangle文字の再現性、全params総当たり、長尺/1080p性能は未検証。

### 共通手順の改善と14への入口

共通harnessだけのPNG一致では同じ誤geometryを見逃しうるため、旧source由来の分類/advanceと
固有期待式を`batch-gates.jsx`へ追加した。mixedの行/size/spacing/強調、shrinkの中心/track/alpha、
slideのstagger/alpha、jitterのstep/seed/閾値、bracketsのnull/current box/展開を別gateにした。
旧adapterは原型を独立実行し、単一font・行cap・強調・item seedだけを合わせる。
旧bracketsの固定18/2.2は変えず、拡張pad/stroke端点の意図した差を保存した。
共有helper/自動選択を広げずに5件を完了できたが、mixedは全文placementだけでは不足し、
item中心縮小と強調写像を移植単位の見積もりに含める必要がある。

14は[新例](../../remotion-jizura/examples/batch/README.md)、`/?catalog`の17件、API追補、
PORTINGと本結果を使う。調整入口はmixed.mode/rotAmp/smallK/accentIdx、jitter.amount、
brackets.pad/stroke/accent、Cutの入退場frame数。混在layoutの変更でitem数が変わればmotion seedも変わる。
明示Cut/effect seed、時間、font/全paramsを保存し、他Cutの固定を検証する。
次の群の案はdecor/rings・dotsの同種現在box描画、enter/slideRの方向統合を再精査すること。
vcolsは縦組metrics/約物/mask経路の別調査が必要で延期を維持する。これらの実装/採用決定は行わない。

## 段階12の共通手順からの入口（2026-10-03）

[追加・検証手順](PORTING.md)と[レビューtemplate](PORT-REVIEW-TEMPLATE.md)を使う。
`tests/port-cases.ts`へ理由付きcase、`port-model.tsx`へ明示factory接続を追加し、
`node remotion-jizura/tests/port-validation.mjs --case=追加case`でPNG/入力/計画/動画を取得する。
geometry採取にはglyph位置/advance/強調index/色、item中心/size/track、motions、step/current boxを含む。
mixed/shrink/jitter/brackets固有の式/関係のgateと旧adapterは13で足す。12のJSON採取だけで
未実装5件を検証済みとはしない。既存自動候補と公開caller型を先に広げない。

文字はGL既定（gl:null）、native画像はswangleを使い、case別に条件を記録する。
swangle文字のkasumiで逆seek差が残ったため、一般GPU許容差や本体変更で吸収しない。
画像fx/透明文字のCanvas PNG→screenshotだけraw最大1/alpha差0/premultiplied差0、
同renderの回帰/並列比較はraw差0。旧source比較は参考、ユーザー確認は別状態。
新5件はparam端点、最短Cut、phase境界、portrait、seed/quantized step、null/current boxを
選んで拡張する。公開追加後は既存consumerへ型/実tarball PNGを追加する。
