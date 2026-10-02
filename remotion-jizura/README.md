# remotion-jizura

Initial ESM package scaffold on the `remotion` branch, version `0.1.0-alpha.0`.
Stages 03–06 implement parsing, planning, font preparation, integer frame evaluation
and seven canvas effects: center, pop, wipe, drift, breathe, kasumi and checkerStrip.
The current Scene renders the active Cut with deterministic motion and decor.
The complete target contract is maintained in the repository at `docs/remotion/API.md`.

```tsx
import {JizuraScene} from 'remotion-jizura';

// Inside a Remotion Composition (example: 640×360, 24 fps).
export const Empty = () => (
  <JizuraScene durationInFrames={24} background="#16324F" />
);
```

The Scene owns one 2D canvas. Omitted width/height use Remotion's video config;
explicit dimensions set the design resolution without multiplying by DPR.
The canvas fills its parent with CSS; the caller controls the parent's aspect ratio.
The default background is `#111111`; `null` clears to transparency. Frames outside
`[0, durationInFrames)` clear the canvas. Empty arrays, Fragments and ignored
null/boolean children work. No font is needed for this example.

`JizuraScene`, `JizuraCut`, `JizuraError`, `parseLines`, `center`, `pop`, `wipe`,
`drift`, `breathe`, `kasumi`, `checkerStrip` and their contracted types are exported.
`parseLines` and the seven factories now work without DOM access. Factories return
validated configuration declarations; they do not render effects. Parsing supports
auto script fallback, manual `/` boundaries, code point emphasis ranges and escapes.
For example, `parseLines('新しい/朝が来た\n*希望*の朝だ')` yields three structured Cuts.

The internal resolver collects direct Cuts, nested arrays and Fragments, validates
inputs, allocates integer frame durations, and resolves group seeds and parameters.
Explicit `false`, `0` and seed `0` are preserved. Font input and Style shape are
validated without loading resources. Empty Scenes accept these settings, and an
omitted background uses the Scene palette's `bg` (`#111111` by default).

Nonempty Scenes prepare the exact registered font face (or load `font.src`),
then measure the center layout and draw each frame’s glyphs and effects. Standalone Cut and unsupported children
throw `E_CHILD`. Unknown IDs, mismatched groups and invalid parameters throw
`E_EFFECT`; invalid numbers, text and Style have their contracted error codes.
Use `enter={null} exit={null} hold={null} decor={[]}` to disable motion/decor.
Center parameters still control geometry and ornaments; fix them for a completely
fixed static layout. External consumers are tested in stage 07.

## Static text and fonts

```tsx
import {staticFile} from 'remotion';
import {JizuraScene, JizuraCut} from 'remotion-jizura';

export const Static = () => (
  <JizuraScene durationInFrames={24}
    font={{family: 'Noto Sans JP', weight: 700, src: staticFile('NotoSansJP.ttf')}}
    style={{fontSize: 64, track: 0.08, lead: 1.4}}>
    <JizuraCut text={'新しい朝が来た\n*希望*の朝だ'}
      enter={null} exit={null} hold={null} decor={[]} />
  </JizuraScene>
);
```

Provide the font file in your Remotion public directory. This package does not
bundle or automatically fetch fonts. Without `src`, register a matching
FontFace or CSS `@font-face` before mounting the Scene. The default is Noto Sans JP
700/normal. `document.fonts.check()` alone does not prove registration.
Missing, conflicting, failed or timed-out faces throw `E_FONT`. Resource loading
has a 15 second timeout; rendering waits until fonts, measurement and drawing
finish. Studio uses explicit preparation state. Scene cleanup releases its own
faces and render handles while preserving caller-owned registrations.

Cut fonts replace the entire Scene FontSpec. Cut Style merges palette keys and
overrides other defined fields; emphasis changes glyph color only. Center preserves
manual newlines, reflows each long line and fits the text including its horizontal
scale. Automatic track comes from seeded center planning. Explicit center track
takes precedence over Style.track. Center also supports offsets, accent, subtitle
and underline. Cut palette.bg does not replace the Scene background. Geometry
and measurement caches are Scene-owned; glyph/shard caches belong to the Canvas.

Stage 04 verified the horizontal static subset against retained font/text code in
Chrome154 with the same Noto Sans JP file: four cases had zero pixel differences.
Real Studio display and 960×540 Remotion PNGs were checked separately. This stage
04 evidence does not establish effect compatibility. Stage 05 separately verified
Cut boundaries, Sequence offsets, reverse seeks and video updates; Player and
external consumers remain unverified. Stage 06 separately verified all seven effects
against the retained source with adapted font, seed and cache contracts: 283 frames
had zero pixel differences. The original planner’s weighted/history selections
are a separate contract and are not reproduced.

