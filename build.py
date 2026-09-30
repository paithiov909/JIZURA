"""Build the single-file browser editions from src/, app/ and vendor/: Japanese, English, 繁體中文, 简体中文, 한국어, Bahasa Indonesia, Tiếng Việt.
usage: python3 build.py            -> index.html, en/, zh-hant/, zh-hans/, ko/, id/, vi/ index.html (GitHub Pages)
       python3 build.py --dev      -> also dev/www/jizura.js + dev/www/test.html for the test tools"""
import argparse, os, re, subprocess, tempfile
from pathlib import Path
from app.english import localize_body, localize_js
from app import i18n
ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)
read = lambda p: open(p, encoding='utf-8').read()
VERSION = read('VERSION').strip()
ap = argparse.ArgumentParser()
ap.add_argument('--out', default='.', help='output root (default: legacy tracked pages)')
ap.add_argument('--vite-input', action='store_true', help='emit temporary HTML/JS/CSS inputs for the root Vite build')
ap.add_argument('--cep', action='store_true', help='include the local CEP bridge and exclude browser WebMCP')
ap.add_argument('--lang', choices=[c for c, _, _, _ in i18n.EDITIONS])
ap.add_argument('--dev', action='store_true')
a = ap.parse_args()
if a.cep and (not a.vite_input or a.lang not in ('ja', 'en')):
    ap.error('--cep requires --vite-input and --lang ja/en')
# Explicit imports in engine/index.ts define initialization, never filename sort.
engine_paths = re.findall(r"^import \w+ from '([^']+)';", read('engine/index.ts'), re.M)
sources = [str((Path('engine') / source).resolve().relative_to(Path(ROOT))) for source in engine_paths]
sources += ['src/12_ui.js'] + ([] if a.cep else ['src/13_webmcp.js'])
mux = '/*! mp4-muxer v5.2.2 | MIT License | (c) 2023 Vanilagy | see THIRD_PARTY_NOTICES.md */\n' + read('vendor/mp4-muxer.min.js')
def build(lang):
    english = lang == 'en'
    local = lang in i18n.MODULES
    m = i18n.module(lang) if local else None
    title = 'JIZURA — Lyric Motion Video Maker' if english else m.TITLE if local else 'JIZURA 字面'
    description = ('Turn lyrics into animated lyric videos in your browser and export MP4.' if english else m.DESCRIPTION if local else '歌詞を入れると文字PV（リリックモーション）を自動で組み立てて MP4 に書き出すブラウザアプリ')
    folder = dict((c, f) for c, f, _, _ in i18n.EDITIONS)[lang]
    canonical = i18n.BASE + (folder + '/' if folder else '')
    language_nav = i18n.nav(lang)
    body = read('app/body.html').replace('@VERSION@', VERSION).replace('    <div class="acts">', '    ' + language_nav + '\n    <div class="acts">', 1)
    if english: body = localize_body(body)
    elif local: body = i18n.localize_body(lang, body)
    labels = read('app/english.js') + ('\n' + i18n.labels_js(lang) if local else '') if english or local else ''
    adapter = read('cep/cep.js') if a.cep else "import install from './src/13_webmcp.js';\nexport default install;"
    if a.cep:
        from app.english import localize_cep
        adapter = 'export default function install(J) {\n' + (localize_cep(adapter) if english else adapter) + '\n}\n'
    def emit_modules(directory):
        os.makedirs(directory, exist_ok=True)
        # Copy dependencies independently of their names; entry imports determine execution.
        for source in sources + ['engine/index.ts', 'engine/types.ts', 'engine/utility-types.ts', 'engine/legacy-types.ts']:
            content = read(source)
            if english: content = localize_js(content, source)
            elif local: content = i18n.localize_js(lang, content, source)
            dest = Path(directory) / source
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(content.replace('@VERSION@', VERSION), encoding='utf-8')
        for name, content in [('style.css', read('app/style.css') + ('\nhtml.cep .lang-switch{display:none}\n' if a.cep and english else '')),
                              ('entry.ts', read('build/entries/legacy.ts').replace('../../engine/index.ts', './engine/index.ts')), ('mp4-muxer.js', mux),
                              ('labels.js', 'export default function install(J) {\n' + labels + '\n}\n'), ('adapter.js', adapter)]:
            (Path(directory) / name).write_text(content.replace('@VERSION@', VERSION), encoding='utf-8')
    if a.vite_input:
        script = ''
    else:
        with tempfile.TemporaryDirectory(prefix='jizura-modules-', dir=os.path.join(ROOT, 'dist') if os.path.isdir('dist') else ROOT) as directory:
            emit_modules(directory)
            script = subprocess.check_output(['node', 'build/bundle-input.mts', directory], text=True)
    alternates = '\n'.join(f'<link rel="alternate" hreflang="{hl}" href="{i18n.BASE}{f + "/" if f else ""}">' for c, f, hl, _ in i18n.EDITIONS)
    html_lang = dict((c, hl) for c, _, hl, _ in i18n.EDITIONS)[lang]
    html = f'''<!doctype html>
<html lang="{html_lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{description}">
<link rel="canonical" href="{canonical}">
{alternates}
<meta property="og:type" content="website">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:url" content="{canonical}">
<meta name="twitter:card" content="summary">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<style>
{read('app/style.css')}
</style>
</head>
<body>
{body}
<script>
{mux}
</script>
<script>
{script}
</script>
</body>
</html>
'''
    target = os.path.join(a.out, folder, 'index.html')
    if a.vite_input:
        html = html.replace('<style>\n' + read('app/style.css') + '\n</style>', '')
        html = html.replace('<script>\n' + mux + '\n</script>', '<script src="./mp4-muxer.js"></script>')
        html = html.replace('<script>\n' + script + '\n</script>', '<script type="module" src="./entry.ts"></script>')
        emit_modules(os.path.dirname(target))
    os.makedirs(os.path.dirname(target) or '.', exist_ok=True)
    open(target, 'w', encoding='utf-8').write(html)
    print(target, len(html), 'bytes')
