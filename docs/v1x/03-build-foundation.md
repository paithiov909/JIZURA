# 03 — TypeScript and Vite build foundation

**Depends on:** task 02's output decision.

Task 02 selected [normal Vite HTML for hosted web, a Chrome 88 library IIFE with local CSS/vendor for CEP, and inline single-HTML packaging for offline](CEP-OFFLINE-DECISION.md). Set explicit JS/CSS targets; do not use Vite's default ES module HTML for local CEP/offline loading. Use the small tested HTML packaging step rather than adding another bundler. The isolated `dev/cep-offline-spike/` package is evidence to consolidate into this workspace, not a second permanent dependency tree. Actual AE/CEP verification remains deferred and must be distinguished from the passing mocks.

## Work

Add a root package manifest, committed lockfile, TypeScript configuration, Vite configuration and documented commands for web, offline, AE and CEP targets. Integrate the current `dev/` Acorn dependency into a clear workspace strategy. Put generated outputs under ignored `dist/` paths and keep source assets, licenses and third-party notices explicit. Establish clean checkout, typecheck and build commands before migrating the engine.

Use the simplest layout that allows distinct browser and CEP targets; do not force ExtendScript through a modern JS target. Preserve version propagation from `VERSION` or replace it with one declared source of truth and a validation check.

## Deliverable and acceptance

- `npm ci` and the documented build/check commands work from a clean checkout on the selected supported Node version.
- Web, offline, AE and CEP scripts have distinct output paths and do not modify tracked generated files.
- A clean `git status` follows a complete build; the new `.gitignore` covers all generated output.

**Handoff to:** tasks 04 and 06.

## Result — 2026-09-30

Integration base: `57a05fc8840394c0e0f2a566b08c0f8a0938dfec` (accepted task 02). Task branch: `codex/v1x-task03-build-foundation`. Implementation commit: `a2b355e`. See [BUILD.md](BUILD.md) for the supported toolchain, commands, output map and temporary migration boundaries.

### Changed source and contract

- Root `package.json`, `package-lock.json`, `.node-version`, `.npmrc`, `tsconfig.json`, `vite.config.mts`: one development dependency install; Node 26.10.0 selected and checked; Vite 8.3.1, TypeScript 7.0.2 and Acorn 8.18.0 pinned. The package omits an application version; `VERSION` remains authoritative.
- `build/build.mts`, `build/packaging.mts`, `build/entries/legacy.ts` and its declaration, `build/muxer-guard.js`: distinct web, offline, AE and CEP builds under ignored `dist/`. Web retains seven locale routes and normal Vite HTML; local builds use explicit Chrome 88 JS/CSS library IIFEs. One-chunk/embedded-asset checks and callback-based HTML insertion preserve the tested packaging strategy. Each output carries licenses/notices, and standalone HTML embeds the muxer license.
- `build.py`, `build_ae.py`, `build_cep.py`, `tools/export_ae_data.js`: explicit output/input adapters that avoid modifying inherited tracked pages, JSX, ZIPs and `ae/data.json`. CEP builds its own fresh cores and local panel. Old defaults are retained for historical tooling, while supported migration commands use ignored paths.
- `tools/export_english_labels.js`: exclude UI-only WebMCP from the metadata VM, fixing task 01's recorded English AE/core failure. No effect IDs, algorithms, locale copy or saved-plan schema changed. The Japanese implementation registry and regenerated metadata match the baseline.
- `dev/ae_test.js`, `dev/build_foundation_test.py`: validate generated JSX via an explicit input and separately check hosted/offline/CEP output. The spike now shares the root classic configuration, guard and chunk validator. Nested dependency lockfiles and its separate TS config were removed; small `dev/` manifests only mark CommonJS/ESM boundaries.
- `.gitignore`, `README.md`, `README.en.md`, `THIRD_PARTY_NOTICES.md`, `dev/cep-offline-spike/README.md`, `docs/v1x/BUILD.md` and migration status docs: document clean outputs, commands, evidence and later tasks. No generated release/application files or downloaded dependencies were added or updated in migration commits.

### Checks actually run

Environment: Linux, Node `26.10.0`, npm `11.19.1`, Python `3.14.7`, Playwright `1.63.0`, installed Chrome `154.0.8037.92`.

