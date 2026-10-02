# 段階04：フォント準備と静止Canvas描画

状態：完了（2026-10-03、実フォント・静止Canvas/PNG・同環境pixel比較）。前提：[段階03](03-scene-plan.md)の計画処理が作業ツリーにあること。
次段階：[05：frame接続](05-remotion-frames.md)。

## 開始時に読むもの

- [AGENTS.md](../../AGENTS.md)、[ルートREADME](../../README.md)、[作業一覧](README.md)、[共通計画](PLAN.md)。
- 段階01〜03の結果、[確定API](API.md)、パッケージREADME。
- [text.ts](../../engine/text.ts)、[フォントサービス](../../ui/services/fonts.js)、
  [styles.ts](../../engine/styles.ts)、[基本layout](../../effects/core/layouts.ts)。
- 段階02の採用バージョンに対応するRemotion公式のフォント・描画待機資料。

## 目的と成果物

固定の日本語フォント1種類から始め、実際の文字計測と静止Canvas描画を成立させる。
後続のcenter layoutや文字変形に必要な、文字item・境界box・描画サービスを用意する。

## 作業

1. フォント準備をSceneの資源管理に接続し、準備後に計測・計画を確定する。
   待機、失敗、再mount、cleanupを扱い、書き出しとプレビューの準備状態をそれぞれ確認する。
2. 比較用フォントのファイル・入手方法・ライセンスを記録する。
   無断でフォントバイナリをコミットせず、移植元と同じ資源を使える比較手順を整える。
3. 既存の文字幅、字間、改行、配置・描画を必要な範囲だけ移植する。
   Canvas生成を描画サービス側に置き、import時のDOMアクセスを避ける。
4. 最小Style、フォント上書き、強調情報を静止描画へ反映する。
   API仕様が要求する文字item・文字別配置・境界boxを供給する。
5. Sceneの基底背景、Canvas解像度、CSS表示サイズ、clear・save/restoreを管理する。
   計測キャッシュとCanvasをScene間で不適切に共有しない。
6. この段階は静止文字を中心に確認する。center effectの完成やenter/hold/exitの移植は段階06で扱う。

## 完了条件と検証

- 固定フォントで日本語・改行・字間・強調・上書きを含む静止画を取得し、配置と境界を確認する。
- 同じフォント・設定での参照計測と描画を比較し、採取条件と差分を記録する。
- フォント未準備で計測しない。失敗が検出され、書き出しの待機handleが残らない。
- 別Scene・再mount・異なるサイズで状態が漏れない。
- 専用型検査・focusedテスト・ビルド、実ブラウザでの静止画検証、`git diff --check`。
  ビルド経路を変更した場合は既存チェックも実行する。
- stub計測と実フォント計測を区別し、画像を実際に確認した範囲を記録する。

## 段階01からの確定事項（2026-10-02）

FontSpec既定は利用側登録のNoto Sans JP 700/normal。src指定も受け、未登録・失敗はE_FONT。
Cut.fontは全置換、Style.paletteはkey別merge。強調はglyph色だけを変える。
CanvasにDPRを掛けない。Scene背景とCut palette.bgを区別し、計測後の静止boxを
後続decorの履歴なしfallbackとして渡す。

## 段階03からの実装入口（2026-10-02）

[scene-plan.ts](../../remotion-jizura/src/core/scene-plan.ts)の `prepareScene` が計測前の
本文・配置・phase時間・seed・font/Style・effect ID/paramsを確定する。
`finalizeScene(prepared, service)` は `MeasurementService<T>.prepareFonts` の成功後に
`measureCut` を実行し、geometryをcopy/freezeした `ScenePlan<T>` を返す。
04は実face準備とglyph/item/boxのgeometry型・計測・静止描画をこの境界へ実装する。
Style trackの優先順位は `cut.trackSource` と `cut.layout.params.track` を参照できる。

[JizuraScene.tsx](../../remotion-jizura/src/react/JizuraScene.tsx)は宣言収集を接続済みだが、
非空Sceneは `E_INPUT/path=canvas` の仮エラーを出す。この箇所を資源準備と静止描画へ置き換える。
7factoryは宣言のみ実装済みで、描画effectの移植完了を意味しない。
03の25件のNode契約と計測stubは実フォント/画像の証拠ではない。
確認は `npm run check:remotion` を基準にし、空Sceneの契約を保ちながら実ブラウザの証拠を追加する。

## 結果・引き継ぎ

2026-10-03：完了。現在の `remotion` ブランチで実施。開始時から段階03のソース・文書が
未コミットで存在し、前提実装と結果を確認した上で保持した。参照ソース・baselineは未変更。

### 設計と実装範囲

- `canvas/fonts.ts` の `SceneFonts` はFontFace/FontFaceSetを使い、正確なfamily/weight/styleの
  登録とload結果を検証する。`check()`のみのfallback成功を採用しない。
  srcはdocument.baseURI基準で解決し、同faceの異なるsrcをE_FONTにする。
  既存caller-owned faceにsrcを重ねない（srcを省略して利用する）。可変weight範囲も確認する。