## Timed static Cuts

The Scene uses `useCurrentFrame()` directly, including its outer Sequence offset.
Cuts occupy integer half-open intervals. Gaps draw the Scene background; frames
outside the Scene clear everything. `motionFps` quantizes Cut-local evaluation
seconds after Cut selection, so it cannot postpone a text switch. Phase values
drive the enter → hold → exit pipeline; decor draws behind or in front of the text.

The `TimedCuts` example has four distinct static texts, a one-frame Cut and a gap.
Its `offset` prop moves the enclosing Sequence; it does not alter the Scene plan.
After obtaining the comparison font below, run:

```sh
npm run build:remotion
node remotion-jizura/tests/frame-browser.mjs
npm exec --workspace remotion-jizura -- remotion still examples/index.tsx TimedCuts ../dist/remotion/stage05/example.png --frame=10 --public-dir=../dist/remotion/stage04/assets --browser-executable=/usr/bin/google-chrome
npm run studio:remotion -- --public-dir=../dist/remotion/stage04/assets
```

The stage 05 browser harness writes PNGs, `timed-cuts.mp4` and `frame-result.json`
to ignored `dist/remotion/stage05/`. It needs local Chrome, ffmpeg and ffprobe.
Fifty sequential PNGs match independently rendered static anchors exactly.
Sequence offsets 12/60 produce identical pixels at the same local frames.
The H.264 CRF1 video is decoded and checked for the correct text/gap in every
frame; its RGB/YUV and compression differences are reported separately from PNG
equality. Preview lifecycle and synthetic test transformations are separate from
the Remotion export checks and are not evidence of a JIZURA effect port.

## Motion and decor

```tsx
import {JizuraScene, JizuraCut, center, pop, drift, breathe, kasumi, checkerStrip} from 'remotion-jizura';

export const Motion = () => (
  <JizuraScene durationInFrames={60}
    font={{family: 'Noto Sans JP', weight: 700, src: staticFile('NotoSansJP.ttf')}}>
    <JizuraCut text="新しい*朝*が来た"
      layout={center({params: {sx: 1, ox: 0, oy: 0, sub: false, under: false}})}
      enter={pop({seed: 123})} exit={drift({seed: 456})} hold={breathe()}
      decor={[kasumi({seed: 889}), checkerStrip({seed: 721})]} />
  </JizuraScene>
);
```

Omit any supported group to choose reproducibly from its API candidate order:
center; pop/wipe; drift; breathe; one kasumi/checkerStrip. These choices use equal
probability, independent group streams and no history weights. Fix only the
parameters you need; explicit `false`, `0` and seed `0` survive planning. Repeated
decor IDs are allowed. Back decor draws first, then text and center ornaments,
then front decor; each layer preserves declaration order. Drift uses raster
components and polygon shards, with caches separated by font, glyph, resolution
and item seed. Current-frame logical boxes (or static fallbacks) position decor,
so reverse seeking does not depend on a previous frame’s box.

The `EffectSamples` Composition has `mode` values `fixed`, `partial`, `automatic`,
`disabled`, `seedDifferent` and `repeated`, plus `seed`, `offset` and `motionFps`.
After preparing the comparison font below:

```sh
npm run build:remotion
node remotion-jizura/tests/effect-browser.mjs
npm exec --workspace remotion-jizura -- remotion still examples/index.tsx EffectSamples ../dist/remotion/stage06/example.png --frame=55 --public-dir=../dist/remotion/stage04/assets --browser-executable=/usr/bin/google-chrome
npm run studio:remotion -- --public-dir=../dist/remotion/stage04/assets
```

The harness writes source comparison PNGs, `effects.mp4` and `effect-result.json`
to ignored `dist/remotion/stage06/`. It verifies 283 source comparison frames,
all 61 parallel Remotion PNGs against direct Canvas drawing, reverse seeks,
Sequence, StrictMode, cache recreation, remounts and multiple Scenes. Every video
frame is matched to the corresponding PNG; H.264 compression differences are
reported separately from exact PNG comparisons. These checks use Chrome154,
Noto Sans JP 700, 640×360 and 24fps. Other browsers/fonts, Player and external
consumer installation remain stage 07 validation work. The PartA/PartB example
is also completed in stage 07.

