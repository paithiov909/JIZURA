# JIZURA v1.x compatibility contract — baseline 1

Source baseline: `codex/webmcp` commit `d217fb0a06d0f81bc31f8b31b9646c30dc540f82`, application version `0.10.0`. This document and `tests/baseline/v1/` record the behavior to preserve during tasks 02–11. The fixture capture runs against the generated pages but does not edit them as source.

## Reproduce and compare

From the repository root, with Python 3, Node, and `/usr/bin/google-chrome` installed:

```sh
python3 build.py
python3 dev/baseline_capture.py --check
```

`--check` compares JSON fixtures byte for byte. It checks all seven editions' WebMCP tool definitions against Japanese in memory. Capture new fixtures deliberately with `python3 dev/baseline_capture.py` only after reviewing a contract change. The capture script uses a temporary copy of each generated page, injects a registration mock, and asks headless Chrome to evaluate the real engine. It also imports each project through the editor and captures the actual saved-project serialization. The generated root HTML and sitemap are build outputs; do not commit them. `tests/baseline/v1/ae-implementations.json` inventories the effective AE registry after loading the generated Japanese ES3 bundle in a bare Node VM; it includes registrations made by loops.

| Fixture | Contract |
| --- | --- |
| `locales.json` | Routes, canonical and alternate URLs, `html lang`, sample lyrics, style/mood names, representative effect names, selected visible labels |
| `registry.json` | Ordered browser IDs, group, pack, Japanese name, declared AE counterpart, style order, font IDs |
| `ae-implementations.json` | Effective AE implementation IDs in registration order, including dynamically registered core entries |
| `webmcp.json` | Exact 18 tool names, input schemas, and annotations |
| `*-project.json` | Saved project version 1, fixed seed, lyrics, settings and enabled map |
| `*-plan-summary.json` | Fixed-seed browser planning: line/cut indices, timing, chosen IDs, and cut seeds |
| `lrc-ja-ae-plan.json` | Full AE export plan version 2, including text, timing, IDs, params, font table, dimensions |
| `lrc-ja-frame*.png` | Two 480×270 rendered reference frames at 1.2 and 3.2 seconds |

The `lrc-ja` case uses seed 42, 16:9, LRC tags, manual slash splitting, emphasis, an interlude, and a note. The `portrait-en` case uses seed 7, 9:16, English words, and manual splitting. Both use `bpm=0`, `offset=0`, `snap=false`, `tail=0.5`, and no audio. `projectData(false)` adds `appVersion`; the AE fixture comes from `J.planForAE` and has `version: 2`.

## Browser and editor

Seven edition routes are `/`, `/en/`, `/zh-hant/`, `/zh-hans/`, `/ko/`, `/id/`, `/vi/` under `https://852wa.github.io/JIZURA/`. The `id` page uses `html lang="id-ID"`; the other pages use `ja`, `en`, `zh-Hant`, `zh-Hans`, `ko`, and `vi`. Every page carries a self canonical URL and seven `hreflang` alternates. Locale data records translated sample lyrics, styles, moods, and representative visible labels. The browser engine IDs and WebMCP schemas remain language independent.

The editor has easy, pro, and mobile modes; lyrics/LRC input; title and artist; audio file upload, analysis and tap sync; line timing and cut edits; palette, font file and local font settings; effect switches and locks; seed, aspect, resolution, fps and output range; preview, history, randomization and reset. Projects can be opened/saved as JSON and exported as AE plans. Export controls provide MP4, direct-to-file MP4, PNG sequence ZIP, transparent PNG ZIP, separate front/back transparent PNG ZIP, and LRC. Audio inclusion, font substitution, WebCodecs support and save dialogs depend on the runtime. The offline single HTML edition must continue to open through `file:`; task 02 verifies its target packaging.

`src/08_planner.js` defines project version 1 and the default structure. `src/11_export.js` changes AE exports to version 2 and adds output dimensions, fonts, and set switches. The saved JSON uses zero-based `overrides` and cut indexes. The WebMCP surface uses one-based line/cut/source-row and range references and requires a fresh `revision` for targeted edits. Unknown IDs, fields and stale revisions are errors; importing a project may fill omitted enabled entries as true. Preserve the shapes of both fixture JSON files and round-trip behavior, including existing overrides, timing, and locked cuts.

The ordered registry currently has 184 layouts, 125 entrances, 52 holds, 109 exits, 130 decorations, 62 treatments, 66 backgrounds, 36 cameras, 69 effects, and 27 transitions, plus 27 styles and 23 font keys. Preserve stable IDs and ordering, not just counts. `J.register` stores group, key, definition, and pack; `J.order` defines pick order. `registry.json` is the canonical list. The AE runtime registry is separate. At this baseline all 860 ordered browser effect IDs have direct AE registrations; the AE registry has two additional special layouts (`title` and `interlude`). The `ae` field in `registry.json` is a declared compatibility counterpart, not a measure of direct AE coverage. The AE mock built the included AE plan with zero fallbacks; future effects and other plans still need checking.

