# 05 — Modular effects and contribution contract

**Depends on:** task 04; use task 01's ID and order inventory.

## Work

Move the existing `src/11p_*.js` packs and core effects into typed modules with explicit registration. Keep the existing groups, IDs, ordering, tags, weights, pack and set flags, and selection rules. Define one source-level registration contract for a new pack, including metadata consumed by UI, browser rendering, plan export and AE mapping. Update `docs/EXPRESSION_PACKS.md` for the new paths and commands.

Do not introduce runtime downloading or arbitrary third-party plugins as part of this task. A new effect is a source module included in a build. For effects without a matching AE implementation, require a declared fallback and surface it in validation.

## Deliverable and acceptance

- The complete baseline registry matches task 01 in IDs and ordering; fixed-seed selection tests stay stable.
- A small sample pack is added through the documented API without edits to engine core files, then either retained as a useful example or removed after its contract test is kept.
- Build validation rejects duplicate IDs, missing required metadata and missing AE implementation/fallback declarations.

**Handoff to:** tasks 07 and 09.

## Result — 2026-09-30

Integration base: `9e85599b6aca6685fb96d91ef906be267afb02e5` (accepted task 04).
Task branch: `codex/v1x-task05-effect-modules`.

### Changes and preserved contract

- `effects/core/{animation,layouts,decor,registry}.ts`, `effects/packs/*.ts` and `effects/sets.ts`
  replace the core effect, registry, 24 expression-pack and selection-set JS installers.
  `effects/index.ts` owns their explicit initialization lists; adding a pack changes that
  list rather than engine core files. Registry setup now precedes core animation/layout/decor
  registration; their original group order is supplied explicitly. `CORE_ORDER` capture and
  AE fallback-map initialization remain before packs.
- `effects/types.ts` and `effects/registry.ts` define required metadata, group callbacks,
  source pack installation, duplicate rejection and an AE implementation/fallback contract.
  New registrations require names, known mood tags, finite nonnegative weights, callbacks,
  decor layers and a declared port or reasoned fallback. Invalid entries fail before being
  added. Selection flags retain the extra/wa/typo/kinetic/horror rules, including packs
  installed after engine creation. Runtime own-property checks use APIs available in
  Chromium 88; a focused test removes `Object.hasOwn` before initializing an engine.
- The baseline-only typed registration bridge preserves originally implicit tags/weights and
  missing core `pack` fields, so the entire exported AE metadata remains equal. All 860
  selectable effects and the two special layouts have explicit same-ID ES3 port declarations
  in `effects/ae-implementations.ts`. Existing `ae`/`AE_MAP` counterpart metadata is preserved.
  `build/check-effects.mts` validates source metadata before root builds and compares declarations
  with both freshly built ES3 registries during `npm run check`. Reports identify every
  fallback; the production baseline currently requires none.
- `tests/effects/` retains a test-only breathing-motion example through `defineEffectPack` /
  `installEffectPack`. It installs without core edits, participates in project/planning/AE
  export and exposes its explicit fallback. It is excluded from production. Type and runtime
  tests reject missing metadata, wrong callback groups, missing or invalid AE declarations,
  conflicting mappings, damaged definitions and duplicate IDs, including same-pack duplicates.
- `build.py` recursively follows local module imports/re-exports when copying localized inputs;
  `dev/build_test.py` selects `effects/packs/*.ts` from the explicit pack list. The engine
  consumer types, metadata exporter, build orchestration, package scripts, TS includes and
  compatibility comments are updated. `docs/EXPRESSION_PACKS.md` and `BUILD.md` document the new
  contribution/build commands. `dev/effect_source_compare.mjs` retains a migration-only source
  comparison against the accepted task-04 commit; that historical commit must be available.
  No baseline fixtures, tracked generated application assets or dependencies are changed.

### Checks actually run

Environment: Node 26.10.0, Python 3.14.7, Chrome 154.0.8037.92 on Linux, with the existing
optional Playwright/Pillow directories in `/tmp`. Browser font requests were blocked.

