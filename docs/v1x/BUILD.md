# v1.x build workspace

Run commands from the repository root. Use **Node 26.10.0** (`.node-version`, npm 11.19.1 checked) and **Python 3** (3.14.7 checked). The npm engine check accepts Node 26.10+ within major 26; only 26.10.0 was exercised for task 03. Native Node TypeScript stripping runs the `.mts` orchestration; `npm run typecheck` separately checks its types. Vite 8.3.1, TypeScript 7.0.2, Acorn 8.18.0 and Node types are pinned in the single root lockfile.

```sh
npm ci
npm run check
```

`check` runs the TS/config/engine typecheck, UI-free Node engine/effect and locale contract tests, all builds, output/syntax validation, source AE-port catalog comparisons, Japanese and English ScriptUI object-model mocks. No Adobe installation or browser is required for this command. Typechecking covers the migrated engine public boundaries and TS implementations, with strict effect registration/metadata/group callback contracts and explicit dynamic drawing/item slots. It does **not** cover the unconverted installer JS or ExtendScript; the ES2021 and ES3 parsers and runtime mocks are separate evidence.

| Command | Output | Format |
| --- | --- | --- |
| `npm run build` | All four targets below | Sequential builds |
| `npm run build:web` | `dist/web/` | Seven Vite HTML/ES module routes with CSS/assets and explicit classic muxer |
| `npm run build:offline` | `dist/offline/JIZURA.html`, `JIZURA_en.html`, `JIZURA_zh-hant.html`, `JIZURA_zh-hans.html`, `JIZURA_ko.html`, `JIZURA_id.html`, `JIZURA_vi.html` | One inline HTML per locale, Vite IIFE/CSS/assets/muxer |
| `npm run build:ae` | `dist/ae/JIZURA_AE.jsx`, `JIZURA_AE_en.jsx`, `ja/jizura_core.jsx`, `en/jizura_core.jsx` | Separately assembled ASCII-escaped ES3 |
| `npm run build:cep` | `dist/cep/com.852wa.jizura/`, `com.852wa.jizura.en/`, `JIZURA_CEP.zip`, `JIZURA_CEP_en.zip` | Classic local IIFE/CSS/vendor and ES3 host/core; existing installers/signing helpers |
| `npm run check:outputs` | Console report | Run after all builds; validates routes, version, resources, script syntax, both CEP host/core plan mocks |
| `npm run test:effects` | Console report | Baseline registry, source contribution example, invalid metadata/IDs, selection flags and fallback validation |
| `npm run check:effects` | `dist/task05/effect-validation.json` | Run after `build:ae`; compare declared ports with both freshly built ES3 registries |
| `npm run test:ae` | Console report | Run after `build:ae`; 87 builds per language with the baseline plan |

Every target can build independently without prebuilt tracked HTML, JSX or `ae/data.json`. The CEP command regenerates its own metadata/cores and does not need `build:ae`. `VERSION` remains the only application version source; the root package has no application version. Builds reject non-`x.y.z` versions and output validation checks propagation into each target and manifest. Outputs include project/third-party notices and muxer/Vite licenses; the standalone HTML also embeds the full muxer license. Do not commit `dist/`, npm dependencies or generated assets.

Vite uses explicit JS/CSS `chrome88` targets for web and both classic targets. `JIZURA_WEB_BASE` defaults to `/JIZURA/`; override it for another hosted path, for example `JIZURA_WEB_BASE=/ npm run build:web`. CEP and offline always use their local paths and ignore that variable. Canonical/hreflang metadata retains the baseline public URLs; `i18n/` owns the seven route descriptors. `PYTHON` can select a Python executable for the root build (`python3` by default).

Untranslated module copies and AE data live in `dist/.inputs/`; temporary IIFE bundles live in `dist/.bundles/`. `build/prepare-browser.mts` creates each target's entry, initializes an independent engine, attaches it to `window.J` for the unconverted UI, applies the runtime dictionary, then starts UI and the selected browser/CEP adapter. `INITIALIZATION_ORDER` exposes the explicit installer sequence, including the pre-pack `CORE_ORDER` capture. Web/offline/CEP, diagnostic bundles and AE metadata exporters share the module graph. Browser sources are never rewritten for translation or version substitution; project exports use `J.APP_VERSION`. `build.py` delegates historical browser/dev CLI commands to the same TypeScript preparation. `tools/export_english_labels.js` uses the runtime English metadata dictionary. AE/CEP host still use separate ES3 Python assembly until tasks 09/10. `build_cep.py` is now a packaging-only helper requiring `--panel-dir`; use `npm run build:cep` for source builds. `build.py`/`build_ae.py` retain historical output defaults that can write tracked outputs; use the root npm commands or explicit ignored output paths.

