# 段階14：AI生成コードからのレビュー体験

状態：完了（2026-10-04、実装・技術検証。1080pの画素再現性に未解決差、ユーザーのdesign/motion確認は未実施）。前提：[13の結果](13-first-effect-batch.md)。
次の作業：今回の実測をもとに次の移植群・UX改善を別途選ぶ。

## 開始時に読むもの

- [AGENTS.md](../../AGENTS.md)、[root README](../../README.md)、[作業一覧](README.md)、
  [初期計画](PLAN.md)、[拡張計画](EXTENSION-PLAN.md)、本メモ、08〜13の結果。
- [API](API.md)、[package README](../../remotion-jizura/README.md)、
  08の比較例、09の構成確認、10の実動接続、11のcatalog、12の検証手順、13の新effect例。

## 目的・成果物

短いCompositionで、候補選択→コード生成→描画→レビュー指示→局所修正→比較→復元を通す。
AIにも人間にも分かる利用手順と、実際の操作・描画で確認した体験を残す。

## 作業

1. 3〜5Cut・10〜20秒程度の例を作る。歌詞/時間は明示し、音声解析・LRC処理を内蔵しない。
   既存7effect、新effect、利用側でimportする独自effectを使う。10の画像fxは実動した方式で組み合わせる。
2. 「静かな場面から最後のキメへ」等のbriefから、catalogを使って候補を選びコードを作る手順を示す。
   実装agentの生成コードを例にできる。人間が選択した事実やAIの成功率は測っていなければ記録しない。
3. 対象Cut、frame/区間、元設定、変更意図を添えるレビュー形式を用意する。
   感想を「入場を遅く」「装飾を控えめに」「別layoutへ」等の操作へ結び付ける。
4. 3種類以上の固定したレビュー指示を実行し、変更前後を同条件で比較する。
   parameter変更、effect差し替え、画像加工の適用範囲変更を含める。
   10でJIZURA接続が不成立なら画像加工は実動例で独立確認し、その制約を結果へ残す。
5. 09の構成確認情報と保存設定をレビュー成果へ添える。変更対象以外が保たれ、旧設定へ戻せることを確認する。
   実行関数をJSONへ保存しない。独自effectは利用側のimportと入力設定の組で再現する。
6. 08の不便を実測した範囲で改善する。候補表示、比較、seek/loop、設定編集/保存、font preloadを対象とする。
   Studioのコード保存を採用するなら実際の保存・reload・再描画まで確認する。
   専用の大きな編集UIは作らず、動く最小の往復経路を優先する。
7. 新effectでレビューに不足したparameterだけを調整し、意味・既定値・範囲と回帰を記録する。
8. 実行command、変更差分、PNG/動画、設定/構成情報、目視評価、残る課題を一つの手順へまとめる。
   次の群の優先順位を提案するが、公開/導入方式やその実装は決定しない。

## 完了条件・検証

- briefから選択理由・実コード・比較artifactへ辿れ、3つ以上の局所修正を実行できる。
- 固定した別Cutの代表frameが維持され、設定復元後に元のframeを再現できる。
- Studio/Playerで実際に操作し、代表frameと短い動画をrenderして表示との対応を確認する。
- 比較対象の入力/解決propsが確実に更新され、構成情報と実画像が対応する。
- 同一固定環境で640×360の回帰に加え1080p・縦長の代表例を確認し、プレビュー/書き出し時間を記録する。
  font preloadの効果は遅延fontまたは初回Scene境界で実測し、未確認ならその範囲を示す。
- `npm run check:remotion`、12のharnessと変更範囲の実browser checks。公開export変更時は外部consumer。
  build経路変更時はroot/spike checks、ローカルリンク、`git diff --check`。
- 担当agentの目視・操作とユーザーの確認を区別する。利用者の満足を未測定のまま断定しない。

## 範囲外

専用AIサービス、skill/plugin/MCPの導入方式決定、長い曲の制作アプリ、旧UI、AE/CEP、公開/配布。
今回の結果は、次の移植群・必要なUX改善・性能検証の判断材料とする。

## 結果・引き継ぎ

