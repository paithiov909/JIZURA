# 段階09：独自effect・構成確認API

状態：完了（2026-10-03、実装・技術検証。ユーザーのdesign/motion確認は未実施）。前提：[08の結果](08-review-workbench.md)。
次段階：[10：標準effects接続](10-remotion-effects.md)。

## 開始時に読むもの

- [AGENTS.md](../../AGENTS.md)、[root README](../../README.md)、[作業一覧](README.md)、
  [初期計画](PLAN.md)、[拡張計画](EXTENSION-PLAN.md)、本メモ、08の結果。
- [API](API.md)、[初期検証](VALIDATION.md)、[package README](../../remotion-jizura/README.md)。
- [公開型](../../remotion-jizura/src/types.ts)、[宣言](../../remotion-jizura/src/effects/declarations.ts)、
  [ScenePlan](../../remotion-jizura/src/core/scene-plan.ts)、[描画](../../remotion-jizura/src/canvas/effect-frame.ts)、
  [計測](../../remotion-jizura/src/canvas/service.ts)、[外部consumer検証](../../remotion-jizura/tests/consumer-validation.mjs)。
- [旧追加契約](../EXPRESSION_PACKS.md)は参考とし、新APIにAE宣言や旧global facadeを持ち込まない。

## 目的・成果物

利用側のTSファイルで定義/importしたeffectをScene/Cutへ適用できる最小公開APIと、
レビュー・再現に必要な解決済み構成の確認APIを実装する。API名・型はこの段階で決める。

## 作業

1. 08の不便を起点に定義・宣言・実行の境界を決め、API.mdへ決定を記録する。
   group/ID、parameter型・既定値・検証、metadata、seed、時間/進行度、glyph/geometryの責務を決める。
2. 文字の配置を作るlayout、文字を変形するmotion、図形を描くdecorの独自例を各1つ作る。
   小さい例に留め、旧カタログの追加移植は13へ渡す。計測・描画helperはこれらに必要な範囲を公開する。
3. importした定義を局所的に使用できる仕組みを実装する。全Scene共有の可変global登録を前提にしない。
   ID競合、異なるgroup、不正params、cleanup、独自effectの自動抽選への参加/不参加を明示する。
4. 調整の意味・範囲を記述できるschema/metadataの最小形を決める。
   Studioのschemaとの共有は検討するが、全parameterのGUI化や検索実装は11/14へ残す。
5. 解決済みのCut時間・effect ID・seed・params・font/Styleを取得する最小APIを作る。
   async font計測前後の境界、serializableな情報と関数/Canvas等の資源の分離を決める。
   内部ScenePlan全体の無制限公開やJSONから任意コードを実行する形式は設けない。
6. 固定した別Cut/effectに変更が波及しない条件と、省略seed/候補追加の影響を文書化する。
   新しい識別子が必要ならここで追加し、React keyとの役割を区別する。
7. 公開型・README・08の例を同期し、package外の参照sourceをimportしない状態を保つ。

## 完了条件・検証

- 公開entryだけから、独自layout/motion/decorを定義・適用して実PNGを得られる。
- 解決済み構成と表示が対応し、取得結果の変更が内部planを変えない。
- 不正宣言とID競合が適切に検出され、別Scene・再mount・cache再生成で状態が漏れない。
- 同じseed/frame、逆順seek、局所parameter更新・復元、2Sceneで独自例の再現性を確認する。
- `npm run check:remotion`、focused実browser検証、tarball外部consumerで型検査と実描画。
  API変更に伴う既存テスト変更の理由を記録し、意図しない退行を隠さない。
- 旧7effectの既存回帰例を確認し、API差・意図した見た目の差をAPI.mdと結果へ記録する。

## 範囲外

配布plugin管理、外部effectの動的取得、旧registry全移植、標準画像fx、旧JSON互換、全group対応。
拡張APIの設計で後続範囲が変わる場合は理由と対応案をメモへ反映する。

## 段階08からの入口（2026-10-03）

[08の結果](08-review-workbench.md)と[レビュー例の手順](../../remotion-jizura/examples/review/README.md)を読む。
`examples/review/inputs.tsx` / `ReviewWorkbench.tsx`のtarget/reference 2Cutを利用する。
全seed・center/decor paramsを固定したcombined→edited→combinedの保存JSON、
frame6/24/52とreference84/112、9動画、環境/hash対応はignored `dist/remotion/stage08/`。
再生成は`node remotion-jizura/tests/review-browser.mjs`。新APIによる局所修正・復元の比較入口とする。