| Command / evidence | Actual result |
| --- | --- |
| `npm run check` (final source) | Passed: TS typecheck, 9 engine tests, 6 effect tests, four builds, output/resource checks, ES2021 browser/CEP parsing, ES3 ScriptUI/host/core parsing, both CEP host/core fixture mocks, both built-AE registry comparisons and both AE model suites. |
| `npm run typecheck`; `npm run test:effects`; `npm run test:engine` | Passed focused runs. Compile-only cases reject missing metadata, a hold definition registered as layout, missing fallback reason and unknown moods. Six runtime effect tests cover the full ordered registry/effective counterpart metadata, the example pack, invalid registrations, selection flags, definition mutation and the unavailable-new-API case. |
| `npm run check:effects` | Japanese and English built ES3 registries match the explicit source port catalog, including special layouts. 862 direct implementations, zero undeclared effects, zero production fallbacks. This loads source registrations in a Node VM; it does not render in Adobe. |
| `node dev/effect_source_compare.mjs` | All 24 pack algorithms match the accepted task-04 AST after type erasure and registration-method normalization. All 3 core effect algorithms match after additionally normalizing explicit registry wiring. No algorithm differences were found. |
| `PYTHONPATH=/tmp/jizura-playwright python3 dev/build_foundation_test.py --browser /usr/bin/google-chrome` | Passed 20 production cases: seven hosted routes, seven local offline files and two CEP languages × three Node modes. Fixtures, localized labels, plans, registry, WebMCP inclusion/exclusion and CEP plan transfers passed. Repeated against the final rebuilt outputs. CEP APIs are mocked. |
| `PYTHONPATH=/tmp/jizura-baseline-py python3 dev/engine_modules_test.py --browser /usr/bin/google-chrome` | Three UI-free cases preserve full browser and AE plans against immutable task-01 source. Twelve controlled same-environment frames, including transparent front/back layers, are pixel-identical. |
| `npm run test:ae` (within final `check`) | Japanese and English each passed 87 model builds, one fixture plan and zero fallbacks, unknown match names, expression syntax errors, problems or warnings. AE object-model mocks only. |
| `python3 dev/build_test.py task05-enter effects/packs/enter.ts`; `python3 dev/build_test.py task05-all --all-packs`; `python3 dev/build_test.py task05-core` | Single-pack, all-pack and core-only diagnostic module bundles built successfully in ignored `dev/www/`. |
| `node tools/export_ae_data.js --out dist/task05/final-data.json` + `assert.deepEqual` against inherited `ae/data.json` | All planning metadata, styles, fonts, flags, durations, fits and legacy mappings remain exactly equal (231977 JSON characters, 27 styles). |
| `python3 -m py_compile build.py dev/build_test.py`; `git diff --check` | Passed. |

Logs are `/tmp/jizura-task05-check-final.log`, `/tmp/jizura-task05-browser-final.log` and
`/tmp/jizura-task05-frames.log`. Machine-readable reports stay ignored in
`dist/task05/effect-validation.json`, `dist/task03-browser-results.json` and
`dist/task04/engine-browser-results.json`. Local browser/server and subprocess restrictions
required sandbox escalation; the checks succeeded with the needed local execution access.

### Remaining gaps and handoff

The registration/metadata/group callback boundary is typed. Preserved algorithm-specific
parameter bags, extended text items and some drawing helpers remain explicitly dynamic
(`EffectValue`); this is not a claim of complete static typing of every Canvas operation.
The baseline-only bridge is isolated from the strict contribution API. The UI/label/export
compatibility installers and Python localization remain for tasks 06–08. AE keeps its ES3
source/build path for task 09; no browser bundle is fed into ExtendScript.

Actual After Effects/CEP, embedded Chromium 88/Node 15.9, OS dialogs and Adobe rendering were
not verified. They remain deferred under the task-02 decision, independently of passing
source comparisons, syntax checks, modern browser automation and mocks.

Dependencies are unchanged. **Task 07** can consume the modular registry after task 06;
**task 09** can begin from these AE declarations and unchanged metadata exports. Task 06
can continue independently. No release, Pages deployment, default-branch change or orphan
cutover was performed.