2026-10-04：現在の`remotion`ブランチで段階14を実施した（開始は2026-10-03）。開始時はクリーンで
08〜13の実装・結果・固定fontが存在した。初期PLAN/VALIDATION、参照source/baseline、
公開API/exports、既存候補・seed・effect params、依存/lockfile、versionを保持した。
既存parameterでレビューを表現できたため、新しいparameterは追加しなかった。

### 実装・決定と変更ファイル

- `remotion-jizura/examples/review-loop/model.tsx`：4Cut、24fps、288frame/12秒の固定入力、
  brief、実catalog検索結果と選定理由、独立3修正と累積revised。時間・Cut/effect seed・
  font identity・style・全paramsを保存する。ラベルは開発例専用、公開Cut IDではない。
  組み込み宣言はscalar JSON、caller wave/ruleはimport済みfactoryへscalar設定を戻す。
  関数や独自宣言の私有identityをJSONへ入れない。未知key、不正font/params/画像区間を拒否する。
- `ReviewLoop.tsx`：既存pop/wipe/breathe/drift、新mixed/slideLeft/shrink/jitter/brackets、
  caller glyphWave/boxRule、標準blurとnative sliceを1Scene・単一HtmlInCanvasへ統合。
  image triggerは同じresolveSceneのCut時間に従うcaller sidecarで、Cut.fx等を追加しない。
  3修正はarrival enter18→30、rise mixed→center、finale画像scene[0,36)→lyrics[0,12)。
  後者は背景motifを加工から外す。scopeの合成経路切替は画像区間内だけに限定し、他Cutを保持する。
  Scene自体は透明、背景/motifは例のDOMで合成し、inspectionと画像設定を分けて記録する。
- `LoopPlayer.tsx` / `preload.tsx`：`/?review-loop`で候補/理由、標準seek/play、Cut loop、
  3修正button、同frameのbefore/after、storage保存/読込、JSON編集、props/構成記録download、復元。
  比較時の表示と編集対象を示す。複数button適用はedited/編集中で独立presetと区別。
  `{input: ...}`をPlayer/Studio/renderで共有し、08のcandidate/コード間の再構築を減らす。
  自動syncは実装せず、同じJSONを転記する。未計測/古いsnapshotを現在構成として表示しない。
  初回だけexact700/normal FontFaceとfonts.loadを待ち、局所編集を跨いでcallerが保持し、unmountで削除する。
  preload失敗には元URL・resolved URL・public-dir/CORS/valid-fontの確認を付ける。
- `examples/StudioRoot.tsx` / `examples/player/main.tsx`：統合例3解像度とrouteを追加。
  defaultPropsは保存可能なliteral `{candidate: "original"}`。computed値へ戻さない。
- `tests/loop-entry.jsx` / `loop-validation.mjs` / `loop-studio.mjs`：実Player操作・保存・
  同条件画像、解決props/計測snapshot、独立export、font遅延/cleanup、実Studio保存/reload/source renderを採取。
  PNG採取時だけ停止中Player controlsを隠して直後に戻し、UI screenshotはcontrols付きで保存する。
  生成物は新規ignored stage14/run-*へ置く。`--ui-only`はpreview/controlのみの補助入口で
  export/高解像度/font試験を含まず、full run pointerを更新しない。
- 文書：例README、package/root README、本メモ、作業一覧、EXTENSION-PLAN、AGENTSの現在地。
  API変更はなくAPI.mdを変更しない。後続番号の新設・次の群の実装はしない。

### 実行command・検証結果

すべてrepo rootから。Chrome/render/buildは重ねず、render concurrency1を明示した。
新commandは`node remotion-jizura/tests/loop-validation.mjs`（任意`--ui-only`）と
`JIZURA_STUDIO_URL=http://localhost:3114 node remotion-jizura/tests/loop-studio.mjs`。
前提font/Chrome/ffmpeg、JSONによる往復、CLI render手順は
[例README](../../remotion-jizura/examples/review-loop/README.md)へまとめた。

