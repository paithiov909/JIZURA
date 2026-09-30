# 11 — Cross-target regression verification

**Depends on:** tasks 08, 09 and 10.

## Work

Run the task 01 contract against clean web, offline, ScriptUI and CEP builds. Cover seven locale routes, stable JSON and effect IDs, fixed-seed plans, representative frames, browser export types, WebMCP calls, AE ES3 parsing and mock construction, CEP packaging and mock bridge. Record test environment, commands, pass/fail counts and known differences in a concise verification report. Fix regressions in the owning source area and repeat only affected checks plus the final required gate.

Prepare a real-AE checklist for Windows/macOS as available: ScriptUI load, CEP panel load, plan import, comp generation, a saved project round-trip and a representative export. Record versions and failures, not just a yes/no result.

## Deliverable and acceptance

- A reproducible verification report maps every compatibility gate in `README.md` to evidence or an explicit outstanding blocker.
- No untriaged test failure remains. Actual-AE checks required for task 13 are complete or clearly marked pending.
- A clean checkout builds all targets without tracked-output changes.

**Handoff to:** tasks 12 and 13.
