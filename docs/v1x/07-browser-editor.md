# 07 — Browser editor and export

**Depends on:** tasks 04, 05 and 06. Preserve the `codex/webmcp` behavior, not the older `main` UI.

## Work

Move the editor UI, styles and browser services to the Vite entry points. Retain simple/advanced/mobile modes, lyrics and timing, cut editing, history, styles, fonts, audio, preview, persistence, JSON import/export, AE-plan export, and MP4/PNG output variants. Produce the Pages site and the tested offline distribution from the same source. Keep the current route and local-file behavior established in task 02.

Expose a typed editor application API for task 08. Do not bind WebMCP directly to DOM implementation details if an existing UI operation can be called through the same application path.

## Deliverable and acceptance

- Browser interaction checks cover a representative project from input through preview, save/load and every export family.
- Output file contents and naming remain compatible where task 01 defines them; supported degradation for codecs/fonts stays visible to users.
- Hosted and offline startup both work. Task 08 can call editor operations without duplicating mutation logic.

**Handoff to:** tasks 08 and 10.

## Result — 2026-09-30

Integration base: `6a8a3644a6000fac6fa672800dabbed99bc6dc17` (accepted task 06).
Task branch: `codex/v1x-07-browser-editor`.

### Changes and decisions

- Authored editor HTML/CSS moved from `app/` to `ui/`; editor implementation moved from `src/12_ui.js` to `ui/editor.js`. Font, audio/storage and browser export implementations moved to `ui/services/`. Engine initialization retains its exact stage order and per-instance service installation, including the existing Node metadata and CEP consumers. No generated HTML, JSX, ZIP, dependency or reference fixture is changed.
- `ui/application.ts` is the shared typed Pages/offline/CEP bootstrap. `ui/types.ts`, `ui/editor.d.ts` and `ui/services/types.ts` define the editor operations, detached state snapshots, export jobs and browser services. `window.jizuraApp.editor` is the same object as the retained `J.uiApi.editor`; mutations, history, persistence, replanning and user-activation timing are not duplicated. `tests/ui/types.ts` demonstrates task-08 usage and rejects invalid inputs at compile time.
- Offline language navigation now uses the actual seven sibling distribution filenames. Hosted routes, canonical/hreflang metadata and historical folder-based CLI links remain compatible. `build/prepare-browser.mts` selects this explicit offline option; it uses the same source graph for all targets.
- `dev/editor_test.py` and `test:editor:browser` add actual editor/file/export-content evidence. The i18n validator and optional reference-source comparison follow the new source locations. API instructions are in [ui/README.md](../../ui/README.md); [BUILD.md](BUILD.md) records repeatable checks; the WebMCP document's source pointer follows the move without changing the tool contract.
- Validated implementation decision: preserve the JavaScript UI/service algorithms behind strict TypeScript consumer declarations rather than simultaneously rewriting 2,800+ lines of editor/codec/font code. This is not a claim that those internals are fully typechecked. The renderer/item dynamic slots and compatibility `window.J` bootstrap remain available for the existing adapter/CEP consumers; task 08 ports the adapter over the typed API. Dependency order and acceptance criteria are unchanged.

### Checks actually run

Environment: Linux, Node 26.10.0, Python 3.14.7, Chrome 154.0.8037.92. Playwright/Pillow were reused from `/tmp/jizura-baseline-py`; remote Google Fonts were blocked. Real local DejaVu Sans TTF upload and 48 kHz PCM audio input were exercised.

