"""Package the separately built local CEP panel and ES3 core.
Use npm run build:cep for source-to-package builds. This packaging helper requires
--panel-dir and keeps its --lang/--out/--core-source options.
"""
import argparse, glob, os, shutil, subprocess, sys, zipfile
from app.english import localize_cep
ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)
VERSION = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'VERSION'), encoding='utf-8').read().strip()
ap = argparse.ArgumentParser()
ap.add_argument('--out', default='dist/cep')
ap.add_argument('--debug', action='store_true')
ap.add_argument('--lang', choices=['ja', 'en'], default='ja')
ap.add_argument('--panel-dir', required=True, help='prepackaged local Vite panel directory (no legacy HTML embedding)')
ap.add_argument('--core-source', help='prebuilt ES3 core to copy; used by the root workspace')
a = ap.parse_args()

english = a.lang == 'en'
extension_id = 'com.852wa.jizura.en' if english else 'com.852wa.jizura'
ext = os.path.join(a.out, extension_id)
if os.path.isdir(ext): shutil.rmtree(ext)
os.makedirs(os.path.join(ext, 'CSXS')); os.makedirs(os.path.join(ext, 'jsx'))

def es_escape(src):
    """escape every non-ASCII character so the ExtendScript file is encoding-proof"""
    out = []
    for ch in src:
        o = ord(ch)
        if o < 128: out.append(ch)
        elif o <= 0xFFFF: out.append('\\u%04X' % o)
        else:
            o -= 0x10000; out.append('\\u%04X\\u%04X' % (0xD800 + (o >> 10), 0xDC00 + (o & 0x3FF)))
    return ''.join(out)

# 1) Copy the independently built local panel (runtime dictionaries, no JS rewriting).
if not os.path.isfile(os.path.join(a.panel_dir, 'index.html')): sys.exit('--panel-dir must contain index.html')
shutil.copytree(a.panel_dir, ext, dirs_exist_ok=True)

# 2) ExtendScript side: host + the build engine (same code as JIZURA_AE.jsx, without its ScriptUI)
host = open('cep/host.jsx', encoding='utf-8').read()
open(os.path.join(ext, 'jsx', 'host.jsx'), 'w', encoding='utf-8').write(es_escape(localize_cep(host, host=True) if english else host))
if a.core_source:
    shutil.copyfile(a.core_source, os.path.join(ext, 'jsx', 'jizura_core.jsx'))
else:
    subprocess.run([sys.executable, 'build_ae.py', '--core', '--lang', a.lang, '--out', os.path.join(ext, 'jsx', 'jizura_core.jsx')], check=True, stdout=subprocess.DEVNULL)

# 3) manifest (+ optional remote-debug file)
manifest = open('cep/manifest.xml', encoding='utf-8').read().replace('@VERSION@', VERSION)
if english: manifest = manifest.replace('com.852wa.jizura', extension_id).replace('<Menu>JIZURA 字面</Menu>', '<Menu>JIZURA English</Menu>')
open(os.path.join(ext, 'CSXS', 'manifest.xml'), 'w', encoding='utf-8').write(manifest)
if a.debug:
    open(os.path.join(ext, '.debug'), 'w', encoding='utf-8').write(
        '<?xml version="1.0" encoding="UTF-8"?>\n<ExtensionList>\n  <Extension Id="' + extension_id + '.panel">\n    <HostList>\n      <Host Name="AEFT" Port="8098"/>\n    </HostList>\n  </Extension>\n</ExtensionList>\n')
for f in ['LICENSE', 'THIRD_PARTY_NOTICES.md']:
    if os.path.exists(f): shutil.copy(f, ext)

# 4) distributable zip: extension folder + install notes + signing scripts
package_name = 'JIZURA_CEP_en' if english else 'JIZURA_CEP'
zp = os.path.join(a.out, package_name + '.zip')
with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED) as z:
    for p in sorted(glob.glob(os.path.join(ext, '**'), recursive=True) + glob.glob(os.path.join(ext, '.debug'))):
        if os.path.isfile(p): z.write(p, os.path.join(package_name, os.path.relpath(p, a.out)))
    for f in sorted(glob.glob('cep/packaging/*')):
        name = os.path.basename(f)
        if english:
            if name == 'README_CEP.md':
                z.writestr(os.path.join(package_name, name), 'JIZURA English CEP panel\n\nExtract this ZIP and run install_win.bat or install_mac.command. Restart After Effects and open Window > Extensions > JIZURA English. It can coexist with the Japanese panel.\n')
                continue
            if name in ('install_win.bat', 'install_mac.command', 'sign_zxp_win.bat', 'sign_zxp_mac.sh'):
                content = open(f, encoding='utf-8').read().replace('com.852wa.jizura', extension_id).replace('> JIZURA.', '> JIZURA English.')
                if name.startswith('sign_zxp'): content = content.replace('JIZURA.zxp', 'JIZURA_en.zxp')
                info = zipfile.ZipInfo(os.path.join(package_name, name))
                info.create_system = 3
                info.external_attr = (0o755 if name.endswith(('.command', '.sh')) else 0o644) << 16
                z.writestr(info, content.replace('\n', '\r\n') if name.endswith('.bat') else content)
                continue
        z.write(f, os.path.join(package_name, name))
size = sum(os.path.getsize(p) for p in glob.glob(os.path.join(ext, '**'), recursive=True) if os.path.isfile(p))
print(ext, f'{size // 1024} KB', '->', zp, f'{os.path.getsize(zp) // 1024} KB', '(debug)' if a.debug else '')
