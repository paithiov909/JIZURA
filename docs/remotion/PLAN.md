# remotion-jizura 初期開発の共通計画

作成日：2026-10-02。作業ブランチ：`remotion`。
実装先：`remotion-jizura/`。パッケージ名は同名を仮称とする。

ユーザーが採用した初期計画を、別スレッドで実施できる単位に分けた資料。
この文書の作成時点ではパッケージは存在せず、各段階は未実施。
APIの具体的な表現は以下の作業案から[段階01](01-api-contract.md)で確定する。

## 到達点

少ない指定でリリックモーションを描け、必要なeffectやparameterだけを固定できる。
時間を整数frameで制御し、任意frameへ移動しても同じ設定から同じ映像を得る。
下記PartA・PartB相当の例がRemotionでプレビューでき、静止画・短い動画として書き出せる。
初期対象effectについて、参照実装との動き・デザインの比較結果を残す。
ビルドしたパッケージをリポジトリ外の小さな利用側から読み込めることも確認する。

全effectの移植、音声解析・BPM/LRC連動、旧UI・AE・CEP移植、複雑なCut重複、
Cut間transition、配布サイト、npm公開は初期段階の対象外。

## 使用イメージ

ユーザーのスケッチ。段階01で仕様が決まり次第、必要な変更理由を記録して更新する。
未実装のAPIであり、このコードだけでは現時点で実行できない。

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

## 公開APIの作業案

| 対象 | 提案 |
| --- | --- |
| Scene | `durationInFrames`必須。幅・高さは省略時にRemotion設定から取得。fpsもRemotionから取得 |
| Cut | `text`、`seed`、`from`、`durationInFrames`、effect指定、フォント・Styleの上書き |
| effect指定 | 対応済みIDの文字列、または設定factoryが返すグループ別の宣言オブジェクト |
| 未指定 | 対応済み候補からseedで選択し、parameterを補う |
| 無効化 | 単一effectは`null`、decorは`[]`。layoutは必須の役割のため`null`不可 |
| 明示指定 | IDと明示parameterを尊重し、足りないparameterのみ補う |
| 未対応・不正指定 | 型と実行時検証でエラー。無言で別effectへ置換しない |
| フォント・Style | Sceneの既定値をCutで上書き。マージ規則を段階01で決める |

`enter={null}`は即時表示、`exit={null}`は範囲終了で消去、`hold={null}`は静止。
`bg={null}`は背景effectを追加しないことであり、Sceneの基底背景の透明化とは区別する。
全グループ（layout、enter、exit、hold、decor、treat、bg、cam、fx、trans）の役割を
設計に残すが、初期の後半5グループは無効状態を基本とし、対応effectを用意するまで自動抽選しない。
段階01で未対応グループの初期型・無効状態・エラーの表現を明確にする。
factoryは設定だけを返し、呼び出し時の乱数生成、DOMアクセス、描画は行わない。

## テキストと時間の作業案

`parseLines`はScene時間に依存しない。前後の空白・空行を整理し、`/`を明示Cut境界として
優先する。その他の行は既存chunk分割を出発点に自動分割する。
`*…*`を本文から除去し、本文・強調情報・元の行位置を持つ構造化データへ残す。
Cutの`text`は文字列とこのデータを受け付ける。
`numCuts: "auto"`はテキストだけで決まる分割とし、数値を初期対応するなら各行のCut数とする。
具体的な分割結果、エスケープ、空・不正入力、分割数の上限、強調の描画規則は段階01で確定する。

| 配置モード | 規則 |
| --- | --- |
| 順次配置 | 全Cutで`from`を省略。明示durationを確保し、残りをduration未指定Cutへ均等配分 |
| 明示配置 | 全Cutで`from`と`durationInFrames`を指定。Scene開始からのframeとして配置 |

端数は宣言順で先頭から1frameずつ配る。60frame・7Cutなら `9, 9, 9, 9, 8, 8, 8`。
両モードの混在、重複、範囲外、0frame、負数・非整数・非有限値はエラー。
順次配置で全duration指定時の未使用時間、CutがないScene、明示配置の非時系列宣言の扱いも
段階01で決める。明示配置の空白区間はSceneの基底背景だけを描く。
Cutの範囲は `[from, from + durationInFrames)`。Scene自身も指定durationの範囲で描画する。
外側のSequenceで得られるローカルframeを使い、Sequenceの開始位置を重ねて加算しない。
frameから秒への変換はeffect評価境界で行う。
enter・hold・exitの進行や短いCutへの収まり方、旧コマ打ちの量子化は調査して仕様化する。

## seedと描画の契約

- Scene seedは固定の既定値。Cutの明示seedを優先し、省略時はScene seedとCut位置から導出。
- effectの明示seedを優先する。未指定parameterはeffectの計画時に確定する。
- グループごとに乱数を分け、decorの固定が無関係なenter選択を変えないようにする。
  同一decorの複数指定や配列順とseedの関係も段階01で決める。
- 既存の乱数アルゴリズムを参照し、旧plannerと新しいseed配分の差を記録する。
- 描画は前frameの実行、mount順、別Sceneの状態に依存しない。
- 文字itemを毎frameの作業用データとして扱い、計画への変形の蓄積を防ぐ。
- 旧rendererの紙・ノイズにある`Math.random()`は初期対象から外す。将来移植する際にseed化する。
- フォント準備後に計測する。フォントの失敗を隠して比較用フォントへ黙って置換しない。
- 旧plannerと同じ抽選結果になることと、個々のeffectの動きが一致することを分けて検証する。

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
