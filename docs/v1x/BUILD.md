# v1.x build workspace

Run commands from the repository root. Use **Node 26.10.0** (`.node-version`, npm 11.19.1 checked) and **Python 3** (3.14.7 checked). The npm engine check accepts Node 26.10+ within major 26; only 26.10.0 was exercised for task 03. Native Node TypeScript stripping runs the `.mts` orchestration; `npm run typecheck` separately checks its types. Vite 8.3.1, TypeScript 7.0.2, Acorn 8.18.0 and Node types are pinned in the single root lockfile.

```sh
npm ci
npm run check
```

`check` runs the new TS/config typecheck, all builds, output/syntax validation, Japanese and English ScriptUI object-model mocks. No Adobe installation or browser is required for this command. Typechecking does **not** cover the unconverted legacy JS or ExtendScript; the ES2021 and ES3 parsers and runtime mocks are separate evidence.

| Command | Output | Format |
| --- | --- | --- |
| `npm run build` | All four targets below | Sequential builds |
| `npm run build:web` | `dist/web/` | Seven Vite HTML/ES module routes with CSS/assets and explicit classic muxer |
| `npm run build:offline` | `dist/offline/JIZURA.html`, `JIZURA_en.html`, `JIZURA_zh-hant.html`, `JIZURA_zh-hans.html`, `JIZURA_ko.html`, `JIZURA_id.html`, `JIZURA_vi.html` | One inline HTML per locale, Vite IIFE/CSS/assets/muxer |
| `npm run build:ae` | `dist/ae/JIZURA_AE.jsx`, `JIZURA_AE_en.jsx`, `ja/jizura_core.jsx`, `en/jizura_core.jsx` | Separately assembled ASCII-escaped ES3 |
| `npm run build:cep` | `dist/cep/com.852wa.jizura/`, `com.852wa.jizura.en/`, `JIZURA_CEP.zip`, `JIZURA_CEP_en.zip` | Classic local IIFE/CSS/vendor and ES3 host/core; existing installers/signing helpers |
| `npm run check:outputs` | Console report | Run after all builds; validates routes, version, resources, script syntax, both CEP host/core plan mocks |
| `npm run test:ae` | Console report | Run after `build:ae`; 87 builds per language with the baseline plan |

Every target can build independently without prebuilt tracked HTML, JSX or `ae/data.json`. The CEP command regenerates its own metadata/cores and does not need `build:ae`. `VERSION` remains the only application version source; the root package has no application version. Builds reject non-`x.y.z` versions and output validation checks propagation into each target and manifest. Outputs include project/third-party notices and muxer/Vite licenses; the standalone HTML also embeds the full muxer license. Do not commit `dist/`, npm dependencies or generated assets.

Vite uses explicit JS/CSS `chrome88` targets for web and both classic targets. `JIZURA_WEB_BASE` defaults to `/JIZURA/`; override it for another hosted path, for example `JIZURA_WEB_BASE=/ npm run build:web`. CEP and offline always use their local paths and ignore that variable. Canonical/hreflang metadata retains the baseline public URLs until the locale service is migrated. `PYTHON` can select a Python executable for the root build (`python3` by default).

Intermediate localized sources and AE data live in `dist/.inputs/`; temporary IIFE bundles live in `dist/.bundles/`. The legacy compatibility entry in `build/entries/legacy.ts` imports one generated lexical `J` scope. Task 04 replaces sorted-source initialization and adds engine types; task 06 replaces Python localization. AE still uses Python assembly and source metadata until task 09. `build.py --out ... --vite-input`, `build_ae.py --data ...`, `tools/export_ae_data.js --out ...` and `build_cep.py --panel-dir ... --core-source ...` are transitional adapters. Their old defaults remain available for historical tooling and can write tracked outputs; use the root npm commands for migration work.

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

Run `npm run build` before the first browser test and `npm run spike:build` before the second. The production test uses 20 cases: seven hosted routes at `/JIZURA/`, seven offline files and Japanese/English CEP with dual, mixed and absent Node APIs. It compares task 01's locale/registry/project/plan/WebMCP fixtures, checks classic startup and transfers the baseline AE plan through the production CEP bridge. Remote Google Fonts are blocked; installed fallback fonts remain usable. Rendering is exercised, but pixel comparisons and all export operations remain tasks 07/11. Reports live in `dist/task03-browser-results.json` and `dist/task02/`.

## Remaining distribution gates

This establishes the build foundation. Browser/CEP entries still use legacy algorithms and localization. Full export regression, WebMCP tool execution/native discovery, accessibility/layout parity, and downloadable assets linked from the hosted UI remain later tasks. Release files are intentionally kept in their own outputs; this task does not stage all release downloads into `dist/web/`, deploy Pages, sign/install CEP or publish a release. The inherited tracked generated files stay untouched until task 13 removes them from the final source snapshot.

No actual AE/CEP, Chromium 88 or embedded Node 15.9 runtime was exercised. Modern Chrome CEP API mocks and Node AE object-model mocks do not certify Adobe compatibility. CEP 11 WebCodecs/MP4 encoding, native dialogs and actual rendering remain deferred as recorded in task 02's decision. `dev/cep_test.py` still requires missing historical assets; use the focused checks above.
