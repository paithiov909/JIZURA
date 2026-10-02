# JIZURA Remotion package work instructions

## Current objective

This branch (`remotion`) develops an independent package that draws JIZURA lyric
motion directly onto a canvas within Remotion, porting the existing effects.
Read [README.md](README.md) and [docs/remotion/README.md](docs/remotion/README.md)
before changing code. The package API, name, layout and implementation sequence
are still undecided; the initial task is source-tree cleanup, not a package scaffold.
Work on the current branch unless the user requests another branch.

## Reference material

- `engine/` and `effects/` contain the primary browser canvas implementation,
  planner and explicitly registered effect packs. Preserve effect IDs, ordering,
  seed behavior and algorithms in the reference sources until a port is validated.
- `tests/baseline/v1/`, `tests/engine/` and `tests/effects/` contain comparison
  fixtures and contracts. Small reference PNG/JSON files are intentional source.
- `ae/`, `ui/`, `i18n/`, `src/`, `cep/`, `app/`, `build/`, `dev/`, `tools/` and
  `vendor/` remain supporting reference/build sources. Check imports and callers
  before moving or deleting them. `cep/packaging/` contains authored installer
  templates, not generated extension files.
- [docs/v1x/README.md](docs/v1x/README.md) records the previous migration and
  completed task handoffs (01–07). The old instructions are archived in
  [docs/legacy/V1X-WORK-INSTRUCTIONS.md](docs/legacy/V1X-WORK-INSTRUCTIONS.md).
  Those integration/cutover tasks and browser/AE/CEP distribution requirements
  are historical context, not the roadmap for this branch.
- Legacy application guides and changelog live in `docs/legacy/`. `LICENSE` and
  `THIRD_PARTY_NOTICES.md` remain authoritative notices.

## Outputs and verification

Keep generated HTML, JSX bundles, ZIPs, temporary metadata, reports and caches in
ignored directories such as `dist/`. Never commit dependencies or release assets.
Use the root lockfile and toolchain documented in [docs/v1x/BUILD.md](docs/v1x/BUILD.md)
to verify retained source; do not treat the old application version in `VERSION`
as an already-decided version for the new package.

Run focused checks for changed files. For cleanup that touches build paths, run
`npm run check` and the preserved spike checks; distinguish syntax checks,
contract tests, pixel/browser comparisons and mocks from actual Adobe runs.
Report files changed, checks actually run, unresolved limits and the next useful
step. Do not regenerate or overwrite baseline fixtures merely to make tests pass.

Do not create an orphan `v1.x`, change the default branch, deploy Pages or publish
a release as part of this work. Preserve the previous migration evidence and Git
history; no prior handoff proves compatibility of a future Remotion package.
