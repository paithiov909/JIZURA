# 旧カタログの分類と最初の移植群

段階11（2026-10-03）の選定資料。分類source/reportの15精査・860件という当時の記録は保持し、13の5件の実装結果は下記へ追補する。[実行可能な検索一覧](../../remotion-jizura/examples/catalog/README.md)とは分離する。
旧通常カタログをgroup/IDと登録順で集計し、[fixture](../../tests/baseline/v1/registry.json)へ照合した。
style/fontは数えず、order外の特殊layout title/interludeも通常860件に加えない。

```sh
node remotion-jizura/scripts/inventory-legacy.mjs
```

機械reportはignored `dist/remotion/stage11/legacy-inventory.json`。
追跡するsourceは[分類規則・注釈](../../remotion-jizura/scripts/legacy-catalog-rules.mjs)と
[集計script](../../remotion-jizura/scripts/inventory-legacy.mjs)。公開packageはこれらや旧sourceをimportしない。
登録順・ID/name/pack/specialがfixtureと違う場合、重複、未知group、古い注釈IDで失敗する。
engine初期化だけに計測context stubを用い、plan/measure/renderは実行しない。画素・依存互換の証拠ではない。

| group | 件数 | 粗い分類 | 共通依存・注意 |
| --- | ---: | --- | --- |
| layout | 184 | 文字配置 | font計測、本文item、glyph配置、mainDraw。独自図形を含むものもある |
| enter | 125 | 文字運動 | 入場progress、glyph/item変形。clip/fragmentを使うものもある |
| hold | 52 | 文字運動 | hold量、秒/step、seed。旧beat/fx依存の有無は個別精査が必要 |
| exit | 109 | 文字運動 | 退場progress、glyph/item変形・破片 |
| decor | 130 | 描画 | Canvas2D、現在box、palette、レイヤー |
| treat | 62 | 描画 | 文字paint、pre/post hook、stroke/pattern。旧item拡張の依存が大きい |
| bg | 66 | 描画 | 画面全体、絶対時間、palette |
| cam | 36 | 描画 | 内容全体の座標変換。画像加工とは別の境界 |
| fx | 69 | 画像加工 | device pixels、scratch、イベント時刻。直接図形だけのものも含む粗分類 |
| trans | 27 | 複数入力 | 前後2frame合成、overlapと入退場再計画 |
| 合計 | 860 | 配置184 / 運動286 / 描画294 / 画像69 / 複数入力27 | group単位の主な責務による分類 |

全行にkey/group/index/name/pack/category/dependencies/review/disposition/publicName/comparisonを持つ。
`helperHints`はcallbackの直接`J.member`参照だけを抜き出した補助情報で、alias・closure・間接呼出を網羅しない。
`publicName=null`は未決定で、IDから将来API名を自動生成しない。groupが違えば同じIDでも別部品として扱う。

実装/比較/精査を分ける。通常860件のうち旧source精査済み15件、粗分類845件。
移植済み7件、段階13の確定5件、統合候補2件、標準利用候補1件、延期260件、未調査585件。
延期にはtreat/bg/cam/fx/transのgroup方針を含み、全項目の個別調査済みを意味しない。
全860件の詳細な目視・callback依存解析・描画は実施していない。
移植済み7件だけに段階06の旧参考比較実績を紐付ける。新候補のcomparisonはnot-run。

## 段階13で実装する5件

次表を確定し、13で対象選びを繰り返さない。公開factory名はこの表の名前を採用予定とするが、
parameterの型・範囲や内部helperは13の実装結果で確定する。**段階13で実装済み**。現在の確定params/適応/検証は[13の結果](13-first-effect-batch.md)を参照。
新5件は明示指定専用とし、既存7件の省略指定CANDIDATES/順序/seedを変えない。