for code, _, _, _ in i18n.EDITIONS:
    if a.lang and code != a.lang: continue
    if code in i18n.MODULES and not i18n.has_module(code):
        print('skip', code, '(no translation module yet)'); continue
    build(code)
# sitemap.xml for search engines: every edition, with its language alternates
import datetime
alts = ''.join(f'\n    <xhtml:link rel="alternate" hreflang="{hl}" href="{i18n.BASE}{f + "/" if f else ""}"/>' for c, f, hl, _ in i18n.EDITIONS)
alts += f'\n    <xhtml:link rel="alternate" hreflang="x-default" href="{i18n.BASE}"/>'
today = datetime.date.today().isoformat()
urls = ''.join(f'\n  <url>\n    <loc>{i18n.BASE}{f + "/" if f else ""}</loc>\n    <lastmod>{today}</lastmod>{alts}\n  </url>' for c, f, hl, _ in i18n.EDITIONS)
open(os.path.join(a.out, 'sitemap.xml'), 'w', encoding='utf-8').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">' + urls + '\n</urlset>\n')
print('sitemap.xml', len(i18n.EDITIONS), 'urls')
if a.dev:
    dev_out = os.path.join(a.out, 'dev/www')
    os.makedirs(dev_out, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='jizura-dev-modules-', dir=os.path.join(ROOT, 'dist') if os.path.isdir('dist') else ROOT) as directory:
        # A Japanese module build preserves the historical dev runner entry.
        subprocess.run(['python3', 'build.py', '--out', directory, '--vite-input', '--lang', 'ja'], check=True, stdout=subprocess.DEVNULL)
        script = subprocess.check_output(['node', 'build/bundle-input.mts', directory], text=True)
    open(os.path.join(dev_out, 'jizura.js'), 'w', encoding='utf-8').write(script)
    open(os.path.join(dev_out, 'test.html'), 'w', encoding='utf-8').write(read('dev/test.html'))
    print('dev/www ready: cd dev/www && python3 -m http.server 8765')
