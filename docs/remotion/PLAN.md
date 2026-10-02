# remotion-jizura 初期開発の共通計画

作成日：2026-10-02。作業ブランチ：`remotion`。
実装先：`remotion-jizura/`。パッケージ名は同名を仮称とする。

ユーザーが採用した初期計画を、別スレッドで実施できる単位に分けた資料。
作成時点ではパッケージは存在せず、各段階は未実施だった。
同日の[段階01](01-api-contract.md)で[API契約](API.md)を確定した。
現在は01〜07完了。初期到達点の実測は[VALIDATION.md](VALIDATION.md)、APIの詳細はAPI.mdを優先する。

## 到達点

少ない指定でリリックモーションを描け、必要なeffectやparameterだけを固定できる。
時間を整数frameで制御し、任意frameへ移動しても同じ設定から同じ映像を得る。
下記PartA・PartB相当の例がRemotionでプレビューでき、静止画・短い動画として書き出せる。
初期対象effectについて、参照実装との動き・デザインの比較結果を残す。
ビルドしたパッケージをリポジトリ外の小さな利用側から読み込めることも確認する。

全effectの移植、音声解析・BPM/LRC連動、旧UI・AE・CEP移植、複雑なCut重複、
Cut間transition、配布サイト、npm公開は初期段階の対象外。

## 使用イメージ

ユーザーのスケッチを段階01のAPI契約として採用。parseLinesの返却値は構造化chunkで、
この例は3Cutを20frameずつ配置する。Noto Sans JP 700のfaceを利用側で登録してから使う。
段階06でCut/frame評価と7effectを接続し、段階07でPartA/PartB統合例を640×360/24fps・120frameで検証した。

```jsx
const PartA = ({durationInFrames}) => {
  const cuts = parseLines(`
新しい/朝が来た
*希望*の朝だ
`, {numCuts: "auto"});

  return (
    <JizuraScene width={1920} height={1080} durationInFrames={durationInFrames}>
      {cuts.map((cut, index) => (
        <JizuraCut key={index} text={cut} seed={index + 1234} />
      ))}
    </JizuraScene>
  );
};

const PartB = () => (
  <JizuraScene width={1920} height={1080} durationInFrames={60}>
    <JizuraCut
      text="喜びに胸を開け"
      hold="breathe"
      decor={[kasumi({seed: 889}), checkerStrip({seed: 721})]}
    />
  </JizuraScene>
);

const MyComp = () => (
  <>
    <Sequence durationInFrames={60}>
      <PartA durationInFrames={60} />
    </Sequence>
    <Sequence from={60} durationInFrames={60}>
      <PartB />
    </Sequence>
  </>
);
```

## 構成と責務

`JizuraCut`の宣言 → `ScenePlan`の確定 → 現在frameのCanvas描画を分離する。

- Cutは個々のモーションの宣言であり、自分のCanvasを作らない。
- Sceneは宣言の収集、時間配分、effect選択、parameter生成、Canvas管理を担当する。
- frame評価は確定済みの計画を読み、現在時刻の状態を計算する。
- parser・時間配分・乱数・計画・effect計算はReactから分離する。
- 文字計測が必要な計画はフォント準備後に確定する。React非依存であることと
  ブラウザの計測サービスが不要であることは同義ではない。
- 最初のchildren対応は直下のCut、配列、Fragmentまで。任意の子コンポーネントを
  実行・展開して内部のCutを収集する仕組みは設けない。
- キャッシュを破棄・再生成しても描画結果が変わらないようにする。

既存の `engine/index.ts` はフォント・音声・書き出しサービスも初期化する。
参照エンジン全体の持ち込みではなく、必要なアルゴリズムと依存を段階的に分離する。

配置の作業案：

```text
remotion-jizura/
  package.json
  src/
    index.ts
    react/       # Scene、Cut、Remotionとの接続
    core/        # テキスト処理、時間配分、計画、乱数
    canvas/      # フォント計測、文字描画、Canvas管理
    effects/     # 移植済みeffect、設定factory
  examples/      # PartA・PartB、比較用Composition
  tests/
  README.md
```

