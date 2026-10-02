# 移植準備の整理 — 2026-10-02

作業ブランチ：`remotion`。開始時点：`6c7acbb`（task 07を受け入れたスナップショット）。
ユーザーの目的変更に従い、このブランチで整理した。旧統合ブランチへのマージ、orphan化、公開操作は行っていない。

## 削除したもの

| 対象 | 理由 |
| --- | --- |
| ルート `index.html` と `en/`・`zh-hant/`・`zh-hans/`・`ko/`・`id/`・`vi/` の `index.html` | ビルド済みの旧ブラウザアプリ。移植元は `engine/`・`effects/`・`ui/`・`i18n/`・`src/` にある |
| `JIZURA_AE.jsx`・`JIZURA_AE_en.jsx` | `ae/` とエクスポートしたメタデータから生成する配布用バンドル |
| `JIZURA_CEP.zip`・`JIZURA_CEP_en.zip` | CEPの配布用ZIP。ホスト・ブリッジ・インストーラのソースは保存 |
| `ae/data.json` | エンジンから再生成できるAE用メタデータ |
| `sitemap.xml` | 旧サイトの生成済みサイトマップ |
| `google1b8ffe7e2950a40c.html` | 旧公開サイトの所有確認専用ファイル。エフェクト移植には使わない |
| `dev/www/` と5か所の `__pycache__/` | ローカルの診断ビルド・Pythonキャッシュ |

追跡対象14ファイル：26,427,216 bytes。無視対象の診断ビルド・キャッシュ：5,649,406 bytes。
合計32,076,622 bytes（約32.1 MB）を削除した。空になった6言語ディレクトリも除いた。
削除した追跡ファイルの元データは開始コミットから参照できる。キャッシュは必要時に再生成する。

## 配置と作業指示

- 旧製品の5言語READMEと変更履歴を `docs/legacy/` に移し、資料内の相対リンクを修正した。
  旧 `AGENTS.md` は `docs/legacy/V1X-WORK-INSTRUCTIONS.md` に保存した。
- ルート `README.md` と `AGENTS.md` を現在の目的へ更新した。
  `docs/remotion/README.md` は参照マップと未決定事項を記録する。
- `docs/v1x/README.md` に目的変更を記載した。各タスクの過去の検証結果は書き換えていない。
  `docs/v1x/BUILD.md` は残した参照ビルドの現在の出力先を反映した。
- 手書きの `cep/dist/` テンプレート5ファイルを `cep/packaging/` に移した。
  生成ディレクトリと誤認して削除しないよう、パッケージ処理の参照も変更した。

## 再生成の整理

- 旧 `build.py` の標準出力先は `dist/legacy/`。
- `tools/export_ae_data.js` は標準で `dist/.inputs/ae/data.json` に出力する。
- `build_ae.py` はその生成メタデータを読み、標準で `dist/ae/` に出力する。
  直接実行する場合は先にメタデータを生成する。`npm run build:ae` は自動で生成する。
- `build_cep.py` の標準出力先は `dist/cep/`。既存のnpmビルドは引き続き入力を独立に生成する。
- AE検証、WebMCP検証、ベースライン採取の標準参照先を生成先に合わせた。
  CEP/offlineスパイクも専用の生成メタデータを用意する。
- `.gitignore` は削除済みの旧出力パスを追加で除外する。

## 保存したもの

エフェクト・エンジンのアルゴリズムと型、旧UI/言語/AE/CEPソース、固定シードの
JSON/PNG資料、比較テスト、ビルド・診断ツール、ロックファイル、ライセンスを保存した。
現時点では構成が未定のため、旧UIやAE関連のソースまで消していない。
既存ビルドや比較検証からの参照を持つため、必要な部分を分離した後に再検討できる。

## 今回の検証

環境：Linux、Node 26.10.0、npm 11.19.1、Python 3。
ロックファイルから `npm ci --cache /tmp/jizura-remotion-npm-cache --ignore-scripts --no-audit --no-fund` で20パッケージを導入して検証した。

| チェック | 結果 |
| --- | --- |
| `npm run check` | 成功。型検査、7言語検査、i18n 6件・engine 9件・effects 6件の契約テスト、4ターゲットのビルド、出力・リソース・ES2021/ES3構文検査、日英AE登録比較、日英それぞれ87ビルド＋JSONプランのAEモック。unknown matchName・式構文エラー・problems・warningsはいずれも0 |
| `npm run spike:build`・`npm run spike:test` | 成功。追跡 `ae/data.json` を使わず再生成。classic出力・muxerの3実行形態・host/core ES3・file/string経由プランのNode/AEモックを確認 |
| `python3 build.py` | 成功。7言語のHTMLを `dist/legacy/` に生成し、ルートの旧HTMLを再作成しないことを確認 |
| `node tools/export_ae_data.js` → `python3 build_ae.py` | 成功。標準パスで動作。メタデータは開始コミットの `ae/data.json` とバイト一致、AEバンドルはnpmビルドとSHA-256一致 |
| `python3 build_cep.py --panel-dir dist/.bundles/cep/ja --core-source dist/ae/ja/jizura_core.jsx` | 成功。標準 `dist/cep/` に出力し、ZIP内の5テンプレートが移動元とバイト一致 |
| `node dev/ae_check.js --group layout --ids center` | 成功。標準生成先のAEバンドルを使うfocused AEモック：1 ID、問題0 |
| `python3 dev/baseline_capture.py --help`・変更Python 5ファイルのAST構文検査・変更JS 4ファイルの `node --check` | 成功。ベースライン採取そのものは未実行で、既存フィクスチャは変更なし |
| 相対リンク検査・アーカイブ内容比較・`git diff --check` | 成功。13文書のリンクを検査し、旧ガイド本文は案内文とリンク補正を除き保存。CEPテンプレート5ファイルはバイト一致。描画/エフェクト実装とテスト資料の未変更を確認 |

ビルド中には従来のclassic muxer参照と大きいチャンクについてViteの警告が出るが、ビルドと出力検査は成功した。
ブラウザ自動化・ピクセル比較は今回未実行（Playwright/Pillowはこの環境に未導入）。
実機After Effects/CEPとRemotionの動作は未検証。過去の検証と今回のNodeモック結果を区別する。

詳細ログは `/tmp/jizura-remotion-check.log`、`/tmp/jizura-remotion-legacy-cli.log`、
`/tmp/jizura-remotion-default-cli.log` に保存した（ローカル一時ファイル）。
検証終了後に今回生成した `dist/`、`node_modules/`、Pythonキャッシュを削除し、成果物を残さない状態へ戻した。
再検証時は `npm ci` から開始する。

## 次の候補

`engine/renderer.ts` と最初に移植するエフェクトを使って、canvas・時間・フォント・乱数の
依存境界を調査し、最小APIと比較検証の方法を決める。Remotion互換性はまだ検証していない。
