# 04 — Engine modules and stable data

**Depends on:** task 03; compare against task 01 fixtures.

## Work

Move the current global `J` utility, text, style, planner and renderer layers into explicit TypeScript modules in small steps. Introduce types for project state, cuts, effect groups, export plans and the AE plan boundary. Keep a temporary compatibility facade only where unconverted UI or pack code requires it, and record its removal path. Avoid changing algorithms merely to satisfy the type system.

The existing `src/*.js` filename sort is a dependency mechanism. Replace it with explicit imports and an initialization order that tests can inspect. Keep the version 2 AE plan, project JSON interpretation, deterministic seed behavior and public effect keys stable.

## Deliverable and acceptance

- Fixed baseline inputs produce equivalent project/plan output and selected frames within task 01's documented tolerances.
- Engine tests run without assembling the old global-source concatenation.
- The build does not rely on lexicographic source filenames for initialization.

**Handoff to:** tasks 05, 06 and 09.

## Result — 2026-09-30

Integration base: `d53096e8232ae816205960cc9b3eea670f5c2e07` (accepted task 03). Task branch: `codex/v1x-task04-engine`.

### Changes and preserved boundaries

- `engine/{util,text,styles,planner,renderer,project,ae-plan}.ts` replace the five original global core JS files and extract project interpretation/AE v2 serialization from UI/export code. `types.ts` and `utility-types.ts` define project/timing/overrides/locked snapshots, cuts, effect groups, browser and AE plans, audio analysis, glyph layout, renderer options and deterministic utility APIs. `VERSION` is passed explicitly to `createEngine`; it remains the only application version source.
- `engine/index.ts` explicitly imports and initializes each layer, exposing frozen `INITIALIZATION_ORDER`. `CORE_ORDER` is captured before packs; export/AE fallback maps initialize before packs extend them. Factories do not set a global `J`, and instances isolate registries, language/typeset state and caches. `engine/package.json` and `src/package.json` mark module runtime boundaries for native Node TypeScript loading.
- Remaining `src/*.js` files have small installer wrappers that receive the engine instead of depending on a shared lexical scope. Effect IDs, definitions and algorithms remain intact. `src/12_ui.js` delegates project merge/migration to the engine; `src/11_export.js` keeps browser exports while the AE boundary moves to its own module. Browser bootstrap alone attaches `window.J`, then installs labels, UI and the selected WebMCP/CEP adapter.
- `build.py`, `build/entries/legacy.ts`, `build/bundle-input.mts`, both `tools/export_*` metadata exporters and `dev/build_test.py` consume explicit modules. No production/diagnostic build discovers initialization via sorted filenames, and no Vite input assembles `legacy.js`. Localization still operates on individual copied sources until task 06.
- `tests/engine/`, `build/build-engine-test.mts` and `dev/engine_modules_test.py` supply independent Node/type/browser verification. `dev/webmcp_test.py` now loads the module-only engine for its no-UI guard and accepts a generated-page root. The preserved spike calls the WebMCP installer explicitly. `.gitignore` excludes diagnostic `dev/www/`; `package.json`, `tsconfig.json`, [BUILD.md](BUILD.md), [EXPRESSION_PACKS.md](../EXPRESSION_PACKS.md) and the migration README document the new route. No generated application assets or fixture changes are committed.

### Checks actually run

Environment: Node 26.10.0, Python 3.14.7, Chrome 154.0.8037.92 on Linux. Existing optional Playwright/Pillow installations in `/tmp` were reused; remote font requests were blocked.

