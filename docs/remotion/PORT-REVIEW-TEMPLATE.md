# 移植・レビュー記録template

[共通手順](PORTING.md)で採取したrunに対応する記録。技術成功とデザイン採用を分ける。
該当しない項目は理由、未実施項目は未確認と書く。生成run内review.jsonも同じ区分を持つ。

## 対象・入力

- effect group/ID、公表名、source/参照source：
- 原型の特徴、適応の理由と影響：
- case ID / case.json / input.json / run絶対path：
- frame/区間、seed、解決params、font hash、サイズ/fps/motionFps/backend：

## 実装・技術検証

- 状態：未実施 / 失敗 / 成功（command・日付・result.json）：
- 型/契約、不正入力：
- seek、再mount、cache再生成、並列render：
- 描画成立（anchor、alpha、clear、geometry診断とその限界）：
- 旧source参考：adapter補正、画素差、説明できた/未分離の差：
- 新実装回帰：比較先、同環境/入力、raw差、candidate/採用済み：
- 別条件評価：条件の差。回帰比較と混同しない：
- 生成PNG/動画/JSON：動画成立・lossy差と画素一致を区別：

## 担当agentの目視

- 状態：未確認 / PNG確認 / 動画採取frame列確認 / 連続再生確認：
- artifactとcase/frame、読める範囲、原型の特徴、動き/強調/組み合わせ：
- 意図したはみ出し/不可視、clip/可読性の懸念：
- 局所変更・復元で分かったこと：

## ユーザー確認

- 状態：未確認 / feedbackあり / 採用 / 要修正：
- 確認者・日付・case/frame/artifact・指示：
- 変更対象、元設定、変更意図、変更後/復元の証拠：

## 回帰基準の採否と引き継ぎ

- 状態：candidate / 採用 / 不採用。採取だけで採用にしない：
- 採用者/理由/条件/参照artifact（source fixtureが必要なら出所/採取条件）：
- 未確認条件、制約、次の作業・担当メモ：
