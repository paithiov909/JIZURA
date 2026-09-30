# 05 — Modular effects and contribution contract

**Depends on:** task 04; use task 01's ID and order inventory.

## Work

Move the existing `src/11p_*.js` packs and core effects into typed modules with explicit registration. Keep the existing groups, IDs, ordering, tags, weights, pack and set flags, and selection rules. Define one source-level registration contract for a new pack, including metadata consumed by UI, browser rendering, plan export and AE mapping. Update `docs/EXPRESSION_PACKS.md` for the new paths and commands.

Do not introduce runtime downloading or arbitrary third-party plugins as part of this task. A new effect is a source module included in a build. For effects without a matching AE implementation, require a declared fallback and surface it in validation.

## Deliverable and acceptance

- The complete baseline registry matches task 01 in IDs and ordering; fixed-seed selection tests stay stable.
- A small sample pack is added through the documented API without edits to engine core files, then either retained as a useful example or removed after its contract test is kept.
- Build validation rejects duplicate IDs, missing required metadata and missing AE implementation/fallback declarations.

**Handoff to:** tasks 07 and 09.
