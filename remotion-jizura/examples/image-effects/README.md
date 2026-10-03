# Native image effects experiment (stage 10)

`ImageEffects` wraps JIZURA in Remotion's public `HtmlInCanvas`, combining
standard WebGL2 `blur()` with Canvas2D `sliceGlitch()` in an ordinary `effects`
array. Scene/Cut props stay unchanged. The same slice factory runs on
`CanvasImage` using a caller-authored SVG, independent of lyrics and fonts.

Use Chrome149+ with `chrome://flags/#canvas-draw-element` enabled for Studio and
Player. Remotion enables it for rendering. Our fixed Chrome154/Linux test uses
`{gl: 'swangle'}` for software WebGL2 blur, and `pixelDensity={1}`. Keep one
HtmlInCanvas wrapper: nesting is rejected by the pinned Remotion4.0.532.
Other GPU/browser/OS paths have not been measured.

```sh
npm run studio:remotion -- --port=3110 --no-open --public-dir=../dist/remotion/stage04/assets
npm run player:remotion -- --port=3108
```

Choose `ImageEffects` in Studio, or open `http://localhost:3108/?image-effects`.
The fixed font is required for lyrics/scene. `@remotion/effects@4.0.532` is an
example dev dependency; a caller using standard blur installs it separately.
The packed library imports only its existing peers, including `remotion`.

| Input | Meaning |
| --- | --- |
| target=lyrics | Transparent lyrics/decor only; put an unaffected backdrop outside the wrapper |
| target=scene | Process lyrics plus Scene background |
| target=image | Apply the same image effects to an SVG through CanvasImage |
| mode=combined / reverse | blur → slices / slices → blur |
| mode=standard / glitch / disabled | Only blur / only slices / both descriptors disabled |
| amount / blurRadius | Slice intensity / standard blur radius |
| offset | Sequence start; effect time stays Sequence-local |

`imageEffectCuts` feeds both JIZURA and `resolveScene()`. Resolved `[12,48)` and
`[60,96)` intervals trigger the effects; Cut seed and `frame - cut.from` determine
the pattern. Gaps disable both descriptors. The image remains visible in gaps;
transparent lyrics are empty. Local frame120 unmounts the example Sequence.
Default Composition duration144 leaves room for an offset24 test.
`rate` is an independent pattern frequency, default12/second; Scene.motionFps
does not quantize it. This is caller code, not a new `Cut.fx` contract.

Keep literal `effects={[blur(...), sliceGlitch(...)]}` arrays for native editing.
Studio's save backend persisted displacement .05 → .1 → .05 in the array;
full reload and separately bundled PNGs confirmed the changes and restoration.
Amount/seed/frame/fps/disabled are expressions here and Studio reports them as
computed. Edit intensity through Composition `amount`, or change caller code.
The checker does not claim a manual Inspector/Save-button run. Player inputs,
Studio source and saved JSON are not automatically synchronized.

```sh
npm run check:remotion
node remotion-jizura/tests/image-effects-browser.mjs
# While Studio is running:
node remotion-jizura/tests/image-effects-studio.mjs
# After browser validation; also needs stage07's scene result:
node remotion-jizura/tests/image-effects-consumer.mjs
```

Requires the stage04 font, Chrome, ffmpeg/ffprobe, and npm cache/registry for the
consumer. Ignored `dist/remotion/stage10/` holds input JSON, Player/export PNGs,
`image-effects.mp4`, 1080p samples, environment/hash reports and Studio/consumer
results. The Studio checker restores source and detects concurrent edits.

45 PNG comparisons: 26 raw RGBA matches; 19 with RGB delta at most1, identical
alpha and integer premultiplied RGB. Direct canvas PNG and Chromium screenshot
unpremultiply differently at some transparent edges. This is a fixed-environment
capture condition, not a general GPU tolerance. The 120-frame MP4 is lossy and
checked separately. See the [stage10 memo](../../../docs/remotion/10-remotion-effects.md)
for measured performance, reference adaptations and remaining limits.
