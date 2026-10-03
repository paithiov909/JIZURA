# First effect batch

`FirstEffectBatch.tsx` imports the five stage13 factories from the public package.
Register `FirstEffectBatch` (640×360, 24fps, 60 frames) or open
`/?batch&candidate=combined` with `npm run player:remotion -- --port=3108`.
The catalog's five new records also select this component. Studio registers
`FirstEffectBatch` with literal candidate/amount/rotAmp default props.

Candidates are `mixed`, `slideLeft`, `shrink`, `jitter`, `brackets`, and `combined`.
They share explicit timing, seeds, font and parameters. Mixed uses one glyph per
item; slideLeft therefore enters those items together, and shrink contracts each
item at its own center. The shrink-only example also uses breathe to expose the
size/spacing interaction. The catalog's movie for shrink shows that combination.
`amount` adjusts jitter displacement; `rotAmp` adjusts mixed item rotation.
The example is a small comparison, not the stage14 integrated review loop.

Prepare the fixed font in `dist/remotion/stage04/assets`, then run from repo root:

```sh
npm run check:remotion
node remotion-jizura/tests/port-validation.mjs --case=mixed,slideLeft,shrink,jitter,brackets,batch --output=dist/remotion/stage13
node remotion-jizura/tests/batch-consumer.mjs
node remotion-jizura/tests/catalog-browser.mjs
```

The consumer command packs/installs in `/tmp`, checks public types and deep-import
rejection, compares six candidates × five PNG frames with local Remotion output,
and creates `dist/remotion/stage13/{candidate}.mp4` plus filmstrips (60 frames,
concurrency1). It also runs the prior 11-frame external-consumer regression.
It needs the root dependencies, local Chrome, ffmpeg/ffprobe and npm cache/registry
access. No release is published. Catalog movie serving is development-only.

The port harness additionally covers 2/9/10/16 glyphs, long portrait input,
newlines/spaces/emphasis, bounds, one-frame Cut, quantized jitter and serial/parallel
rendering. New runs are technical regression candidates, never automatically
adopted baselines. Agent visual inspection and user design approval are recorded
separately in [stage13](../../../docs/remotion/13-first-effect-batch.md).
