"""English ExtendScript copy. Browser and CEP panel copy lives in i18n/.
AE assembly remains separate until task 09.
"""

AE_UI = {
    "'文字PV系の部品を使う'": "'Use typographic parts'", "'キネティックの部品を使う'": "'Use kinetic parts'", "'ホラーの演出も使う'": "'Include horror effects'",
    "'線・数字・字組みだけで見せる、文字PVらしい部品（約50）'": "'About 50 parts that work with lines, numbers and type alone'",
    "'語ごとに動く・跳ねる・積み上がる、動き重視の部品（約50）'": "'About 50 motion-first parts: words move, bounce and stack one by one'",
    "'不気味な雰囲気の部品（約50）と配色セット3。オンにすると、おまかせの雰囲気に「ホラー」が加わります（ホラーの部品は雰囲気が「ホラー」のときだけ使います）'": "'About 50 eerie parts and 3 styles. When on, Randomize adds a Horror mood (horror parts are used only in that mood)'",
    "'  〔ホ〕'": "'  [H]'",
    "'\u3000縦長のとき'": "'  On tall frames'",
    "'上下に分ける'": "'Top / bottom'",
    "'左右に分ける'": "'Left / right'",
    "'軽量（AE での再生を軽く）'": "'Lightweight (faster playback in AE)'",
    "'色ズレの複製・紙の質感・グロー・粒子・一部の画面効果を省いて、After Effects での再生を軽くします（長い曲におすすめ）'": "'Leaves out the colour-shift copies, paper texture, bloom, grain and some screen effects so the composition plays back faster in After Effects (recommended for long songs)'",
    "'中央を空ける（キャラクター用：横長は左右・縦長は上下に配置）'": "'Keep the centre free (for a character: left / right on wide, top / bottom on tall frames)'",
    "'中央にキャラクターなどを重ねる前提で、文字と演出をカットごとの帯（横長の画面は左右、縦長は上下。行ごとに交互）に置きます。背景と画面効果は画面全体のままです'": "'For a character or other footage in the middle: each cut is laid out in a side band (left / right on wide frames, top / bottom on tall ones, alternating line by line). Backgrounds and screen effects still cover the whole frame.'",
    "'中止'": "'Stop'",
    "'作成を止めます（そこまでのカットでコンポを仕上げます）'": "'Stop building (the composition is finished with the cuts built so far)'",
    "'JIZURA：いま作成中です。終わるまで待つか「中止」を押してください'": "'JIZURA: a build is running. Wait for it to finish or press Stop.'",
    "' カット' : '効果を追加中'": "' cuts' : 'adding effects'",
    "'中止しています…（作成済みのカットで仕上げます）'": "'Stopping… (finishing with the cuts built so far)'",
    "'中止（' + job.done + ' / ' + job.total + ' カット）'": "'Stopped (' + job.done + ' / ' + job.total + ' cuts)'",
    '歌詞の言語': 'Lyrics language', "['自動判定', '日本語',": "['Auto-detect', '日本語',",
    '中国語（繁体字・簡体字）や韓国語の歌詞は、その文字を持つ書体で組みます（各スタイルの書体の雰囲気に近いものに置き換え）。自動判定はかな・ハングル・繁体字／簡体字に特有の字から判断します': 'Chinese (Traditional / Simplified) and Korean lyrics are set in fonts that have those characters, close in feel to each style. Auto-detect looks at kana, Hangul and the characters that differ between Traditional and Simplified Chinese.',
    "var JZ_SAMPLE = '夜明けの色を/覚えてる\\nほどけた声が遠くで鳴った\\nねえ、まだ間に合うかな\\n*透明*なままじゃ終われない!';": "var JZ_SAMPLE = 'I remember/the color of dawn\\nA voice faded into the distance\\nCan we still make it in time?\\n*Transparent* is not how this ends!';",
    'JIZURA 字面  lyric motion': 'JIZURA  lyric motion',
    '（': ' (', '）': ')', '部品': 'techniques',
    '歌詞（1行=1フレーズ　/ 区切り　*強調*　行末! インパクト）': 'One phrase per line. / = cut, *word* = emphasis, final ! = impact',
    'おまかせで生成（押すたびに別の演出）': 'Create a variation',
    'スタイル・雰囲気・演出の強さ・配色・シードをまるごとランダムに決めて、新しいコンポを作ります': 'Randomize style, mood, effects, colors and seed, then create a composition.',
    'オフのときは最初の公開版の演出（356部品・スタイル12種）だけを使います。オンにすると、あとから追加した演出・スタイル・書体も候補になります': 'Include techniques, styles and fonts added after the first release in random picks.',
    '提灯・はがき・障子・扇・家紋・青海波・桜の花びらなどの和風グラフィックと、和風のスタイル。オフにすると自動では選ばれません（追加分の判定のあとに適用）': 'Include Japanese motifs such as lanterns, shoji, fans and cherry blossoms in automatic picks.',
    'アクティブなコンポと同じ': 'Same as active comp',
    '通常（スタイルの背景）': 'Style background', 'グリーンバック（合成用）': 'Green screen (compositing)',
    'ブラックバック（合成用）': 'Black background (compositing)',
    'グリーンバック／ブラックバック：白い文字と演出だけを単色の背景の上に作ります（背景の模様・紙・粒子・周辺減光なし）。グリーンはキーイング、ブラックはスクリーン合成で抜けます': 'Solid green or black background behind white text and effects. Key out green or use Screen blending for black.',
    '自動（文字数・BPM から） / LRCの時刻': 'Auto (text length and BPM) / LRC timestamps',
    '選択レイヤーのマーカーを行頭に使う': 'Use selected layer markers for line starts',
    'コンポマーカーを行頭に使う': 'Use composition markers for line starts',
    '選択中の音声レイヤーを新しいコンポに入れる': 'Include selected audio layer in new composition',
    '標準（すべての手法を使う）': 'Standard (all techniques)',
    '雰囲気ごとに使うレイアウト・登場・退場の手法が絞られます（シードで再現）': 'Mood influences the selection of layouts, entrances and exits (reproducible by seed).',
    '背景に合うアクセント色とズレ色A/Bをランダムに選びます（明るさは背景に合わせて自動調整）': 'Randomize accent and offset colors with automatic brightness adjustment.',
    '配色を変更しました — 「コンポを生成する」で反映されます': 'Palette changed. Create a composition to apply it.',
    'ブラウザ版 JIZURA の「AE用に書き出し」で作った .json を読み込み、': 'Import a JSON file made with Export for AE in the browser app.',
    '同じタイミング・レイアウト・演出で編集可能なコンポを組みます。': 'Create an editable composition with the same timing, layouts and effects.',
    '思ったとおりにできないときは、下のボタンで診断レポート（JIZURA_report.txt）を保存して送ってください。': 'If the result looks wrong, save a diagnostic report (JIZURA_report.txt).',
    '診断レポートを保存（最後に作ったコンポ）': 'Save diagnostics for last composition',
    'PostScript名で指定（見つからない指定はここに落ちます）': 'Specify PostScript font names (fallbacks when a font is unavailable).',
    '常にこの4書体を使う（自動選択しない）': 'Always use these four fonts (disable automatic selection)',
    '選択中のテキストレイヤーの書体を「見出し」に': 'Use selected text layer font for display text',
    'Noto Sans JP / Noto Serif JP / Dela Gothic One などが入っていれば自動で使います（AE 2024以降）。': 'Installed Google Fonts are used automatically in After Effects 2024 or later.',
    'この PC に無い書体: ': 'Fonts missing on this computer: ',
    'JIZURA：次の書体がこの PC に無いため、近い書体で作りました。': 'JIZURA: These fonts are unavailable, so similar fonts were used.',
    'どれも Google Fonts（fonts.google.com）から無料で入れられます。入れて After Effects を再起動し、作り直すと、ブラウザ版と同じ書体になります。': 'Install them from Google Fonts, restart After Effects and rebuild for the closest browser match.',
    'JIZURA：この After Effects では書体が入っているかを確認できないため（AE 2024 より前）、「フォント」タブで指定した書体で作りました。': 'JIZURA: This version of After Effects cannot check installed fonts, so the font tab fallbacks were used.',
    'ブラウザ版と同じ書体にするには、使われている書体（Google Fonts）を入れて「フォント」タブで指定するか、AE 2024 以降で作ってください。': 'For matching type, install the Google Fonts used in the browser and select them in the font tab, or use AE 2024 or later.',
    'JIZURA：生成しましたが、一部に注意があります：': 'JIZURA: Composition created with some warnings:',
    'マーカーを使うには、コンポを開いてください': 'Open a composition to use markers',
    'マーカーのあるレイヤーを選択してください': 'Select a layer with markers',
    'マーカーが見つかりません': 'No markers found', 'マーカーを読めませんでした: ': 'Could not read markers: ',
    '構成の計算でエラー: ': 'Could not plan composition: ',
    '配色の値が読めないため、スタイルの色のままにしました（#RRGGBB 形式で入力）': 'Invalid color. Style colors were kept (enter #RRGGBB).',
    'JSONを読めませんでした: ': 'Could not read JSON: ',
    'JIZURA の AE用JSON ではないようです': 'This is not a JIZURA AE project JSON',
    'このパネルに無い表現 ': 'Techniques unavailable in this panel: ',
    'JIZURA：この JSON には、このパネルが作れない表現が ': 'JIZURA: This JSON contains ',
    ' 箇所あり、近い表現に置き換えました。': ' unsupported techniques; similar ones were substituted.',
    ' 箇所を、近い表現で作りました': ' instances were replaced by similar techniques',
    'ブラウザ版より古いパネルを使っている可能性があります。最新の JIZURA_AE.jsx（v': 'This panel may be older than the browser edition. Install the latest JIZURA_AE_en.jsx (v',
    '・860 部品）に差し替えて、After Effects を再起動してください。': ', 860 techniques) and restart After Effects.',
    '先にコンポを作ってください（このパネルで最後に作ったコンポを調べます）': 'Create a composition first; diagnostics inspect the last one created here.',
    '最後に作ったコンポが見つかりません（削除された可能性があります）': 'The last composition could not be found (it may have been deleted).',
    '診断中…（数十秒かかることがあります）': 'Diagnosing… (this can take a few seconds)',
    'レポートを保存しました：': 'Report saved: ',
    'レポートを保存できませんでした（環境設定 → スクリプトとエクスプレッション →「スクリプトによるファイルへの書き込みとネットワークへのアクセスを許可」をオンにしてください）。': 'Could not save report. Allow scripts to write files and access the network in After Effects preferences.',
    'テキストレイヤーを選択してください': 'Select a text layer', 'テキストレイヤーではありません': 'This is not a text layer',
    '追加分の演出も使う': 'Include new effects', '和風の演出も使う': 'Include Japanese motifs',
    '選択中の音声レイヤーも入れる': 'Include selected audio layer',
    'JSONを選んで生成…': 'Open JSON and build…',
    'スタイルの色を上書き': 'Override style colors', 'ランダム配色': 'Random palette',
    'コンポを生成する': 'Create composition', 'JSONから': 'From JSON', '歌詞から': 'From lyrics',
    'おまかせ：': 'Variation: ', 'ランダム配色': 'Random palette',
    '生成中…': 'Building…', '生成中にエラー: ': 'Build error: ',
    '診断：エクスプレッションのエラー ': 'Diagnostics: expression errors ',
    'JIZURA 診断：エクスプレッション ': 'JIZURA diagnostics: expressions ',
    ' 個のうち、エラー ': ', errors ', ' 個': '',
    '（時間の上限で途中まで）': ' (partial, time limit)', '（途中まで）': ' (partial)',
    '置換あり': 'Substitutions', '注意 ': 'Warnings: ', '件': '',
    '書体の代用 ': 'Font substitutions: ', '箇所': ' instances',
    '歌詞が空です': 'Lyrics are empty', '準備OK': 'Ready',
    '曲名': 'Song title', 'アーティスト': 'Artist', 'スタイル': 'Style',
    'サイズ': 'Size', '背景': 'Background', 'タイミング': 'Timing',
    '行の長さ': 'Line duration', '演出': 'Effects', '雰囲気': 'Mood',
    '動きの強さ': 'Motion strength', 'グリッチ': 'Glitch', '色ズレ': 'Color offset',
    '装飾の量': 'Decoration amount', 'カットの細かさ': 'Cut density',
    '質感': 'Texture', '背景の切替': 'Background changes',
    '2コマ打ち': 'On twos', 'フラッシュ': 'Flash',
    'スタイル次第': 'Auto by style', '非表示': 'Hide', '表示': 'Show',
    'シード': 'Seed', 'シャッフル': 'Shuffle',
    'アクセント・ズレ色': 'Accent and offset colors', 'アクセント': 'Accent',
    'ズレ色A': 'Offset A', 'ズレ色B': 'Offset B',
    'フォント': 'Fonts', '見出し': 'Display', '明朝': 'Serif',
    '小さな文字': 'Small text', '等幅': 'Monospace', '・': ' · ',
    '追加': 'New', '和': 'JP',
}