段階02でnpm workspaceを第一候補として検討し、単一のルートロックファイルを使う。
旧ビルドのTS設定にはTSXを混ぜず、パッケージ用設定を分ける。
React・Remotionはpeer dependencyとし、対応バージョンと開発依存を段階02で確認・記録する。
実行コード・公開型はパッケージ外の参照ソースをimportしない。
参照ソースを読む比較テストは公開内容から除外する。生成物は明示した無視対象に置く。

## 確定した公開API

[API.md](API.md)が公開型・既定値・入力検証・エラー・受け入れケースを定める。
Scene、Cut、parseLinesと7factoryを公開し、ScenePlan・registry・PRNGは非公開。
対応ID集合は段階06で全7候補を移植済み。
段階02は空Sceneのみ実装する。

- Scene duration必須、幅・高さ省略はRemotion設定、fpsもRemotionから取得。
- Cutは文字列またはParsedChunk。直下Cut・配列・Fragmentから宣言を収集する。
- 省略時はlayout=center、enter=pop/wipe、exit=drift、hold=breathe、
  decor=kasumi/checkerStripから1個。候補順と等確率を固定し、旧history・重みは導入しない。
- 単一effect無効化はnull、decorは[]、layoutはnull不可。
  treat/bg/cam/fx/transの初期型はnullのみ。未知ID・不正parameterはエラー。
- factoryは設定宣言だけを返し、明示seed・parameter（false/0を含む）を保持する。
- FontSpecはCutで全置換、Styleはpaletteのkey別mergeと他項目の上書き。
  centerの明示track→明示Style.track→自動trackの優先順を保つ。

## 確定したテキストと時間

parseLinesは時間・seedに依存せず、正規化本文・code point強調範囲・元行番号を返す。
手動 / を唯一の分割境界として優先し、それ以外は既存chunkTextのscript分類fallbackを使う。
Intl.Segmenterは呼ばず、数値numCutsは初期非対応。escape・上限・不正構文はAPI.mdに従う。
単一Cut文字列は改行を保持する。構造化本文は再parseしない。

| 配置モード | 規則 |
| --- | --- |
| 順次 | 全from省略。明示durationを確保し残りを未指定Cutへ均等配分。端数は先頭から |
| 明示 | 全fromとduration指定。非時系列宣言を許しplanを時間順へsort。seed用宣言indexは保持 |

60frame・7Cutは9,9,9,9,8,8,8。全duration指定の余りは末尾空白。空Sceneも許可。
混在、重複、範囲外、0duration、非整数、不足frameはエラー。
Scene/Cutの整数frame半開区間でactiveを決め、空白はScene基底背景のみ。
外側Sequenceのローカルframeを使い、開始位置を重ねて加算しない。

enter/exitは旧planner通常秒式を整数化し、静止1frameを残すD-1予算へ
自動時間のみ比例縮小する。明示時間は固定し、予算超過はエラー。
1frame Cutは自動入退場0で文字表示。holdは旧mainDrawの強度rampを保持する。
motionFpsは既定null（毎frame）、24fpsで12を明示すればon twos相当。
active判定後にCutローカル評価秒だけを量子化する。

## seedと描画の契約

- Scene seed既定20260922、Cut省略seedはScene seedと宣言indexから数値hashで導出。
- effect明示seed優先。抽選とparameter生成をgroup別streamに分ける。
  decorのslotは配列index。挿入・並べ替えは未指定decor seedだけを変える。
- utilのhash/FNV-1a/mulberry32を保持する。具体的導出式と生成順はAPI.mdに従う。
  旧plannerの単一stream/history抽選との一致は要求しない。