| command | 実測結果・証拠の範囲 |
| --- | --- |
| `npm run check:remotion` | 最終strict TS/TSX、ESM/d.ts build、64/64 Node契約成功。font Node契約はmock。新しい例も型検査対象 |
| `node remotion-jizura/tests/loop-validation.mjs` | 5案×20frameの100 Player/export PNGがraw差0。独立3修正の有意差と別Cutの固定、measured snapshotの対応、累積button、before/after、storage/JSON、復元/逆seek、StrictMode再mount、arrival/finale loop成功。不正入力5種を拒否。run-JaUVoL |
| 同commandの動画/代表例 | original/revised各288frame・12秒のH264動画、concurrency1、ffprobe/全decode、各6代表frameの平均channel差最大1.331854。1080p/縦長各2案×4frameの16代表PNGと16再exportを採取。縦長8件はpreview/export/再export raw差0、1080p8件の差は下記へ保存 |
| 同commandのfont試験 | 600msの遅延font、cold/preloadedのframe/準備観測、元/解決URL付きmissing font失敗、caller所有Faceのunmount/StrictMode cleanup成功。最終Face0 |
| `npm run studio:remotion -- --port=3114 --no-open --public-dir=../dist/remotion/stage04/assets` / `JIZURA_STUDIO_URL=http://localhost:3114 node remotion-jizura/tests/loop-studio.mjs` | 実save backendでoriginal→arrival-slower→rise-center→finale-window→revised→originalをsourceへ保存、full reload後frame84/180/240の18PNG raw差0。各保存sourceからfresh bundle/defaultPropsでframe240の6PNGも差0。sourceを完全復元、今回のStudioは停止済み。UI Save-button手操作とは別 |
| `node remotion-jizura/tests/port-validation.mjs --case=center,combined,custom,image-combined,mixed,slideLeft,shrink,jitter,brackets --stills-only --output=dist/remotion/stage14/ports` | 段階12の9case、68代表PNG、53旧source参考比較raw差0、順/逆seek/cache/StrictMode/edit/restore/clear/parameter/negative gate成功。combined33frameのconcurrency1/2 raw差0。画像caseの6sampleにおけるCanvas→screenshot丸めは既存取得経路条件で判定。run-06HxrM。動画は省略 |
| `npm exec --workspace remotion-jizura -- vite build --config examples/player/vite.config.mjs --outDir ../../../dist/remotion/stage14/player` | 新routeを含むproduction bundle成功。生成font/bundleはignored dist |
| `npm run check` | 保持したroot型/i18n/engine/effect契約、4target build、出力/registry、日英AE object-model mock成功。Adobe/CEP実機の証拠ではない |
| `npm run spike:build` / `npm run spike:test` | 保存spike build、Node VM/muxer/AE model mock成功。実機検証とは分ける |
| `node --check`（loop-validation.mjs / loop-studio.mjs）、`python3 /tmp/jizura-stage14-doc-check.py`、`git diff --check` | 最終構文・ローカルリンク・変更/未追跡の空白を確認。結果は最終追記を参照 |

主証拠はignored `dist/remotion/stage14/run-JaUVoL/`。入力/props file hash・解決props、
measured snapshot、catalog選定結果・reviews、Player/export/restore/JSON PNG、動画/filmstrip、
環境/font/source hash、操作・loop・font/performance JSON、Studio source保存/reload記録を保持する。
生成物を採用済みbaselineにはしていない。font/OFLは既存stage04 assetsを使う。

### 実測・目視と残る制約

主runの最初のpage→Player準備は2078ms、bundle1603ms。640×360のseek＋4RAF＋screenshot＋CPU decodeは
中央値152ms（139〜328ms）で、純描画時間や実時間fpsではない。20still/案のexportは10.38〜11.30秒。
12秒動画の記録時間はoriginal20.72秒/revised18.74秒（render＋ffprobe/decode/anchor/filmstripを含む）。
Studio full reload→canvas準備は1.92〜3.83秒（6回）。1回ずつの観測で、普遍的な性能値ではない。

1080pのfont/geometry mount準備104/115ms、seek＋4RAFは通常64〜106ms、画像有効frameは933〜1117ms。
縦長mount91/96ms、通常seek58〜67ms、画像有効は150〜184ms。1080pの4frame×2exportは
original21.82秒/revised14.48秒、縦長6.24秒/5.66秒。software WebGL2画像処理を実時間再生性能と扱わない。

