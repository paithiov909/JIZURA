"""Compatibility command for browser/dev builds. The TypeScript preparation and
runtime dictionaries are shared with npm builds; no Python source localization.
Use --out dist/... to keep generated files out of the source tree.
"""
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
os.chdir(ROOT)
subprocess.run(['node', 'build/legacy-cli.mts', *sys.argv[1:]], check=True)
