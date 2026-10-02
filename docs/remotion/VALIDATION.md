# remotion-jizura 初期開発の検証記録

検証日：2026-10-03。ブランチ：`remotion`。package：`remotion-jizura@0.1.0-alpha.0`。
段階01〜06の証拠を保存したうえで、段階07の統合例・Player・外部利用を確認する。
公開契約は[API.md](API.md)、再実行と利用例は[package README](../../remotion-jizura/README.md)。

状態：完了。初期到達点のPartA/PartB、再現性、実書き出し、Player、外部tarball利用を確認した。

## 対象と固定条件

- 公開値：JizuraScene、JizuraCut、JizuraError、parseLines、center/pop/wipe/drift/breathe/kasumi/checkerStrip。
  ScenePlan・PRNG・registry・canvasサービスは非公開。ESMのroot entryのみ。
- Node26.10.0/npm11.19.1、React/React DOM19.3.0、Remotion関連4.0.532、Vite8.3.1、TypeScript7.0.2。
  React/React DOM/Remotionはexact peer。Playerは例のdev dependencyで、runtimeへimportしない。
- `/usr/bin/google-chrome`、Chrome154.0.8037.97、Linux。Studio/Player viewport1280×800、DPR2。
  CanvasおよびPNGは640×360、24fps、motionFps=null、Scene style.fontSize64。