08は例側だけの変更で公開APIを追加していない。`id`はReact key/開発ラベル、
`candidate`/`input`は例のprops、JSONは公開プロジェクト形式ではない。
動きの強度/速度は現factoryの空paramsで調整できない。decor.v/r等の意味を確認できる
metadata、計測前後の解決済み構成、明示seedと安定した識別の関係が09の検討材料。
Player選択・Studio保存・JSON編集は自動同期されず、全入力の転記が必要。
初期candidateを含むリテラルdefault propsでStudio保存backendは動くが、
`reviewInputs.combined`のようなcomputed値は保存できない。保存入口は
`examples/studio-entry.tsx` / `StudioRoot.tsx`。Saveボタンの手操作とユーザーのdesign承認は未確認。

## 結果・引き継ぎ

2026-10-03：現在の `remotion` ブランチで段階09を実装・技術検証した。
開始時はクリーンでorigin/remotionより2commit先行、08のコード・結果と比較fontが存在した。
段階10以降の実装・追加移植は行っていない。package version/依存/lockfile/参照sourceは維持した。

### 確定した境界

- 公開値：defineLayoutEffect、defineMotionEffect、defineDecorEffect、resolveScene。
  Scene.onInspectとCustomEffect/Schema/Context/Inspection系型を追加した。
  [API追補](API.md#段階09の拡張契約2026-10-03)に入力・実行・seed・cleanup契約を記録。
- 定義は利用側TSへ置きfactoryの宣言を直接渡す。可変global registryを設けず、
  コードをWeakMapで宣言/解決effectに関連付け、plan/inspectionのserializable dataから分離。
  同group/IDの異定義はScene内でE_EFFECT、別Sceneでは分離。既存IDは予約、独自自動抽選なし。
  同ID/同paramsのcallback差し替えも再計測する私有identityは乱数/snapshotへ含めない。
- scalar schemaの型推論、固定default・description/範囲/unit・tagsを実装。
  Studio GUI/schemaの自動生成は導入せず、11/14で必要情報を拡張する。
- layoutはfont待機後のmeasureText/fitTextと1〜64個の本文placement。
  motionはglyphの移動/scale/rotation/alpha/hide、decorは現在frame boxとCanvas2D。
  独自例はoffsetLines/glyphWave/boxRule各1つ。新しい旧effect移植ではない。
- resolveSceneはfont前の同期prepared snapshot。onInspectはfont・geometry・初回描画後の
  measured snapshot（静止box/placements/glyphCount）。両方はdetached JSONでplanを変更できない。
  callbackのidentity変更だけでは再計測/再通知しない。StrictModeでの反復通知は許す。
- 公開Cut IDは追加せず、明示時間・Cut/effect seed・全paramsで局所修正を固定する。
  省略Cut seedの宣言index依存・decor seedのslot依存・自動時間再配分の影響を保持。
  組み込み7effectの初期API/描画差は意図していない。独自layoutはcenterの再分割/装飾を使わない。

### 変更ファイル

- 公開型/構成：`remotion-jizura/src/custom-types.ts`、`src/inspection.ts`、
  `src/types.ts`、`src/index.ts`。
- 解決/実行：同packageの `src/effects/custom.ts`、`src/effects/declarations.ts`、
  `src/effects/motion.ts`、`src/core/scene-plan.ts`、`src/canvas/custom-layout.ts`、
  `src/canvas/custom-frame.ts`、`src/canvas/service.ts`、`src/canvas/effect-frame.ts`、
  `src/react/collect-cuts.ts`、`src/react/JizuraScene.tsx`。
- 例：`examples/custom/effects.tsx`、`CustomEffects.tsx`、`README.md`、
  `examples/StudioRoot.tsx`、`examples/index.tsx`、
  `examples/review/inputs.tsx`、`ReviewWorkbench.tsx`、`README.md`。
  08の例へonInspectを転送。従来indexがstudio-entryをimportするだけでは採用版の
  registerRoot静的検査で停止したため、indexにも直接registerRootを書き、既存書き出しを修復した。
- テスト：`tests/custom.test.mjs`、`custom-types.tsx`、`custom-entry.jsx`、
  `custom-browser.mjs`、`custom-consumer.mjs`、`scaffold.test.mjs`、`consumer-validation.mjs`。
  最後の2つの厳密export一覧を新しい4公開値に更新し、内部export拒否は維持した。
- 文書：root/package README、API、本メモ、作業一覧、EXTENSION-PLAN、10/11/12の後続メモ。
  初期PLAN/VALIDATIONの過去実績とbaselineは変更していない。

### 実行した検証と結果

- `npm run typecheck:remotion`：成功。schemaのnumber/enum、空schema、group mismatchの型ケースを含む。
- `npm run check:remotion`：最終51/51成功（既存42＋独自9）、型検査/build成功。
  customのNode計測はstubであり、font/画素の証拠は次の実browserと分離した。
- 新command `node remotion-jizura/tests/custom-browser.mjs`：成功。
  2実Playerで同一frame、逆seek、snapshot変更、12→32→12の局所振幅変更/復元、固定reference、
  別Scene同IDの異定義、同ID/同paramsの関数差し替え、StrictMode再mount/cache再生成を確認。
  Canvas alpha/transform復元、最終owned font face0。baseline/editedの各11 PNGは
  Player対Remotionで画素差0、保存JSONを再読込した復元frame24も差0。
  concurrency2で60frame/2.5秒MP4を生成・全frame decode。MP4はlossyでPNG一致と分離。
- 新command `node remotion-jizura/tests/custom-consumer.mjs`：成功。
  既存consumer gateで実tarballをrepository外へinstall（workspace symlinkなし）、
  callerの3定義・公開型ケースをstrict TS検査し、baseline/editedの22実PNGを画素差0で確認。
  旧例11PNGも一致。packed importsは全てpackage内部/peerに限定し、deep importを拒否。
  最終ソースの再pack後に検証し、packed/emitted JS・d.ts計64ファイルのbyte一致と
  package内部/peerの148 importを確認した。installにはregistryまたはnpm cacheが必要。
- `node remotion-jizura/tests/effect-browser.mjs`：旧7effectの参照283比較で画素差0、
  StrictMode/複数Scene/seek/cache再生成/cleanup成功。旧例61並列PNGも全frame一致。
  MP4の最大frame平均channel差1.42619213（lossy）、61frameの最も近い原画を確認。
  初回は上記index静的検査でexport部分が停止し、entry修正後に全体を再実行して成功。
- `node remotion-jizura/tests/review-browser.mjs`：08の9案の実Player、保存/復元、
  99 PNG一致、9本60frame動画decode、target/reference loopと局所編集回帰を確認。
- `npm run check`：参照4target build・出力/契約/i18n・ja/en AE object-model mock成功。
  `npm run spike:build && npm run spike:test`：保存spike build/Node VM/AE model mock成功。
  Adobe/CEP実機の証拠ではない。
- 変更Markdown11ファイルのローカルリンク161件と未追跡を含む空白検査、
  `git diff --check`：成功。一時checkerは `/tmp/jizura-stage09-files.txt` の変更一覧から検査した。
- sandboxではbuildの`spawnSync tsc EPERM`、browserの`listen EPERM`があった。
  同commandを許可された通常実行環境で再実行した結果を上記に採用。
  ViteのPlayer `use client` warningと旧buildの既存warningは残るが、検証は成功。

### 実描画・目視の範囲

ignored `dist/remotion/stage09/`へ、baseline/edited JSON、prepared/measured snapshot、
Player/export22PNG、復元PNG、custom.mp4、環境/font/hash対応のcustom-result.json、
custom-consumer-result.jsonを保存。生成物はcommit対象ではない。
Node26.10.0、React19.3.0、Remotion4.0.532、HeadlessChrome154、640×360/24fps、
preview DPR2、Noto Sans JP700/normalを使用。font SHA256は
`c2f3b4d463500a2ddcd3849cded1fceeb9fd6d1c32e6cbecd568453ba50fc68f`。

担当agentはbaseline/edited frame24 PNGと、MP4を4fpsで抽出した10frame contact sheetを目視。
歌詞の保持・朝の強調・glyph wave振幅差・文字下のrule・pop入場/drift退出を確認した。
動画を全速で再生しての目視、ユーザーのdesign/motion承認、独自例のStudio操作/Saveは未確認。
contact sheetはPillow未導入のためffmpegで採取した開発用出力で、baselineには採用しない。

### 制約と次段階

font/OS/browser差、縦長/1080p性能、独自例の全parameter端点は未測定。
純粋callbackの契約を利用側が守る必要がある。setup/外部資源hook、任意glyph注入/縦組、
厳密な回転/clip/shard bbox、画像effect接続、全parameter GUI/catalog/保存syncは未導入。

10は[追加引き継ぎ](10-remotion-effects.md#段階09からの入口2026-10-03)から開始する。
通常DOM canvasと図形decorの境界を維持し、画像加工は標準Remotion APIで独立に試す。
11へfactory.metadata/schemaと組み込み意味情報の未追加、12へfocused harnessと
JSON/PNG/環境の対応を渡した。10/11/12のメモを同期済み。
