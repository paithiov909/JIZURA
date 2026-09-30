# 10 — CEP panel and packaging

**Depends on:** tasks 07 and 09; use the format decision from task 02.

## Work

Build separate Japanese and English local CEP panels from the shared browser UI and the CEP-only adapter. Keep extension IDs, CSXS manifest requirements, `host.jsx` and `evalScript` contract, install scripts, license and third-party notices, and AE core loading. Preserve Node-assisted file export and the browser-only WebMCP guard. Package two ZIPs from ignored output; never package development `.debug` files into normal releases.

Verify relative paths under the unpacked extension, Chromium 88-compatible JavaScript/CSS, and the behavior of the MP4 muxer in CEP's mixed Node/browser environment.

## Deliverable and acceptance

- Both packages pass manifest, archive-content and CEP mock tests; panel UI and AE comp generation are exercised.
- An actual supported AE installation is used to check at least panel startup and comp generation before final cutover, with platform/AE version recorded. If unavailable in this task, keep that as a blocking item for task 13.
- The released ZIP contains only necessary runtime files, installers and notices.

**Handoff to:** task 11.
