# 06 — Browser i18n

**Depends on:** tasks 03 and 04. Coordinate UI touchpoints with task 07.

## Work

Replace Python source-text substitution in `app/english.py`, `app/i18n*.py` and `build.py` with typed locale dictionaries and a browser i18n service. Migrate interface copy, accessible labels, status/errors, style and effect names, and locale-specific samples. Keep Japanese, English, Traditional Chinese, Simplified Chinese, Korean, Indonesian and Vietnamese. Preserve contributor translations and identify missing keys without replacing them with silently incorrect Japanese text.

Keep the existing locale URLs, page language, canonical and hreflang metadata. A runtime language switch may reuse the current route structure; it must preserve project state according to task 01's observed behavior.

## Deliverable and acceptance

- All seven routes render the intended language, including dynamic UI and effect labels.
- A missing-key check fails in CI and a focused browser check covers route navigation and metadata.
- No build-time free-form replacement of JavaScript source remains in the supported build path.

**Handoff to:** task 07.


## Result — 2026-09-30

- Integration base: `ce6a4a2a3074e768981d2dc877acb45366e176ed`.
- Task branch: `codex/v1x-task06-i18n`; reviewed changes are merged back into `codex/v1x-integration` after the checks below.
- Added seven typed dictionaries and an engine/editor-bound service in `i18n/`, with 460 browser UI/export messages, all 860 selectable effect labels, 27 styles, eight moods and seven samples/page descriptors. Two-language CEP copy lives separately in 52-message dictionaries. Community translation precedence and the supplied English effect names in Indonesian/Vietnamese are preserved. No browser translation falls back silently to Japanese.
- Changed `app/body.html`, `src/12_ui.js`, `src/11_export.js` and `cep/cep.js` to use runtime copy, including titles/ARIA/placeholder attributes, late UI, errors and progress. Word-order differences correctly associate interpolation arguments. Project exports use the engine's version. Route-menu navigation flushes pending autosave before leaving; the existing hosted URLs, page language, canonical/hreflang/OG metadata and saved project schema are retained.
- Added `build/prepare-browser.mts`, `build/legacy-cli.mts` and the missing-key/caller/catalog validator; updated `build/build.mts`, `build.py`, the English AE metadata exporter, root scripts/types and the compatibility check alias. Removed retired browser Python glossaries, JS label installers and the temporary localized entry. `app/english.py` now contains only separate ExtendScript copy. `build_cep.py` requires prebuilt local panel files and no longer embeds/retranslates browser scripts: the CEP bridge is now an imported module, so preserving a second raw-script embedding path would bypass the supported module graph. The root npm interface is unchanged.
- Added `tests/i18n/`, focused browser/source-comparison checks in `dev/`, a dictionary-only integration CI workflow, [locale instructions](../../i18n/README.md) and updated [build documentation](BUILD.md) plus retired-source/CEP-command references in the Indonesian and Vietnamese READMEs. Source catalog/DOM hash fixtures were captured from the old effective translations, not the new implementation. Generated outputs remain ignored.

### Checks actually run

| Command / evidence | Result |
| --- | --- |
| `npm run check` | Passed: typecheck, locale validator, six i18n tests, nine engine tests, six effect tests, all four builds, output validation, both AE port catalogs and both 87-build AE model suites; zero problems/warnings in the AE mocks |
| `npm run typecheck`; `npm run check:i18n`; `npm run test:i18n` after final validator changes | Passed; missing/empty keys, parameter inventories, untranslated Japanese copy and all effect/style/mood labels checked |
| `node dev/i18n_source_test.mjs` | 1,025 retained function AST comparisons passed against the old effective translations; this is source comparison, not runtime evidence |
| `PYTHONPATH=/tmp/jizura-baseline-py python3 dev/i18n_test.py --browser /usr/bin/google-chrome` | 21 cases passed: 14 hosted/offline locale pages match captured static DOM and dynamic UI/export messages; seven actual hosted language-menu transitions preserve pending edits, project JSON, volume and mode |
| `PYTHONPATH=/tmp/jizura-baseline-py python3 dev/build_foundation_test.py --browser /usr/bin/google-chrome` | 20 cases passed against task-01 fixtures: seven hosted, seven offline, six ja/en CEP API/Node-mode mocks; no page errors; browser WebMCP definitions preserved and excluded from CEP |
| `PYTHONPATH=/tmp/jizura-baseline-py python3 dev/engine_modules_test.py --browser /usr/bin/google-chrome` | Three full browser/AE plan comparisons and 12 controlled pixel comparisons exact. Original stored noisy PNGs retain the known nonzero differences (1.5964 / 3.5325 mean absolute channel difference), distinct from controlled baseline rendering |
| `python3 build.py --out dist/task06/legacy-cli --lang ja --dev`; `python3 build.py --out dist/task06/diagnostic-input --lang ja --vite-input`; `python3 dev/build_test.py task06 --all-packs`; `python3 tools/check_i18n.py` | Compatibility CLI, dev/diagnostic module build and validator alias passed |
| `npm run check:outputs` | Seven web pages, seven offline files, four ES3 AE/core files and two CEP packages passed; both eight-cut CEP core model checks had zero fallbacks |
| `python3 -m py_compile build.py build_cep.py app/english.py tools/check_i18n.py dev/i18n_test.py`; `node --check dev/i18n_source_test.mjs`; `git diff --check` | Passed |

Chrome was `154.0.8037.92`; remote font requests were blocked in focused browser checks. Ignored evidence includes `dist/task06-check.log`, `dist/task06-browser-results.json`, `dist/task03-browser-results.json` and the task-04 controlled-frame report/images. A final local diff review checked the runtime/service boundaries, copy provenance, registration/schema stability, route state, separate CEP assembly and absence of generated release files before commit/merge. No actual Adobe run was performed.

### Remaining boundaries and next task

The UI/export implementations still use their compatibility installers and formatted HTML messages; task 07 owns their module conversion, complete export workflows, download links and offline packaging/menu behavior. Runtime language navigation uses full hosted route reloads and the baseline shared autosave; transient playback/history state is not serialized. Offline locale files render independently; cross-file browser storage/navigation is not certified as portable. Indonesian/Vietnamese part labels intentionally remain the supplied baseline English names. Actual AE/CEP, Chromium 88 and embedded Node 15.9 were unavailable; modern Chrome/AE/CEP mocks are distinct evidence. Python source localization remains only for separate ExtendScript ScriptUI/host assembly, owned by tasks 09/10. No dependency changes: next browser task is **07**; task 09 is independently unblocked by task 05.
