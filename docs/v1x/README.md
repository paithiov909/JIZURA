# JIZURA v1.x migration plan

Status: plan and task handoff notes. Creating this document does not execute the migration tasks.

## Starting point and objective

- Functional and visual baseline: `codex/webmcp` at `d217fb0a06d0f81bc31f8b31b9646c30dc540f82`.
- Integration branch: `codex/v1x-integration`. Task branches begin from its latest accepted commit and return to it for review.
- Final source branch: orphan `v1.x`, created from a verified integration snapshot. It must have no common history with `main`; `main` stays as an archive. After publication and verification, make `v1.x` the repository default branch.
- Scope: replace the browser build with TypeScript and Vite; keep AE ScriptUI and CEP compatibility; make effect packs easy to add; replace build-time string replacement with runtime/browser i18n; remove tracked build products from the new source branch.

The current `build.py` concatenates `src/*.js` and creates seven localized single-file HTML pages. `build_ae.py` assembles ES3 `.jsx` files and exported `ae/data.json`. `build_cep.py` embeds the browser page and bridge into a local CEP extension. The existing registry already supports expression packs through `J.register`; the migration should preserve that contract while moving packs into modules. `docs/WEBMCP.md` describes the browser-only 18-tool interface that the new UI must retain.

## Proposed boundaries

```text
TypeScript/Vite workspace
  engine/       project model, planner, renderer, stable effect registry
  effects/      explicit pack modules and metadata
  ui/           browser editor, export, audio and fonts
  i18n/         typed locale dictionaries for seven languages
  adapters/     WebMCP and CEP bridges, each with its own entry point
  build/        web, offline, AE and CEP targets; packaging and validation
ae/            ExtendScript ES3 source and AE-specific effect implementations
dist/          ignored generated website and release assets
```

The directory names are an architectural guide, not a required rename in one commit. A small compatibility adapter may remain while the global `J` code is migrated. Browser Pages output may use static assets; the offline download must still open locally. CEP needs an explicitly compatible local bundle, independent of Vite's default browser target. AE's ES3 code is a separate runtime target, even if TypeScript orchestrates its build.

## Compatibility gates

1. Seven locales keep their existing URLs (`/`, `/en/`, `/zh-hant/`, `/zh-hans/`, `/ko/`, `/id/`, `/vi/`), translated UI and part names, and equivalent editor behavior.
2. Existing project JSON and AE plan version 2 load and round-trip. Stable IDs, registration order, seed-based choices, and saved overrides continue to work. New effects declare an AE implementation or an explicit fallback.
3. Browser MP4, PNG sequence, transparent PNG, layered PNG, audio, fonts, and file-based project workflows still work. A downloadable offline browser build remains available.
4. `codex/webmcp`'s 18 browser tools retain names, schemas, errors, state revisions, and CEP exclusion.
5. Both AE ScriptUI languages and both CEP packages build. ES3 parsing, AE mock tests, CEP mock tests, and an actual supported AE/CEP run are separately recorded.
6. A clean checkout can build and test with the documented toolchain. No generated application files are tracked on `v1.x`.

## Work order

| Task | Memo | Depends on | Result |
| --- | --- | --- | --- |
| 01 | [Baseline contract](01-baseline-contract.md) | none | Fixtures, inventory, comparison rules |
| 02 | [CEP and offline feasibility](02-cep-offline-spike.md) | 01 | Validated bundling decision |
| 03 | [Build foundation](03-build-foundation.md) | 02 | TS/Vite scripts, clean outputs |
| 04 | [Engine modules](04-engine-modules.md) | 03 | Typed engine with stable outputs |
| 05 | [Effect modules](05-effect-modules.md) | 04 | Explicit, extensible pack registration |
| 06 | [Browser i18n](06-browser-i18n.md) | 03, 04 | Seven locale dictionaries and routes |
| 07 | [Browser editor and export](07-browser-editor.md) | 04, 05, 06 | Feature-complete browser build |
| 08 | [WebMCP adapter](08-webmcp.md) | 07 | Preserved browser-only tool contract |
| 09 | [AE build](09-ae-build.md) | 04, 05 | ES3 Japanese/English outputs |
| 10 | [CEP package](10-cep-package.md) | 07, 09 | Compatible Japanese/English extensions |
| 11 | [Regression verification](11-regression.md) | 08, 09, 10 | Evidence and resolved regressions |
| 12 | [Actions distribution](12-actions-distribution.md) | 11 | Release and Pages workflows |
| 13 | [Orphan cutover](13-cutover.md) | 11, 12 | `v1.x` source branch and verified publication |

After task 04, tasks 05 and 06 can proceed in parallel on separate task branches. Task 09 can begin after task 05 while browser task 07 proceeds. Coordinate shared files through integration commits rather than editing one worktree concurrently.