- Noto Sans JP700/normal、段階04と同じ可変TTF、SHA-256
  `c2f3b4d463500a2ddcd3849cded1fceeb9fd6d1c32e6cbecd568453ba50fc68f`。
  [公式font/OFL取得手順](../../remotion-jizura/README.md#development)を使用。
  fontとOFLは無視対象 `dist/remotion/stage04/assets/`、packageには同梱しない。

## 利用例と描画契約

`examples/lyrics.tsx` のPartA/PartBを `LyricsDemo` の2本のSequenceへ配置した。
Studio Compositionと通常Reactアプリ内のPlayerは同じcomponentを使う。

| Composition区間 | 本文・指定 | 確認内容 |
| --- | --- | --- |
| `[0,20)` | 新しい、Cut seed1234 | 手動 `/` による分割、自動effect/parameter |
| `[20,40)` | 朝が来た、Cut seed1235 | 整数Cut境界で切り替え |
| `[40,60)` | 希望の朝だ、Cut seed1236 | 希望のcode point範囲 `[0,2)` を強調 |
| `[60,120)` | 喜びに胸を開け | hold=breathe、kasumi seed889/back、checkerStrip seed721/front |

Scene seedは20260922。PartAの3Cutは各20frame、PartBはローカルframe0〜59。
cutSeed999へ変更した計画と代表frame10のPNGを比較し、差を確認する。
PartAだけのseed変更はPartBのframe60/61/80/110/119へ影響しない。
計画・現在frame box・glyph cacheはScene/Canvasで分離し、前frameの変形を蓄積しない。

`EffectSamples` のautomatic/fixed/partial/disabled/repeatedと `TimedCuts` の明示時間配置も
保持した。READMEは少ない指定、全group/seed固定、部分parameter固定、無効化、明示from/durationを示す。
無効化した静止例はcenterのgeometry/ornamentも明示する。

## Player準備待ちの修正

修正前は1秒遅延したfontを読み込むPlayerが、準備中にframe0から進むことを実測した。
delayRenderはexport待機用で、Playerの再生を止めない。
`JizuraScene.tsx` はPlayer内の非空Sceneで `useBufferState().delayPlayback()` を取得し、
font/計測/最新commit frameの描画後にunblockする。
成功・失敗・StrictMode cleanup・再mountは同じ一度だけのrelease経路を使う。
exportのdelayRender/continueRender/cancelRender、公開props・候補・seed契約は保持した。

実Playerで逆順seek、再mount、2Sceneの同時表示、宣言seed変更と復元、frame119までの再生、
Scene境界60での準備を確認。遅延fontの開始300ms時点は未準備でframe0を保持し、
未準備frameは0/60のみ。404fontはPlayer errorFallbackへE_FONTを返し、unmount後は
font face数0・export handle数0。error試験の404/React console.errorは意図した失敗入力。

採用4.0.532の実コードに加えて、2026-10-03に公式
[Player](https://www.remotion.dev/docs/player/player)、
[buffer state](https://www.remotion.dev/docs/use-buffer-state)、
[renderStill](https://www.remotion.dev/docs/renderer/render-still)、
[renderMedia](https://www.remotion.dev/docs/renderer/render-media)、
[version alignment](https://www.remotion.dev/docs/version-mismatch)を確認した。
inputPropsを変える検証は同じ値でselectCompositionを再実行し、解決済みpropsを更新する。
06のmode名付きstillはこの再解決をしていなかったため、各mode描画の証拠から除外する。
07で手順を修正し5modeを再採取した。06の283参照比較・固定例61PNG/動画の証拠は有効。

## 段階07の実行結果

すべてrepo rootから実行。生成PNG・動画・bundle・tarball・JSON/logは無視対象へ保存する。

| コマンド | 実測結果・証拠の範囲 |
| --- | --- |
| `npm install --workspace remotion-jizura --save-dev --save-exact @remotion/player@4.0.532 --cache /tmp/jizura-remotion-npm-cache --fetch-retries=0 --fetch-timeout=15000` | 既存依存と同じ版を明示追加。単一root lockfileを更新 |
| `npm run check:remotion` | strict型検査、ESM/型build、41件Node契約成功。Node font試験はmock |
| `node remotion-jizura/tests/scene-browser.mjs` | 実Playerの上記検証。直接Canvasで独立取得した全120frameに対し、concurrency1/2の240PNGすべて画素差0。境界0/19/20/39/40/59/60/61/80/110/119、非連続110→3→110のstillも一致。H.264 CRF1/yuv444p・concurrency2、640×360/24fps/120frame/5秒、全decode成功。全120frameが対応PNGを最小差候補として識別（同画素の同率を許可）。最大channel差127、frame平均channel差最大0.892535。PNG完全一致とは区別 |
| `npm run studio:remotion -- --port=3107 --no-open --public-dir=../dist/remotion/stage04/assets` | 実Studio起動。初回TSX相対importのbundler解決エラーを修正し再bundle。`node remotion-jizura/tests/studio-validation.mjs` で13frameと繰り返しseekを比較し、すべて直描画/PNGと画素差0、ready=true/handle0。実画面を取得・目視 |
| `npm run player:remotion -- --host=127.0.0.1 --port=3108 --strictPort` | Viteで通常React Player例を起動。font配信・初回ready=true、640×360・handle0・表示errorなし |
| `node /tmp/jizura-stage07-player-page.mjs` | 上記Player例のheadless実画面・frame0を取得し目視。先頭はenter開始前の基底背景。別途harnessのframe80で文字/decor表示も目視 |
| `npm exec --workspace remotion-jizura -- vite build --config examples/player/vite.config.mjs` | Player production bundle成功、`dist/remotion/stage07/player/`。use-client directive・chunkサイズのbundler warningのみ |
| `node remotion-jizura/tests/consumer-validation.mjs` | 実tarball57ファイル・105import検査成功。repo外consumerで公開entry/型検査と11PNGの実Remotion描画成功、対応frameと画素差0 |
| `node remotion-jizura/tests/effect-browser.mjs` | 段階06回帰：283参照frame画素差0、5modeの解決済みprops再取得・PNG差を追加確認、全61並列PNG・Sequence・seek/cache・短い動画成功。新しいPartA/PartBとの比較ではない |
| `node remotion-jizura/tests/canvas-browser.mjs` | 段階04の4静止subset比較で画素差0、font失敗・caller face・cleanup成功 |
| `node remotion-jizura/tests/frame-browser.mjs` | 段階05回帰：整数境界/D1/空白/Scene外/Sequence/遅いfont中のseek、50PNG/短い動画成功 |
| `npm run check` | 旧sourceの型/i18n/engine/effect契約・4種build・syntax/output/catalog・日英AE mock成功 |
| `npm run spike:build` / `npm run spike:test` | 保存したspike成功。Node VM/AE object-model mockでありAdobe実機ではない |
| `node --check`（追加/更新mjs4本） / `python3 /tmp/jizura-stage07-doc-check.py` / `git diff --check` | 構文成功、Markdown14ファイル183ローカルリンク欠落0、追跡/未追跡ファイルの空白エラー0 |

sandboxの `spawnSync tsc EPERM` は同じチェックを通常実行環境で再実行して解消した。
TSX例の相対importは実bundlerが解決できる `.tsx` を使い、noEmit型検査のみ
allowImportingTsExtensions=true。published buildはfalseで従来どおり `.js` 内部importを出力する。

## 外部consumerと公開内容

consumer-validationはroot workspaceのpackを実tarballにし、
repo外 `/tmp/jizura-stage07-consumer-*` へtarballとexact peer/development依存をインストールする。
公開entryと公開型だけでコピーした利用例を型検査・Remotion描画し、境界を含む11PNGを比較する。
実consumerは `/tmp/jizura-stage07-consumer-vaW36m`、packageは通常ディレクトリへ展開され、
realpathもconsumer内にある。workspace symlink、tsconfig paths、repoのnode_modulesは利用していない。
57ファイルはdist JavaScript/declarations・README・LICENSE・manifestのみ。
JS/型の105importを構文で検査し、package内またはReact/Remotion peerだけを参照する。
examples/tests/source/report/font/dependenciesは混入していない。
rootからの11公開値をNodeでもimportし、非公開値の型importとdeep importは拒否される。
consumerはcopied `lyrics.tsx` を公開型だけでstrict検査し、frame3/19/20/39/40/59/60/61/80/110/119の
実PNGがrepoの独立直描画と全画素一致した。consumerの独自lockfile/dependenciesも/tmp内のみ。

検査器の最初のregexはコメントをimportとして誤検出したため、採用CLI依存に含まれる
Babel parser7.24.1でJS/TSのimport/export構文を読む方式へ修正した。
TypeScript7.0.2には旧createSourceFile/ScriptTarget APIがなく、この検査には使っていない。
型検査は採用7.0.2のtscをconsumer内で実行した。

## 生成証拠と再実行

`dist/remotion/stage07/` に次を保存する（commit対象外）：

- `scene-result.json`：環境、通常/seed変更の計画、Player lifecycle、全frame RGBA hash、動画比較。
- `direct/`、`frames-1/`、`frames-2/`、`still-*.png`、`changed-seed.png`、`partB-*.png`、`lyrics.mp4`。
- `player.png`、`player-page.png`、`player-page-result.json`、`studio.png`、`studio-result.json`。
- `pack/`、`consumer-result.json`、consumerのinstall/render log。

再取得fontと全コマンドは[package README](../../remotion-jizura/README.md#player-and-integration-validation)を参照。
`scene-browser.mjs` → `studio-validation.mjs` / `consumer-validation.mjs` の順。
Studio validatorのみ稼働中のStudioが必要。font・Chrome・ffmpeg/ffprobe・npm cache/registryが前提。
今回起動したStudio/Playerサーバーは確認後に停止した。

## 制約と次の判断

同一font・同一Chrome・同じ解決parameterでのpixel一致を確認する検証であり、
他font/OS/browserのメトリクスやアンチエイリアス一致、全legacy effect、旧weighted/history抽選、
Adobe AE/CEP互換性の証明ではない。H.264は圧縮/RGB-YUV差を含み、PNG一致と区別する。
PlayerはSceneの初回準備で再生を一時停止する。境界pauseを避けるfont preloading/premountの
専用APIは初期範囲に追加しない。
手操作の全Studio/Player UI、複数ブラウザ/peer版、実運用の長時間動画・高解像度性能は未検証。
Studioは既存の `examples/index.tsx` 登録形式を使うため、default propsのソース保存に
「Cannot find root file in project」が表示される。プレビュー/書き出しは成功し、
props変更はCLI inputProps・Player入力・ソース編集で行える。Studioのネイティブ保存は未対応。
フォント資産の取得/登録と再配布時のOFL保持は利用側の責務。

次は固定fontでの追加browser/OS比較と、境界pauseの少ないcaller preload例、
または次のeffect群の優先順位を別途決める。新しいeffect・npm公開・Pages・Releaseは実施していない。
過去の[01〜06の結果](README.md)は各段階当時の実績として保持する。