| 順序 | 旧group/ID → 公開名 | 原型の特徴 | 必要処理・比較の焦点 |
| --- | --- | --- | --- |
| 1 | layout/mixed → mixed | 漢字・カナ・Latin・約物で大小のリズム、9文字超で2行、微小seed回転 | glyph単位のadvance・size・位置・回転、script判定、元codePointIndex/強調とbox。2/9/10/16文字、改行/space、縦長 |
| 2 | enter/slideL → slideLeft | 左から逐字遅延で入場、-0.85×sizeの横移動、outQuint、alphaの立ち上がり | glyph数/順序とstagger0.5、progress0/1、1文字/複数行/最短Cut、明示入場時間 |
| 3 | exit/shrink → shrink | inCubicでitemを収縮、alpha=1-e²、trackを0.2em減らす | item中心基準のglyph中心/size/spacing変化。glyphのscaleだけで代用しない。breathe/mixedとの組み合わせ |
| 4 | hold/jitter → jitter | stepごとの逐字dx/dy（size2.5%）、小回転、hold量で減衰 | effect/item/step/glyph/channelのstateless hash、量子化評価秒、0強度/同step/逆seek/並列描画 |
| 5 | decor/brackets → brackets | 現在boxの4隅へマークが0.35秒で開き退場で閉じる | Canvas polyline、pad=18+box高さ12%、前面、palette、全glyph非表示/null fallback・縦長/透明 |

詳細なfeatures/helpers/adaptation/casesは上記注釈sourceへ保持し、reportのbatchにも同じ順序で出す。
原型は[core layouts](../../effects/core/layouts.ts)、[core animation](../../effects/core/animation.ts)、
[enter pack](../../effects/packs/enter.ts)、[core decor](../../effects/core/decor.ts)。

mixedは複数fontを単一の解決fontへ適応する。大小と配置を表現の中心として保持する。
09の公開layout callbackは各placementで本文全体を描くため、mixedの各文字size/回転/位置を表現できない。
shrinkも09のglyph scaleだけではitem全体の中心・track変化を表現できない。
13で限定した**内部geometry/item変形経路**を追加する方針とし、11/12では実装せず、
callerの公開TextPlacement/GlyphTransformを先に広げない。12ではこの差を捉える比較ケースを整える。
原型のfont・item/seed・track適応は13で明記し、旧pixel完全一致を必須条件にしない。

## 統合・標準利用・延期

- enter/slideRは将来のslide方向parameter化候補。slice系等を名前だけで自動統合しない。
  enter/slideWholeはitem全体のoutBack運動と縦分岐があり、slideLと別原理なので延期する。
- fx/sliceは10のsliceGlitch画像familyとの統合候補。10のalpha保持/wrapは意図した適応で旧seed/pixel一致は未確認。
- fx/defocusは標準[blur](https://www.remotion.dev/docs/effects/blur)の利用候補。
  旧版のquarter-size buffer、downsample fallback、イベントenvelopeを標準Gaussian blurで
  そのまま再現できるとは扱わない。標準効果を文字effectとして重複登録しない。
- layout/vcolsは縦組metrics・約物向き・repeat/split列・outlineコピーを要するため今回は延期。
  mixedによるglyph配置の実測後に別群で扱う。今回は必要処理の少ない5件に制限した。
- treat/bg/camの旧描画拡張、fxの全scratch合成、transの前後入力・overlapは別群へ延期。
  標準effectsを使えるものはtarget（歌詞/decor、背景込み、独立画像）とbackendを先に確認する。
  10の単一HtmlInCanvas接続成功を全旧fx移植の証拠へ広げない。

12には上記casesと適応境界、13には固定5件と順序、14には実行可能catalogの選択入口を渡す。

## 段階13の実装追補

注釈sourceは選定のdisposition/order/features/adaptationを保持し、新5件へ
implementation=ported-stage13、comparison=stage13-adapted-reference-recorded、13のevidenceを加えた。
選定分類のcountsは旧7ported/5selectedのまま、実装数は合計12。比較は単一font/cap/強調/seed
adapterを含み、bracketsの新pad/stroke端点は旧固定値と差がある。ユーザー承認とは扱わない。
`node remotion-jizura/scripts/inventory-legacy.mjs --output=dist/remotion/stage13`で
860件の登録順/ID照合と現在注釈を再生成でき、段階11の生成reportを上書きしない。
