# 02 — CEP and offline build feasibility

**Depends on:** task 01. Keep this a bounded proof of compatibility, not a full editor rewrite.

## Work

Build a tiny TypeScript/Vite panel entry that loads from a local CEP extension, calls `evalScript`, and exercises the Node file bridge used by `cep/cep.js`. Test against the minimum supported AE/CEP runtime or, when actual AE is unavailable, run the CEP mock and record that limitation. Test the MP4 muxer global/Node interaction separately. Build a browser offline artifact and open it via `file:`; confirm that its JavaScript, CSS, and assets load without an HTTP server.

Compare Vite's normal output, an explicit Chromium 88 target, and a classic single-bundle target as needed. Keep Pages-specific asset paths out of CEP and offline artifacts. Confirm that WebMCP does not register in the CEP context.

## Deliverable and acceptance

- A short decision record naming the tested target formats, observed results, and selected web/CEP/offline outputs.
- A repeatable spike or focused test that demonstrates local loading, bridge calls, and offline startup.
- If Vite cannot directly emit the required CEP format, specify the smallest compatible packaging step; do not weaken the compatibility gate.

**Handoff to:** task 03.

## Result — 2026-09-30

The bounded spike and eight browser cases passed; the two normal Vite `file:` cases deliberately assert the observed CORS failure. Adopt normal Vite HTML/ES modules for hosted web, Chrome 88 Vite library IIFE plus local files for CEP, and a single HTML with inline IIFE/CSS/assets for offline. See [CEP-OFFLINE-DECISION.md](CEP-OFFLINE-DECISION.md) for exact results, commands and remaining gaps, and `dev/cep-offline-spike/` for repeatable source/tests.

Actual AE/CEP runs are deferred per the user's instruction because no AE subscription/installation is available. Browser CEP API mocks, Node filesystem/muxer checks and production ES3 host/core object-model mocks are recorded separately. They satisfy this task's mock allowance and permit task 03 to proceed; they do not certify a supported Adobe runtime.