遅延font trial（100msのprobeを含む準備観測）ではcold mount753ms、preload731ms＋mount118ms。
総時間はcold754ms/preloaded849ms。待機をSceneの前へ移した効果であり、network cost削減ではない。
100ms時点はcold未準備/preloaded準備済み、frameはいずれも0。font/geometryが済んでも初回HtmlInCanvas
準備・bufferが残り得るため、再生開始全体が速くなったことや実時間fpsをこの観測から断定しない。

固定条件：Node26.10.0、React19.3.0、Remotion/effects4.0.532、HeadlessChrome154/Linux x64、
24fps、640×360/1920×1080/360×640、preview DPR1、HtmlInCanvas pixelDensity1、画像対応swangle。
Noto Sans JP700/normal、SHA256
`c2f3b4d463500a2ddcd3849cded1fceeb9fd6d1c32e6cbecd568453ba50fc68f`。
高解像度/縦長はfontSizeをmin(width/640,height/360)で変え、effectのdesign px paramsは固定した。
全parameter/OS/font/GPU、長尺、高解像度動画、実時間fps、一般的な編集不変は未検証。

担当agentはoriginal/revised動画をdecodeした7frame filmstrip、1080p/縦長revised frame180、
Player UI、Studio revised frame240を目視した。静かなwave/rule、arrival84で遅く揃う逐字入場、
mixedの大小/回転からcenterへ戻る差、希望/光の強調、背景motifのscope差、短縮した画像accentを確認した。
縦長は本文/枠が内側に収まり、静かな余白が大きい。1080pも主要配置と強調は対応している。
全frame/全速の連続動画鑑賞、ユーザーのdesign/motion承認は未実施。result.jsonへ目視artifactと所見を記録し、
user=unconfirmed、baseline=candidateを保持した。

640×360の局所変更/復元/exportはraw差0。高解像度の実preview/PNGは取得・目視したが、
1080p8件のpreview/exportで8〜206pixel、再exportで13〜201pixel、いずれもmaxRaw1/maxAlpha0の差が残った。
同一backendでも非整数glyph/Canvas合成の取得経路が関係すると考えられるが、原因の完全分離は未実施。
1080pのraw再現性を検証済みとはせず、代表例の成立と時間だけを確認した。縦長8件は両比較でraw差0。
差を一般許容差で吸収せず、pixelDifferenceへ実測値とunresolved statusを保存した。
preview/exportの一致、export再現性、代表例成立を分ける。swangle文字について12の制約を維持する。
MP4はH264 CRF1/yuv444pのlossyで、代表6frameの平均channel差をPNG完全一致と区別した。
動画全decodeは確認したが全動画frameのPNG比較ではない。

初回sandbox buildは既知のspawnSync tsc EPERMで止まり、同commandを許可された通常環境で成功した。
初回scope変更は別Cutにも1階調差を出したため、透明Scene/背景を例側で分け、scope切替をevent内だけに限定した。
停止中Player controlsのoverlayを映像差として採取した試行、ffmpeg selectのcomma escaping、
font試験で採用版PlayerRefにないisBuffering getterを呼んだ試行は検証側を修正し、失敗runもdistへ保持した。
高解像度の微差を本体変更・params改変・baseline更新で隠していない。
Studioは実save backend/source/full reload/新bundleを確認し、UI Saveボタンの手操作とは区別する。

### 08〜14の到達点と次の入口

08の比較と保存、09のcaller定義/inspection、10の実画像接続、11の17件catalog、
12のcase手順、13の新5件を短い1Compositionのレビュー往復へ接続した。
技術検証・担当agent目視・ユーザーdesign/motion承認は別で、ユーザー確認は未実施。
公開/導入方式、専用AIサービス、skill/plugin/MCP、旧UIや音声解析を決定していない。

次の判断順を提案する（採用・実装は未決定）：

1. original/revisedの12秒動画をユーザーが確認し、入場時間、mixed→center、画像accentの範囲を採否判断する。
2. swangle/1080pの文字端差を切り分ける。backend/Canvas取得/非整数glyph変位を独立caseへ分け、
   同条件export差0を回復できるか調べる。性能もmount/seek/render startupと純描画を分ける。
3. 次の小移植群はdecor/rings・dotsのcurrent box責務、enter/slideRの方向parameter統合を精査する。
   全item運動と逐字運動は区別し、PORTINGのcase/evidenceで選ぶ。vcolsの縦組metrics/約物/maskは延期を維持する。
