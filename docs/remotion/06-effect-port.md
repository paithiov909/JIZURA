# 段階06：少数effectの移植

状態：完了（2026-10-03、7effect・参照画素比較・実Remotion PNG/動画）。前提：[段階05](05-remotion-frames.md)のframe描画が作業ツリーにあること。
次段階：[07：利用・書き出し検証](07-scene-validation.md)。

## 開始時に読むもの

- [AGENTS.md](../../AGENTS.md)、[ルートREADME](../../README.md)、[作業一覧](README.md)、[共通計画](PLAN.md)。
- 段階01〜05の結果、[確定API](API.md)、パッケージREADME。
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

## 段階01からの確定事項（2026-10-02）

7候補の初期ID・factory・params範囲・等確率候補順はAPI.mdに従う。
centerのfontは解決済みFontSpecに写し、旧font抽選の乱数消費順を保持する。
decorParamsのseed抽選は消費して捨て、group/slot別effect seedをP.seedに使う。
getBBのWeakMap履歴を移植せず、現在frame boxまたはplan静止boxを使う。
exit driftはglyph連結成分/polygon断片も必要。API.mdに従いcomponentキーを安定化し、
fragments cacheをseed別に分離して0seedを保持する。glyph全体のfadeで代替しない。
入退場時間・抽選・font adapter・bbox/component/cacheの差を個別effect数式の比較と分けて記録する。

## 段階05からの実装入口（2026-10-03）

[evaluateFrame](../../remotion-jizura/src/core/frame.ts) は整数active判定の後にローカル秒・
pIn/pOut・holdAmount・stepとapply条件を返す。`activeCutIndex` は時間順のplan indexで、
宣言indexは `cut.prepared.declarationIndex` に残る。外側Sequenceの開始位置は加算しない。
[createCanvasFrame / drawFrame](../../remotion-jizura/src/canvas/frame.ts) は
`ScenePlan<CutGeometry>` とframeから、当該Cutのitem/glyph/font/boxを作業用に複製する。
06はこの入口へenter→hold→exitと背面→文字→前面を接続し、char/piece/clip等も毎frame生成する。
boxは04の静止geometryのコピーなので、center完成後は静止fallbackと当該frameのboxを更新する。
履歴bboxを導入しない。`drawFrame` の任意transformはテスト用の内部入口で、公開拡張APIではない。

05の `TimedCuts` は全motion/decorを無効化した静止文字の切り替え例。
テスト内のsin/scale変形はJIZURA effectの移植ではない。
`npm run check:remotion`、`node remotion-jizura/tests/frame-browser.mjs`、
`node remotion-jizura/tests/canvas-browser.mjs` を回帰の入口にする。
35件のNode契約・境界/Sequence PNG・50frame書き出しと検証条件は[05の結果](05-remotion-frames.md)を参照。

## 結果・引き継ぎ

2026-10-03：完了。現在の `remotion` ブランチで実施。開始時に段階05の実装・結果と
未コミット差分15ファイルが存在した。その差分を保持して06を追加した。
候補変更なし。参照engine/effects、既存baseline、公開exports/props、依存・lockfile・build設定は変更なし。

### effect対応表と実装

| ID / group | 移植元 | 移植先（package内） | 保持した依存・比較 |
| --- | --- | --- | --- |
| center / layout | `effects/core/layouts.ts` center/splitLines/splitWords | `src/canvas/center.ts` | sxを含むfit、track優先、ox/oy、accent、sub、under。改行・Latin・日本語・強調を比較 |
| pop / enter | `effects/core/animation.ts` pop | `src/effects/motion.ts` | glyph index/全glyph数、outBack/outCubic、effect.itemSeed。単独・組み合わせ画素差0 |
| wipe / enter | 同wipe、layouts drawFx | `src/effects/motion.ts`、`src/canvas/effect-frame.ts` | 入場前のmeasure、seedの方向、clip、バー。両方向で画素差0 |
| breathe / hold | 同breathe、mainDrawのamt | 同motion/effect-frame | ローカル秒とholdAmount、size/trackを変えて再組版。単独・組み合わせ画素差0 |
| drift / exit | 同drift、`engine/text.ts` drawPieces/fragList、`ui/services/fonts.js` | 同motion/effect-frame、`src/canvas/glyphs.ts` | 連結成分、polygon断片、移動/回転/stretch/alpha。単独・組み合わせ画素差0 |
| kasumi / decor back | `effects/packs/decorB.ts` kasumiとrrPath/part/stroke | `src/effects/decor.ts` | 解決済みP.seed、n/right、lt/ltb、paletteの明暗/contrast。画素差0 |
| checkerStrip / decor front | `effects/packs/decor.ts` checkerStripとcornerSpot/rects/segs | 同decor | vの3種類、right/low、accent、当該frame bbox。画素差0 |

