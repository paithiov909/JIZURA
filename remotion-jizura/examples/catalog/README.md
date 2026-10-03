# Effect discovery (stage 11)

From the repository root, run the existing Player server:

```sh
npm run player:remotion -- --host 127.0.0.1 --port 3108
```

Open `http://localhost:3108/?catalog`. The list contains seven built-in text/decor
effects, the package's native sliceGlitch, three caller-owned stage09 definitions,
and standard Remotion blur. The latter four require their explicit imports; the
package catalog does not register them. Legacy candidates are kept in a separate
[inventory](../../../docs/remotion/EFFECT-CANDIDATES.md), outside executable search.

Use the three usage buttons, a name/tag/condition substring, or a group. Click a
candidate to inspect its description, conditions, limitations and parameters,
then seek/play the embedded real Player. The initial frame is its representative
frame. “比較例を開く” opens the existing review/custom/image example; review links
preselect the single-effect stage08 candidate. Custom entries show the same three
definitions together. Native-image links select glitch or standard mode, while
their representative movie shows the combined stage10 example. It is not an
isolated movie for either effect.

Suitability is an editorial hypothesis, not a design approval or a promise for
every font, text length or aspect. The fixed 640×360 Japanese example gives a
starting point. Kasumi is dark with the fixed palette; a “quiet” motion can become
distracting with larger custom amplitude or longer text. Strong blur hides detail.

`getEffectCatalog()` returns eight deeply frozen, serializable package entries.
`searchEffects(query?, entries?)` filters those by default; pass `exampleCatalog`
from `entries.tsx` to include the caller examples. All filters must match. Text
uses NFKC/case-insensitive substrings, whitespace-separated tokens use AND, and
tags/uses/conditions use exact case-insensitive values. Source order is retained.
There is no natural-language ranking, embedding service, executable factory lookup,
or automatic registration. For AI-authored code, inspect group/kind/origin first,
then import the appropriate factory and use its actual types.

```tsx
import {getEffectCatalog, searchEffects} from 'remotion-jizura';
import {exampleCatalog} from './entries.tsx';
const quiet = searchEffects({uses: ['静かな保持']}, exampleCatalog);
const accents = searchEffects({group: 'decor', uses: ['控えめな装飾']}, exampleCatalog);
const punch = searchEffects({uses: ['短いキメ']}, exampleCatalog);
const image = searchEffects({group: 'image', conditions: ['2d']}, getEffectCatalog());
```

`CatalogEntry.parameters` distinguishes seeded omitted built-in values from fixed
schema defaults. For built-ins, use `resolveScene` to obtain actual values, or set
all options explicitly. `usage: "ignored"` means a legacy shared parameter is
accepted but has no effect here. Kasumi uses n/right; checkerStrip uses
v/right/low/accent. Seeds are factory options, not those shared params.
Numeric `bounds: "input"` describes accepted bounds; `exclusiveMax` covers r<1.
`bounds: "editor"` is an editor range: standard blur radius is required and finite,
its schema says 0–100/default40, and the visual example passes 4 explicitly.
Neither a catalog record nor its default values are an executable declaration.

The local Vite server serves generated MP4s through `/catalog-media/stageNN/file.mp4`.
Generate them with the existing commands when missing:

```sh
node remotion-jizura/tests/review-browser.mjs
node remotion-jizura/tests/custom-browser.mjs
node remotion-jizura/tests/image-effects-browser.mjs
```

These need the stage04 Noto Sans JP font, Chrome and ffmpeg; see the
[review prerequisites](../review/README.md) and [native image prerequisites](../image-effects/README.md).
The media route is local development middleware, not an asset-distribution system.
Static production builds do not bundle these ignored movies.

Stage11 checks:

```sh
npm run check:remotion
node remotion-jizura/scripts/inventory-legacy.mjs
node remotion-jizura/tests/catalog-browser.mjs
node remotion-jizura/tests/consumer-validation.mjs
```

`catalog-browser.mjs` reads prior stage08/09/10 Player PNGs and generated movies,
so run those commands first on a clean checkout. It checks all twelve preview
links/frames and three query examples, comparing raw pixels with the original
components in the same current browser. Older-run pixel differences are recorded
separately: stage11 uses swangle for native images, while old text checks did not
specify that backend. This does not establish a general pixel tolerance.
It writes PNGs/UI screenshots and metadata to ignored `dist/remotion/stage11/`
and does not adopt new baselines. The consumer checks the real tarball's new search API/types and the
original eleven Remotion PNGs; the stage07 scene report must also exist.