- fontは利用側登録またはsrcから準備する。失敗を隠さず、計測後にplanを確定する。
- frame用itemへ変形を適用しplanへ蓄積しない。decorの前frame bbox cacheは使わず、
  当該frame boxかplan静止boxを使う。cacheの再生成でも描画結果を変えない。
- driftのglyph分解はcomponentキーを安定hashへ置き換え、fragments cacheをseed別にする。
  採取順counter・最初のseedによる状態へ依存せず、0seedも保持する。
- Canvasはdesign解像度、CSS表示は親に合わせ、DPRを掛けない。
  Scene基底背景とbg effectを区別する。Scene範囲外では背景もclearする。
- 紙・ノイズのMath.random()、chroma/HUD/camera等は初期対象外。
- 旧抽選結果との一致、個別effectの数式/描画一致、Remotion実書き出しを別々に検証する。

## 最初のeffect候補

| グループ | 候補 | 移植元 | 主な確認点 |
| --- | --- | --- | --- |
| layout | center | [core/layouts.ts](../../effects/core/layouts.ts) | 計測、サイズ調整、配置 |
| enter | pop、wipe | [core/animation.ts](../../effects/core/animation.ts) | 文字単位変形、clip |
| exit | drift | [core/animation.ts](../../effects/core/animation.ts) | 退出の時間評価 |
| hold | breathe | [core/animation.ts](../../effects/core/animation.ts) | サイズ・字間の時間変化 |
| decor | checkerStrip | [packs/decor.ts](../../effects/packs/decor.ts) | 前面描画、共通ヘルパー |
| decor | kasumi | [packs/decorB.ts](../../effects/packs/decorB.ts) | 背面描画、独立seed |

無効化時の基礎動作（即時表示、静止、装飾なし）も用意する。
decorのparameter生成は [engine/planner.ts](../../engine/planner.ts) の `decorParams` も調べる。
移植対象のID・描画順・数式・seed使用を保持し、必要な差を記録する。
依存調査で候補を変更する場合は、理由と代わりの比較対象を段階06に記録し、例と計画も更新する。

## 検証と引き継ぎ

契約テスト、同一環境での描画比較、実際のRemotion書き出し、外部利用を区別する。
既存baselineは上書きせず、追加の小さな参照資料は出所と採取条件を明記する。
比較画像・動画・一時consumer・レポートは `dist/` 等の無視対象へ置く。
フォント・Chromium・サイズ・fps・時刻・parameter・量子化条件を比較記録に残す。
プレビューだけで書き出しの再現性を証明したことにしない。

旧参照ビルドの変更には [BUILD.md](../v1x/BUILD.md) のルートロックファイル・ツールチェーンを使い、
`npm run check`、`npm run spike:build`、`npm run spike:test` を実行する。
新パッケージの具体的なチェックコマンドは段階02で決め、後続メモに記録する。

各段階は [作業一覧](README.md) の順に実施する。前提成果を確認し、割り当て段階だけを進める。
完了後は担当メモの結果欄と一覧の状態を更新する。
結果には日付、状態、判断、変更ファイル、実行コマンドと結果、実環境の描画証拠、
未検証事項、次段階の参照先を記録する。未実施チェックを成功と書かない。
仕様を変更した場合はこの文書と影響する後続メモを同期し、理由を残す。

## Remotionの参照先

2026-10-02の計画時に確認した公式資料。実装時は採用バージョンで再確認する。