## Development

Use Node **26.10.0**, npm **11.19.1** and the repository root lockfile.
This package is an npm workspace; do not create a package-local lockfile.
React and React DOM **19.3.0**, Remotion and all `@remotion/*` packages **4.0.532**
are pinned. These exact versions are the initial peer contract and the only
combination validated here. React/Remotion remain external to the package build.
See [React 19 support](https://www.remotion.dev/docs/react-19),
[React versions](https://react.dev/versions), and
[Remotion version alignment](https://www.remotion.dev/docs/browser-bundler).

Run from the repository root:

```sh
npm ci
npm run typecheck:remotion
npm run test:remotion
npm run build:remotion
npm run check:remotion
npm run studio:remotion
npm run still:remotion -- --browser-executable=/usr/bin/google-chrome
npm run render:remotion -- --browser-executable=/usr/bin/google-chrome
npm pack --workspace remotion-jizura --dry-run
```

| Command | Result |
| --- | --- |
| `typecheck:remotion` | Strict TS/TSX checking of source, example and compile-only consumer |
| `test:remotion` | Build, then 41 Node contracts; font resource tests use mocks |
| `build:remotion` | ESM JavaScript and declarations in `remotion-jizura/dist/` |
| `check:remotion` | Typecheck and Node contracts, including build |
| `studio:remotion` | Local Remotion Studio for `examples/index.tsx` |
| `still:remotion` | Frame 0 PNG, `dist/remotion/still.png`, 640×360 |
| `render:remotion` | H.264 MP4, `dist/remotion/empty.mp4`, 24 frames at 24 fps |

The browser flag is optional; without it Remotion may download Chrome Headless Shell.
Use a local Chrome/Chromium executable for offline rendering. The CLI includes its
render/encoding tools; system ffprobe/ffmpeg are only used for optional output QA.
Studio needs a local available port (default 3000). Each Studio/still/render command
builds the package before importing its public entry. Rendering needs the browser's
Linux runtime libraries. The empty Scene needs no font. StaticText/StaticOverride
need the fixed comparison font in a supplied public directory.
CLI reference: [Studio, still and render](https://www.remotion.dev/docs/cli).
Generated bundles, images, videos, reports and caches belong in ignored `dist/`.

For this repository's static examples, download the official comparison font and
its [SIL OFL 1.1 license](https://github.com/google/fonts/blob/295d98a7a0c17c68f1341eaeea354e7960ea70d3/ofl/notosansjp/OFL.txt):

```sh
mkdir -p dist/remotion/stage04/assets
curl -fL 'https://raw.githubusercontent.com/google/fonts/295d98a7a0c17c68f1341eaeea354e7960ea70d3/ofl/notosansjp/NotoSansJP%5Bwght%5D.ttf' -o dist/remotion/stage04/assets/NotoSansJP.ttf
curl -fL 'https://raw.githubusercontent.com/google/fonts/295d98a7a0c17c68f1341eaeea354e7960ea70d3/ofl/notosansjp/OFL.txt' -o dist/remotion/stage04/assets/OFL.txt
npm run build:remotion
node remotion-jizura/tests/canvas-browser.mjs
npm exec --workspace remotion-jizura -- remotion still examples/index.tsx StaticText ../dist/remotion/stage04/static-text.png --public-dir=../dist/remotion/stage04/assets --browser-executable=/usr/bin/google-chrome
npm run studio:remotion -- --public-dir=../dist/remotion/stage04/assets
```

Font SHA-256: `c2f3b4d463500a2ddcd3849cded1fceeb9fd6d1c32e6cbecd568453ba50fc68f`.
StaticOverride uses the same variable font at weight 400. The browser harness
requires this file and the existing Vite/Remotion development dependencies;
`JIZURA_BROWSER` can override its Chrome executable. It writes comparison images,
box overlays and a JSON report to `dist/remotion/stage04/`. Reference imports are
development-only. Preserve the font's license when redistributing the font file.

The root entry exposes ESM imports and declarations; CommonJS `require` is not a
supported entry. Pack includes only built `dist/`, README, LICENSE and npm's
manifest. Source does not import the old engine/effects or other repository code.
Examples and tests are development-only. `prepack` builds locally; no publish or
release is part of this stage. External consumer validation is assigned to stage 07.

[MIT License](LICENSE). React and Remotion retain their own dependency licenses;
[Remotion terms](https://www.remotion.dev/docs/license) apply to Remotion use.
