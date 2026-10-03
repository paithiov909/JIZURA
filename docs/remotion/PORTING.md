# effect追加・検証・レビューの共通手順

段階12で追加した開発用harness。公開APIや保存project形式ではない。
[API](API.md)、[候補5件](13-first-effect-batch.md)、[結果](12-port-validation.md)と併用する。
旧source・baselineを保持し、生成物はignored `dist/remotion/stage12/run-*/`へ毎回新規保存する。

## 実行と前提

repo root、Node26.10.0、root lockfileの依存、local Chrome、ffmpeg/ffprobeが必要。
package READMEの[固定font取得](../../remotion-jizura/README.md#development)で
`dist/remotion/stage04/assets/NotoSansJP.ttf`とOFLを用意する。
font SHA256は`c2f3b4d463500a2ddcd3849cded1fceeb9fd6d1c32e6cbecd568453ba50fc68f`。
異なるfontを同じ回帰条件へ黙って代入しない。`JIZURA_BROWSER`でChromeの絶対pathを指定できる。
serverはharnessが起動・停止し、既存Studio/Playerを必要としない。

```sh
npm run check:remotion
node remotion-jizura/tests/port-validation.mjs --list
node remotion-jizura/tests/port-validation.mjs
node remotion-jizura/tests/port-validation.mjs --case=combined,custom,image-combined
node remotion-jizura/tests/port-validation.mjs --case=combined --stills-only
node remotion-jizura/tests/port-validation.mjs --case=mixed,slideLeft,shrink,jitter,brackets,batch --output=dist/remotion/stage13
# 過去の完了runの絶対pathを指定する。raw PNG比較で、採用状態は自動変更しない。
node remotion-jizura/tests/port-validation.mjs --case=center,custom,image-combined --stills-only --compare-to=/absolute/path/to/dist/remotion/stage12/run-XXXXXX
```

段階12当時は23case/7動画。段階13で21case/7動画を追加し、現在の全runは44case/14動画。`video:true`を指定したcaseは自動でMP4を取得する。
`--stills-only`は動画取得だけを省略し、代表PNG・seek/remount・negative gate・指定caseの
並列比較は実行する。`--output=dist/remotion/stage13`は保存先parentだけを変え、run directoryを毎回新規作成する。
全case全parameter全frameの総当たりではない。
Chrome/build/render checksを重ねず、この16GB hostでは通常concurrency1、combinedの
PNG比較だけconcurrency1/2を順次実行する。文字はGL既定（gl:null）、画像fxはswangle。
種類が変わるとbrowserを閉じて次を開き、同時に所有するbrowserは1つ。条件はcase別にも保存する。

## 追加する順序とsource

1. 移植元group/ID/path、数式、依存、認識できる特徴、意図した適応を対象メモへ書く。
   旧planner/seed/project互換、描画アルゴリズム参考比較を区別する。
2. 組み込み実装はpackage内に置く。factory/型/parameter検証を接続し、公開追加なら
   `src/index.ts`、API、README、compile-only型、厳密export一覧を同期する。
   caller定義は09のdefineLayoutEffect/defineMotionEffect/defineDecorEffectをimportする。
   native画像factoryは10の別境界。Scene/Cutの文字decorへ画像descriptorを渡さない。
3. 11のcatalogに説明・params意味/範囲/default・制約・source/evidence・視覚例を追加する。
   suitabilityは仮説。13の5件は明示指定専用、autoSelect=false。初期候補順を維持する。
4. [port-cases.ts](../../remotion-jizura/tests/port-cases.ts)へ一意のcase ID、条件とreasonを追加する。
   IDはharnessだけの識別子。Cutの公開ID/seedへ転用しない。各caseを単独で追試できる。
   [port-model.tsx](../../remotion-jizura/tests/port-model.tsx)のpreset→factory接続を追加する。
   scalar入力だけを保存し、import済みfactoryを再生成する。独自宣言をJSON復元しない。
5. 型/契約・invalid paramsを先に確認し、focused harnessと既存固定例回帰を実行する。
   公開export変更は実tarball consumer、build経路変更はroot/spike checksも行う。
6. 代表PNG・短い動画の採取frame列を目視し、[レビューtemplate](PORT-REVIEW-TEMPLATE.md)へ
   技術結果・担当agentの目視・ユーザー確認・回帰基準の採否を別々に記録する。
   担当メモ・状態表を更新し、未確認項目と次段階の入口を残す。

## ケースの選び方

| 責務 | 代表ケースと理由 | 追加時の確認点 |
| --- | --- | --- |
| layout | center、long-wide、multiline-tall、latin、bounds-low/high | 短/長、reflow、改行、強調index、space、Latin、横長/縦長、size/track/offset |
| motion | pop/wipe/drift/breathe、combined、one-frame、quantized | 入場start/mid/end、保持、退出開始/終盤、D1、seed0/uint32上端、motionFps、item中心/spacing |
| decor | kasumi/checker、combined、custom、portrait | back/front、null/current box、layer順、端への接触、透明、意味のあるparams端点 |
| caller | custom、custom-low/high | 09のlayout/motion/decor、schema端点、0振幅/速度、thickness、accent、強調/改行 |
| image | image-glitch/standard/combined/reverse、image-independent | slice/blur、配列順、透明歌詞/独立画像、amount端点、Cut-local時間、無効化/復元 |

frame一覧は`representativeFrames`がCut境界・phase時間から計算する。
CompositionはScene終了frameより1frame長くし、rendererによる範囲外frameのclampを避ける。
可視性のgateはcaseの中間anchorで背景のみとの画素差を確認する。
入場前の非表示やdriftのはみ出し、装飾の端への接触を全frame可視/bbox内制約で禁止しない。
空白/終了のclearは背景・alphaと境界画像で確認する。geometry.boxは回転/clip/shardの
厳密な可視境界ではなく、これだけで「切れていない」と判定しない。
背景だけのgap・Scene終了のalpha全0は独立に作ったblank画像と照合する。
独立画像caseはgapでも原画像を保持して加工だけを無効化し、境界のpass-throughを比較する。

13向けの拡張箇所は[port-entry.jsx](../../remotion-jizura/tests/port-entry.jsx)のgeometry採取。
`createCanvasFrame`→`prepareEffectItems`の後にstate/step/current box/motionsと
itemの中心・size・track・全glyphの位置/advance/色/codePointIndexをJSONへ保存する。
mixedの個別glyph配置/強調、shrinkのitem中心/track、jitterの同step/隣step、
bracketsのnull/current boxをここでeffect固有の期待式/関係へ照合できる。
現在は診断値の採取とquantized pairの一致だけ。未実装5件の正しさを検証済みとはしない。
必要な内部geometry/item経路と旧adapterは13で実装し、caller公開型は先に広げない。

## 判定と比較の3種類

| 比較 | 判定・位置づけ |
| --- | --- |
| 旧source参考 | `legacy:true`だけを06のdrawReferenceへ渡す。PNG/画素差を記録するがgateにしない。font、改行/reflow、emphasis、itemSeed、現在box、glyph断片cacheのadapter補正は[06](06-effect-port.md)とsourceに保持。旧plannerとの独立比較ではない |
| 新実装回帰 | 同runのdirect/Player/export、逆seek、cache破棄、StrictMode再mount、並列renderを判定。`--compare-to`は完了runとの同環境/同case入力raw一致。採取しただけのrunはcandidateで、採用した基準とは区別する |
| 別条件目視 | font/OS/backend、縦横サイズ、本文/paramsの異なる画像を並べて評価。raw一致を要求しない。環境が違う`--compare-to`は拒否し、一般許容差へ広げない |

通常のraw比較は画素差0。画像fx/透明文字のCanvas PNG→Remotion screenshotだけ、
raw最大差1、alpha差0、丸めたpremultiplied RGB差0を同時に要求する（10の取得丸め、
12の透明custom frame4でも2pixel/raw最大1を実測）。
同じrender同士の並列/過去run比較は画像fxもraw差0。GPU一般の許容差ではない。
MP4はlossy、透明は合成される。ffprobe/全decodeは動画成立の証拠であり、
全動画frameのPNG一致や視覚採用の証拠ではない。alphaはPNGを確認する。

毎回caseの保存input.jsonを再読込し、同じinputPropsで
[selectComposition](https://www.remotion.dev/docs/renderer/select-composition)を実行する。
解決propsと寸法/時間を照合し、editを実描画へ渡し、preview/PNGに有意な変化を要求する。
さらに古いCompositionへedited inputPropsだけを渡した実PNGを取得し、差を検出できることを確認する。
同じ誤入力/空画像同士の一致だけで成功としない。

## 失敗の再現と出力

```sh
# すべて意図した非zero終了。通常成功commandとは別に実行する。
node remotion-jizura/tests/port-validation.mjs --case=center --stills-only --inject=parameter
node remotion-jizura/tests/port-validation.mjs --case=center --stills-only --inject=empty
node remotion-jizura/tests/port-validation.mjs --case=center --stills-only --inject=pixels
node remotion-jizura/tests/port-validation.mjs --case=center --stills-only --inject=stale-props
```

`result.json`のstatus/failure.stage/message、case.json、browser.json、input/edited-input、
preview/export/legacy/stale-props-negative PNGを順に確認する。consoleへ巨大pixel bufferを出さず
differentPixels/maxRaw/maxAlpha/maxPremultipliedを記録する。途中成功caseは結果を逐次保存する。
parameterはfactory、emptyはanchor、pixelsは20pxの意図した赤い描画変更、stale-propsは
旧Composition再利用の実描画とprops照合を通じて再現する。

各runには環境/font hash、全case条件/理由、prepared snapshot、計測geometry、frame state、
代表PNG比較、preview/旧参考/export/edited-exportを横に並べたcomparison.png、
動画/filmstrip、動画metadata、並列比較、negative gate、harness/adapter source hashを保存する。
filmstripは動画から代表frameを直接選んで並べ、左からのframe番号をvideo.sampleFramesへ残す。
空tileを終了frameと取り違えない。透明動画は黒へ合成され、PNGのalpha確認と分ける。
`review.json`はpending/unconfirmed/candidateで生成する。目視後に担当者がコピー/記入し、
case/frame/artifactへの対応を残す。sourceにはcase・必要な小fixture・採取条件を保持し、
生成動画/大きな画像/レポートをcommitしない。baseline一括更新commandは設けない。

画素診断は描画元へgetImageDataを呼ばず、保存PNGをdecodeして別のCPU witness Canvasで読む。
Chromiumには[readbackによるGPU→CPU切替heuristic](https://chromium.googlesource.com/chromium/src/third_party/%2B/master/blink/renderer/modules/canvas/canvas2d/base_rendering_context_2d.cc)がある。
12の初期試行で直接読取後の復元に1936pixel/最大2の差が出て、witness読取へ変更すると解消した。
heuristicが原因という説明はsourceとこの切り分けからの推定で、backend telemetryは取得していない。
この対処はharnessの観測方法だけで、本体のCanvasや一般許容差を変更しない。
一方、swangleのkasumi seed0/frame16はPNG経由の読取でも逆seekに360pixel/最大50の差が残った。
同caseをGL既定条件へ変えると解消した。backend起因が疑われるが完全な原因分離は未実施。
文字は初期検証と同じGL既定条件でgateし、画像fxはswangleでgateする。
swangle文字の厳密な再現性を保証せず、差を許容するgateやbaseline更新を追加しない。
直接Canvas/公開Playerは同じemitted runtimeをimportする。src/distの別runtimeを混ぜると
font所有権と独自宣言のWeakMapが分離する。build後にharnessを起動し、動作中に再buildしない。

## 段階13で追加したgate

新5件のcaseはbatchSchemasの端点、mixedの2/9/10/16字・長文/縦長・元強調index、
slideLeftの1字/複数行/D1、shrinkのbreathe/mixed、jitterの0/step/量子化/並列、
bracketsのnull/current boxとpad/stroke端点を含む。`tests/batch-gates.jsx`は
旧util/classificationと実測advanceを使い、geometry/alpha/seed/boxの固有期待式を検査する。
新helperの出力だけを期待値にコピーしない。旧reference adapterは原型を独立実行し、
単一font・Style.fontSizeの行単位cap・強調・motion item seedへ適応する。
旧bracketsは固定pad18/stroke2.2のままなので、新しい端点値とは意図した画素差がある。
公開consumerとcatalog例の検証は`batch-consumer.mjs`と`catalog-browser.mjs`、
command/結果は[13](13-first-effect-batch.md)に記録する。
