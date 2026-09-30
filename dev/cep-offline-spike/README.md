# Task 02: local CEP and offline feasibility spike

This is a small, isolated TypeScript/Vite package, not the task 03 root workspace or a migrated editor. It imports the production `cep/cep.js` and `src/13_webmcp.js` unchanged, with a minimal editor surface and task 01's Japanese AE plan. The generated extension contains the existing Japanese host/core and uses a separate `com.852wa.jizura.spike` ID. Nothing is installed into Adobe directories.

From the repository root:

```sh
npm --prefix dev/cep-offline-spike ci --ignore-scripts
npm --prefix dev/cep-offline-spike run typecheck
npm --prefix dev/cep-offline-spike run build
npm --prefix dev/cep-offline-spike run test:node
python3 -m venv /tmp/jizura-task02-python
/tmp/jizura-task02-python/bin/pip install -r dev/cep-offline-spike/requirements.txt
/tmp/jizura-task02-python/bin/python dev/cep-offline-spike/browser_test.py --browser /usr/bin/google-chrome
```

Use Node >=22.12, Python and an installed Chrome/Chromium; the checked environment is recorded in [the decision record](../../docs/v1x/CEP-OFFLINE-DECISION.md). No downloaded browser is required. Pass the installed browser path explicitly on another OS.

All outputs and raw results go into ignored `dist/task02/`:

- `vite-default/` and `vite-chrome88/`: normal Vite HTML/ES module builds for comparison.
- `cep/com.852wa.jizura.spike/`: local classic IIFE, CSS, vendor, manifest and Japanese ES3 host/core.
- `offline/JIZURA-spike.html`: one HTML file with inline classic JS, CSS, image and muxer.
- `node-results.json`, `browser-results.json`, and browser screenshots: verification evidence.

The browser suite has eight cases: two HTTP controls, two expected `file:` failures, three local CEP API mocks (dual Node, mixed Node, no Node), and the single-file offline build. HTTP controls use a temporary loopback server; CEP/offline cases block all HTTP(S) requests and assert none occur. No browser security flags are relaxed.

The actual CEP bridge handles connection, file/string plan transfer, audio file bytes, binary save and save cancellation. Audio decoding and AE comp creation are mocked in the browser. Separately, the Node suite runs the production ES3 host/core through the existing AE object-model mock, checks native filesystem/Buffer use, and tests the muxer global/CommonJS guard. Muxer tests use a synthetic AVC chunk and verify container creation; they do not certify decodable video or WebCodecs support.

The WebMCP production adapter is intentionally included in this spike to prove its CEP guard: zero registrations in CEP, 18 registrations with a mock modelContext in browser/offline controls. Tool execution is outside this spike. Task 08 will keep WebMCP out of the production CEP entry.

No actual AE, CEP 11, Chromium 88 or CEP's embedded Node 15.9 runtime is tested. These mocks and syntax checks must not be reported as an Adobe runtime pass. Existing English core build failures remain assigned to later migration tasks.