`src/effects/math.ts` はutilのhash参照、乱数値、easing、lum/contrastの必要部分だけ。
全7候補がruntimeに接続済み。自動候補順・等確率はAPI v1どおりで、旧重み/history/適合抽選は
追加しない。factoryは宣言のみで、DOM・乱数・描画を呼ばない。parameterは段階03の
`generatedParams` でplan時に確定し、全bagを生成後に明示値を上書きする順を保った。

### 状態・geometry・参照との差の扱い

- `CanvasMeasurementService` はcenterの完成した静止geometryとsubtitle geometryを計測する。
  subtitleの本文もfont準備のsampleへ含める。sxをfitに反映し、fontSizeを上限にし、
  明示params.track→Style.track→自動trackを保持する。body/display/serifは同じ解決fontを使う。
- centerの明示改行は境界として保持し、各行に旧splitLines/splitWordsを適用する。
  旧splitLinesが複数行全体を再分割する挙動より、APIの「単一Cut文字列は改行を保持」を優先した。
  改行後のglyphには元code point indexを写し、強調を追従させる。公開型・parameter範囲は変更なし。
- `drawFrame` はscratchを作り、enter→hold→exit、背面decor→文字→center subtitle/under→
  前面decorの順で同期描画する。breathe後に不変のadvanceからglyphを再配置する。
  文字/char/clip/pieceの変形はplanや前frameへ保存しない。無効化は即時・静止・装飾なし。
- bboxは旧drawItemの論理boxに合わせ、popのhide/scaleとbreatheの再組版を含める。
  glyph回転、clip、飛散したpieceの実占有域は旧どおりboxに含めない。
  現在frameの有効box→plan静止box→centerBB fallbackを使い、旧WeakMap履歴は使わない。
  kasumiはそもそもbboxを参照しない。checkerStripは当該frameのboxで配置する。
- glyph rasterは64/128/256/512 bucket、alpha閾値60、8近傍連結、2回のfringe拡張、
  微小成分merge、面積降順・同面積は走査順を保持する。componentキーは
  `h(sid(ch), bucket, pieceIndex+1)`。fragment数・clip polygon・pieceの運動式は保持する。
  cacheはcanvasごとにfont/文字/bucket/itemSeedをkeyとし、最大256 entry。
  sprite tintはseedごとに生成したPiece objectのWeakMapで分離する。seed0を保持し、
  cache破棄・evictionでも再生成結果は同じ。Scene cleanupでcanvasのcacheを破棄する。
- 比較adapter `tests/effect-reference.jsx` は保持した旧installerを独立に呼び出す。
  解決font/Style/fontSize/強調、group別itemSeed、明示改行、現在frame bbox、安定componentキーと
  seed別fragment再生成を旧側へ適用する。旧effectの数式・描画コードは変更していない。
  旧planner抽選・履歴bbox・採取順counter・最初のseedのcache状態との一致は要求しない。
  小さい入退場0では旧applyを無効化するadapterを使い、05の整数phase契約を優先する。

### 変更ファイル

- 新規source：`src/canvas/center.ts`、`effect-frame.ts`、`glyphs.ts`、
  `src/effects/math.ts`、`motion.ts`、`decor.ts`。
- 更新source：`src/canvas/service.ts`、`geometry.ts`（subtitle）、`frame.ts`（実effect接続）、
  `src/react/JizuraScene.tsx`（cache cleanup）、`src/effects/declarations.ts`（移植状態の注記）。
  `frame.ts` は開始時に存在した段階05の未追跡ファイルへの更新。
- 例：`examples/index.tsx` にEffectSamples。`mode`で全固定・部分固定・自動・無効化・
  seed違い・同ID複数を表示。`offset`と`motionFps`も指定可能。
- 新規テスト：`tests/effects.test.mjs`、`effect-cases.js`、`effect-reference.jsx`、
  `effect-entry.jsx`、`effect-browser.mjs`。更新 `tests/browser-entry.jsx` は04の歴史的な
  静止subset比較を専用test serviceで保持し、公開Sceneは新centerを使う。
- 文書：本メモ、07入口、作業一覧、PLAN、API実装状態/改行規則、ルート/パッケージREADME。
  01〜05の過去の検証記録は書き換えていない。

### 検証条件と結果

Node26.10.0/npm11.19.1、React19.3.0/Remotion4.0.532、Chrome154.0.8037.97。
Noto Sans JP 700/normal、04と同じ可変TTF、SHA-256
`c2f3b4d463500a2ddcd3849cded1fceeb9fd6d1c32e6cbecd568453ba50fc68f`。
fontの取得/OFLは[04の結果](04-static-canvas.md)とパッケージREADMEを参照。
比較/書き出しは640×360、24fps、fontSize64、motionFps=null。
固定centerはseed123、sx1/track0.08/ox0/oy0/sub=false/under=false/accent=false。
各effectの解決seed/paramsは `effect-result.json` の `resolved` に記録し、
入力は `tests/effect-cases.js` に保持する。
previewはviewport1280×800・DPR2、Canvasはdesign解像度。12 motionFpsも別に検証。

