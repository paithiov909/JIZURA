# remotion-jizura

Initial ESM package scaffold on the `remotion` branch, version `0.1.0-alpha.0`.
Stage 02 implements an **empty Scene only**. It is not a lyric renderer yet.
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
Only empty Scene behavior is implemented. Nonempty children, `seed`, `font`,
`style`, `motionFps`, parser and factories throw a `JizuraError` with code `E_INPUT`
and the pending input/API as `path`; standalone Cut throws `E_CHILD`.
Other unsupported child types throw `E_CHILD`. These are temporary scaffold errors,
not the final validation of those inputs.
Stage 03 adds declaration collection, parser, validation, seeds and planning;
stages 04–06 add fonts, text drawing and motion. Full API examples are not runnable yet.

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
| `test:remotion` | Build, then Node scaffold contracts (no font/effect/pixel comparison) |
| `build:remotion` | ESM JavaScript and declarations in `remotion-jizura/dist/` |
| `check:remotion` | Typecheck and scaffold contracts, including build |
| `studio:remotion` | Local Remotion Studio for `examples/index.tsx` |
| `still:remotion` | Frame 0 PNG, `dist/remotion/still.png`, 640×360 |
| `render:remotion` | H.264 MP4, `dist/remotion/empty.mp4`, 24 frames at 24 fps |

The browser flag is optional; without it Remotion may download Chrome Headless Shell.
Use a local Chrome/Chromium executable for offline rendering. The CLI includes its
render/encoding tools; system ffprobe/ffmpeg are only used for optional output QA.
Studio needs a local available port (default 3000). Each Studio/still/render command
builds the package before importing its public entry. Rendering needs the browser's
Linux runtime libraries. Fonts and network font loads are not used in stage 02.
CLI reference: [Studio, still and render](https://www.remotion.dev/docs/cli).
Generated bundles, images, videos, reports and caches belong in ignored `dist/`.

The root entry exposes ESM imports and declarations; CommonJS `require` is not a
supported entry. Pack includes only built `dist/`, README, LICENSE and npm's
manifest. Source does not import the old engine/effects or other repository code.
Examples and tests are development-only. `prepack` builds locally; no publish or
release is part of this stage. External consumer validation is assigned to stage 07.

[MIT License](LICENSE). React and Remotion retain their own dependency licenses;
[Remotion terms](https://www.remotion.dev/docs/license) apply to Remotion use.
