# remotion-jizura 表現拡充・レビュー体験の開発計画

作成日：2026-10-03。ブランチ：`remotion`。状態：08〜12は実装・技術検証完了、13〜14は未着手。
初期01〜07の[計画](PLAN.md)・[API](API.md)・[検証記録](VALIDATION.md)を前提とする。
[作業一覧](README.md)から各タスクへ進む。

## 目的と合意した方針

AIがRemotionのコードを組み、人間がデザイン・モーションを見て直す制作フローを支える。
パッケージの中心は表現の部品、選択に必要な情報、局所的な調整と再現に必要なAPIとする。
同じような見た目をRemotionで扱えることを重視し、旧版の完全互換を目標にしない。

- エフェクトを増やす。旧分類・IDをそのまま公開する必要はなく、統合・parameter化も検討する。
- 雰囲気・動き・用途・制約から候補を探せるようにし、共通条件で視覚比較できるようにする。
- 独自エフェクトを利用側のファイルからimportして使えるようにする。
- AIと人間が、解決済み構成を確認し、対象だけを変更して、同じ条件で比較できるようにする。
- 画像加工はRemotionの標準`effects`への適合を試す。文字配置・文字単位の運動とは境界を分ける。
- 移植数が増える前に、実装・検証・目視確認の共通手順を作る。

## 今回の到達点と対象外

現在の7effectを比較・調整できる最小レビュー環境、独自effectの実利用例、構成確認API、
標準effects接続の実測、カタログと共通検証手順を用意する。その手順で最初の小さな移植群を
追加し、短いCompositionで「選ぶ→描く→比較する→局所修正する→再現する」を確認する。

LRC入出力、拍スナップ、音声解析、旧おまかせの再現、旧JSON読み込み、旧編集UI、
AE/CEP連携、全effectの一括移植、複雑なCut overlap/transitionは対象外。
外部で決めた時間・進行度を利用しやすくすることは、担当APIの範囲で検討する。
大きなrepository構造変更、導入方式・対応版の拡大、npm公開、サイト配布、CI全面刷新は後段で決める。
今回のレビュー例・検証に必要な局所的な登録形式やscriptsの整備は各タスクで行える。

## タスクと順序

| 段階 | メモ | 主な成果物 |
| --- | --- | --- |
| 08 | [既存7effectの最小レビュー環境](08-review-workbench.md) | 比較例、設定保存・復元、局所修正の確認 |
| 09 | [独自effect・構成確認API](09-custom-effects.md) | 最小公開契約、利用側effect例、解決済み構成の確認 |
| 10 | [Remotion標準effects接続の試作](10-remotion-effects.md) | 画像加工effect、JIZURA描画との接続方式・実測 |
| 11 | [選択カタログ・移植候補の整理](11-effect-catalog.md) | メタデータ、検索・比較、全体一覧、最初の移植群の指定 |
| 12 | [共通の移植・検証手順](12-port-validation.md) | ケース駆動の検証・レビュー出力、追加手順 |
| 13 | [最初の小さな移植群](13-first-effect-batch.md) | 11で選んだ4〜6effectと比較・回帰記録 |
| 14 | [AI生成コードからのレビュー体験](14-review-loop.md) | 統合例、修正・比較・再現の手順と実測 |

08→09→10→11→12→13→14の順に、別スレッドへ引き継ぐ。
各メモの開始時に読むものには、この計画・初期結果・そのタスクの直接前提を記載する。
前タスクが契約や対象を変更したら後続メモを同期する。既存メモの過去の実績は書き換えない。
API名、接続方式、追加command名は担当タスクで選び、結果へ記録する。
この計画の案を、すでに実装された公開APIとして扱わない。

## 契約と互換性

旧版との一致は品質の参考情報とし、描画アルゴリズムの参照比較と、旧planner/seed/JSON互換を分ける。
Remotion向けの変更は理由・影響・比較条件を記録し、参照sourceや旧baselineを保持する。
一方、現在のパッケージ内の整数frame、非連続seekでの再現性、font待機、cleanupなどは土台となる。
新APIに必要な変更は許すが、意図しない退行を見落とさないよう既存の回帰チェックを使う。
08は公開契約を変更せず、09以降の担当で[API.md](API.md)を更新する。

レビュー対象を固定するため、effect ID、明示seed、解決済みparameter、時間、font条件を残す。
初期版の省略seedはCut宣言index、decorのslotは配列indexに依存する。
全編集で不変と宣言せず、まず明示seedと対象の識別によって局所修正を保証する。
候補追加時の自動選択への影響や、安定した識別子の追加が必要なら担当タスクで契約を決める。
独自effectと組み込みeffectの自動選択への参加は明示的に扱う。

