# 段階08：既存7effectの最小レビュー環境

状態：完了（2026-10-03、実装・技術検証。ユーザーのdesign/motion確認は未実施）。前提：初期01〜07の実装・結果。
次段階：[09：独自effect・構成確認API](09-custom-effects.md)。

## 開始時に読むもの

- [AGENTS.md](../../AGENTS.md)、[root README](../../README.md)、[作業一覧](README.md)、
  [初期計画](PLAN.md)、[拡張計画](EXTENSION-PLAN.md)、本メモ。
- [07の結果](07-scene-validation.md)、[API](API.md)、[初期検証](VALIDATION.md)、
  [package README](../../remotion-jizura/README.md)。font失敗を扱う場合は[04の追補](04-static-canvas.md)も読む。
- [EffectSamples/登録例](../../remotion-jizura/examples/StudioRoot.tsx)、
  [Player例](../../remotion-jizura/examples/player/main.tsx)、
  [scene checks](../../remotion-jizura/tests/scene-browser.mjs)、
  [Studio checks](../../remotion-jizura/tests/studio-validation.mjs)。

## 目的・成果物

現在の7effectで「候補を比較し、対象だけを直し、同じ案へ戻る」を体験できる最小例を作る。
examplesと小さな開発用出力を中心にし、公開API・effect数・導入方式を変更しない。

## 作業

1. 同じ歌詞・font・寸法・時間・明示seedで、7effectの単独表示と組み合わせを比較できる例を作る。
   対象Cutのloop/seekは既存Studio/Playerを活用し、専用編集アプリは作らない。
2. 各案へ識別名を付け、入力設定・代表frame・短い動画の対応を記録する。
   JSON等の保存設定は開発例の入力形式とし、公開プロジェクト形式にはしない。
3. 入退場時間、色、既存center/decor paramsを局所変更し、変更前後を同条件で比較できるようにする。
   現在のmotion factoryは空paramsであるため、強度・速度の新APIを先取りしない。
4. 明示seedと固定設定で、別Cutを保持しつつ1Cutを修正し、設定復元で元のframeを再現する。
5. 最短の実行・比較手順をpackage READMEまたは開発資料へ記録する。
   新commandを追加したら、その名前・出力先・必要font/Chromeを結果へ記録する。
6. Studioのdefault props保存が使えるか、現状の登録形式で実測する。
   最小の例側修正で直せる場合は修正する。未対応ならコード/入力ファイル編集による往復を動かして記録する。

## 完了条件・検証

- 7effectを単独/組み合わせで見られ、比較する案が同じ入力条件である。
- 実PlayerまたはStudioでseek/loopと設定更新を確認し、代表PNGと短い動画を実書き出しする。
- 1Cut変更後、明示的に固定した別Cutの代表frameは同じ。復元後は元のPNGと一致する。
- 保存した入力から再表示・再書き出しでき、出力に設定/環境/frameの対応がある。
- `npm run check:remotion`、変更例に必要な実browser check、ローカルリンク、`git diff --check`。
  広範な既存チェックの再実行は変更範囲に応じて選ぶ。
- 代表frameと動画を担当agentが目視し、レビューの手数・残る不便を結果へ記録する。

## 範囲外

新effect・独自effect API・解決済みplanの公開・標準effects接続・検索カタログ・AI専用サービス。
音声やタイミングの生成、ユーザーレビューを自動で承認する仕組みは追加しない。

## 結果・引き継ぎ

2026-10-03：現在の `remotion` ブランチで完了。開始時はクリーンで、01〜07のコード・
結果と比較fontが存在した。公開exports/props、effect数、package version、peer依存は変更していない。
新effectや09のAPIは実装していない。

### 決定と変更ファイル

- `remotion-jizura/examples/review/inputs.tsx`：center/pop/wipe/drift/breathe/kasumi/checkerStrip
  の単独7案、combined、editedの9案。歌詞「新しい*朝*が来た」、font/解像度/fps/
  Scene seed、2Cutの時間を固定。Cut seed1234/5678、全effect seed、全center/decor paramsを明示。
  layoutは必須なので「単独」はcenter＋対象1effect。無効なphaseの時間は既存契約に従い0。