| Check | Result and evidence |
| --- | --- |
| Root `npm ci --ignore-scripts --cache /tmp/jizura-task02-npm-cache` | Passed from the committed lockfile; 20 development packages installed; no nested dependency install needed |
| `npm run typecheck` | Passed for the TS orchestration/config/entry and spike; unconverted JS and AE source are outside this typecheck |
| `npm run build` and `npm run check:outputs` | Passed: seven hosted routes, seven standalone offline HTMLs, Japanese/English ScriptUI and cores, two local CEP extensions and ZIPs; VERSION propagation, local resources, ES2021 browser scripts and ES3 host/core/panels checked |
| `npm run test:ae` | Both languages passed, each with 87 model builds and one baseline JSON plan; zero fallbacks for the fixture, unknown match names, expression syntax errors, problems or warnings. This is an ES3 parser/object-model mock, not actual AE |
| `PYTHONPATH=/tmp/jizura-playwright python3 dev/build_foundation_test.py` (default installed Chrome path) | All 20 cases passed: hosted/offline seven locales each; both CEP languages with dual/mixed/no-Node API mocks. Locale metadata/copy, stable registry, deterministic project/plan/AE-plan and all 18 WebMCP definitions match task 01. CEP excludes WebMCP and transfers unchanged plans through file/string paths; only display copy follows the language |
| `npm run spike:build`, `npm run spike:test`, `PYTHONPATH=/tmp/jizura-playwright python3 dev/cep-offline-spike/browser_test.py --browser /usr/bin/google-chrome` | Shared-config spike and Node checks passed; all eight original browser cases passed, including two expected module `file:` CORS failures and zero HTTP requests for selected local spike outputs |
| `cmp ae/data.json dist/.inputs/ae/data.json`; `node dev/baseline_ae_registry.js dist/ae/JIZURA_AE.jsx` followed by JSON comparison with `tests/baseline/v1/ae-implementations.json` | Fresh metadata is byte-identical; the AE implementation inventory matches task 01 |
| `python3 -m py_compile build.py build_ae.py build_cep.py dev/build_foundation_test.py dev/cep-offline-spike/browser_test.py`; `git diff --check` | Passed |
| Fresh local clone of `a2b355e`: `npm ci --offline --cache /tmp/jizura-task02-npm-cache`, then `npm run check` | Passed, including both 87-build AE suites. Plain `npm ci` lifecycle behavior was used, without `--ignore-scripts`; the existing cache supplied the pinned tarballs. `git status --porcelain` was empty before and after |
| Same disposable checkout: remove inherited generated HTML/JSX/ZIP/sitemap/`ae/data.json`, clear `dist/` before each `npm run build:web`, `build:offline`, `build:ae`, `build:cep` | All four independently passed without other target outputs or tracked generated inputs. No additional tracked changes occurred; restoring only the intentionally removed inherited files returned a clean Git status |

Raw root/clean-checkout logs are preserved under ignored `dist/task03/`; production browser results are `dist/task03-browser-results.json`, and spike results remain in `dist/task02/`. The inherited generated-file deletion check occurred only in a disposable `/tmp` checkout. Review covered build boundaries, CommonJS/ESM dependency resolution, version/license propagation and generated-file isolation before integration.

### Remaining gaps and next tasks

No actual After Effects/CEP installation was used, in accordance with task 02's recorded deferral. Chromium 88, embedded Node 15.9, ScriptUI rendering, native dialogs and CEP MP4 encoding remain unverified. Modern Chrome startup, AE object-model mocks and syntax targets are distinct evidence. Browser export regression, native WebMCP execution/discovery and pixel/UI parity remain tasks 07/08/11; hosted download staging and Actions remain tasks 12/13. Full distribution approval is not claimed.

The temporary lexical `J` adapter still concatenates filename-sorted legacy sources and uses Python localization. These are the defined removal boundaries for tasks 04 and 06. Task 09 will migrate metadata production/AE assembly further and must also update the preserved spike's old `build_ae.py` metadata default before removing tracked `ae/data.json`. The English VM failure was fixed early because the root build foundation must build both languages; no dependency order or acceptance criterion was relaxed.

Next dependent task: **04 — Engine modules and stable data**. Task **06 — Browser i18n** also depends on task 04, so it can begin after that engine boundary is accepted. No default-branch change, deployment or release was performed.
