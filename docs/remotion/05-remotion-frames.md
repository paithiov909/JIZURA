# 段階05：Remotionのframeと描画の接続

状態：完了（2026-10-03、整数frame評価・境界/Sequence PNG・Studio・短い動画）。前提：[段階04](04-static-canvas.md)の実フォント・静止描画が作業ツリーにあること。
次段階：[06：effect移植](06-effect-port.md)。

## 開始時に読むもの

- [AGENTS.md](../../AGENTS.md)、[ルートREADME](../../README.md)、[作業一覧](README.md)、[共通計画](PLAN.md)。
- 段階01〜04の結果、[確定API](API.md)、パッケージREADME。
- [renderer.ts](../../engine/renderer.ts)、[基本layoutのmainDraw](../../effects/core/layouts.ts)。
- 採用Remotion版の `useCurrentFrame`、`useVideoConfig`、Sequence、描画待機の公式資料。

## 目的と成果物

Sceneのローカルframeから有効Cutと進行を計算し、Canvas描画をRemotionへ接続する。
実effect移植に先立ち、時間・frame取得順・描画完了の契約を検証する。

## 作業

1. 整数frameでSceneとCutの範囲を判定し、Cutローカルframeを求める。
   秒への変換、enter・hold・exitの進行、量子化は段階01の仕様に従う。
2. 外側Sequenceのローカル時間をそのまま使う。Sequence開始frameを二重加算しない。
   Sceneの範囲外、明示配置の空白、Cut境界で前frameの文字が残らないようにする。
3. 確定済みplanとframeを渡す描画entryを用意する。
   item変形は毎frameの作業用データへ適用し、planに蓄積しない。
4. frame更新後のCanvas描画が書き出しのframe取得前に完了することを確認する。
   資源準備、描画待機、cleanupとReact再評価を接続し、独自の実時間再生時計を作らない。
5. Cutごとに異なる静止文字を使い、時間による表示切り替えを例で示す。
   動きをテスト用定義で検証する場合は、JIZURA effectの移植結果と区別する。
6. 任意frameの直接取得、順序変更、cache再生成、複数Scene、再mountで再現性を確認する。

## 完了条件と検証

- 先頭、境界直前・直後、最後、1frame Cut、空白区間を実Remotionの静止画で確認する。
- `0 → 30 → 10 → 30`等の非連続・逆順取得で同じframeの結果が一致する。
- 外側Sequenceの開始位置を変えても、同じSceneローカルframeは同じ描画になる。
- 短い書き出しでCanvas更新遅延や前frame残留がない。
- 専用型検査・focusedテスト・ビルド、実Remotion描画、`git diff --check`。
  ビルド経路の変更には共通計画の既存チェックも行う。
- 比較は固定フォント・同一ブラウザで行い、プレビューと書き出しの証拠を分ける。

## 段階01からの確定事項（2026-10-02）

整数frameで先にactiveを決め、motionFps（既定null）はCut内評価秒だけに適用する。
API.mdの入退場進行・hold強度・1frame・D2・Sequence境界のケースを確認する。
Scene範囲外は背景もclearする。plan・item・bboxを前frameから変形蓄積しない。

## 段階04からの実装入口（2026-10-03）

[CanvasMeasurementService](../../remotion-jizura/src/canvas/service.ts)と `finalizeScene` が
font準備後に `ScenePlan<CutGeometry>` を確定する。geometryはitemとglyph配列、静止boxを持つ。
[JizuraScene](../../remotion-jizura/src/react/JizuraScene.tsx)は資源の待機・破棄と描画前のhandle解放を接続済み。
[drawStaticFrame](../../remotion-jizura/src/canvas/static-frame.ts)はScene範囲内で **先頭の計画Cutだけ** を描く。
05はこの暫定選択を整数active判定に置き換え、phase/量子化の評価とframe用描画entryを追加する。
planを変更せず、Scene間でmetrics/Canvasを共有しない。centerの完全なgeometryは06で更新する。

`npm run check:remotion` と `node remotion-jizura/tests/canvas-browser.mjs` が既存の検証入口。
固定フォントの配置・取得方法と実CLI/Studio証拠は[04の結果](04-static-canvas.md)を参照。
04のpixel差0は水平静止描画の証拠であり、Cut切り替え・Sequence・effectの証拠ではない。

## 結果・引き継ぎ