4. JSONの手動転記、対象frameへの移動、catalog選択→コードの対応を実ユーザー操作で観測し、必要なUXだけを選ぶ。

入口は本結果、統合例README、PORTING、EFFECT-CANDIDATES。
次の段階番号・公開API・配布方針を今回先に固定せず、実測とレビューから別途scopeを決める。


## 段階10の実動接続引き継ぎ（2026-10-03）

JIZURAを単一の公開HtmlInCanvas（pixelDensity1）で包む方式が実動した。
歌詞/decorのみはScene.background=null、背景込みは背景付きSceneを包み、
wrapper外の背景/DOMは加工対象外。Cut時間/seed/local frameの画像fx発火は
resolveSceneを使うcaller側sidecarで、Cut.fx指定を新設していない。
HTML-in-Canvas flag、software WebGL2 blurのswangle、nesting拒否の条件を守る。
Studio literal displacementのnative保存backend・再読み込み・別renderは検証済み。
amount等computed値のGUI保存全般やUI Saveボタン確認は未実施。
[実例](../../remotion-jizura/examples/image-effects/README.md)と[10の結果](10-remotion-effects.md)を入口にする。

## 段階11の選択入口（2026-10-03）

[実Player catalog](../../remotion-jizura/examples/catalog/README.md)は`/?catalog`で利用できる。
getEffectCatalog/searchEffectsのmetadataと用途3例から候補の理由・params・条件を確認し、
08/09/10比較例へ移れる。caller定義/標準画像effectsはimportと実行境界を分け、
検索entryをCut宣言として使わない。未移植候補は[EFFECT-CANDIDATES](EFFECT-CANDIDATES.md)の別report。
13の新5件が完了したら既存一覧へ明示追加し、AIの選定理由と局所修正/再現へ接続する。
代表動画は生成物であり、独自3件/画像2件の動画は組み合わせ例。選択effect単独の動画と取り違えない。

## 段階13からの入口（2026-10-03）

新5factory/型とparameterの確定契約は[API追補](API.md#段階13の明示effect追加2026-10-03)。
[FirstEffectBatch](../../remotion-jizura/examples/batch/README.md)を`/?batch`/Studioで表示でき、
`/?catalog`は新5件を含む17件、package catalogは13件。新5件は明示指定専用、
既存自動候補/seedは変えない。組み込みの意味情報はfactory.metadataではなくcatalogから得る。

mixedは空白/改行を除去し1文字1itemへ配置する。slideLeftはmixedで同時入場、
shrinkは各文字中心へ縮む。centerへ差し替えればglyph staggerと全文中心の収縮になる。
item数/順序の変更はmotion item seedに影響する。inspectionのitemSeedは先頭itemの値、
詳細glyph/rotationは開発harnessのgeometryへ残し、公開snapshotのshapeは拡張していない。
局所編集ではCut/effect seed・font/寸法・時間・全paramsを保存し、固定した別Cutを検証する。

調整値はmixed.mode/rotAmp/smallK/accentIdx、jitter.amount、brackets.pad/stroke/accent、
入退場frame数。縦長で大きなbrackets.pad/stroke、center.offsetは枠/本文をclipしうる。
端点入力が成立しても推奨presetやユーザー承認ではない。
比較command・149PNG/旧参考差・動画/外部consumer・目視と制約は[13の結果](13-first-effect-batch.md)。
13の例は60frameの小比較で、3〜5Cut/10〜20秒の統合例や編集保存syncは14で作る。
Studioの新例登録は済み、Studio操作/Save/reloadは13で未検証なので14で実測する。

### 最終文書チェック

`python3 /tmp/jizura-stage14-doc-check.py`でMarkdown32本のlocal link444件と、変更/未追跡16fileの
末尾空白を確認し、欠落・空白エラー0。`git diff --check`と追加mjs2本の`node --check`も成功。
checkerは一時ファイルでrepositoryへ追加しない。公開exports不変のため外部tarball consumerは今回は再実行していない。
`--ui-only`は補助commandを実装したが今回の最終検証はfull runを使い、補助commandの独立実行はしていない。
