# 段階08：既存7effectの最小レビュー環境

状態：未着手。前提：初期01〜07の実装・結果。
次段階：[09：独自effect・構成確認API](09-custom-effects.md)。

## 開始時に読むもの

- [AGENTS.md](../../AGENTS.md)、[root README](../../README.md)、[作業一覧](README.md)、
  [初期計画](PLAN.md)、[拡張計画](EXTENSION-PLAN.md)、本メモ。
- [07の結果](07-scene-validation.md)、[API](API.md)、[初期検証](VALIDATION.md)、
  [package README](../../remotion-jizura/README.md)。font失敗を扱う場合は[04の追補](04-static-canvas.md)も読む。
- [EffectSamples/登録例](../../remotion-jizura/examples/index.tsx)、
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

未着手。完了時に日付、変更ファイル、例/command、実測、目視範囲、制約を追記する。
09へ、局所修正に不足するparameter・識別・構成確認情報と、再現可能な比較例を渡す。