Task 02 result (2026-09-30): [CEP/offline output decision](CEP-OFFLINE-DECISION.md) and repeatable `dev/cep-offline-spike/` checks are available. Normal Vite HTML failed the tested local-file startup; library IIFE/local CEP and single-HTML offline startup passed focused checks. Per the user's instruction, actual AE tests are deferred while no AE subscription/installation is available. Implementation can continue using separately identified mocks; an actual Adobe runtime pass has not been established.

Task 03 result (2026-09-30): the [root TS/Vite workspace](BUILD.md) builds all four targets into ignored `dist/` outputs from one dependency lockfile. Clean-checkout install/check and independent builds without inherited generated inputs passed. Twenty production-output browser cases, eight preserved spike cases and both 87-build AE model suites passed. The English metadata-export VM failure is fixed. Actual Adobe/Chromium 88 runtime checks remain deferred; see [task 03's handoff](03-build-foundation.md#result--2026-09-30). Next: task 04, then task 06 alongside task 05.

Task 04 result (2026-09-30): the [explicit TypeScript engine](04-engine-modules.md#result--2026-09-30) preserves fixture projects/plans and AE v2 output without global-source assembly. Nine Node contract tests, twenty production browser cases, twelve controlled pixel comparisons, both AE model suites and the preserved spike checks passed. UI/pack installer adapters and dynamic effect/item slots have documented removal paths. Actual Adobe verification remains deferred. Next: tasks 05 and 06; task 09 follows task 05.

Task 05 result (2026-09-30): the [typed effect modules and source contribution contract](05-effect-modules.md#result--2026-09-30) preserve all 860 selectable IDs and two special layouts, ordering, selection flags and exported AE metadata. Six effect tests, nine engine tests, all builds, twenty production browser cases, twelve controlled frame comparisons and both 87-build AE model suites passed. Both built ES3 registries match the declared ports. The retained sample is test-only; algorithm-local dynamic bags and actual Adobe verification remain documented limitations. Next: task 09; task 07 follows task 06.

Task 06 result (2026-09-30): the [typed runtime browser i18n service](06-browser-i18n.md#result--2026-09-30) preserves seven locale routes, translated/static/dynamic copy and contributor labels without browser-source rewriting. Six locale tests, nine engine tests, six effect tests, all builds, 21 focused locale/navigation cases, 20 production browser/CEP cases, 1,025 source-function comparisons, 12 controlled frames and both AE model suites passed. Hosted language switching preserves pending edits and saved state. Adobe/runtime and portable offline-menu boundaries remain explicit. Next browser task: 07; task 09 can proceed independently.

Task 07 result (2026-09-30): the [shared typed browser-editor API and export verification](07-browser-editor.md#result--2026-09-30) preserve hosted/offline/CEP editor initialization and move authored UI/services into `ui/`. All builds/contracts, 20 production cases, 21 locale cases, 12 controlled frames and actual hosted/offline JSON/LRC/MP4/PNG/audio/font workflows passed. Offline sibling-language navigation is fixed. Hosted direct writing passed with a mocked picker; native dialogs, file-origin OPFS restrictions, retained JavaScript internals and actual Adobe verification are explicit boundaries. Next: task 08; task 10 follows task 09.

## Distribution design

- CI runs focused checks on task PRs and on `codex/v1x-integration`. It creates no release or Pages deployment there.
- A push to `v1.x` triggers a website build and direct Pages deployment through `actions/upload-pages-artifact` and `actions/deploy-pages`. Set Pages Source to **GitHub Actions**. There is no `docs` branch and no commit of the generated site.
- A `v1.*` version tag pointing into `v1.x` triggers build, validation and upload of the Japanese/English AE scripts, Japanese/English CEP ZIPs, an offline browser distribution, and checksums to GitHub Releases. Use the minimum workflow permissions needed for each job.
- Keep the existing public URL shape and canonical/hreflang behavior. Verify the deployed root and all six language subpaths after the first deployment.

## Decision points and risks

- **CEP:** Adobe CEP 11 uses Chromium 88; a current Vite default target may be newer. Task 02 must prove local loading and the Node/MP4 bridge before committing to its final output format. A separate classic bundle is acceptable if Vite's normal HTML output fails that gate.
- **Offline:** `file:` loading and module scripts can differ from hosted Pages. Task 02 must test the offline deliverable explicitly.
- **AE:** ExtendScript is ES3. Do not feed the browser bundle into AE; keep source and parser checks for AE's own runtime. Mock tests do not certify an actual AE version.
- **Orphan history:** GitHub cannot use a normal merge from `main` into `v1.x`. Task 13 cuts a new root commit from the verified snapshot, checks that `git merge-base main v1.x` finds none, and records the baseline SHA in documentation for provenance.

## Handoff format for every task thread

1. State the task ID, integration-base SHA, and task branch.
2. List changed source/docs and the compatibility contract touched.
3. Give the exact checks run with results; distinguish mocks from actual AE.
4. Record decisions, unresolved issues, and any changed dependency for later tasks.
5. Return a reviewable commit or PR against `codex/v1x-integration` without release assets.