- `ReviewWorkbench.tsx`：2Cutの120frame/5秒Composition。target `[0,60)`、
  reference `[60,120)`。同じ本文で比較し、editedはtargetだけのenter12→20/exit16→10、
  palette/強調色、center sx/track/offset/underline、decor count/side/size/variantを変更する。
  factoryに存在しないmotion強度/速度paramsは追加しない。
- `ReviewPlayer.tsx`、`examples/player/main.tsx`：既存Playerの `/?review` に候補選択と
  target/reference/全体のloop範囲選択。seek/playは標準Playerのcontrols。通常 `/` はLyricsDemo。
  例内のerrorFallbackで入力/resource失敗を表示する。専用編集アプリは作らない。
- `examples/studio-entry.tsx` / `StudioRoot.tsx`：registerRootとComposition一覧を分離。
  採用4.0.532は `*-entry.tsx` と対応する `*Root.tsx` を探索するため、この名前を採用。
  `examples/index.tsx`は従来のstill/render/harnessから使える入口として保持し、
  package.jsonの既存studio scriptだけを新entryへ変更した。
- 最初の `defaultProps={{input: reviewInputs.combined}}` は実Studioに
  `Cannot update computed prop "defaultProps"`と拒否された。初期値を
  `{candidate: "combined"}`のリテラルへ変更し、candidate→例入力の解決を例側で行う。
  完全な保存JSONの `input` はcandidateに優先する。`input.name`だけでは候補を切り替えない。
  公式[registerRoot](https://www.remotion.dev/docs/register-root)・
  [visual editing](https://www.remotion.dev/docs/visual-editing)と採用版の実sourceを確認した。
- `tests/review-entry.jsx` / `review-browser.mjs`：実ReviewPlayerのselector/loop/seek/
  restore/remount、保存JSONからの再読込、各案のPNG/動画、環境とinput/frame/hashの対応を記録。
  `review-studio.mjs`は稼働中Studioの保存backendへ同一origin requestを送り、source保存・
  full page reload・PNG一致を確認する。テスト後は元のStudioRootを正確に復元し、
  途中の他者編集を検出したら上書きしない。Saveボタンの手操作テストとは区別する。今回起動したStudioは検証後に停止済み。
- 文書：本メモ、root/package README、`examples/review/README.md`、作業一覧、
  EXTENSION-PLAN、09の入口。01〜07のPLAN/VALIDATIONと参照source/baselineは保持。

### 実行したチェックと実測

すべてrepo rootから実行。Chrome154/Linux、Node26.10.0、React19.3.0、Remotion4.0.532、
Noto Sans JP700/normal、640×360/24fps、motionFps=null、preview DPR2。
fontは段階04と同じTTF（SHA256 `c2f3b4d463500a2ddcd3849cded1fceeb9fd6d1c32e6cbecd568453ba50fc68f`）。
追加npm script・依存・lockfile変更はない。新しい検証commandと出力先は次のとおり。

| コマンド | 結果・証拠の範囲 |
| --- | --- |
| `npm run check:remotion` | strict TS/TSX、ESM/型build、42件Node契約成功。font契約はmock |
| `node remotion-jizura/tests/review-browser.mjs` | 実Playerの9案×11代表frame、逆順seek52→6→24→112→24、combinedへの復元、StrictMode再mount成功。target57→58→59→0、reference117→118→119→60の実再生loopを確認 |
| 同commandの実書き出し | 各案の保存JSONを再読込し同じinputPropsでselectComposition。frame0/6/12/24/43/52/59/60/84/112/119の99PNGが実Playerと全画素一致。edited target frame24はcombinedと異なり、固定reference4frameは全9案で同じ。復元JSONから再取得したframe24も画素差0 |
| 同commandの動画 | 9本、各target frame0〜59、H.264 CRF1/yuv444p/concurrency2、640×360/24fps/60frame/2.5秒。ffprobe metadata・全frame decode成功。各動画の代表7frameとPNGの平均channel差は最大1.555197（圧縮/RGB-YUV差、PNG完全一致と区別）。全動画frameのPNG照合ではなく代表frame照合 |
| `npm run studio:remotion -- --port=3109 --no-open --public-dir=../dist/remotion/stage04/assets` / `node remotion-jizura/tests/review-studio.mjs` | 実Studio保存backendでcombined→edited→combinedをsourceへ保存し、毎回full reload。各回frame24/84/6/112/24の計15PNGが対応exportと画素差0/待機handle0。保存前の初期candidate frame24も一致。root探索・computed props拒否を解消。sourceは復元済み |
| `JIZURA_STUDIO_URL=http://localhost:3109 node remotion-jizura/tests/studio-validation.mjs` | 新しい登録入口で既存LyricsDemo13frameが段階07の比較hashと一致。Sequence境界/繰り返しseekの回帰 |
| `npm exec --workspace remotion-jizura -- vite build --config examples/player/vite.config.mjs --outDir ../../../dist/remotion/stage08/player` | 最終Player例のproduction bundle成功。既存のuse-client/outDir/chunk-size warningのみ |
| `npm run check` | 保存した旧sourceの型/i18n/engine/effect契約、4種build、syntax/output/catalog、日英AE mock成功。Adobe実機ではない |
| `npm run spike:build` / `npm run spike:test` | 保存spike build/Node VM・AE object-model mock成功 |
| `node --check`（追加mjs2本） / `python3 /tmp/jizura-stage08-doc-check.py` / `git diff --check` | 構文、変更Markdown7本のローカルリンク107件、追跡/未追跡18ファイルの空白を確認。欠落/空白エラー0 |

最初のsandbox内buildは既知の `spawnSync tsc EPERM`。同じcheckを通常実行環境で
再実行して成功した。単独例の最初の試行は無効phaseに非zero時間を残していたため
既存E_TIMINGに拒否され、例側で0に直した。Studio checkerのrequest/header/envelopeも
採用版に合わせた。実装本体のエラーや互換性の失敗としては扱わない。

### 出力・目視・レビューの手数

新しい生成出力はignored `dist/remotion/stage08/`へ保存する。
`<name>.json`、`<name>-<frame>.png`、9本の `<name>.mp4`、`restored-24.png`、
Player/StudioのPNG、`review-result.json` / `studio-review-result.json`。
前者に全入力、入力file/hash、font/environment、frame/PNG hash、動画対応とloop履歴を記録。
font/OFLは既存 `dist/remotion/stage04/assets/`、取得手順とChrome/ffmpeg前提は
[例の手順](../../remotion-jizura/examples/review/README.md)に記録。baseline fixtureは追加/再生成しない。

担当agentは9案のframe6/24/52のcontact sheet、9動画をdecodeした
frame0/6/12/24/43/52/59のfilmstrip、combined/editedのPlayer画面とeditedのStudio画面を目視。
popの逐字入場、wipeの帯、driftの破片、breatheの文字間隔変化、背面kasumiと前面checkerStrip、
変更後の色/underline/装飾位置と入退場の差を確認した。kasumiはこのpaletteでは暗く、
decorの端への接触は元の特徴。目視は動画の採取frame列で行い、連続再生での鑑賞とは区別する。
ユーザーのdesign/motion承認は未確認。画素一致を採用承認としない。

比較は候補選択→標準seek/play、局所変更はinputs.tsxまたはStudio Props→保存→
同じframe比較→combined/保存JSONへの復元、という短い往復になった。
一方、decor.v/r等の意味、解決済み構成、motion強度/速度の不足、長いJSONの編集、
Playerのコード入力とStudio保存先間の手動転記が不便として残る。

### 制約と09への入口

- 同じChrome/fontの再現性のみ。他OS/font/ブラウザ、長時間/高解像度性能は今回未検証。
  初期の全effect参照pixel比較・外部tarball検証は再実行していない。公開export/本体は変更なし。
- 実StudioのSave backend・source・再表示は確認済みだが、UI Saveボタンの手操作は未確認。
  初期値のcomputed参照を戻すと保存できない。Player/Studio/JSONは自動同期しない。
- 例のidはReact key/開発ラベルであり公開識別APIではない。明示seedと全paramsで対象を固定した
  条件だけを保証する。省略seed/候補追加/decor slotの一般的編集安定性を先取りしない。
- [09メモ](09-custom-effects.md)に比較2Cut・commandと不足情報を追記した。
  `examples/review/inputs.tsx`と保存JSON/代表frameを独自effect・構成確認APIの検証入口にする。
  API名・parameter schema・metadata・計測前後の公開境界は09で決める。
