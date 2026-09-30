# Browser locale dictionaries

`locales/*.ts` is the source of browser copy for Japanese, English, Traditional Chinese,
Simplified Chinese, Korean, Indonesian and Vietnamese. Each dictionary must satisfy
`LocaleDictionary`: the Japanese key set defines all 460 UI/export messages, ordered
selectable effect labels, style names/descriptions, moods and sample lyrics. Stable
engine IDs and project/AE schemas are independent of this display copy.

The initial dictionaries preserve the effective translations from integration base
`ce6a4a2a3074e768981d2dc877acb45366e176ed` (the baseline translations inherited from
`d217fb0a06d0f81bc31f8b31b9646c30dc540f82`). Traditional Chinese retains Zaious's
contribution in PR #6; Korean retains andongmin94's contribution in PR #8. Their
phrase overrides and effect/style/mood labels take precedence over the later
translation additions, exactly as the old merged glossary did. Simplified Chinese
keeps its existing part-name glossary. Indonesian and Vietnamese intentionally keep
the baseline English effect names; these are existing supplied labels, not a
silent Japanese fallback. Technical/native font and lyric-language names stay as
in the baseline.

`cep/ja.ts` and `cep/en.ts` separately define 52 Adobe-panel messages. The CEP
packages support these two languages only. ExtendScript ScriptUI/host copy still
uses `app/english.py`, separately from the browser service; tasks 09/10 own those
ES3 assembly boundaries.

Use `createI18n(language)` for a service bound to an engine/editor. `applyLabels`
sets only display metadata, the sample and the engine's export-message service.
`applyDocument` fills static text nodes and accessible attributes before UI boot,
and builds the existing route menu. Static bindings are `<!--i18n:body.key-->`
followed by a text node, or `data-i18n-attrs="title:body.key aria-label:body.key"`.
They add no wrapping spans and do not replace interactive controls. Existing
formatted UI templates remain messages while task 07 migrates the editor.

Messages use `{p0}`, `{p1}`, etc.; call `t(key, [value0, value1])`. Translations can
reorder placeholders, but must keep the same parameter inventory. Insertions are
literal: `$&`, braces or other content in a value cannot become a second template.
Call sites that insert HTML retain their existing escaping requirements. Unknown
keys/parameters throw; missing translations never fall back to Japanese.

```sh
npm run typecheck
npm run check:i18n
npm run test:i18n
npm run build
PYTHONPATH=/tmp/jizura-baseline-py python3 dev/i18n_test.py --browser /usr/bin/google-chrome
```

The Python path above is this workspace's optional Playwright installation; use
your own environment with the task-02 requirements elsewhere. The validator also
checks legacy JS call keys/argument counts, static HTML bindings, untranslated
Japanese kana and the current effect/style/mood inventory. Adding an effect or
message requires labels in every browser dictionary. The root build and CI run
this check.

`tests/i18n/legacy-catalog.json` contains SHA-256 digests of the independently
captured old effective effect/style/mood/sample/page-metadata catalog. The body
fixture hashes come from old translated `app/body.html` parsed in Chrome, before
UI startup. `dev/i18n_test.py` compares runtime-localized static DOM (including
accessible attributes), ignoring only binding comments/attributes, script tags,
the separately checked locale menu, outer body whitespace and the version label.
It also exercises late-created UI/export messages and seven actual hosted route
transitions with a pending autosave, full project data, volume and mode.

For forensic source comparison, `npm run test:i18n:source` reads the immutable
integration-base git object into a temporary directory and expands runtime
messages back into ASTs. It compares 1,025 retained function bodies across the
seven browser locales and both CEP languages. It excludes the explicitly changed
installer bootstrap, loop-label selection and project-version accessor. Legacy
Python substitution runs only on these reference files, never in a supported
build. This optional check requires that historical git object; it is not a
clean-checkout/orphan-branch gate.
