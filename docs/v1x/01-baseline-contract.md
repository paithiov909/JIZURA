# 01 — Baseline and compatibility contract

**Start from:** `codex/webmcp` at `d217fb0a06d0f81bc31f8b31b9646c30dc540f82`. No implementation migration in this task.

## Work

Inventory the browser UI, seven locale routes, editor state, exports, effects and stable IDs, saved project JSON, AE plan v2, WebMCP's 18 tools, and Japanese/English AE and CEP distributions. Capture a small representative fixture set: lyric inputs, fixed seeds, project JSON, AE plan JSON, locale strings, and selected rendered frames. Document the exact commands and environments used to produce baseline results. Preserve intentional variability caused by installed fonts or codecs in the comparison rules.

Read `build.py`, `build_ae.py`, `build_cep.py`, `docs/EXPRESSION_PACKS.md`, `docs/WEBMCP.md`, and existing `dev/` checks. Do not use the generated root HTML/JSX/ZIP files as editable source.

## Deliverable and acceptance

- A versioned contract document and small, reviewable fixtures under test/source directories.
- Each later task can point to an expected schema, ID inventory, URL, tool signature, or behavior without guessing.
- Record which checks passed at baseline and which need a real AE installation. Baseline failures remain visible rather than being silently normalized.

**Handoff to:** task 02, and tasks 04–11 as their comparison reference.