| 実行 | 結果・証拠の範囲 |
| --- | --- |
| `npm run check:remotion` | strict型検査・ESM/型build・41件Node契約成功。6件追加でcenter reflow/Style/subtitle、旧pop/driftのcallback値、polygon面積/seed0、scratch/bbox、group独立性。font Node部分はmock |
| `node remotion-jizura/tests/effect-browser.mjs` の参照比較 | 19条件（7候補、wipe両方向、checker v0/1/2、日本語/Latin/明示改行、部分/全固定、自動、無効化、seed違い、重複decor）とCut境界。**283frameの全pixel差0**。基本frame0/1/3/8/14/24/30/43/48/55/59/60、fixedは0..60すべて。geometry差は1e-9未満 |
| 同preview/cache確認 | 各条件で0→55→10→55→30→1→59→30一致。cache破棄・別Cut seed・seed0 polygon分離・motionFps12の隣接姿勢一致。StrictMode、Sequence offset12、複数Scene、再mount、plan再生成と直接canvas一致。最終face/handle0 |
| 同Remotion `renderStill` | frame0/3/10/30/43/48/55/59/60、frame55再取得、offset12 local3/30/55/60。直接描画/繰り返し/Sequence画素一致。自動/部分/無効化/seed違い/重複例のPNGも取得 |
| 同 `renderFrames` | concurrency2、0..60の61PNG。全frameが独立した直接描画のPNGと全pixel一致。前frame残留・非連続取得との差なし |
| 同 `renderMedia` / ffprobe / ffmpeg | H.264 CRF1/yuv444p、concurrency2、640×360/24fps/61frame（約2.542秒）。全decode成功。各動画frameは対応PNGが全61候補中の最小差（同画素の同率を許可）。圧縮差はchannel最大129、frame平均channel差最大1.426193。PNG完全一致とは区別 |
| `node remotion-jizura/tests/canvas-browser.mjs` | 04の静止subset4条件の画素差0、caller face・準備失敗・StrictMode・cleanup成功。歴史的subsetはtest-only serviceで比較し、完成centerの証拠と区別 |
| `node remotion-jizura/tests/frame-browser.mjs` | 05の整数境界、D1、空白/範囲外、Sequence12/60、seek、遅いfont準備、50PNGと短いMP4の回帰成功。新centerで再検証、05当時の静止geometry画素を固定するテストではない |
| `npm run studio:remotion -- --port=3106 --no-open --public-dir=../dist/remotion/stage04/assets` / `node dist/remotion/stage06/studio-check.mjs` | 実Studio bundle・EffectSamples表示、0→55→10→55→30→60。frame55一致、ready=true、Canvas640×360、handle0、render errorなし。確認後停止 |
| `node --check remotion-jizura/tests/effect-browser.mjs` / `node --check remotion-jizura/tests/effects.test.mjs` | 成功。JSX/参照adapterはVite bundleと実行で検証 |
| `python3 /tmp/jizura-stage06-check.py` / `git diff --check` | 変更Markdown8ファイル101ローカルリンク欠落0、公開source88importはpackage内とReact/Remotionのみ、新規/既存差分の空白エラーなし。geometry差最大2.274e-13 |

比較画像・JSON・動画は無視対象 `dist/remotion/stage06/`：`effect-result.json`、
`{case}-{frame}-target.png` / `-reference.png`、`frame-*.png`、`frames/`、
`effects.mp4`、`studio.png`、`studio-result.json`。
fixed退出frame55のpolygon断片、hold frame30とStudioを目視確認した。
全frameは自動画素検証で、動画全体を目視再生したという証拠ではない。

sandbox内のbuildは `spawnSync tsc EPERM` のため、許可されたsandbox外で同じcheckと
ブラウザ/Studioを実行した。最初の追加Nodeテストは不正なParsedChunk shapeと
旧PT未初期化のtest setupで失敗し、正式source shapeと旧text installerを使って修正した。
画素比較の許容差は0のまま。動画でchannel差129を測ったため、平均差だけでなく
全PNG候補との最短差も検証し、frameずれがないことを確認した。
旧build経路は変更していないためroot `npm run check` とspikeは再実行していない。

### 制約と段階07の入口

この同一Chrome/固定font環境では対象7effectの単独・組み合わせに未解決の画素差はない。
任意OS/ブラウザ/font、未収録glyphのfallback検出、長い本文の性能、Player、
速度変更/trim/loop、外部consumer、Adobe/CEP実機は未検証。
Studioのdefault props source保存は05と同じ「Cannot find root file in project」警告があり、
表示/seek/書き出しとsource保存の証拠を区別する。commit・push・publish・releaseは行っていない。

[段階07](07-scene-validation.md)はEffectSamplesと `node remotion-jizura/tests/effect-browser.mjs` を
回帰入口に、共通計画のPartA/PartB・120frame例、Player、並列書き出しの再現性、
packしたパッケージの外部consumer検証と利用文書を完成させる。
06ではPartA/PartB統合・外部install・npm公開は実施していない。