2026-10-03：完了。`remotion` のcleanな作業ツリーから開始し、01〜04の実装と結果を確認した。
参照engine/effects、baseline、公開exports/props、依存、manifest/lockfile、build設定は変更していない。

### 時間・描画完了・状態の判断

- `core/frame.ts` の `evaluateFrame` がScene/Cutを整数半開区間で選択する。
  時間順のplan index、Cut localFrame、秒、in/out秒、pIn/pOut、holdAmount、step、apply条件を返す。
  空白ではCutはnull、Scene範囲外では背景もclear。整数frame以外はE_NUMBER。
- motionFpsはCut選択後のローカル秒だけをAPI式で量子化する。Scene/Sequence開始位置を
  秒評価へ二重加算しない。入退場0ではapplyを省略し、D1/D2、D60と退出開始を検証した。
  `dur-outDur` の浮動小数相殺でframe43のpOutが約3e-16になったため、
  同値の `(D-exitFrames)/fps` で退出開始を計算する。pOut=0を厳密に保ち、公開契約は変えていない。
- `canvas/frame.ts` がplanとframeからCanvasFrameを作る。item、glyph配列、font、boxを
  複製し、変形をplanや前frameから蓄積しない。現時点のboxは04の静止boxのコピー。
  `drawFrame` はclear→active Cut描画の同期入口で、実effectはまだ適用しない。