| Command / evidence | Actual result |
| --- | --- |
| `npm run check` | Passed: typecheck, 6 locale/9 engine/6 effect contract tests, all four builds, ES2021/ES3 output parsing, both declared AE-port comparisons, both CEP host/core fixture mocks and both AE model suites. Each AE language passed 87 builds with zero fixture fallbacks, unknown match names, expression syntax errors, problems or warnings. |
| `npm run typecheck`; `npm run test:i18n`; `python3 -m py_compile dev/editor_test.py` | Final focused checks passed, including the new valid/invalid task-08 consumer and declaration overloads. These were rerun after the initial aggregate check. |
| `npm run build:offline`; `npm run check:outputs` | Passed after the offline menu correction; all 7 web/7 offline/4 AE/2 CEP outputs and both core mocks remain valid. |
| `npm run test:i18n:source` | 1,025 localized function AST comparisons passed against immutable pre-i18n sources. Source relocation did not change editor/export algorithms. |
| `PYTHONPATH=/tmp/jizura-baseline-py python3 dev/build_foundation_test.py` | All 20 production cases passed: 7 hosted routes, 7 offline files, 2 CEP languages × 3 Node modes. Registry, locales, project/plan/AE/WebMCP fixtures and CEP transfers preserved. CEP APIs are mocked. |
| `PYTHONPATH=/tmp/jizura-baseline-py python3 dev/i18n_test.py` | All 21 locale/display/hosted-navigation cases passed, preserving pending edits and mode/volume state. |
| `PYTHONPATH=/tmp/jizura-baseline-py python3 dev/engine_modules_test.py` | 3 full browser/AE plan comparisons and 12 controlled frames, including transparent front/back layers, match task-01 source exactly. |
| `PYTHONPATH=/tmp/jizura-baseline-py python3 dev/editor_test.py` | Hosted Japanese and file-based English passed real JSON file input/save, AE v2 serialization, lyric/timing/cut edits, locks/randomization, edit/look histories, preview, all 3 modes, uploaded font/audio restoration and project/AE plan reload equivalence. LRC naming/content, actual MP4/PNG outputs, cancellation, missing-font errors, codec-unavailable copy and reset confirmation passed. All 7 offline language-menu transitions passed. |
| Export-content inspection inside the editor suite | Each regular MP4 is H.264, 1280×720, 24 fps, 6 decoded frames/0.25 s, with a decoded Opus audio track. The visible Opus fallback and companion mono 16-bit/48 kHz WAV naming, ranged duration and non-silent samples passed. PNG ZIPs have 6 opaque or alpha entries, or 12 entries in ordered `back/` and `front/` folders; names/dimensions/CRC/alpha passed. Hosted direct-to-file MP4 also decoded successfully using a real OPFS writable stream behind a mocked picker. |
| `git diff --cached --check` | Passed; the staged snapshot contains only source, types, tests and documentation. |
| Visual/source review | Hosted/offline screenshots were inspected. HTML/CSS and audio/font implementations retain the previous source; UI/export changes are initialization/import wiring. No baseline layout or algorithm regression was observed. |

Reports and actual downloads/screenshots remain ignored under `dist/task07/`, `dist/task03-browser-results.json`, `dist/task06-browser-results.json` and `dist/task04/engine-browser-results.json`. Console logs are `/tmp/jizura-task07-*.log`. Browser/local-server and build child-process checks required the permitted elevated execution route.

### Remaining boundaries and next tasks

Native OS save-dialog interaction is unverified. Chrome 154 rejects OPFS at `file:`; the direct-save test's offline mock backend therefore produced a correctly visible picker error. This does not establish the native offline picker's availability; ordinary offline MP4/PNG/JSON/LRC downloads passed. Cross-file localStorage/IndexedDB behavior in other browsers, broader codec/device/font combinations and long/high-resolution exports remain task-11 regression concerns.

No actual After Effects/CEP installation, embedded Chromium 88/Node 15.9, Adobe rendering, signing or installation was tested. An actual supported Adobe runtime is still required for those gates, deferred under the existing task-02 decision. Syntax, AE model mocks and modern-Chrome CEP mocks are separate evidence.

Next: **task 08**, preserving all 18 WebMCP tools over `EditorAPI`; **task 10** can consume the shared editor/CEP hooks after task 09. Keep release-asset staging, publication, orphan cutover and default-branch changes in their assigned later tasks.
