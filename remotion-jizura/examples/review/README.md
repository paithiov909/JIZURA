# Minimal effect review (stage 08)

This development example uses the existing public package entry and seven effects.
It adds no project format or package API. `inputs.tsx` contains named, serializable
inputs; `ReviewWorkbench` renders them in Studio and the existing Player example.

All candidates use Noto Sans JP 700, 640×360, 24fps, the same emphasized lyric,
Scene seed20260922, and two explicitly placed 60-frame Cuts. Every enabled effect
has an explicit seed and all center/decor parameters are fixed. `target` occupies
`[0,60)`, `reference` occupies `[60,120)`. These labels are React keys and development
labels only; they are not public Cut identifiers.

| Input | Target Cut |
| --- | --- |
| center | Static center layout; other groups disabled |
| pop / wipe | One enter effect; center is required |
| drift | One exit effect |
| breathe | One hold effect |
| kasumi / checkerStrip | One decor effect |
| combined | pop → breathe → drift, kasumi behind / checkerStrip in front |
| edited | Same seeds/text; only target timing, color, center and decor params change |

Enabled enters use 12 frames and exits use 16. Disabled phases explicitly use 0,
as required by the existing API. All Cut durations/positions stay the same.
`edited` uses enter20/exit10, center sx1.15/track0.12/offsets/underline, new colors,
and changed decor count/side/size/variant. Motion factories still accept no params.
The reference Cut remains fully fixed across all nine inputs.

## Compare and edit

Obtain the fixed font and OFL as described in the [package README](../../README.md#development).
From the repository root:

```sh
npm run player:remotion -- --host=127.0.0.1 --port=3108 --strictPort
```

Open `http://localhost:3108/?review`. Choose a candidate and use Player's normal
seek/play controls. The range selector loops target, reference, or the whole
Composition. Compare `combined` and `edited` at frame6 (enter), 24 (hold), and
52 (exit); switch to the reference at frame84/112 to check isolation.
Selecting `combined` restores the original input. Edit the target's object in
`inputs.tsx` to make another local change; Vite reloads the example. No separate
timeline editor is introduced.

Studio uses the same component:

```sh
npm run studio:remotion -- --port=3109 --no-open --public-dir=../dist/remotion/stage04/assets
```

Select `ReviewWorkbench`. Its initial Props are `{candidate: "combined"}`;
change `candidate` to choose a preset, or supply `{input: {name, cuts}}` for a full input.
The native Save action writes `examples/StudioRoot.tsx`; source editing remains
available. `studio-entry.tsx` / `StudioRoot.tsx` match the adopted version's root
discovery convention. Literal initial props avoid computed-prop save restrictions.
The old `index.tsx` remains a render entry. An explicit `input` takes precedence over
`candidate`; changing just `input.name` does not select a preset. Studio's saved
default props do not update Player's `inputs.tsx`; transfer the input explicitly.

## Save, export, restore

```sh
npm run check:remotion
node remotion-jizura/tests/review-browser.mjs
# Studio above must be running; this writes and restores StudioRoot.tsx.
node remotion-jizura/tests/review-studio.mjs
```

The browser command requires local Chrome (default `/usr/bin/google-chrome`,
override `JIZURA_BROWSER`), the font, and ffmpeg/ffprobe. It exercises the actual
ReviewPlayer's candidate selector, seek, both Cut loops, restore and StrictMode
remount, then saves and reloads each input JSON before real Remotion exports.
The Studio command uses `JIZURA_STUDIO_URL` (default `http://localhost:3109`).
It tests the running Studio save backend, source writes and full page reloads;
it does not click the UI Save button. Do not edit StudioRoot.tsx during that test.

Ignored `dist/remotion/stage08/` contains:

- `center.json` through `edited.json`: complete CLI input props.
- `<name>-<frame>.png`: frames0/6/12/24/43/52/59/60/84/112/119 of each input.
- `<name>.mp4`: target frames0–59, 2.5 seconds, H.264 CRF1/yuv444p.
- `player-<name>-<frame>.png`, `restored-24.png`, Player/Studio screenshots.
- `review-result.json`: input hashes, font/environment, exact PNG hashes,
  frame/output correspondence, loop evidence and lossy video anchor differences.
- `studio-review-result.json`: saved source / reloaded frame evidence.

To edit a saved JSON and render it again, run from the repository root:

```sh
npm exec --workspace remotion-jizura -- remotion still examples/studio-entry.tsx ReviewWorkbench ../dist/remotion/stage08/manual-24.png --props=../dist/remotion/stage08/edited.json --frame=24 --public-dir=../dist/remotion/stage04/assets --browser-executable=/usr/bin/google-chrome
npm exec --workspace remotion-jizura -- remotion render examples/studio-entry.tsx ReviewWorkbench ../dist/remotion/stage08/manual.mp4 --props=../dist/remotion/stage08/edited.json --frames=0-59 --public-dir=../dist/remotion/stage04/assets --browser-executable=/usr/bin/google-chrome
```

Paste that JSON as Studio props to redisplay it, or copy its `input` into the
Player example. Reload `combined.json` to restore the saved baseline. Regenerating
the browser outputs overwrites development outputs, not committed baseline fixtures.
Keep copies of a manually edited JSON if you need to preserve it between runs.

## Stage08 review limits and original stage09 handoff

Center cannot be disabled; “single” means one tested effect plus required layout.
There is no motion strength/speed parameter, resolved-config inspection, stable
public Cut ID, semantic parameter controls, or automatic Player/Studio save sync.
Explicit seeds and complete params make this example repeatable; omitted seeds,
reordered decor slots or new automatic candidates have a different contract.
Stage09 should use this pair of Cuts and the saved input/PNG correspondence to
evaluate its custom-effect and inspection APIs. Technical equality is distinct
from a user's design acceptance.

## Stage09 update

`ReviewWorkbench` now forwards an optional `onInspect` callback to `JizuraScene`.
Use it in TSX to obtain a detached measured configuration; use the public
`resolveScene` function with the same Scene settings, 24fps and
`reviewInputs.combined.cuts.map(({cut}) => cut)` for font-free inspection.
Callback functions are code props and are not saved in Studio JSON.

The [custom example](../custom/README.md) reuses the lyric/target/reference timing
with explicitly seeded caller-owned layout/motion/decor. Its wave adds amplitude
and speed controls; the original pop/wipe/drift/breathe factories remain empty
params. No public Cut ID or automatic Player/Studio synchronization was added.
Existing nine review inputs and their pixels retain their stage08 meaning.