- Documentごとに同一srcの非同期face資源だけを参照数で共有し、最後の利用者がowned faceを削除。
  caller-owned faceは削除しない。15秒の独自timeout、cleanupによるabort、遅延load後の登録禁止を実装。
  フォント失敗はcode/path付きE_FONT。未使用Scene.fontはロードせず、解決済みCut.fontだけを準備する。
- `canvas/service.ts` の `CanvasMeasurementService` が03の計測境界を実装。
  全Cutのフォント準備後に専用計測Canvasを作り、100pxで計測したadvance/emをScene所有cacheへ保存。
  import時のDOMアクセスなし。計測Canvas/metricsをScene間で共有しない。
- `canvas/geometry.ts` の `CutGeometry` は静止item、文字別glyph、design-space boxを持つ。
  水平・中央揃え・typeset=falseの旧 `layoutText/fitSize` を必要範囲だけ移植した。
  明示改行を保持し、code point強調indexには改行を含め、運動用glyph indexには含めない。
  Style上限、lead、palette merge、font全置換、明示trackの優先順位と0を適用する。
- 04の静止経路はsx/sy=1、自動track=0.06、width*0.84/height*0.5とheight*0.33でfitする。
  centerの自動改行・sx/ox/oy/accent/sub/underはまだ描画しない。
  06でcenter静止geometryを確定し直し、decor fallbackのboxもそのgeometryへ置き換える。
  現在のboxは04の静止文字のadvance/size境界で、glyphの厳密なink boundsではない。
- `canvas/static-frame.ts` は **先頭の計画Cutを静止表示**。Scene範囲外clearは維持するが、
  Cutのfrom/duration選択・phase/量子化・enter/hold/exit/decorの描画は05〜06へ残す。
  強調はglyphのfill色だけを変える。Cut.palette.bgでScene背景を塗り直さない。
