# 段階10：Remotion標準effects接続の試作

状態：完了（2026-10-03、実装・技術検証。ユーザー目視は未確認）。前提：[09の結果](09-custom-effects.md)。
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

2026-10-03：現在の `remotion` ブランチで段階10を実装・技術検証した。
開始時はクリーンで08/09のコード・結果と固定fontが存在した。11以降は実装していない。
公開追加はsliceGlitch/型、標準blur依存は4.0.532のdev依存としてroot lockfileへ追加。
参照source・baseline・初期PLAN/VALIDATION・package versionとpeerは保持した。

### 接続案と採否

| 方式 | 評価と今回の扱い |
| --- | --- |
| 通常canvasにeffects props | 非対応。propsだけの接続を成果にはしない |
| 公開HtmlInCanvasで既存Sceneを包む | **採用・実動**。内部ref/APIなし、文字描画は既存Scene、native capture/chain待機はRemotionが所有 |
| Canvas出力callback→PNG/CanvasImage bridge | 今回未実装。frameごとのencode/decode/別待機と新Scene契約が必要なため、実動したwrapperを優先 |
| Canvas/chain内部APIを直接使用 | 不採用。private APIへのruntime依存を設けない |

採用型と公式[Effects](https://www.remotion.dev/docs/effects)、
[createEffect](https://www.remotion.dev/docs/create-effect)、
[HTML-in-canvas](https://www.remotion.dev/docs/html-in-canvas)を確認した。
wrapperは1つ、pixelDensity1に固定。採用4.0.532の実装はHtmlInCanvas nestingを拒否する。
previewはChrome149+のHTML-in-Canvas flagが必要。実測Chrome154/Linuxでは公開rendererが
CanvasDrawElementを有効化し、blurはWebGL2/software `swangle`、sliceはCanvas2Dで動いた。
angle/実GPU/別browserの性能や画素一致は今回保証しない。

### 独自画像effectと確定契約

[API追補](API.md#段階10の画像effects契約2026-10-03)を確定。
`sliceGlitch` はnative createEffectのfactory、09の文字用宣言とは別のEffectDescriptor。
schemaはRemotion InteractivitySchema、typeはio.jizura.sliceGlitch。
amount/displacement/bands/seed/frame/fps/rate、標準disabledを検証する。
frameは明示Cut-local整数、tick=floor(frame*(rate/fps))、hash(seed,tick,band)で変位を決める。
setInterval/Math.random/前frame/履歴bufferなし。rate0は静止pattern、amount0はpass-through。
setupはnullで独自資源を持たず、Canvas/標準GPU chainのcleanupはRemotionへ委ねる。

旧rendererのslice（水平帯のずれ）を表現の参考にした。旧版は現在frameへ部分帯を
重ね描きし、透明時はalphaGuardを使う。今回は全高の固定bands、seed/Cut-local tick、
整数変位、target clearとwrapによる一回の再構成へ適応した。旧planner/画素互換の移植ではない。
採用版のchromaticAberrationはamount/angleによるRGB分離、noiseDisplacementは局所noise場。
今回の帯ごとの離散的なずれ・時間pattern・透明の保持をそれらへ無理に合わせず、sliceを新作した。
標準blurは再実装せず既存factoryを使用する。

利用側例の同じCut宣言をresolveSceneへ渡し、解決 `[12,48)` / `[60,96)`、Cut seed、
Sequence frame - Cut.fromから標準/独自画像fxを発火する。空白と終了frameはdisabled、
次Cutでframe0へreset。Scene.motionFpsとは独立。Cut.fx等の新propsは設けない。
`target=lyrics`はbackground=nullの歌詞/decor層、sceneはScene背景込み、imageは独立SVG。
画像側はfont不要で同factoryが動く。wrapper外背景/DOMは加工しない。
配列順blur→sliceを通常例、slice→blurを順序比較にした。

### 変更ファイル

- 本体：`remotion-jizura/src/effects/slice-glitch.ts`、`src/index.ts`。
- 依存：`remotion-jizura/package.json`、root `package-lock.json`。
  @remotion/effects4.0.532は例のdev依存。packed library importsは既存peer/内部だけ。
- 例：`examples/image-effects/ImageEffects.tsx`、`ImageEffectsPlayer.tsx`、`README.md`、
  `examples/StudioRoot.tsx`、`examples/player/main.tsx`。既存Playerの `/?image-effects` を追加。
- tests：`image-effects.test.mjs`、`image-effects-types.tsx`、`image-effects-entry.jsx`、
  `image-effects-browser.mjs`、`image-effects-studio.mjs`、`image-effects-consumer.mjs`。
  厳密export一覧の `scaffold.test.mjs` / `consumer-validation.mjs`を新公開値へ同期。
- 文書：root/package README、API、本メモ、作業一覧、EXTENSION-PLAN、11/12/14の入口。

### 実行command・結果

すべてrepo rootから。新commandは下表の3つのimage-effects mjs。
生成物はignored `dist/remotion/stage10/`。fontは段階04のNoto Sans JP700/normal、
SHA256 `c2f3b4d463500a2ddcd3849cded1fceeb9fd6d1c32e6cbecd568453ba50fc68f`。
Node26.10.0、React19.3.0、Remotion/effects4.0.532、Chrome154、640×360/24fps、preview DPR2。

| command | 実行結果と証拠の範囲 |
| --- | --- |
| `npm install --workspace remotion-jizura --save-dev --save-exact @remotion/effects@4.0.532 --cache /tmp/jizura-remotion-npm-cache --fetch-retries=0 --fetch-timeout=15000 --no-audit --no-fund` | 採用版をroot lockへ追加。npmの既存esbuild install-script warningは残る |
| `npm run check:remotion` | 最終53/53 Node契約、strict型/ESM/d.ts build成功。native EffectDescriptorの型、文字decorへの誤渡し、parameter異常とkey/disabledを含む |
| `node remotion-jizura/tests/image-effects-browser.mjs` | 実Player45sample、7案、逆seek、同seed/frame、seed差、量変更/復元、StrictMode再mount、Sequence offset24、最終owned font0。独立image/背景込み/文字層とalphaを確認 |
| 同commandのPNG | 保存input JSON再読込→Composition再解決→45PNG。26件raw画素差0、19件raw RGB最大差1、全件alpha差0・丸めたpremultiplied RGB差0。最初の不一致は39pixel、raw平均channel差0.0000477431、premultiplied差0で、Canvas PNG対screenshotのunpremultiply丸めを実測。許容条件はこの取得経路だけに限定 |
| 同commandの動画 | scene/combinedをframe0..119、concurrency2、H.264 CRF1/yuv444p、5秒/120frame。ffprobeと全frame decode成功。lossyでありPNG完全一致や全動画frameの画素照合とは区別 |
| 同commandの1080p | 1920×1080のframe12/24/47 PNG成功。fresh-browser renderStill（起動/font/capture/blur/slice/PNG込み）10.415/9.316/9.955秒。別の30frame Canvas2D slice+toDataURLは中央値37ms（純applyだけの時間ではない）。同ホストで他checksも動いた測定で、24fpsの安定preview性能を保証しない |
| `npm run studio:remotion -- --port=3110 --no-open --public-dir=../dist/remotion/stage04/assets` / `node remotion-jizura/tests/image-effects-studio.mjs` | 実Studio native save-effect-props backendでdisplacement .05→.1→.05、source読取・full reload・各別bundle PNG。可視差/復元成功、3PNGもalpha/premultiplied一致・raw最大1。sourceは正確に復元、起動したStudioは検証後停止。UI Saveボタンは未確認 |
| `node remotion-jizura/tests/image-effects-consumer.mjs` | 実tarballをrepo外 `/tmp` へinstall、workspace linkなし。strict TS、deep import拒否、packed imports153件を確認。native7PNG＋旧LyricsDemo11PNGが対応renderと全画素一致。必要な標準effectsはconsumer自身に別途install |
| `npm exec --workspace remotion-jizura -- vite build --config examples/player/vite.config.mjs --outDir ../../../dist/remotion/stage10/player` | 新しいPlayer入口のproduction bundle成功。既存use-client/outDir/chunk-size warningのみ |
| `node remotion-jizura/tests/custom-browser.mjs` | 段階09の2実Player・22PNG全画素一致、逆seek/局所変更/identity swap/StrictMode/cleanup、60frame動画decodeを回帰確認 |
| `npm run check` | 保存参照4target build、型/i18n/engine/effect/output/AE ja/en object-model mock成功。Adobe/CEP実機ではない |
| `npm run spike:build` / `npm run spike:test` | 保存spike build、Node VM/AE model mock成功。実Adobe証拠ではない |
| `node --check`（追加mjs4本） / `python3 /tmp/jizura-stage10-doc-check.py` / `git diff --check` | 構文成功。変更/追加26file、Markdown10本のlocal link162件、追跡/未追跡の末尾空白を検査し、欠落/空白エラー0 |

最初のsandbox内npm installはEAI_AGAIN、check内buildは既知のspawnSync tsc EPERM。
同commandを許可された通常実行環境で再実行した成功結果を採用。
最初のbrowser checkはraw PNG厳密一致の丸め差で停止し、上記の実測条件を確認して再実行成功。
raw不一致を全画素一致と記録しない。Vite Playerの既存use-client warningは残る。
保存PNGの追加Python/ffmpeg decodeではlyricsのframe11/48/96/120でalpha全0、
sceneの代表9frameでalpha全255、独立imageのCut開始frame12と非加工frame11の可視差を確認。
結果は `artifact-alpha-result.json`。

### 目視と限界

担当agentは加工/無効の歌詞比較PNG、独立image frame24、Studio変更後画面、
5秒MP4を2fpsで抽出した10frame contact sheetを目視した。
横帯のずれ、標準blur、朝/光の強調、Cut間の空白と背景保持を確認。
連続再生による動きの鑑賞、ユーザーdesign/motion承認、native Inspector/Saveボタン操作は未確認。
Studioはliteral displacement/bands/rateを保存できる形式。amount/seed/frame/fps/disabledは
computedと判定され、代表displacement以外の保存全組み合わせは試していない。
Player/Studio/JSON同期は自動化していない。

本接続はexperimental HTML-in-Canvasの制約を引き受ける。別GPU/OS/browser/font、
一般DPR/scale、長尺の資源推移、独立動画、複数入力/Sceneの合成、縦長は未検証。
1080pは3PNGとslice+PNG serializationの代表測定だけで、全動画/リアルタイム性能は未確認。
全fx、history残像、camera/bg/treat移植、新GPU基盤、catalog/共通harnessは実装していない。

11はnative画像factory/schemaとglyph/decor metadataを区別して一覧化する。
12へalpha/配列順/半開区間/offset/復元/取得丸めのケースとfocused commandsを渡す。
14は単一wrapperを採用し、歌詞のみ/背景込みとwrapper外背景をレビューの適用先として扱う。
[11](11-effect-catalog.md)・[12](12-port-validation.md)・[14](14-review-loop.md)の入口を同期した。

## 段階09からの入口（2026-10-03）

09の公開値はdefineLayoutEffect/defineMotionEffect/defineDecorEffect/resolveScene、
Scene.onInspect。詳細は[APIの追補](API.md#段階09の拡張契約2026-10-03)。
decorはlibraryがsave/restoreするCanvas2Dの図形描画で、画像effectではない。
Sceneは引き続き通常DOM canvas。内部ref・全画素加工・標準effects propsは公開していない。
10ではこの境界を前提に採用版の公開APIで接続を試す。独自文字motionのschemaへ
画像fxを押し込めない。新しい出力callback等が必要なら09の契約を明示的に拡張する。
実例は[custom README](../../remotion-jizura/examples/custom/README.md)、
実描画入口は `node remotion-jizura/tests/custom-browser.mjs`。
