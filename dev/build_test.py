"""Build a diagnostic bundle with explicit module initialization and selected packs.
usage: python3 dev/build_test.py NAME [src/11p_x.js ...]
       python3 dev/build_test.py NAME --all-packs
Outputs remain ignored in dev/www; the production module graph defines order.
"""
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
os.chdir(ROOT)
name = sys.argv[1]
if not re.fullmatch(r'[\w-]+', name):
    raise ValueError('NAME must contain only letters, digits, underscores or hyphens')
args = sys.argv[2:]
index = (ROOT / 'engine/index.ts').read_text(encoding='utf-8')
imports = re.findall(r"^import (\w+) from '../(src/11p_[^']+\.js)';", index, re.M)
known = {source for _, source in imports}
chosen = known if '--all-packs' in args else {arg for arg in args if arg.endswith('.js')}
if chosen - known:
    raise ValueError(f'Unknown packs: {chosen - known}')
(ROOT / 'dist').mkdir(exist_ok=True)
with tempfile.TemporaryDirectory(prefix='jizura-pack-test-', dir=ROOT / 'dist') as directory:
    subprocess.run(['python3', 'build.py', '--out', directory, '--vite-input', '--lang', 'ja'], check=True)
    for alias, source in imports:
        if source not in chosen:
            index = re.sub(rf'^import {alias} from [^\n]+\n', '', index, flags=re.M)
            index = re.sub(rf'^  \[[^\n]+, {alias}\],\n', '', index, flags=re.M)
    (Path(directory) / 'engine/index.ts').write_text(index, encoding='utf-8')
    bundle = subprocess.check_output(['node', 'build/bundle-input.mts', directory], text=True)
output = ROOT / 'dev/www'
output.mkdir(parents=True, exist_ok=True)
(output / f't_{name}.js').write_text(bundle, encoding='utf-8')
page = (ROOT / 'dev/test.html').read_text(encoding='utf-8').replace('src="jizura.js"', f'src="t_{name}.js"')
(output / f't_{name}.html').write_text(page, encoding='utf-8')
print('built', f'dev/www/t_{name}.html', 'packs:', [source for _, source in imports if source in chosen])