- Sceneは準備成功後、最新の **commit済み** frameを描いてから初回待機handleを解放する。
  frameRefはrender中ではなくlayout effectで更新し、破棄されたReact評価を参照しない。
  準備後の更新はlayout effectで同期描画する。独自時計、frameごとのasync処理や待機は追加しない。
  採用4.0.532の `TimelineContext` はframe変更時に待機し次のRAFで解放し、rendererは
  frame-readyとfont-readyを待って取得する。実コードと公式
  [useCurrentFrame](https://www.remotion.dev/docs/use-current-frame)、
  [Sequence](https://www.remotion.dev/docs/sequence)、
  [useVideoConfig](https://www.remotion.dev/docs/use-video-config)、
  [delayRender](https://www.remotion.dev/docs/delay-render)を再確認した。
- 例 `TimedCuts` は朝 `[0,10)`、一瞬 `[10,11)`、空白 `[11,15)`、昼 `[15,30)`、
  夜 `[30,48)`。夜を先に宣言しsort後のindexも検証する。全motion/decorは無効。
  browser testのsin/scale/glyph変形は作業用データと量子化の検証用で、JIZURA effectではない。

### 変更ファイル

- source新規：`remotion-jizura/src/core/frame.ts`、`src/canvas/frame.ts`。
- source更新：`src/react/JizuraScene.tsx`、`src/canvas/static-frame.ts`（共通drawItems抽出とscale対応）。
- 例：`remotion-jizura/examples/index.tsx` にTimedCutsとoffset/motionFps props。
- テスト：新規 `tests/frame.test.mjs`、`tests/frame-browser.mjs`、更新 `tests/browser-entry.jsx`。
- 文書：本メモ、06の開始入口、作業一覧、PLAN、APIの実装状態、ルート/パッケージREADME。
  過去の04の先頭Cutのみ・静止subsetの証拠は保持した。

### 実行チェックと描画証拠

Node26.10.0/npm11.19.1、React19.3.0/Remotion4.0.532、Chrome154.0.8037.97。
Noto Sans JP 700/normal、04と同じTTF、SHA-256
`c2f3b4d463500a2ddcd3849cded1fceeb9fd6d1c32e6cbecd568453ba50fc68f`。
fontの取得・OFL条件は[04の結果](04-static-canvas.md)を参照。
実書き出しは640×360・24fps・fontSize64/track0.08・motionFps=null、追加の量子化比較は12。
preview harnessとStudioはviewport1280×800、DPR2。PNGはdesign解像度を維持する。

| 実行 | 結果・証拠の範囲 |
| --- | --- |
| `npm run check:remotion` | strict型検査・ESM/型build・35件Node契約成功。新規5件で境界・phase・D1/D2・量子化・作業用データを検証。font Node部分はmock |
| `node remotion-jizura/tests/frame-browser.mjs` | 実FontFace/CanvasとReact context harness。0→30→10→30、Scene外clear、同一Canvas保持、StrictMode、nested Sequence、複数Scene、再mount、計測cache/plan再生成、量子化姿勢の画素一致。3秒font準備中のseek後に最新frameを描画、最後のface/handle数0 |
| 同frame-browserの実Remotion still | frame0/9/10/11/14/15/29/30/47/48/119のPNG。4Cutは異なる画素、1frameだけ一瞬を表示、空白全域は基底背景、終了後は全域透明 |
| 同frame-browserのSequence/量子化 | Sequence offset12/60、それぞれlocal0/10/15/30/47/48はoffset0と全pixel一致。motionFps12のframe9/10/11/30も切り替えを遅らせず一致 |
| 同frame-browserの `renderFrames` | concurrency1でframe0..49の50PNGを取得。全frameが直接取得した該当Cut/空白/終了PNGと全pixel一致（差分0） |
| 同frame-browserの `renderMedia` / ffprobe / ffmpeg | concurrency2、H.264 CRF1/yuv444p、640×360/24fps/50frame（約2.083秒）。全decode成功。全frameの最も近い4Cut/空白/黒終了anchorが期待通り、平均channel差は次候補の1/4未満。channel最大差11、frame平均差最大0.66978。非可逆圧縮とRGB/YUV変換を含むためPNGの完全一致と区別 |
| `node remotion-jizura/tests/canvas-browser.mjs` | 04の4条件（標準・上書き・小サイズ・透明）の参照pixel差0を維持。準備失敗・caller face・cleanupも成功 |
| `npm run studio:remotion -- --port=3105 --no-open --public-dir=../dist/remotion/stage04/assets` | 実Studio起動・bundle成功。確認後停止 |
| `node dist/remotion/stage05/studio-check.mjs` | 無視対象の一時probe。実Studioで0→30→10→30→11→48、同frame画素一致、ready=true、640×360、handle0、Scene例のrender errorなし。frame48はSequence終了でCanvas unmount |
| `python3 /tmp/jizura-stage05-check.py` / `git diff --check` | 変更Markdown7ファイル91ローカルリンク欠落0、公開source62importはpackage内とReact/Remotionだけ。追跡/未追跡15ファイルに空白エラーなし |
| `node --check remotion-jizura/tests/frame-browser.mjs` / `node --check remotion-jizura/tests/frame.test.mjs` | 両方成功。JSX harnessはVite bundleで構文検証 |

画像とJSON：`dist/remotion/stage05/frame-*.png`、`offset-*-local-*.png`、`quantized-*.png`、
`frames/`、`frame-result.json`、`timed-cuts.mp4`、`studio.png`、`studio-result.json`。
frame10（一瞬）、frame30（夜の強調色）とStudio frame30を目視確認した。
他のPNGは自動画素検証で、動画全体を目視再生したという証拠ではない。

通常sandboxのbuildは `spawnSync tsc EPERM`。同じcheckと実ブラウザ/Studioコマンドは
許可されたsandbox外で実行した。最初のbrowser harnessはComposition60がframe60を59へ
clampするため失敗し、Composition120に修正。負のframeは直接描画で検証した。
H.264 CRF0は採用版が拒否するためCRF1を使用。動画を完全一致と扱う初期検査は
非可逆差11で失敗し、動画はCut識別と実測差、PNGは厳密一致へ分けた。PNG許容差は広げていない。
既存build経路は変更していないため旧 `npm run check` とspikeは今回再実行していない。

### 制約と次の入口

実effectとcenter全体、driftの分解/断片、現在frameの変形後bboxは未実装。
テスト用変形はmotion pipelineやeffectの比較証拠ではない。
任意ブラウザ/OS/font、Player、速度変更/trim/loop、外部consumer、Adobe/CEP実機は未検証。
Studioのdefault props保存には「Cannot find root file in project」の非致命的警告が出る。
表示・seek・書き出しは成功したが、Studioからsourceのpropsを書き換える操作は未検証。
公開・push・releaseは行っていない。

[段階06](06-effect-port.md)は `evaluateFrame` のphase/apply条件と `drawFrame` の作業用itemを入口に、
center静止geometryの完成、enter→hold→exit、背面→文字→前面を接続する。
既存boxを履歴cacheへ保存せず、center完成後の静止boxと当該frame boxを使う。
公開APIの変更はない。ローカルリンク・空白・package import境界の最終確認も成功した。