- [Sequenceとローカルframe](https://www.remotion.dev/docs/sequence)
- [useCurrentFrame](https://www.remotion.dev/docs/use-current-frame)
- [useVideoConfig](https://www.remotion.dev/docs/use-video-config)
- [非同期準備と描画待機](https://www.remotion.dev/docs/delay-render)

描画待機とStudio/Playerの準備状態は別々に確認する。

## 決定・変更記録

- 2026-10-02：初期開発の7段階と `remotion-jizura/` を作業先として採用。
  API詳細は段階01で確定する。今回作成したのは計画と引き継ぎ資料のみ。
- 2026-10-02（段階01）：[API.md](API.md)を確定。Intl辞書差を避けるautoのfallback固定、
  数値numCutsの初期非対応、整数境界・静止1frame確保、group別seed、FontSpec/Style、
  透明基底背景、前frame bbox cache除去を採用した。旧版との差をAPI.mdと後続メモへ記録。
  ソース・依存・baselineは未変更。

- 2026-10-02（段階02）：npm workspaceと単一ルートlockfileを採用。パッケージ版は
  `0.1.0-alpha.0`、React/React DOM 19.3.0、Remotion関連4.0.532を固定した。
  [パッケージREADME](../../remotion-jizura/README.md)にコマンド・実装範囲を記録。
  空SceneのStudio/PNG/MP4を検証した。API契約の変更はなく、歌詞描画はまだ未実装。

- 2026-10-02（段階03）：parser・整数配置・group/slot seed・宣言/parameter検証・
  font/Style解決・不変のPreparedSceneを実装し、Sceneの宣言収集へ接続。
  計測後planは内部 `MeasurementService<T>` で準備/計測をawaitして確定する。
  25件のNode契約と型検査/buildを確認。実フォント/実effect/歌詞描画は未接続で、
  非空Sceneは描画境界の未実装を明示する。API契約の変更なし。詳細は[03の結果](03-scene-plan.md)。

- 2026-10-03（段階04）：Scene所有のfont/metricsサービスとglyph/item/boxの静止geometryを接続。
  固定Noto Sans JPの通常/上書き/小サイズ/透明4条件で参照text/metricsのpixel差0、
  Studio表示とRemotion PNG、準備失敗・StrictMode/再mount/cleanupを検証した。
  04の静止経路は先頭の計画Cutを中央表示し、自動trackは0.06、sx/syは1。
  centerのreflow/params/装飾を含む静止boxへの更新は06、Cut選択/phase評価は05。
  公開契約は変更なし。詳細は[04の結果](04-static-canvas.md)。

- 2026-10-03（段階05）：整数active判定・Cutローカル秒・進行/hold強度・motionFpsを接続。
  frame用item/glyph/font/boxを複製し、同期layout effectでCanvas更新を完了する。
  退出開始は `(D-exitFrames)/fps` で計算し、浮動小数の相殺誤差による微小pOutを防ぐ。
  35件のNode契約、境界PNG・Sequence・逆順seek・50frameの連続PNG/動画を検証。
  実effectは未移植で、テスト用変形と区別した。API契約変更なし。詳細は[05の結果](05-remotion-frames.md)。

- 2026-10-03（段階06）：center/pop/wipe/drift/breathe/kasumi/checkerStripを接続。
  centerは明示改行を保持して各行を旧reflowへ渡し、fontSize/lead/強調を解決する。
  APIの改行保持を優先した差で、型・候補・parameter範囲は変更なし。
  glyph連結成分/polygon分解を安定キー・seed別cacheで移植し、現在frame bboxを使用。
  41件Node契約、参照283frame画素差0、全61並列PNG/短い動画・Studio・再mountを検証。
  PartA/PartB統合・Player・外部consumerは07へ残す。詳細は[06の結果](06-effect-port.md)。


- 2026-10-03（段階07）：PartA/PartBの120frame例と通常ReactのPlayer例を追加。
  Playerの遅いfont準備で再生が先行する問題を修正し、buffer待機を成功/失敗/cleanupで解放する。
  公開API・effect・seed・時間の契約変更なし。直描画と逐次/並列240PNGが画素差0、
  実5秒動画・Studio/Player・tarball外部consumerの型/11PNGを確認した。
  export検証のinputProps変更ではselectCompositionを再実行して解決済みpropsを更新する。
  06のmode別PNG採取手順も修正し、過去の記録へ訂正を追記した。
  初期7段階は完了。固定環境と未検証項目、次の候補は[全体検証](VALIDATION.md)を参照。
