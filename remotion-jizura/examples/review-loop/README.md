# A twelve-second review loop

This stage14 development example follows a brief through catalog choices, executable
Remotion code, three local review instructions, comparison, saved props and restore.
The implementation agent authored it; no human selection or AI success rate was measured.

Run from the repository root with the fixed Noto Sans JP font and its OFL license in
`dist/remotion/stage04/assets/` (download instructions in the [package README](../../README.md#development)).
Use the root lockfile, Node26.10.0 and the pinned React/Remotion versions.

```sh
npm run player:remotion -- --port=3108
# Open http://localhost:3108/?review-loop
npm run studio:remotion -- --port=3114 --no-open --public-dir=../dist/remotion/stage04/assets
# Select ReviewLoop, ReviewLoop1080 or ReviewLoopPortrait
```

Image effects need [HTML-in-Canvas enabled in Chrome](https://www.remotion.dev/docs/html-in-canvas).
The checks use Chrome154 with the flag supplied by Remotion and software WebGL2
`swangle`. A single wrapper is used. This is an experimental browser condition,
not general GPU/browser compatibility.

## Select and generate

Brief: “静かな夜から朝、希望が弾み、最後の光で短いキメ。”

[model.tsx](model.tsx) records the actual `searchEffects(query, exampleCatalog)`
results, choices and reasons. Search results are candidates; subsequent explicit
choices also consider motion/decor groups. A catalog entry is not a Cut declaration.
[ReviewLoop.tsx](ReviewLoop.tsx) turns these saved scalar settings into actual
`JizuraCut` declarations, measured by one `JizuraScene`, then post-processes the
scene using standard blur and JIZURA sliceGlitch. These two files are the generated
code example. [Caller definitions](../custom/effects.tsx) are imported explicitly.

| Label | Global frame interval | Expression |
| --- | --- | --- |
| quiet | [0,72) | center + wipe/drift, caller glyphWave3px/0.35Hz and boxRule2px |
| arrival | [72,144) | center + pop/breathe/drift |
| rise | [144,216) | mixed/wave/rotAmp4 + slideLeft/shrink/jitter0.3/brackets |
| finale | [216,288) | center + slideLeft/shrink/jitter0.65/brackets, image accent [0,36) local |

All times and Cut/effect seeds are explicit. Audio/LRC/beat analysis is caller work.
Full parameters, style and exact font identity are stored in the input. Caller
slots store numbers and IDs indirectly through the fixed imported adapter, never
functions. This example schema is neither a public project format nor a new Cut ID.

## Review, compare and restore

Choose a candidate, select a Cut loop, and use the standard Player seek/play controls.
The three “この修正を適用” buttons apply cumulatively; the candidate selector provides
independent changes and the cumulative `revised`. Applying multiple buttons is
labeled `edited`/編集中 so it cannot masquerade as one independent preset. “変更前へ/変更後へ” toggles the same
frame between the original and current settings. It does not overwrite current edits.

| Fixed instruction | Original → revised | Representative frame |
| --- | --- | --- |
| arrival: 入場をゆっくりに | enter duration18 →30 frames; completion moves from90 to102 | 84 |
| rise: 大小と回転を抑える | mixed → explicit center, track0.08 | 180 |
| finale: 入場直後だけ画像加工 | scene [0,36) → lyrics [0,12), local frames | 224 for scope, 240 for window |

Include the label, global/local interval, exact original settings, intent and desired
change in further feedback. For example:

```text
Cut: arrival; global [72,102), local [0,30), inspect frame84.
Before: pop seed202 / enterDurationInFrames18.
Intent: More time to read the arrival; keep other Cuts and all seeds fixed.
Change: enterDurationInFrames30; retain exitDurationInFrames16.
```

Layout replacement changes the target Cut's item count and motion item seeds; it
cannot preserve target geometry. Other fixed Cuts must retain their images.
Image scope includes a subtle background motif so excluding the background is
observable. Scope switching occurs only while the image event is active; otherwise
all variants follow the same compositing path. The base JIZURA Scene is transparent;
caller background/motif composition is recorded separately in `input.scene`/`image`.
Inspection reports the JIZURA Scene, not the enclosing DOM or processed image.

“設定を保存/保存設定を読込” uses browser localStorage at the current origin.
“Props JSONを取得” downloads exactly `{input: ...}` for the current edited settings.
“構成・レビュー記録を取得” downloads the currently displayed measured inspection,
scalar input, image sidecar and unresolved review status. Diagnostic inspection
cannot reconstruct code. Keep the exact imported caller definitions with the input.

Open “同じPropsを編集・Studioへ渡す”, edit/apply JSON or paste the same props into
Studio's Props editor. Save to its literal defaultProps and reload Studio. Alternatively
save the downloaded JSON to an ignored directory and render it directly:

```sh
npm exec --workspace remotion-jizura -- remotion still examples/studio-entry.tsx ReviewLoop ../dist/remotion/stage14/manual.png --frame=180 --props=../dist/remotion/stage14/revised-props.json --public-dir=../dist/remotion/stage04/assets --browser-executable=/usr/bin/google-chrome --gl=swangle
npm exec --workspace remotion-jizura -- remotion render examples/studio-entry.tsx ReviewLoop ../dist/remotion/stage14/manual.mp4 --props=../dist/remotion/stage14/revised-props.json --public-dir=../dist/remotion/stage04/assets --browser-executable=/usr/bin/google-chrome --gl=swangle --concurrency=1
```

Player and Studio do not synchronize automatically. The shared props envelope
removes the earlier candidate-only/manual reconstruction step; transfer still
requires JSON. Browser storage is not a source file. Restore with “元設定へ復元”,
`original`, a saved props file, or the original literal defaultProps.

## Reproduce the evidence

Run sequentially on the 16GB host:

```sh
npm run check:remotion
node remotion-jizura/tests/loop-validation.mjs
# While the Studio command above is running:
JIZURA_STUDIO_URL=http://localhost:3114 node remotion-jizura/tests/loop-studio.mjs
node remotion-jizura/tests/port-validation.mjs --case=center,combined,custom,image-combined,mixed,slideLeft,shrink,jitter,brackets --stills-only --output=dist/remotion/stage14/ports
npm run check
npm run spike:build
npm run spike:test
```

The first command checks types/build/Node contracts. `loop-validation.mjs` operates
the real example selectors, buttons, JSON/storage, before/after, two Cut loops and
StrictMode remount; captures100 representative PNGs at640×360 plus16 at1080p/portrait;
exports both full12-second videos at concurrency1; and records inputs, measured
snapshots, resolved props, hashes and timings under a new ignored stage14/run directory.
For screenshot comparisons only, paused Player controls are temporarily hidden
and immediately restored. UI screenshots keep controls. The latest successful run
path is saved in `dist/remotion/stage14/latest-run.txt`.

`loop-validation.mjs --ui-only` runs the preview/control path only, without
exports/high-resolution/font trials and without replacing the latest full-run pointer.
Use it for isolated UI follow-ups, not as evidence of a full check.

`loop-studio.mjs` saves six states via the actual Studio backend, reads saved source,
fully reloads/seeks, and compares18 frames plus6 independently bundled renders.
It restores StudioRoot after checking for concurrent edits. It tests the save backend,
not hand operation of the UI Save button. Stop Studio after the check if no longer needed.

Font preload is caller-owned and checks the exact700/normal Face plus fonts.load.
The same Face remains across local edits and is deleted at unmount; Scene omits src
when using it. A600ms delayed-font trial compares cold Scene buffering with loading
before the first Scene boundary. Preload moves loading earlier; it does not remove
network cost. Total latency and post-mount font/geometry observations are reported separately.
The delayed-font trial includes a100ms probe; readiness times are observation bounds,
not effect-only cost. A prepared font does not prove the first HTML-in-canvas paint
or playback has started; that initial image pipeline can still buffer. Missing
preload sources surface the specified/resolved URL and repair checks.

The fixed image-enabled environment is distinct from stage12's default-GL text
checks. No tolerance is introduced for the640×360 same-environment restoration/export gate. The1080p/portrait
representatives record preview/export and independent-export differences separately;
subpixel glyph differences remain unresolved rather than being accepted by a new
tolerance. Videos
are lossy and use separate anchor metrics. See the [stage14 result](../../../docs/remotion/14-review-loop.md)
for measured values, agent visual inspection, remaining limits and next candidates.
User design/motion acceptance remains unconfirmed; generated artifacts are not
adopted source baselines. No package exports/effect parameters/dependencies changed.
