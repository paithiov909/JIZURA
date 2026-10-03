# JIZURA Remotion package work instructions

## Current objective

This branch (`remotion`) develops an independent package that draws JIZURA lyric
motion directly onto a canvas within Remotion, porting the existing effects.
The source cleanup and initial stages 01–07 are complete in `remotion-jizura/`
(provisional package name: `remotion-jizura`). Preserve their plan and evidence in
[docs/remotion/PLAN.md](docs/remotion/PLAN.md) and
[docs/remotion/VALIDATION.md](docs/remotion/VALIDATION.md).
The next stages 08–14 follow
[docs/remotion/EXTENSION-PLAN.md](docs/remotion/EXTENSION-PLAN.md): a minimal review
loop, custom effects and inspection APIs, native Remotion effects experiments,
a catalog, repeatable port validation, a small effect batch and review integration.
Read [README.md](README.md), [docs/remotion/README.md](docs/remotion/README.md),
both plans and the assigned numbered task memo before changing code.
The initial API is recorded in [docs/remotion/API.md](docs/remotion/API.md).
Extension API names and contracts are proposals until the assigned stage records
and implements its decisions. Implement only the assigned stage.
Work on the current branch unless the user requests another branch.

Support AI-authored Remotion code and human design/motion review. Similar visual
expression is the priority; full legacy planner, seed or project compatibility is
not required. Record intentional adaptations while retaining reference evidence.
LRC/audio analysis/beat snapping belong to caller workflows. AE/CEP integration is
outside this project's scope. Defer major repository, installation and publishing
decisions until more implementation evidence exists.

## Task handoffs

- Each stage has its own memo, acceptance criteria and result section under
  `docs/remotion/`. Implement only the assigned stage and necessary fixes within
  its scope. Read prerequisite results before starting dependent work.
- Execute extension stages 08 through 14 in order; 01–07 are completed prerequisites.
  Separate chats are handoffs, not a
  request for simultaneous edits, new branches or automatic chat creation.
- If a chat uses an isolated checkout, verify that prerequisite changes and
  result notes are present there before continuing. Do not assume another chat's
  uncommitted files are available.
- On completion, update the assigned memo's result section and the status table
  in `docs/remotion/README.md`. Record decisions, changed files, exact checks and
  outcomes, runtime evidence, unresolved limits and the next stage's entry point.
- Update the applicable common plan and any affected later memo when an implementation
  finding changes a contract. Explain the reason; keep past evidence intact.
- A planning-only chat may edit these handoff documents when requested, but must
  not create the package or execute implementation tasks without authorization.

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
Task 02 added an npm workspace using the same root lockfile. The old build
guide's no-workspaces statement describes the reference build, not a restriction
on the new package. Give the package its own TS/TSX configuration and public
exports; published code must not import reference sources outside its package.

Run focused checks for changed files. For changes that touch build paths, run
`npm run check` and the preserved spike checks; distinguish syntax checks,
contract tests, pixel/browser comparisons and mocks from actual Adobe runs.
For documentation-only changes, check local links and `git diff --check`; do not
claim that implementation or rendering tests ran. Initial package commands were
chosen in task 02. Record any new command in its implementing task's handoff before
later tasks use it. Keep implementation checks, visual inspection and user review
status distinct; unreviewed output does not prove design acceptance.
Report files changed, checks actually run, unresolved limits and the next useful
step. Do not regenerate or overwrite baseline fixtures merely to make tests pass.

Do not create an orphan `v1.x`, change the default branch, deploy Pages or publish
a release as part of this work. Preserve the previous migration evidence and Git
history; no prior handoff proves compatibility of a future Remotion package.