## 検証の共通方針

| 層 | 主な評価 |
| --- | --- |
| 型・契約 | parameter・時間・宣言、エラー、import境界 |
| 再現性 | 同じframe、逆順seek、再mount、cache再生成、並列描画 |
| 描画成立 | 可視性、clear、alpha、境界、意図しないはみ出し・消え残り |
| 見た目・動き | 原型の特徴、可読性、局所調整、組み合わせ。動画と代表frameを目視 |
| レビュー体験 | 候補発見、比較、修正範囲、保存・復元、書き出しとの対応 |

同一固定環境の回帰比較、旧sourceとの参考比較、別font/OSでの評価を区別する。
画素が一致しても、見た目を採用したことや利用者レビュー完了の証明にはしない。
担当agentの目視確認とユーザーの確認を区別し、後者がなければ「未確認」と記録する。
ユーザー未確認は引き継ぎ事項とし、実装・技術検証の状態と別に管理する。
新しい基準画像は採取条件・出所・選定理由を残す。生成画像・動画・レポートはignored `dist/`へ置く。
自動生成をそのまま採用済みbaselineとして扱わず、失敗に合わせて旧fixtureを更新しない。

既存の入口は`npm run check:remotion`と、package READMEにあるbrowser/consumer checks。
変更範囲に応じてfocused checkを選び、前提asset・実行command・結果を記録する。
公開export変更はtarballからの外部利用を確認する。build経路変更はAGENTS.mdのroot/spike checksを行う。
新commandは実装した担当が記録する。未実装commandを後続タスクの成功前提にしない。

## 完了時の引き継ぎ

担当メモの結果と[作業一覧](README.md)の状態を更新する。日付、変更ファイル、確定契約、
実行commandと結果、実描画と目視の範囲、制約、次タスクの入口を記録する。
試作で採用しなかった案にも理由を残し、接続不能や未検証を成功として報告しない。
過去の[VALIDATION.md](VALIDATION.md)は初期開発当時の証拠として保持する。
新しいAPIはAPI.mdとpackage README、共通手順は担当が追加する文書へ反映する。

## 参照と計画作成時の確認