| Command / evidence | Actual result |
| --- | --- |
| `npm run typecheck` | Passed, including migrated TS and compile-only valid/invalid consumer examples. Unconverted JS and dynamic effect/item slots are not claimed to be fully typed. |
| `npm run test:engine` | 9 tests passed by importing `createEngine` directly, with only a font-measurement stub. Exact ordered registry/style/font IDs, two fixture projects and deterministic summaries, full Japanese AE plan, legacy timing migration, sanitation, isolated instances, AE export range, cut boundaries, and saved locks/overrides passed. No global-source concatenation or UI assembly is used by these tests. |
| `npm run check` | Passed: typecheck, engine tests, all four builds, output/resource checks, ES2021 browser/CEP parsing, ES3 host/core/ScriptUI parsing, both CEP host/core fixture mocks, and both AE model suites. The aggregate run preceded the final added lock test; the final focused typecheck and 9-test engine suite passed afterwards. |
| `PYTHONPATH=/tmp/jizura-playwright python3 dev/build_foundation_test.py --browser /usr/bin/google-chrome` | All 20 production cases passed: seven hosted routes, seven local offline files, and two CEP languages × three Node modes. Locale/registry/project/plan/WebMCP fixtures unchanged; CEP plan transfers passed. CEP APIs are mocked. |
| `PYTHONPATH=/tmp/jizura-baseline-py python3 dev/engine_modules_test.py --browser /usr/bin/google-chrome` | UI-free module bundle passed three cases: both fixture inputs and unify/typeset/portrait sidebands. Full browser plans and AE v2 plans match immutable task-01 source exactly. Twelve same-environment frames, including transparent front/back layers, are pixel-identical with texture randomness reset identically. |
| Stored task-01 PNG visual review | Both 480×270 fixture compositions, text, colors and motion agree. Unseeded texture/noise makes stored PNG bytes variable; mean absolute RGBA channel differences were 1.596/255 at 1.2s and 3.533/255 at 3.2s. Controlled same-source comparisons above are exact. |
| `npm run test:ae` | Japanese and English each passed 87 model builds: one fixture plan, zero fallbacks, unknown match names, expression syntax errors, problems or warnings. This is an AE object-model mock, not actual rendering in Adobe. |
| `npm run spike:build && npm run spike:test` | Preserved formats, muxer modes, ES3 host/core and native Buffer/file plan bridge checks passed after installer adaptation. |
| `PYTHONPATH=/tmp/jizura-playwright python3 dev/cep-offline-spike/browser_test.py --browser /usr/bin/google-chrome` | Original eight cases passed, retaining the expected normal-Vite `file:` failure and classic/offline successes. Modern Chrome with CEP/Node API mocks. |
| `python3 build.py --out dist/task04/legacy-cli --lang ja --dev`; `python3 build.py --out dist/task04/legacy-all`; `python3 dev/build_test.py task04 --all-packs`; `python3 dev/build_test.py task04-core` | Single-file CLI, dev harness, seven CLI editions, all-pack and core-only diagnostics build through Vite modules. Outputs stay ignored. |
| `PYTHONPATH=/tmp/jizura-playwright python3 dev/webmcp_test.py --root dist/task04/legacy-all --browser /usr/bin/google-chrome` | Passed on freshly generated CLI pages: 18 tools, edits/history/locks/validation/import/reset, actual Chrome MP4/PNG exports and outcome states, seven locales, no-UI and CEP guards. Native Chrome discovery, get-state and settings edit also passed. OS save dialogs are unverified. |
| `node tools/export_ae_data.js --out dist/task04/final-data.json` + JSON comparison to inherited `ae/data.json` | All exported metadata remains exactly equal. |
| `git diff --check` | Passed. |

Machine-readable engine/frame evidence is in ignored `dist/task04/engine-browser-results.json`; production/spike reports remain `dist/task03-browser-results.json` and `dist/task02/`. Console logs from this run are `/tmp/jizura-task04-*.log`. Browser launch/local server restrictions required sandbox escalation; tests succeeded after running with the necessary local process/network access.

### Compatibility facade and next tasks

`engine/legacy-types.ts` intentionally contains the temporary dynamic `LegacyFacade`/`LegacyValue` types for per-effect parameter bags, effect callbacks and renderer drawing environments. Core public inputs/outputs are typed; this task does not claim complete static typing of every legacy effect or canvas helper. Preserve these dynamic behaviors while narrowing them in later conversions.

- **Task 05:** replace JS animation/layout/decor/pack installers and dynamic registry definitions with typed effect modules/registration. Keep the explicit stage order, `CORE_ORDER`, fallback-map timing and fixture IDs. Extend the module-copy adapter for any new nested dependencies, or remove it through a validated build route.
- **Task 06:** replace `labels.js` and Python source localization with runtime dictionaries. Preserve the bootstrap ordering before UI project defaults and planning.
- **Task 07/08:** replace the remaining UI/export/audio/font/language installers and `window.J` consumers with direct typed engine/adapter imports; then remove the browser compatibility bootstrap and narrow renderer item/environment slots. WebMCP remains browser-only.
- **Task 09:** AE metadata exporters already use the Node module graph. Continue the separate ES3 build path and preserve AE v2 inputs.

Dependencies remain unchanged: tasks 05 and 06 can start; task 09 follows task 05. No actual After Effects/CEP installation, embedded Chromium 88/Node 15.9, OS save dialogs, AE rendering, signing or installation was verified. Actual Adobe checks remain deferred under the existing task-02 decision. No release, Pages deployment, orphan branch or default-branch change was performed.