CEP_HOST = {
    "'生成中のコンポがありません'": "'No composition is being built'",
    'JIZURA の構成データではありません': 'This is not JIZURA project data',
    'コンポを開いて、曲のレイヤーを選択してください': 'Open a composition and select an audio layer',
    '曲（音声ファイル）のレイヤーを選択してください': 'Select an audio file layer',
    'コンポを開いてください': 'Open a composition',
    'マーカーが見つかりません（曲のレイヤーかコンポにマーカーを打ってください）': 'No markers found. Add markers to the audio layer or composition.',
    '構成データの一時ファイルが見つかりません': 'Temporary project data file not found',
    '先にこのパネルでコンポを作ってください': 'Create a composition in this panel first',
}


def localize_cep(source, host=False):
    if not host:
        raise ValueError("CEP panel localization is runtime-only; use npm run build:cep")
    return replace_copy(source, CEP_HOST)


def localize_ae(source):
    return (replace_copy(source, AE_UI)
            .replace('lyr.preferredSize = [340, 150]', 'lyr.preferredSize = [440, 150]')
            .replace('preferredSize.width = 86', 'preferredSize.width = 120')
            .replace('preferredSize.width = 70', 'preferredSize.width = 95'))


def replace_copy(source, glossary):
    # Longest first protects complete phrases from shorter label replacements.
    for japanese, english in sorted(glossary.items(), key=lambda pair: -len(pair[0])):
        source = source.replace(japanese, english)
    return source
