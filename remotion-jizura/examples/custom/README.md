# Caller-owned effects and inspection (stage 09)

`effects.tsx` imports only the public package entry and defines one layout,
per-glyph hold motion, and back decor. `CustomEffects.tsx` applies them to the
stage08 lyric/target `[0,60)` and keeps a fixed reference Cut `[60,120)`.
Definitions live outside React renders. No global registration is required.

- `offsetLines`: uses font-ready `fitText` and returns a placement.
- `glyphWave`: amplitude in design pixels and cycles/sec; zero amplitude is still.
- `boxRule`: a palette-colored rule below the current logical glyph bounds.

Use `factory.metadata` to read descriptions, tags, schema bounds/defaults/units.
Pass the factory's original declaration to its group. Custom declarations cannot
be reconstructed from a JSON ID. Persist scalar options, import the definition,
and call the factory again. Custom effects never enter automatic selection.

`inspectCustom()` uses `resolveScene()` before font preparation. Supply
`onInspect` to `CustomEffects` to get a detached measured snapshot after fonts,
layout, and the first draw. It includes resolved times, seeds, params, font/style,
and static placements/bounds; it does not contain executable code or a Canvas.
Snapshots have readonly types; mutating their data cannot change the Scene plan.

Prepare Noto Sans JP and OFL as described in the [package README](../../README.md#development).
From the repository root:

```sh
npm run studio:remotion -- --port=3109 --no-open --public-dir=../dist/remotion/stage04/assets
```

Select `CustomEffects`. Change `amplitude` from 12 to 32, compare frame24,
then frame84/112 of the reference, and restore 12. `amplitude` is an example prop,
not a Scene prop. The Studio registration uses literal default props.

```sh
npm run check:remotion
node remotion-jizura/tests/custom-browser.mjs
node remotion-jizura/tests/custom-consumer.mjs
```

The browser harness requires local Chrome (`JIZURA_BROWSER` overrides
`/usr/bin/google-chrome`), ffmpeg/ffprobe and the fixed font. It uses two real
Players, reverse seeks, parameter edits, a same-ID function replacement, snapshot
mutation and StrictMode remounts. It exports baseline/edited JSON props, 22 PNGs,
a restored PNG and a 60-frame MP4 under ignored `dist/remotion/stage09/`.
`custom-result.json` records configuration, environment/font hash and exact PNG
hashes. MP4 is lossy; PNG equality does not imply lossless video.

The consumer harness first runs the established tarball install/legacy gate,
then copies caller definitions and type cases to that independent installation.
It compiles them with strict TypeScript and compares 22 rendered PNGs to the
browser/export result. It requires npm registry access or the established cache,
and the existing `dist/remotion/stage07/scene-result.json` (regenerate using
`node remotion-jizura/tests/scene-browser.mjs` if missing).

See the [API contract](../../../docs/remotion/API.md#段階09の拡張契約2026-10-03)
for lifecycle, schema, seeds and bounds limitations. These are small new examples;
no additional legacy catalog ports or native image effects are introduced here.
Human design/motion acceptance remains separate from technical verification.
