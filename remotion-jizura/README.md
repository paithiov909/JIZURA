# remotion-jizura

Initial ESM package on the `remotion` branch, version `0.1.0-alpha.0`.
Stages 03–06 implement parsing, planning, font preparation, integer frame evaluation
and seven canvas effects: center, pop, wipe, drift, breathe, kasumi and checkerStrip.
Stage13 adds explicit-only mixed, slideLeft, shrink, jitter and brackets.
The current Scene renders the active Cut with deterministic motion and decor.
Stage 07 adds the 120-frame PartA/PartB example, Player buffering and tarball
consumer validation. The complete contract is maintained in the repository at
`docs/remotion/API.md`; measured evidence is in `docs/remotion/VALIDATION.md`.

## Quick start

Install this local alpha tarball together with its exact peers. The Player is
optional and belongs in the consuming app, not in the package's runtime imports.

```sh
npm install /absolute/path/to/remotion-jizura-0.1.0-alpha.0.tgz react@19.3.0 react-dom@19.3.0 remotion@4.0.532
# Optional web preview:
npm install @remotion/player@4.0.532
```

Place `NotoSansJP.ttf` in your Remotion public directory (see the font instructions
below), then register this component in a 640×360, 24fps, 120-frame Composition:

```tsx
import {Sequence, staticFile} from 'remotion';
import {JizuraScene, JizuraCut, parseLines, kasumi, checkerStrip} from 'remotion-jizura';

const fontFor = (src: string) => ({family: 'Noto Sans JP', weight: 700, src});
const PartA = ({fontSrc}: {fontSrc: string}) => (
  <JizuraScene durationInFrames={60} font={fontFor(fontSrc)} style={{fontSize: 64}}>
    {parseLines('新しい/朝が来た\n*希望*の朝だ').map((text, index) =>
      <JizuraCut key={index} text={text} seed={1234 + index} />)}
  </JizuraScene>
);
const PartB = ({fontSrc}: {fontSrc: string}) => (
  <JizuraScene durationInFrames={60} font={fontFor(fontSrc)} style={{fontSize: 64}}>
    <JizuraCut text="喜びに胸を開け" hold="breathe"
      decor={[kasumi({seed: 889}), checkerStrip({seed: 721})]} />
  </JizuraScene>
);
export const LyricsDemo = ({fontSrc = staticFile('NotoSansJP.ttf')}: {fontSrc?: string}) => <>
  <Sequence durationInFrames={60}><PartA fontSrc={fontSrc} /></Sequence>
  <Sequence from={60} durationInFrames={60}><PartB fontSrc={fontSrc} /></Sequence>
</>;
```

PartA allocates three Cuts at `[0,20)`, `[20,40)`, `[40,60)`; emphasis on `希望`
survives parsing. PartB starts at composition frame 60, using local frame 0 and
independent decor seeds. The executable repository example is
`examples/lyrics.tsx`, shared by Studio and Player. It also accepts `fontSrc`,
`seed` (Scene seed, default 20260922) and `cutSeed` (PartA base seed, default 1234).

## Minimal effect review

Stage08 adds `ReviewWorkbench` and a small Player selector for the seven current
effects, combined/edited inputs, and target/reference Cut loops. See the
[review example](examples/review/README.md) for the shortest comparison, local edit,
saved JSON, PNG/video export and restore workflow. Run the existing Player command
and open `http://localhost:3108/?review`; the original LyricsDemo remains at `/`.
`node remotion-jizura/tests/review-browser.mjs` writes ignored
`dist/remotion/stage08/` outputs. `review-studio.mjs` checks saving in running Studio.
These are development inputs, not a public project format or new effect API.

## Brief-to-review loop (stage 14)

[The twelve-second example](examples/review-loop/README.md) combines four explicit
Cuts, existing/new/caller effects and standard/native image processing. Open
`/?review-loop` with the Player command, or select `ReviewLoop`, `ReviewLoop1080`
or `ReviewLoopPortrait` in Studio. Three fixed review instructions cover duration,
layout replacement and image scope. Compare before/after at the same frame, loop a
Cut, save/reload scalar settings and restore the original. One `{input: ...}` props
envelope is shared by Player JSON, Studio defaultProps and rendering.