- [Remotion Effects](https://www.remotion.dev/docs/effects)
- [createEffect](https://www.remotion.dev/docs/create-effect)
- [HTML-in-canvas](https://www.remotion.dev/docs/html-in-canvas)

2026-10-03の方針検討で公式資料と採用4.0.532の型を確認した。
標準effectsは対応canvas系componentの画素加工で、普通のDOM canvasへpropsを足すだけでは接続できない。
JIZURAとの実接続や新しいレビュー体験は、この計画の作成時には試していない。
実装担当は採用版の公開APIを確認し、内部APIへの依存を避けて検証する。

## 計画作成の結果

2026-10-03：08〜14と作業入口を文書化。実装・依存追加・描画・公開は実施していない。
`python3 /tmp/jizura-extension-doc-check.py`で変更/追加Markdown12ファイルのローカルリンク190件、
未追跡を含む末尾空白、08〜14の必須欄と状態表を確認し、欠落・空白エラー0。
`git diff --check`も成功。checkerはこの計画作成時の一時ファイルで、repositoryには追加していない。
最初の着手先は08。

## 段階08の結果（2026-10-03）

既存7effectの単独例とcombined/editedの比較9案を追加した。明示seed・全center/decor
params・2Cutの時間を固定し、最初のCutだけの変更・保存入力の再読込・復元を実測した。
実Playerのseek/両Cut loop、99代表PNG、9本の2.5秒MP4、実Studio保存backendと
再読み込み15frameを確認。詳細・実行条件・目視とユーザーレビューの区別は[08の結果](08-review-workbench.md)。

公開契約は変更していない。例の入力ラベルは公開Cut IDではなく、JSONは開発用入力。
Studioの保存には採用版が探索できるentry/root名とリテラルdefault propsが必要だったため、
`examples/studio-entry.tsx` / `StudioRoot.tsx`を追加し、初期候補を文字列propsにした。
09には局所編集用parameterの意味、構成確認、識別・seedの条件、Player/Studio間の転記の不便を渡す。

## 段階09の結果（2026-10-03）

独自layout/motion/decorをcallerのTSからfactory宣言で局所適用できるAPIと、
font前のresolveScene/計測後のScene.onInspectを追加した。scalar schema/metadataと
explicit seedの条件を[API追補](API.md#段階09の拡張契約2026-10-03)へ確定。
可変global registry・JSONコード復元・新しい公開Cut ID・独自自動抽選は導入しない。
組み込み7effectの候補/seedを維持し、現在frameのglyph変形/図形decorを画像fxから分離する。

独自3例の2実Player、22 PNG一致・復元・別Scene分離・cleanup、実外部tarballの型/22PNG、
旧7effect283参照比較と61並列PNG、08の9案を検証した。詳細は[09の結果](09-custom-effects.md)。
生成物はdist、ユーザーデザイン承認と独自Studio保存は未確認。
10へ通常DOM canvasとの画像fx接続境界、11へmetadataと組み込み意味情報の補完、
12へfocused browser/consumer手順を引き継いだ。共通harness/catalogは未実装のまま残す。

## 段階10の結果（2026-10-03）

公開HtmlInCanvasの単一wrapperで既存Sceneを加工する方式が実動した。
標準blur(WebGL2)と新しいsliceGlitch(2d)を配列順で組み合わせ、独立CanvasImageにも適用した。
公開追加は画像factory/型だけで、Scene/Cut/09の文字用API・候補順・seedは維持。
Cut宣言→resolveSceneの時間とseed→画像fx発火のsidecarを利用側例へ置いた。
詳細・確定parameter・必要条件は[API追補](API.md#段階10の画像effects契約2026-10-03)と[10の結果](10-remotion-effects.md)。

45実PNGはalpha/premultiplied RGB一致（raw26件完全一致、残りRGB最大差1の取得丸め）。
5秒動画、逆seek/再mount/Sequence/透明、Studio native保存backend、1080p、外部tarballを確認。
採用版のHTML-in-Canvas flag・nesting拒否・software WebGL2条件を記録し、一般GPU保証には広げない。
ユーザー目視とUI Saveボタンは未確認。旧pixel完全互換や全fx移植は行っていない。
11へ画像schemaと適用対象の分類、12へ取得丸め/alpha/順序/時間ケース、14へ単一wrapperを渡す。

## 段階11の結果（2026-10-03）

getEffectCatalog/searchEffectsと、組み込み7＋native1のmetadataを追加した。
caller3例/標準blurは例側catalogへ明示追加し、12件の用途/名前/tag/group/条件検索と実Player・動画リンクを確認。
用途は編集上の仮説、動作説明はsource/既存証拠に基づく。未移植候補は実行一覧から分離し、
旧860件のgroup/ID/orderをfixtureへ照合、主な責務で粗分類し、精査15件を区別した。
生成reportはdist、分類注釈と選定理由はsourceに保持。詳細は[11の結果](11-effect-catalog.md)。

13の対象はmixed、slideLeft（旧slideL）、shrink、jitter、bracketsの5件・この順序で確定した。
新5件は明示指定専用とし既存自動候補を維持する。mixedは個別glyph配置、shrinkはitem中心/track変形が必要で、
09の全文placement/glyph scaleでは不足する。13で限定した内部geometry/item経路を追加し、
12ではその差を検出できるcase拡張箇所を用意する。公開caller型を先に広げない。
vcolsは縦組metrics/約物/outline列のため延期した。標準blurやslice familyは旧効果の完全移植とは扱わない。

57 Node契約、12実preview PNG対同条件の元例差0、検索と9動画URL、外部tarballの型/検索/11既存PNGを確認。
旧保存画像とのbackend条件差は別記録で、baseline更新・一般許容差は導入しない。
ユーザーのdesign/motion承認は未確認。次は12の共通検証手順。

## 段階12の結果（2026-10-03）

[追加・検証手順](PORTING.md)と[レビューtemplate](PORT-REVIEW-TEMPLATE.md)、
case駆動の開発harnessを追加した。理由付き23caseで旧7件、09のcaller3定義、
10のslice/標準blurを実行し、代表162PNG、旧参考105比較、7短編動画、
並列33frame（concurrency1/2）を確認。最終7caseの過去run54PNGはraw差0。
不正params・空anchor・意図した400pixel変更・古いComposition propsの4失敗を非zeroで検出した。
詳細・command・runtime条件・目視範囲は[12の結果](12-port-validation.md)。

文字はGL既定、画像fxはswangleを使い、同条件内の再現性を判定する。
swangle文字のkasumi逆seek差は未解決条件として保存し、一般許容差で吸収しない。
画像fx/透明文字のCanvas PNG→screenshotだけraw最大1/alpha差0/premultiplied差0、
同renderの回帰/並列比較はraw差0。ユーザー承認・採用済みbaselineとcandidateを分ける。
13にはglyph/強調/item中心/spacing/step/null-current boxの診断とcase拡張位置を渡した。
本体API/公開export/候補/依存は変更せず、13の新5件は未実装。次は13。