The `dev/` and spike manifests mark CommonJS/ESM boundaries only. Install dependencies once at the root; no npm workspaces, second bundler or nested dependency lockfiles are needed. Task 02's preserved spike shares the root classic config, muxer guard and one-chunk validator:

```sh
npm run spike:build
npm run spike:test
```

## Browser checks

Use an installed Chrome/Chromium, without downloading a browser or relaxing file security. Prepare the optional Python environment, then run the production-output check and task 02's original eight-case comparison:

```sh
python3 -m venv /tmp/jizura-browser-python
/tmp/jizura-browser-python/bin/pip install -r dev/cep-offline-spike/requirements.txt
/tmp/jizura-browser-python/bin/python dev/build_foundation_test.py --browser /usr/bin/google-chrome
/tmp/jizura-browser-python/bin/python dev/cep-offline-spike/browser_test.py --browser /usr/bin/google-chrome
```

Run `npm run build` before the first browser test and `npm run spike:build` before the second. The production test uses 20 cases: seven hosted routes at `/JIZURA/`, seven offline files and Japanese/English CEP with dual, mixed and absent Node APIs. It compares task 01's locale/registry/project/plan/WebMCP fixtures, checks classic startup and transfers the baseline AE plan through the production CEP bridge. Remote Google Fonts are blocked; installed fallback fonts remain usable. This suite exercises rendering; focused pixel comparisons and export-content checks are documented below. Reports live in `dist/task03-browser-results.json` and `dist/task02/`.

## Remaining distribution gates

This establishes the build foundation. Browser/CEP entries use the shared typed editor bootstrap and runtime dictionaries. The preserved UI/service algorithms remain JavaScript modules, with typed consumer contracts and the task-07 browser/export checks below. The task-08 adapter port, broader task-11 regressions, and downloadable release assets linked from the hosted UI remain later tasks. Release files are intentionally kept in their own outputs; this task does not stage all release downloads into `dist/web/`, deploy Pages, sign/install CEP or publish a release. The inherited tracked generated files stay untouched until task 13 removes them from the final source snapshot.

No actual AE/CEP, Chromium 88 or embedded Node 15.9 runtime was exercised. Modern Chrome CEP API mocks and Node AE object-model mocks do not certify Adobe compatibility. CEP 11 WebCodecs/MP4 encoding, native dialogs and actual rendering remain deferred as recorded in task 02's decision. `dev/cep_test.py` still requires missing historical assets; use the focused checks above.

## Engine checks (task 04)

```sh
npm run test:engine
PYTHONPATH=/tmp/jizura-baseline-py python3 dev/engine_modules_test.py --browser /usr/bin/google-chrome
```

The second command's `PYTHONPATH` is the already-installed task-01 optional Python dependency directory used in this workspace; alternatively install Playwright and Pillow into your own virtual environment and use its Python. No browser download is needed. Node tests import `createEngine(version)` directly, with a font-measurement stub and no UI/global `J`; they compare project/plan fixtures, legacy timing migration, sanitation, locks/ranges and independent instance state. Compile-only examples reject invalid group, seed, text-item and AE-plan types.

The browser engine check builds a UI-free IIFE from actual modules into `dist/task04/engine/`. It constructs an immutable reference from task-01 git sources for comparison only, blocks remote fonts and resets texture randomness before rendering. Three cases compare full browser/AE plans and twelve frames (including front/back transparent layers) exactly in one Chrome/font environment. The two stored reference PNGs contain unseeded noise; their differences are reported and visually reviewed separately. Results and PNGs stay in ignored `dist/task04/`.

Historical CLI helpers now use the module graph too. For isolated generated outputs, use `python3 build.py --out dist/task04/legacy-all`, `python3 build.py --out dist/task04/legacy-cli --lang ja --dev`, or `python3 dev/build_test.py NAME --all-packs`. The pack diagnostic accepts explicit source paths and filters the registered installer sequence, rather than sorting filenames; its `dev/www/` output is ignored. `dev/webmcp_test.py --root dist/task04/legacy-all` tests fresh CLI pages and the module-only no-UI guard without replacing tracked root pages.

