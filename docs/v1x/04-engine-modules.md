# 04 — Engine modules and stable data

**Depends on:** task 03; compare against task 01 fixtures.

## Work

Move the current global `J` utility, text, style, planner and renderer layers into explicit TypeScript modules in small steps. Introduce types for project state, cuts, effect groups, export plans and the AE plan boundary. Keep a temporary compatibility facade only where unconverted UI or pack code requires it, and record its removal path. Avoid changing algorithms merely to satisfy the type system.

The existing `src/*.js` filename sort is a dependency mechanism. Replace it with explicit imports and an initialization order that tests can inspect. Keep the version 2 AE plan, project JSON interpretation, deterministic seed behavior and public effect keys stable.

## Deliverable and acceptance

- Fixed baseline inputs produce equivalent project/plan output and selected frames within task 01's documented tolerances.
- Engine tests run without assembling the old global-source concatenation.
- The build does not rely on lexicographic source filenames for initialization.

**Handoff to:** tasks 05, 06 and 09.
