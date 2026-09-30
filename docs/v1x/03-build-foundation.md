# 03 — TypeScript and Vite build foundation

**Depends on:** task 02's output decision.

## Work

Add a root package manifest, committed lockfile, TypeScript configuration, Vite configuration and documented commands for web, offline, AE and CEP targets. Integrate the current `dev/` Acorn dependency into a clear workspace strategy. Put generated outputs under ignored `dist/` paths and keep source assets, licenses and third-party notices explicit. Establish clean checkout, typecheck and build commands before migrating the engine.

Use the simplest layout that allows distinct browser and CEP targets; do not force ExtendScript through a modern JS target. Preserve version propagation from `VERSION` or replace it with one declared source of truth and a validation check.

## Deliverable and acceptance

- `npm ci` and the documented build/check commands work from a clean checkout on the selected supported Node version.
- Web, offline, AE and CEP scripts have distinct output paths and do not modify tracked generated files.
- A clean `git status` follows a complete build; the new `.gitignore` covers all generated output.

**Handoff to:** tasks 04 and 06.
