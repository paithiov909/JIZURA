# Task 02 — CEP and offline output decision

Date: 2026-09-30. Integration base: `a24f557dc5263c20ef06cee960dbc42148a1a249` (task 01). Task branch: `codex/v1x-task02-cep-offline`.

## Decision

Use Vite for all browser-side bundles, with separate entries and output directories:

| Target | Selected output | Packaging |
| --- | --- | --- |
| Web / Pages | Normal Vite HTML, ES module JS and asset files; explicit `target: 'chrome88'` and `cssTarget: 'chrome88'` | Apply the deployment base only to this target; preserve the seven locale routes in task 06 |
| CEP | Vite library mode, `formats: ['iife']`, Chromium 88 target; classic local script and CSS files | Small HTML wrapper, local muxer plus its CommonJS/global guard, existing manifest and separate ES3 host/core |
| Browser offline | Same Chromium 88 IIFE, inline into a single downloadable HTML | Inline JS, CSS, image/data assets and muxer; no external modules, runtime fetches or HTTP server for startup |

Vite directly produces the required IIFE. No second bundler, legacy plugin, ESM loader or change to browser security settings is needed. Normal Vite HTML output is unsuitable for the tested local-file startup even with a relative base and older syntax target. The smallest extra step is HTML assembly: reference classic JS/local CSS for CEP; embed those bytes for offline. Use replacement callbacks when inserting bundle text (JavaScript's `$` replacement tokens must remain literal). Check that the IIFE contains one chunk without imports or dynamic imports and that assets are embedded or local.

These are feasibility results for a tiny panel, not evidence that the complete migrated editor, all exports, or all seven localized distributions work. Pages' explicit target avoids carrying the tested default's newer syntax into shared source; task 07 still tests full browser behavior and feature detection. CEP/offline must be built and verified separately.

## Observed results

Environment: Linux; Node `26.10.0`; npm `11.19.1`; Python `3.14.7`; Playwright `1.63.0`; installed Google Chrome `154.0.8037.92`. The isolated package pins Vite `8.3.1`, TypeScript `7.0.2` and Acorn `8.18.0` with a lockfile. Vite's inspected default targets were Chrome/Edge 111, Firefox 114, Safari/iOS 16.4.

| Format / evidence | Observed result |
| --- | --- |
| Normal Vite HTML, `base: './'`, default target, HTTP control | JS, CSS and external SVG loaded; mock modelContext registered 18 production WebMCP definitions |
| Normal Vite HTML, `base: './'`, default target, `file:` | Expected failure: module JS and `crossorigin` CSS rejected by Chrome CORS; no startup |
| Normal Vite HTML, relative base, explicit Chrome 88, HTTP control | Startup and assets passed; 18 definitions registered |
| Same explicit Chrome 88 HTML via `file:` | Same expected CORS failure; lowering syntax does not fix local loading |
| Classic Chrome 88 CEP via `file:`, dual/mixed/no-Node API mocks | All three started with local CSS/image/vendor, zero HTTP requests and zero WebMCP registrations; real `cep/cep.js` connected via evalScript, transferred the unchanged 8-cut fixture, and finished the mocked step loop |
| CEP mock file bridge | Dual/mixed modes read song bytes through fs into a browser File, transferred the plan via a temporary UTF-8 file, saved exact binary bytes and respected save cancellation; no-Node mode used encoded-string transfer and browser save fallback |
| Single HTML offline via `file:` | JS, CSS, embedded image and muxer loaded with zero HTTP requests; 18 WebMCP definitions registered through the same mock modelContext |
| Output syntax comparison | Default retains the static-block probe; Chrome 88 module/IIFE outputs lower it. Classic panel/vendor/guard parse as ES2021 scripts; panel has no import.meta. This is syntax evidence, not a Chromium 88 runtime test |
| Separate MP4 muxer / Node VM | Browser-global, mixed CommonJS/global and Node-only CommonJS + guard all expose Muxer and produce a 640-byte container from a synthetic AVC sample. This checks muxing/global lookup, not real video encoding or playback |
| Production host/core / Node AE model mock | Both parse as ES3. File and encoded-string transfers each built the baseline 8 cuts with zero fallbacks, unknown match names, expression syntax errors or model problems. Native filesystem cleanup and cross-realm typed-array to Node Buffer save passed |

The eight-case browser test passes only when both ES module `file:` cases fail for the expected CORS reason and all selected output cases succeed. Hosted controls distinguish packaging failure from a broken TS entry. Browser and Node API mocks are separate from the Node host/core object-model check.

## Checks actually run

From the repository root, the equivalent repeatable commands are:

```sh
npm --prefix dev/cep-offline-spike ci --ignore-scripts --cache /tmp/jizura-task02-npm-cache
npm --prefix dev/cep-offline-spike run typecheck
npm --prefix dev/cep-offline-spike run build
npm --prefix dev/cep-offline-spike run test:node
PYTHONPATH=/tmp/jizura-playwright python3 dev/cep-offline-spike/browser_test.py --browser /usr/bin/google-chrome
python3 -m py_compile dev/cep-offline-spike/browser_test.py
git diff --check
```

`npm ci`, TS typecheck, all four spike builds, the focused Node checks and all eight browser cases passed. Typecheck covers the tiny TS surface; it does not typecheck the unchanged legacy JS modules. `build` invokes the existing Japanese `build_ae.py --core --lang ja` with an explicit ignored output path. Raw results and screenshots are under `dist/task02/`; only this concise result and source/lockfile are committed. [Spike instructions](../../dev/cep-offline-spike/README.md) also document Python dependency installation for a fresh environment.

## Remaining compatibility gaps

- Per the user's 2026-09-30 instruction, no actual AE run is attempted while an AE subscription/installation is unavailable. This task explicitly permits mocks, so task 03 and later implementation work can proceed. Actual AE/CEP installation, ExtendScript behavior/rendering and native save dialogs remain unverified; record them as deferred in later verification/cutover handoffs.
- Chromium 88 / CEP 11's Node 15.9 have not been run. A configured build target and parser check do not prove that every runtime API or full-editor CSS is supported. The spike ships no npm/Node dependencies inside CEP.
- Muxing is separate from encoding: Chromium 88 predates the standard Chrome 94 WebCodecs rollout. Given the existing exporter's `VideoEncoder` dependency, CEP 11 MP4 encoding is not established by the muxer test. Preserve the existing capability checks and fallback/error behavior; do not infer a VideoEncoder implementation from the global muxer being present. Modern browser exports remain covered by the baseline and later task 07/11 checks.
- This generated extension uses the Japanese core. Full Japanese/English CEP distributions are task 10; task 01's English core build failure is unchanged and remains for task 09/10. The missing `aerender.js` / `cepx_song.wav` dependencies of legacy `dev/cep_test.py` remain unchanged; the focused spike has neither dependency.
- Full editor offline operation, optional remote fonts and all exports await tasks 07/11. The startup proof covers only this deliberately small source/assets fixture.

## Handoff

Changed source: `.gitignore` and `dev/cep-offline-spike/` (TS entry, CSS/image/HTML source, Vite build script, guard, focused Node/browser tests, manifests for development dependencies and instructions). Changed migration docs: this decision record, task 02 result, task 03 output requirements and README status. Production bridge, WebMCP, AE, schemas, effect IDs and all tracked generated application outputs are unchanged.

Next dependent task: **03 — TypeScript and Vite build foundation**. Move the proven output strategy into the root workspace, consolidate development dependencies, keep AE ES3 separate, and build all targets into ignored directories. No dependency order is changed. Task 10/11 must retain the actual-runtime gap even when mock checks pass.

## Primary references

- [Adobe CEP 11.1 cookbook](https://github.com/Adobe-CEP/CEP-Resources/blob/master/CEP_11.x/Documentation/CEP%2011.1%20HTML%20Extension%20Cookbook.md): Chromium 88, Node 15.9, Node globals and local extension resources. The repository manifest retains AE >=22.0 / CSXS 11.
- [Vite build options](https://v8.vite.dev/config/build-options): target selection and library IIFE output; [relative base](https://vite.dev/guide/build.html#relative-base) describes relative URLs, not a guarantee of module loading via file URLs.
- [Chrome 94 WebCodecs announcement](https://developer.chrome.com/blog/new-in-chrome-94): separates runtime encoding availability from successful MP4 muxing.