See [task 04](04-engine-modules.md) for the compatibility-facade removal path and recorded checks.

## Effect checks (task 05)

`effects/index.ts` owns the explicit core/pack/set stage lists. The engine consumes those
lists without naming individual packs; core initialization installs the registry first,
then registers motion/layout/decor in the original public order. `build/prepare-browser.mts` follows relative
imports and re-exports recursively, including nested TypeScript dependencies, when copying
untranslated build inputs. Diagnostic selection uses `effects/packs/*.ts` paths, for example:

```sh
python3 dev/build_test.py enter effects/packs/enter.ts
npm run typecheck
npm run test:effects
npm run check
```

The production inventory remains 860 selectable effects and two special layouts. The
contribution example is test-only; no baseline fixtures or release assets are changed.
`build/check-effects.mts` validates metadata before each root build and reports declared
fallbacks. With `--ae`, it loads the built ES3 registry and compares its IDs to the explicit
source catalog, without running the AE UI or rendering. See [the contribution contract](../EXPRESSION_PACKS.md)
and [task 05](05-effect-modules.md) for recorded verification and remaining dynamic slots.


## Locale checks (task 06)

```sh
npm run check:i18n
npm run test:i18n
npm run test:i18n:source
PYTHONPATH=/tmp/jizura-baseline-py python3 dev/i18n_test.py --browser /usr/bin/google-chrome
```

The first two are included in `npm run check`; every root build also runs the missing-key/caller/catalog validator. The focused GitHub Actions workflow validates dictionaries and types on integration pushes/PRs, with no deployment. The optional source comparison needs the integration-base git object; it is excluded from clean-checkout gates. The browser check needs completed web/offline builds, verifies 14 locale pages against captured static DOM and seven hosted language-menu transitions, and writes `dist/task06-browser-results.json`. Its route transitions preserve pending lyric edits, full project data, volume and mode. Per-file offline startup/localization is verified separately; portable cross-file storage/menu navigation remains an offline packaging concern for tasks 07/11.

See [the locale contribution instructions](../../i18n/README.md) and [task 06](06-browser-i18n.md) for provenance, checks and remaining boundaries.

## Editor checks (task 07)

```sh
npm run typecheck
npm run check
PYTHONPATH=/tmp/jizura-baseline-py npm run test:editor:browser
```

The optional Python path above is this workspace's Playwright/Pillow installation;
use your own virtual environment on a clean checkout. The focused browser suite
also needs installed Chrome, ffmpeg/ffprobe and a local TTF. For other paths, run
`python3 dev/editor_test.py --browser PATH --font PATH`. No downloaded browser or
font is bundled with the source.

`ui/application.ts` initializes `ui/editor.js` for all targets. Authored HTML/CSS
live in `ui/`; font/audio/export implementations live in `ui/services/`.
`ui/types.ts` and `ui/services/types.ts` are strict public consumer boundaries;
the preserved JavaScript internals and renderer/item dynamic slots are not claimed
to be fully TypeScript-checked. The compile-only task-08 consumer in `tests/ui/`
rejects invalid modes, export families, cut groups, times and project versions.
See [the editor API](../../ui/README.md).

The browser suite runs representative hosted Japanese and local-file English
projects through actual file input, editor/preview/history/lock/timing operations,
font and audio upload, localStorage/IndexedDB reload, JSON and AE v2 outputs, LRC,
MP4, opaque/transparent/layered PNG ZIP, cancellation, visible missing-font and
codec errors, and reset confirmation. ffprobe and ffmpeg verify MP4 frames, size,
fps, duration, audio and full decoding; Pillow/zipfile verify PNG names, count,
CRC and alpha. Opus's companion PCM WAV and user-facing fallback copy are checked.
The seven offline sibling-file language-menu transitions also pass. Results,
actual downloads and UI screenshots live in ignored `dist/task07/`.

Direct-to-file MP4 uses an actual hosted OPFS writable stream behind a mocked
picker. Chrome 154 disallows that OPFS test backend at `file:`; its visible error
is recorded without claiming anything about the native offline save dialog.
Native OS picker interaction, real Adobe/CEP, embedded Chromium 88/Node 15.9,
and cross-file persistence guarantees in other browsers remain unverified.
See [task 07's handoff](07-browser-editor.md#result--2026-09-30).
