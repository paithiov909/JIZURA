# 08 — Browser WebMCP adapter

**Depends on:** task 07; follow `docs/WEBMCP.md` and task 01's captured contract.

## Work

Port `src/13_webmcp.js` as a browser-only adapter over the typed editor API. Preserve all 18 tool names, input schemas, JSON result structure, revisions, busy errors, export job lifecycle and validation limits. Keep the supported `document.modelContext` and legacy `navigator.modelContext` registration paths and graceful behavior when neither exists. Guard CEP and engine-only pages from registration.

Keep tool IDs and argument semantics identical across all seven UI languages; only display labels should localize. Update `docs/WEBMCP.md` only for verified behavior changes that are necessary for the new build.

## Deliverable and acceptance

- The contract tests from `dev/webmcp_test.py` or their replacement pass for seven locales and unsupported/legacy API paths.
- Browser registration and at least one real tool call are checked separately from a mocked API call, when a capable browser is available.
- CEP exclusion is tested and the adapter introduces no new runtime server or API key.

**Handoff to:** task 11.
