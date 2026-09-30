"""Compatibility alias for the typed locale validator (checks every locale)."""
import subprocess
from pathlib import Path

subprocess.run(["node", "build/check-i18n.mts"], cwd=Path(__file__).resolve().parent.parent, check=True)