## WebMCP

The browser registers 18 tools: `get_state`, `list_options`, `set_lyrics`, `update_settings`, `set_timing`, `edit_line`, `edit_cut`, `set_techniques`, `set_locks`, `randomize`, `history`, `preview`, `tap_sync`, `project`, `start_export`, `get_export_status`, `cancel_export`, and `reset_project`, all prefixed `jizura_`. `webmcp.json` has the full schemas. The adapter prefers `document.modelContext`, falls back to `navigator.modelContext`, and is excluded from CEP and engine-only pages. Results are JSON strings with `ok` and either data or `error.code/message`. Key error behavior includes `invalid_input`, `stale_revision`, `busy`, `cancelled`, and `operation_failed`. Exports have `running`, `completed`, `cancelled`, `failed`, or `save_declined` states; `download_started` is not proof of a saved file. `mp4file` and reset require a user action. See `docs/WEBMCP.md` for interaction rules and `dev/webmcp_test.py` for the existing behavioral suite.

## AE and CEP

`build_ae.py` assembles ES3 ScriptUI panels in Japanese and English from `ae/*.jsx` and `ae/data.json`. `build_cep.py` embeds the browser page and `cep/cep.js`, builds `host.jsx` and a core AE script, and packages Japanese/English extension IDs `com.852wa.jizura` and `com.852wa.jizura.en`. The manifest declares AE 22.0–99.9 and CSXS 11.0, with local `index.html` and Node enabled. CEP is Japanese/English; the browser has seven editions. Both distribution builds must remain separate from browser syntax tests. An actual supported After Effects/CEP installation is needed to verify ScriptUI behavior, rendering, extension loading, and the host bridge.

## Comparison rules

- Compare locale routes, canonical/hreflang URLs, WebMCP names and schemas, ordered IDs, save format, AE plan version and fields, and deterministic cut selections/timing exactly. Treat seed as a complete input only with the same lyrics, settings, registry order, and planner history. A changed `appVersion` is expected only for an intentional release version change.
- Compare the reference PNGs visually at the same times and design dimensions. Pixel equality is meaningful only with the same Chrome, OS font set, font loading, device scale, and Canvas implementation. With different installed fonts or unavailable Google Fonts, judge composition, visible text, colors, and motion; record the font environment before accepting a difference.
- MP4 bytes, codec labels, hardware/software path, muxing and performance depend on WebCodecs and the installed browser. Compare decoded duration, dimensions, fps, frame content, audio presence/sync, and export job behavior. ZIP entry structure and PNG transparency/layer semantics are contract targets; compressed bytes need not match.
- AE mock checks show parser/model behavior but do not establish actual AE support. CEP browser mocks do not establish host installation support. Record each evidence type separately.

## Baseline evidence and gaps (2026-09-30)

Environment: Linux, Python 3.14.7, Node 26.10.0, `/usr/bin/google-chrome` 154.0.8037.92 (headless). `python3 build.py` generated all seven pages. `python3 dev/baseline_capture.py` and `--check` succeeded; Chrome mock registration found 18 matching tools in each edition, both fixed-seed plans and the project import/save path succeeded, and both reference frames rendered. Five `tools/check_i18n.py` runs and seven `tools/check_page_js.py` runs succeeded. Japanese `build_ae.py` and Japanese `build_cep.py` succeeded. Node syntax parsing of the Japanese AE output after removing the ExtendScript `#target` directive succeeded. After installing `acorn` from the local npm cache, `node dev/ae_test.js tests/baseline/v1/lrc-ja-ae-plan.json` passed: 87 mock builds, one fixture plan with zero fallbacks, zero unknown match names, expression syntax errors, problems, or warnings. This is an ES3 parser/mock result, not a real AE run. With Playwright and Pillow isolated in `/tmp`, `dev/webmcp_test.py --browser /usr/bin/google-chrome` passed: 18 tools, editing/import/export cases, seven editions, CEP guard, and native Chrome discovery/call. The test downloaded real MP4 and PNG variants, but it did not test the OS save dialog.

**Existing baseline failure:** English `build_ae.py` fails in `tools/export_english_labels.js`: it loads `src/13_webmcp.js` in a VM whose document lacks `getElementById`, causing `TypeError: document.getElementById is not a function`. English `build_cep.py` fails for the same reason while invoking the English core build. Preserve this failure in regression reporting until a focused implementation task fixes it. `dev/cep_test.py` was not runnable as checked in: its required `aerender.js` and `cepx_song.wav` assets are absent from `dev/`. No actual AE/CEP installation was available. The Chrome fixture capture uses a registration mock; live WebMCP discovery and export behavior are evidenced separately by `dev/webmcp_test.py`.