The Player preloads the exact caller-owned font once across local edits. Input and
measured inspection downloads record separate reproduction/diagnostic data; custom
code is recreated by importing the same definitions. `loop-validation.mjs` and
`loop-studio.mjs` generate ignored stage14 artifacts, including timing and delayed-font
trials. Read the example for command prerequisites and the backend-save/UI distinction.
User design acceptance remains unconfirmed. No public API or effect parameters change.

## Custom effects and resolved configuration (stage 09)

Import `defineLayoutEffect`, `defineMotionEffect`, and `defineDecorEffect` from
`remotion-jizura` in a caller-owned TS file. Define them outside React renders;
call the returned factory with `{seed, params}` and pass its original declaration
to the matching Cut group. Each factory exposes `.metadata` with typed parameter
schema, defaults/bounds/descriptions/units and tags. Custom effects are explicit
choices and do not change the existing seven automatic candidates.

The [custom example](examples/custom/README.md) defines measured text placement,
a seeded per-glyph wave and a rule below the lyric bounds. In Studio select
`CustomEffects`, change `amplitude` 12 → 32, compare frame24 and the fixed
reference at frame84/112, then restore 12.

`resolveScene(sceneProps, {width, height, fps}, cutPropsArray)` synchronously
returns a detached `SceneInspection` with `stage: "prepared"`, resolved Cut times,
effect IDs/seeds/params and font/style. `JizuraScene.onInspect` reports
`stage: "measured"` after fonts, measurement and the first draw, adding static
placements/bounds. `ReviewWorkbench` also forwards this optional callback.
Snapshots contain no code or Canvas and cannot change the internal plan.
They are diagnostic data; restore custom effects by importing the same definitions
and passing saved scalar options back to their factories.

```sh
npm run check:remotion
node remotion-jizura/tests/custom-browser.mjs
node remotion-jizura/tests/custom-consumer.mjs
```

