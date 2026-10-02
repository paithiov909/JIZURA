# remotion-jizura

Initial ESM package scaffold on the `remotion` branch, version `0.1.0-alpha.0`.
Stages 03–04 implement parsing, declarations, planning, font preparation and
static text drawing. The current preview displays the first planned Cut;
Cut time selection and motion are implemented in stages 05–06.
The complete target contract is maintained in the repository at `docs/remotion/API.md`.

```tsx
import {JizuraScene} from 'remotion-jizura';

// Inside a Remotion Composition or Player (example: 640×360, 24 fps).
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
then measure and draw static glyphs. Standalone Cut and unsupported children
throw `E_CHILD`. Unknown IDs, mismatched groups and invalid parameters throw
`E_EFFECT`; invalid numbers, text and Style have their contracted error codes.
Use `enter={null} exit={null} hold={null} decor={[]}` for static examples. Effect
declarations are validated, but their motion/decor and the full center layout
are not drawn yet. External consumers are tested in stage 07.

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
overrides other defined fields; emphasis changes glyph color only. Static drawing
keeps manual newlines, uses automatic track 0.06, and fits within the canvas.
Explicit center track takes precedence over Style.track. The full center reflow,
scale, offsets and ornaments are assigned to stage 06. Cut palette.bg does not
replace the Scene background. Geometry and measurement caches are Scene-owned.

Stage 04 verified the horizontal static subset against retained font/text code in
Chrome154 with the same Noto Sans JP file: four cases had zero pixel differences.
Real Studio display and 960×540 Remotion PNGs were checked separately. This does
not establish effect, Cut-boundary, Sequence, Player or video-update compatibility.

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
| `test:remotion` | Build, then 30 Node contracts; font resource tests use mocks |
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
