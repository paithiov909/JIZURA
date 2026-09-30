# 06 — Browser i18n

**Depends on:** tasks 03 and 04. Coordinate UI touchpoints with task 07.

## Work

Replace Python source-text substitution in `app/english.py`, `app/i18n*.py` and `build.py` with typed locale dictionaries and a browser i18n service. Migrate interface copy, accessible labels, status/errors, style and effect names, and locale-specific samples. Keep Japanese, English, Traditional Chinese, Simplified Chinese, Korean, Indonesian and Vietnamese. Preserve contributor translations and identify missing keys without replacing them with silently incorrect Japanese text.

Keep the existing locale URLs, page language, canonical and hreflang metadata. A runtime language switch may reuse the current route structure; it must preserve project state according to task 01's observed behavior.

## Deliverable and acceptance

- All seven routes render the intended language, including dynamic UI and effect labels.
- A missing-key check fails in CI and a focused browser check covers route navigation and metadata.
- No build-time free-form replacement of JavaScript source remains in the supported build path.

**Handoff to:** task 07.