- Sceneは宣言内容が同じframe更新で資源を再準備せず、内容変更時にCanvas/planをremountする。
  useLayoutEffectで準備handleを作り、初回Canvas描画 **後** に解放する。
  Studioでは `data-jizura-ready` とReact状態で準備完了を管理し、失敗を表示する。
  書き出し失敗はcancelRenderへ伝え、cleanup/失敗/再mountではhandleを解放する。
  採用4.0.532の実コードと公式[fonts](https://www.remotion.dev/docs/fonts)・
  [delayRender](https://www.remotion.dev/docs/delay-render)・[cancelRender](https://www.remotion.dev/docs/cancel-render)を確認した。

### 固定フォントと再取得

Noto Sans JP可変TTFをGoogle Fontsの公式repoから取得し、700/normal（上書き比較は400/normal）で使った。
取得時のfile commitは `295d98a7a0c17c68f1341eaeea354e7960ea70d3`。
バイナリとOFLは無視対象 `dist/remotion/stage04/assets/` のみ。packageに同梱しない。
利用者が登録済みfaceを用意するかFontSpec.srcを指定する。
[SIL Open Font License 1.1](https://github.com/google/fonts/blob/295d98a7a0c17c68f1341eaeea354e7960ea70d3/ofl/notosansjp/OFL.txt)。
ライセンス通知は取得ファイルに保存し、フォントを再配布する場合はそれも保持する。

repo rootでの再取得例（curlにはネットワーク接続が必要）：

```sh
mkdir -p dist/remotion/stage04/assets
curl -fL 'https://raw.githubusercontent.com/google/fonts/295d98a7a0c17c68f1341eaeea354e7960ea70d3/ofl/notosansjp/NotoSansJP%5Bwght%5D.ttf' -o dist/remotion/stage04/assets/NotoSansJP.ttf
curl -fL 'https://raw.githubusercontent.com/google/fonts/295d98a7a0c17c68f1341eaeea354e7960ea70d3/ofl/notosansjp/OFL.txt' -o dist/remotion/stage04/assets/OFL.txt
sha256sum dist/remotion/stage04/assets/NotoSansJP.ttf
```

検証フォントSHA-256：`c2f3b4d463500a2ddcd3849cded1fceeb9fd6d1c32e6cbecd568453ba50fc68f`。
参照側の `FONTS.fixture` は同じFontFace family/weightを指し、旧fonts.ensureのネット取得は呼ばない。
旧textのcharFnへ新emphasisのglyph色だけを渡すadapter条件で比較した。

### 変更ファイル

- 新規source：`src/canvas/fonts.ts`、`geometry.ts`、`service.ts`、`static-frame.ts`。
- 更新source：`src/react/JizuraScene.tsx`。公開exports/props・03のcoreは本段階で変更なし。
- 更新例：`examples/index.tsx` のStaticText（日本語・改行・字間・強調）、StaticOverride（font/Style上書き）。
- 新規テスト：`tests/canvas.test.mjs`、`browser-entry.jsx`、`canvas-browser.mjs`。
  scaffoldの非空Scene SSRはDOMに触れない準備待ちCanvasへ更新。
- 文書：本メモ、作業一覧、共通計画、API実装状態、05の入口、ルート/パッケージREADME。
  03の過去の未実装・stub証拠は変更せず残した。

### 実行チェックと描画証拠

Node26.10.0/npm11.19.1、React19.3.0/Remotion4.0.532、Chrome154.0.8037.97。
比較はframe0、24fps、motionFps=null、DPR2、水平typeset=false、effects無効の静止経路。

| 実行 | 結果・証拠の範囲 |
| --- | --- |
| `npm run check:remotion` | strict型検査・ESM/型build・Node契約30件すべて成功。font lifecycleのNode部分は明示mock |
| `npm run typecheck:remotion` | 最終例のfontSrc props追加後も成功 |
| `node remotion-jizura/tests/canvas-browser.mjs` | 実FontFace/Canvas。標準700・上書き400・320×180・透明の4条件で全pixel差0。glyph/box差最大1.14e-13 |
| 同browser harnessのScene確認 | StrictMode準備、640×360/320×180の同時Scene、remount画素一致、Scene範囲外clear、準備中unmountと3.2秒後の遅延load確認、previewのE_FONT。最後のface/handle数0 |
| 同browser harnessのcaller登録face | src省略の登録済み可変100..900faceを700で計測・描画。src版と同画素、service破棄後もcaller faceを保持 |
| 同browser harnessの資源失敗 | 404、不正バイナリ、100msに短縮したtimeoutでE_FONT、計測前に停止。font失敗後のface数0 |
| `npm exec --workspace remotion-jizura -- remotion still examples/index.tsx StaticText ../dist/remotion/stage04/static-text.png --public-dir=../dist/remotion/stage04/assets --browser-executable=/usr/bin/google-chrome` | 実PNG成功、960×540。日本語・改行・字間・強調を目視確認 |
| 上記と同形式の `StaticOverride` → `static-override.png` | 実PNG成功、960×540。400weight/fg/track/強調上書きとScene背景維持を目視確認 |
| 上記StaticTextに `--props='{"fontSrc":"/missing-font.ttf"}'`、出力 `failed.png` を指定 | 意図したexit1。フォント404でJizuraErrorを即時報告し、待機timeoutなし・PNG未生成 |
| `npm run studio:remotion -- --port=3104 --no-open --public-dir=../dist/remotion/stage04/assets` | 実Studio起動・bundle成功。検証後停止 |
| `node dist/remotion/stage04/studio-check.mjs` | 無視対象の一時probe。DPR2でもCanvas960×540/CSS100%、ready=true、handle0、画面エラーなし。Studio screenshot目視確認 |
| `python3 /tmp/jizura-stage04-check.py` / `git diff --check` | Markdown7ファイル83ローカルリンクの欠落0、公開source55importはpackage内とReact/Remotionだけ、既存差分/新規ソースの空白エラー0 |
| 固定commitのfont再取得と `cmp` | 上記URLから `/tmp/jizura-stage04-pinned-font.ttf` へ再取得し、比較フォントとbyte単位で一致 |

画像・レポートは `dist/remotion/stage04/`：`browser-result.json`、4条件の `*-target.png` /
`*-reference.png` / `*-boxes.png`、`static-text.png`、`static-override.png`、`studio.png`、
`studio-result.json`。box overlayの標準画像を目視確認し、行とglyphの配置を確認した。
他のpixel比較画像は自動全pixel比較で検査し、すべてを個別目視したという証拠ではない。

通常sandboxではbuildの `spawnSync tsc EPERM` とfont取得DNS制限があったため、
同じチェック/ブラウザ・取得コマンドを許可されたsandbox外で実施した。
rootのbuild経路・manifest/lockfile・buildスクリプトは変更せず、旧 `npm run check` とspikeは再実行していない。

### 制約と次の入口

公開API契約変更なし。固定フォントの水平静止subsetを検証した段階であり、center全体・
glyph分解・実effect・Cut選択/境界/Sequence・非連続frame/動画更新の検証は05〜06へ残す。
未収録glyphのfallback検出、任意OS/ブラウザ/フォント、Player、外部consumer、Adobe/CEP実機は未検証。
既定のNoto Sans JPも利用側登録が必要。異なるsrcとの競合は同じDocument内で検出するが、
callerが後から直接FontFaceSetを書き換える動作は管理対象外。
push・公開・release・依存追加は行っていない。

[段階05](05-remotion-frames.md)は `ScenePlan<CutGeometry>` と `drawStaticFrame` の先頭Cut選択を
frame評価/activeCut選択へ置き換えるところから開始する。サービスとhandle管理を保ち、
frame用変形をplanへ蓄積しない。center geometryの完成と静止box更新は06の範囲。