These commands require the fixed font, Chrome and ffmpeg/ffprobe; the consumer
also requires npm registry/cache and stage07's scene result. They generate evidence
under ignored `dist/remotion/stage09/`. See the [stage09 contract](../docs/remotion/API.md#段階09の拡張契約2026-10-03)
for group/ID conflicts, lifecycle, motion progress, seed/slot dependencies and
logical bounds. Stage11 adds separate discovery data without changing factory metadata.

## Native image effects (stage 10)

`sliceGlitch({amount?, displacement?, bands?, seed?, frame?, fps?, rate?, disabled?})`
returns a Remotion-native image `EffectDescriptor`, separate from glyph/decor
declarations. Pass Cut-local frame explicitly. It shifts seeded horizontal bands,
wraps edges, clears each target frame and preserves alpha without frame history.
Use it in `CanvasImage.effects`, or wrap JIZURA in one public `HtmlInCanvas` with
`pixelDensity={1}`. A transparent Scene processes lyrics/decor; a Scene with a
background processes both. Effects apply in array order.

The [image-effects example](examples/image-effects/README.md) connects standard
blur, Cut-derived triggers, an independent image, Player controls and Studio
source saving. Open `/?image-effects` with the existing Player command.
`sliceGlitch` uses existing `remotion@4.0.532`; the standard blur example separately
uses `@remotion/effects@4.0.532`. Studio/Player needs Chrome149+ with the
HTML-in-Canvas flag. Fixed tests use Chrome154 and software WebGL2 `swangle`.
This experimental connection does not add a Scene/Cut `effects` prop.

## First effect batch

Stage13 adds `mixed`, `slideLeft`, `shrink`, `jitter` and `brackets`, their typed
options, and catalog records with `autoSelect: false`. Use strings or factories
explicitly; omitted groups still select from the original seven candidates.
See [batch comparisons](examples/batch/README.md) and the repository's stage13 API.

```tsx
import {mixed, slideLeft, shrink, jitter, brackets} from 'remotion-jizura';
// Inside a font-ready Scene. Explicit Cut timing remains integer frames.
<JizuraCut text="新しい*朝* ABC！" seed={1234}
  layout={mixed({params: {mode: 'wave', rotAmp: 6, smallK: 0.5, accentIdx: 2}})}
  enter={slideLeft()} exit={shrink()} hold={jitter({params: {amount: 1}})}
  decor={[brackets({params: {pad: 18, stroke: 2.2, accent: false}})]} />
```

Mixed removes spaces/newlines, keeps original emphasis indices, and uses one
resolved font with different glyph sizes and seeded rotations. More than nine
glyphs uses two rows. Style.fontSize caps each glyph; Style.track/lead do not alter
this layout. With one glyph per item, slideLeft enters the items together and
shrink contracts each at its own center. Jitter uses deterministic 24Hz steps;
amount0 disables it. Brackets follows the current logical box (rotation/clip are
excluded), with a central fallback on null; large pad/stroke can clip at an edge.

Mixed accepts mode line/stair/wave, rotAmp0..20, smallK0.25..1, and integer
accentIdx0..9999. Its omitted params are seeded. Jitter amount is0..4 (default1).
Brackets pad is0..64 (default18), stroke0.5..12 (default2.2), accent boolean
(defaultfalse). SlideLeft/shrink have no params. All bounds are inclusive;
invalid values/unknown keys fail with E_EFFECT.

## Choosing effects and timing

Stage11 adds `getEffectCatalog()` and `searchEffects(query?, entries?)`.
The package catalog contains twelve text/decor effects plus native sliceGlitch;
image records describe native effects, not Cut declarations. Search supports name,
tag, group, use and conditions, preserves source order, and never changes automatic
selection. The [catalog example](examples/catalog/README.md) includes the three
caller definitions and standard blur, three usage queries, real Player previews,
parameter meaning/limitations and links to generated representative movies.
Open `http://localhost:3108/?catalog` with the existing Player command.

```ts
import {getEffectCatalog, searchEffects} from 'remotion-jizura';
const quiet = searchEffects({group: 'hold', uses: ['静かな保持']});
const native = searchEffects({group: 'image', conditions: ['2d']}, getEffectCatalog());
```

Catalog records are readonly discovery data. Import the real factory to execute.
Seeded built-in defaults, unused shared params and standard editor ranges are
explicitly distinguished; suitability is a hypothesis for visual review.

These Cut declarations fit inside a Scene with a loaded font:

```tsx
// Automatic choices and parameters, reproducible from Scene/Cut seeds.
<JizuraCut text="新しい*朝*" seed={1234} />
// Fix every group and effect seed. Omitted parameters are generated from those seeds.
<JizuraCut text="新しい*朝*" layout={center({seed: 1})}
  enter={pop({seed: 2})} hold={breathe({seed: 3})} exit={drift({seed: 4})}
  decor={[kasumi({seed: 889}), checkerStrip({seed: 721})]} />
// Fix only the selected groups/parameters; the rest remain automatic.
<JizuraCut text="喜びに胸を開け" hold="breathe"
  layout={center({params: {under: false, ox: 0}})} decor={[kasumi({seed: 889})]} />
// Immediate, static letters; also fix center geometry and ornaments.
<JizuraCut text="希望の朝" enter={null} exit={null} hold={null} decor={[]}
  layout={center({params: {sx: 1, track: 0.08, ox: 0, oy: 0, sub: false, under: false, accent: false}})} />
```

Import the factories used above from `remotion-jizura`. In the following example, `font` is your registered FontSpec. Explicit timing requires
`from` and `durationInFrames` on every Cut; declarations can be out of order:

```tsx
<JizuraScene durationInFrames={60} font={font}>
  <JizuraCut text="夜" from={40} durationInFrames={20} />
  <JizuraCut text="朝" from={0} durationInFrames={20} />
</JizuraScene>
```

Frames20–39 show the Scene background. Mixed timing modes, overlaps, fractional
frames and insufficient duration throw an error. `EffectSamples` demonstrates
automatic/fixed/partial/disabled settings; `TimedCuts` demonstrates explicit
placement, a gap and a one-frame Cut.

## Player and integration validation

Pass the component directly to Player. Your web app supplies a reachable font URL:

```tsx
import {Player} from '@remotion/player';
import {LyricsDemo} from './lyrics';

<Player component={LyricsDemo} inputProps={{fontSrc: '/NotoSansJP.ttf'}}
  durationInFrames={120} compositionWidth={640} compositionHeight={360} fps={24}
  controls style={{width: '100%'}} />
```

The repository's parameterized LyricsDemo accepts `fontSrc` as above. JizuraScene
buffers Player playback during font/plan preparation, draws the committed frame,
then unblocks playback. Failures surface through the Player error boundary;
cleanup releases both playback and export handles. Preload/register fonts if you
want to avoid preparation pauses when a new Scene mounts. Scenes own their canvas;
the caller supplies a positioned parent when deliberately layering multiple Scenes.

From the repository root, after preparing the comparison font:

```sh
npm run check:remotion
npm run player:remotion -- --port=3108
npm run studio:remotion -- --port=3107 --public-dir=../dist/remotion/stage04/assets
npm exec --workspace remotion-jizura -- remotion still examples/index.tsx LyricsDemo ../dist/remotion/stage07/example.png --frame=80 --public-dir=../dist/remotion/stage04/assets --browser-executable=/usr/bin/google-chrome
npm exec --workspace remotion-jizura -- remotion render examples/index.tsx LyricsDemo ../dist/remotion/stage07/example.mp4 --public-dir=../dist/remotion/stage04/assets --browser-executable=/usr/bin/google-chrome
# Run these in another terminal; Studio must be running for studio-validation.
node remotion-jizura/tests/scene-browser.mjs
node remotion-jizura/tests/studio-validation.mjs
node remotion-jizura/tests/consumer-validation.mjs
```

The integration harness compares all 120 frames from independent canvas drawing
with two Remotion PNG runs (concurrency 1/2), repeated stills and Player seeks.
It decodes a 640×360, 24fps, 120-frame (5 second) H.264 movie and identifies each
frame against the PNGs. Compression differences are measured separately.
The consumer harness packs locally into ignored `dist/remotion/stage07/pack/`,
creates `/tmp/jizura-stage07-consumer-*`, installs the tarball and peers, checks
public types/exports and compares 11 actual exported frames. It requires npm
registry access or a populated cache (`JIZURA_NPM_CACHE` overrides the cache).
It does not publish. Reports and images are in `dist/remotion/stage07/`.
`JIZURA_BROWSER` overrides the local Chrome path and `JIZURA_STUDIO_URL` the Studio
URL. System ffmpeg/ffprobe are required for these optional validation harnesses.

The initial automatic choices remain the seven listed effects; stage13 adds five explicit-only effects. Numeric `numCuts`,
grapheme-aware typography, audio/BPM/LRC synchronization, Cut overlaps/transitions,
custom effect registration and the remaining legacy groups are outside this alpha.
Chrome154 with the fixed Noto Sans JP file and the pinned dependency versions is
the validated environment. Other browsers, fonts and version combinations can
change metrics/rasterization and have not been certified by these comparisons.

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
fixed static layout. Stage 07 verifies an installed tarball consumer.

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

Font preparation errors include `E_FONT`, the affected Cut path, family/weight/style,
the supplied `src` and its resolved URL, and the original browser error as `cause`.
For missing or invalid files, check that the URL serves a valid font, the Remotion
public directory contains it, and remote servers allow CORS. For this repository's
examples, first obtain the comparison font as described below, then start Studio
with `npm run studio:remotion -- --public-dir=../dist/remotion/stage04/assets`.
The `--public-dir` path is relative to the `remotion-jizura` workspace where the
Studio command runs. Without `src`, register a matching face before mounting.

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
Cut boundaries, Sequence offsets, reverse seeks and video updates. Stage 06 separately verified all seven effects
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
Noto Sans JP 700, 640×360 and 24fps. Stage07 adds PartA/PartB, Player and external
consumer evidence; it does not expand the validated browser/font matrix.

## Development

For repeatable effect ports, use the stage12 [porting workflow](../docs/remotion/PORTING.md)
and [review template](../docs/remotion/PORT-REVIEW-TEMPLATE.md). After building and preparing
the fixed comparison font, run `node remotion-jizura/tests/port-validation.mjs` from
the repository root. `--list`, `--case=combined,custom,image-combined`, `--stills-only`,
`--compare-to=/absolute/completed/run` and deliberate `--inject` failures are documented
there. It saves representative PNGs, selected short movies, inputs, measured geometry,
environment and separate technical/visual/user review data in a new ignored run directory.
Text uses the default GL condition; native image cases use software WebGL2 swangle.
Generated runs start as candidates, and user visual acceptance remains separate.

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
| `test:remotion` | Build, then 64 Node contracts; font resource tests use mocks |
| `build:remotion` | ESM JavaScript and declarations in `remotion-jizura/dist/` |
| `check:remotion` | Typecheck and Node contracts, including build |
| `studio:remotion` | Local Remotion Studio for `examples/studio-entry.tsx` / `StudioRoot.tsx` |
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
release is part of this work. The stage07 consumer uses a real installed tarball.

[MIT License](LICENSE). React and Remotion retain their own dependency licenses;
[Remotion terms](https://www.remotion.dev/docs/license) apply to Remotion use.
