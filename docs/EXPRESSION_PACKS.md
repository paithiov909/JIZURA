# JIZURA expression packs — contributor guide

JIZURA is a browser lyric-video (文字PV) engine: lyrics → timed "cuts", each cut = one **layout** (composition) +
**enter** (entrance) + **hold** (idle motion) + **exit** + 0..n **decor** graphics (+ treatment / background / camera / fx,
which are handled by other packs). Everything renders into a Canvas2D in *design space* and is deterministic from a seed.

A pack is a source module in `effects/packs/<pack>.ts`, explicitly imported and installed in
`effects/index.ts`. New packs do not edit engine core files. They are included in the build;
there is no runtime downloading or third-party plugin loader.

Read `effects/core/animation.ts`, `effects/core/layouts.ts` (`mainDraw`, `drawFx`),
`effects/core/decor.ts`, `engine/text.ts` (text items) and `engine/renderer.ts` (drawing helpers).
`effects/types.ts` defines the group callbacks, metadata and AE declarations.

## Source registration contract

```ts
// effects/packs/example.ts
import { defineEffectPack, installEffectPack } from '../registry.ts';
import type { EffectRuntime } from '../types.ts';

const pack = defineEffectPack({
  id: 'example',
  install({ register }) {
    register('hold', 'examplePulse', {
      name: '呼吸の例', tags: ['calm'], w: 0.5,
      aeSupport: {
        kind: 'fallback', id: 'breathe',
        reason: 'No dedicated ES3 port; use the built-in breathing motion.',
      },
      apply(env, item, amount) {
        item.sx = (item.sx || 1) *
          (1 + 0.02 * Math.sin(env.ltb * 2) * amount * env.fx.motion);
      },
    });
  },
});
export default function install(engine: EffectRuntime): void {
  installEffectPack(engine, pack);
}
```

Import the installer in `effects/index.ts` and append `['example', installExample]` to
`PACK_STAGES`. Keep the existing sequence intact: registration order affects seeded picks.
The existing `CORE_ORDER` is captured before packs, and set marking runs after packs.
A test-only version of this example is retained in `tests/effects/example-pack.ts`; it is
excluded from production, so it adds no IDs to the baseline registry.

`register(group, id, definition)` requires a unique camelCase ID **within that group**, a
nonempty `name`, `tags`, a finite nonnegative `w`, the group's callbacks (and `layer` for decor),
and `aeSupport`. Registration rejects duplicates even within the same pack, before updating
registry or order. Types prevent using one group's callback contract for another group.
`name` is the short Japanese UI label (normally 2–7 characters). Translate new labels using
the locale dictionaries/label installers; AE/CEP distributions support Japanese and English.
`tags` may contain `glitch calm pop graphic editorial emotional horror`; `w` is the base pick
weight (1 normal, 0.4–0.7 for specific looks, 1.2–1.5 for general-purpose ones).
`special`, `set`, `wa` and `extra` are optional selection metadata.

The runtime still exposes `engine.register(group, id, definition, pack)` and `registerAll`
through the compatibility facade, with the same validation. New packs use this strict
contract. Migrated baseline modules alone use `registerBaseline`/`registerBaselineAll`:
the original implicit tags/weights and absent core `pack` fields are preserved to keep
exported AE metadata byte-for-byte equivalent. Baseline AE ports are explicitly declared in
`effects/ae-implementations.ts`. `EffectValue` names dynamic item extensions and parameter
bags in preserved algorithms; this does not claim that every drawing helper is fully typed.

## Design space & environment

Design size by aspect: 16:9 1920×1080 · 9:16 1080×1920 · 4:3 1440×1080 · 3:4 1080×1440 · 1:1 1440×1440 · 4:5 1440×1800 · 21:9 2520×1080.
Always position/size relative to `W`/`H` (and `Math.min(W, H)`); every layout must look right in landscape AND portrait.

Every render/draw/apply receives `env`:

| field | meaning |
|---|---|
| `ctx` | CanvasRenderingContext2D, already transformed to design space (and camera) |
| `W`, `H` | design size |
| `sc` | colour scheme: `bg fg sub accent accent2 ink dim ghostA ghostB` (+ optional `grad:[a,b]`). `ink` = sticker/plate colour, `dim` = faint background-text colour. Use ONLY these colours (plus `#000/#fff` for contrast decisions via `J.lum`). |
| `st` | style pack: `st.fonts.display/serif/body/mono` = arrays of font keys |
| `fx` | sliders 0..1: `motion glitch chroma decor density texture bgSwitch` |
| `cut` | `text` (this cut's text), `lineText` (whole lyric line), `note`, `line` (index), `index`, `start end dur inDur outDur`, `params` (your plan() output), `seed`, `emph` (emphasised), `words` (chunks) |
| `lt` | local time since cut start (s). **Lagged per pass** (see ghosts) |
| `ltb` | `lt` + pass lag — use this for continuous motions (scrolling, rotation) so ghosts trail correctly |
| `pIn`, `pOut` | 0..1 entrance / exit progress of the cut |
| `step` | integer random clock (≤24 Hz) — use for flicker / jitter randomness |
| `pass` | `'B'`, `'A'` (chromatic ghost passes, drawn first, tinted) or `'main'` |
| `scale` | design→pixel scale (for pixel-sized strokes / filters) |
| `allowFilter` | false in fast preview — skip `ctx.filter` blur when false |
| `energy` | 0..1 audio loudness or null · `beat` = `{since, len, index}` or null |

### Chromatic ghost passes (important)
Each layout `render` / decor `draw` is called THREE times per frame: pass B, pass A (time-lagged, drawn in a single ghost colour
under the main image) and pass main. The env helpers handle this for you:
- `env.draw(item)` / `J.mainDraw(env, item)` — text; ghost passes draw the same glyphs in the ghost colour. Set `ghost: false`
  on secondary text that should NOT get chromatic ghosts.
- `env.rect(x, y, w, h, color, alpha = 1, ghost = true)`, `env.line(pts, color, lw, alpha, ghost)`, `env.polyPartial(pts, e, color, lw, alpha, ghost)`,
  `env.circle(cx, cy, r, fill, stroke, lw, alpha, ghost)`, `env.arc(cx, cy, r, a0deg, a1deg, color, lw, alpha, ghost)`,
  `env.rrect(x, y, w, h, r, fill, alpha, ghost, stroke, lw)`, `env.poly(pts, color, alpha, ghost)`, `env.blob(pts, color, alpha, ghost)`.
  With `ghost=false` the shape is drawn in the main pass only. Use `ghost=true` only for bold graphic shapes that should split.
- If you draw with `ctx` directly (gradients, clip paths, images…) you MUST guard it: `if (env.pass === 'main') { … }`,
  otherwise it is drawn 3× in its real colours. `ctx.save()/restore()` around any transform/clip/alpha/composite change.

## Text items (`J.drawItem` model)

`{ text, font, size, x, y, color, align:'center'|'left'|'right', vertical, lead, track, sx, sy, rot, skew, alpha,
   fill (default true), stroke (px), strokeColor, strokeUnder, strokeDash:[a,b], gradient:[c1,c2] or [[offset,colour],…],
   pattern:'dots'|'stripes'|'hatch'|'grid'|'lines' (+patternColor, patternBg), shadow:{color,blur,dx,dy}, extrude:{n,dx,dy,color,fade,a},
   fillAlpha, dash (0..1 stroke draw-on progress), blur, blend, ghost:false, mi (motion index for stagger), plain:true (skip treatments),
   enter/exit/hold (per-item override keys), noHold }`
Glyphs are centred on `(x, y)` (multi-line via `\n`; `lead` = line spacing factor). `J.measure(item)` → `{w, h, lay}`,
`J.fitSize(text, font, maxW, maxH, {sx, sy, track, lead, vertical})` → size that fits, `J.itemBox(item)` → `{x0 y0 x1 y1 w h cx cy}`,
`J.splitLines(text, maxPerLine)` balanced Japanese line breaks, `J.glyphCount(text)`, `J.fontsOf(st, ['display','serif'])` → font keys,
`J.metrics.adv(fontKey, ch)` advance in em. Fonts: `gothic_black gothic_bold gothic_med gothic_light dela zenkaku mincho_black mincho_bold
mincho mincho_light tokumin round pop dot brush mono sansui` — prefer the style's role fonts (`st.fonts.*`).

`J.mainDraw(env, item)` draws the lyric WITH the cut's enter/hold/exit/treatment applied and returns its bbox
`{x0,y0,x1,y1,cx,cy,boxes}` (or null while hidden). `env.draw(item)` draws plain text (no motion) — use it for secondary text.
Combine boxes with `J.unionBB(a, b)`; fall back with `J.centerBB(env, bb)`.

Motion extras an enter/exit/hold may set on an item: `clip:[x0,x1]` (horizontal window), `clipY:[y0,y1]`, `clipFn(ctx, env, it)`
(add a path; it becomes the clip), `bands:[[y0,y1,dx],…]` (horizontal slices shifted), `vbands:[[x0,x1,dy],…]` (vertical slices),
`streak:{n,dx,dy,a}` (motion-trail copies), `echo:{n,dx,dy,a,decay,scale,rot,outline,color}` (stepped copies behind),
`wipeBar:{x,h}`, `cursorAt`, `pre(env,it)` / `post(env,it,bb)` hooks, plus any item field above.
Helpers: `J.itemBands(env, it, n, (i,n)=>dx)`, `J.itemVBands(env, it, n, (i,n)=>dy)`.
Per-glyph functions: push `(i, g, n) => ({dx, dy, rot, s, sx, sy, a, color, ch, hide, skew, blur, outline, clipX:[a,b], clipY:[a,b]})`
into `it.charFns` (`i` glyph index, `n` glyph count, `g` glyph layout with `g.w g.h g.x g.y`; clipX/clipY are fractions of the glyph box,
centre 0, e.g. `clipY:[-0.7, 0.2]` shows the top part). Return `null` for "no change". Per-stroke-piece functions (advanced):
`it.pieceFns.push((ci, pj, piece, ox, oy) => J.PT(dx, dy, rot, s, stretch, stretchDir, a))`, return `J.PID` for rest and `null` for hidden;
set `pieces: true` on the recipe (see `assemble`, `explode` in effects/core/animation.ts).

## Randomness, easing, colour
Deterministic only — never `Math.random()` in render/draw/apply. In `plan(rng, …)` use `rng()`, `rng.range(a,b)`, `rng.int(a,b)`,
`rng.pick(arr)`, `rng.chance(p)`. At render time hash: `J.r(a,b,c,d,e)` 0..1, `J.rs(…)` −1..1, `J.rr(lo,hi,…)`, `J.h(…)` uint, keyed by
`env.cut.seed`, `it.seed`, index, `env.step`. `J.noise1(x, seed)` smooth noise. Easing `J.E.lin inQuad outQuad inCubic outCubic inOutCubic
outExpo inExpo inOutExpo outBack(x, s) outElastic inOutSine`. `J.clamp(x,a=0,b=1) J.lerp J.smooth(a,b,x) J.TAU J.DEG`.
Colour: `J.lum(hex)` 0..1, `J.mix(a, b, t)`, `J.rgba(hex, alpha)`, `J.fitContrast(hex, bg, ratio)`. Script tests: `J.isKanji J.isHira J.isKata J.isLatin J.isPunct J.isSmallKana`.
`J.romaji(kana)` (null when kanji present), `J.fmtTime(t)`.

## Group contracts

**layout** `{ name, tags, w, fits(n) → bool (n = glyph count without spaces, 1..30), plan(rng, cut:{text,n,W,H,dur}, st) → params (plain JSON: numbers/strings/bools/arrays, no functions), render(env) → bbox|null,`
optional `portrait` (weight multiplier when H > W, e.g. 0.5 if it is weak in portrait), `emph` (weight multiplier on emphasised lines), `treat: false | 'safe'` (false = no text treatments; 'safe' when the lyric sits on your own coloured plate), `busy: true` (you fill the whole screen → busy backgrounds are suppressed), `enterBias: {enterKey: mult}` }`
- The lyric itself MUST go through `J.mainDraw` (so every entrance/exit/treatment works on it); use `mi` on multiple items for stagger.
- Your own secondary graphics must animate IN (use `env.lt`, e.g. `E.outExpo(J.clamp(env.lt / 0.35))`) and OUT (`1 - E.inCubic(env.pOut)`).
- Keep the lyric inside a ~5% safe margin at rest in every aspect; handle 1–16 glyphs (use `fits` to exclude what can't work) and latin text with spaces.
- Params are chosen in `plan` (variety per cut: pick among 2–4 variants, sizes, directions…), render reads `env.cut.params`.

**enter** `{ name, tags, w, apply(env, it, p, ctx) }` — `p` 0→1 (already delayed per item by `it.delay`); `ctx = {dur, inDur, outDur}`.
Mutate the item / push charFns so that p=0 is "not yet visible" and **p=1 is exactly the resting item** (no leftover offset/alpha).
Optional: `inDur(dur, n) → seconds` (default clamp(dur*0.36, 0.12, 0.6)), `minDur` (avoid on cuts shorter than this), `maxChars`, `pieces: true`.
apply() is only called while p < 1.

**exit** `{ name, tags, w, apply(env, it, p, ctx) }` — p 0 (resting) → 1 (**fully gone**: alpha 0 / off-screen / hidden). Optional `outDur(dur, n)`, `minDur`.

**hold** `{ name, tags, w, apply(env, it, amt, ctx) }` — continuous idle motion while the cut rests; `amt` 0..1 ramps in after the
entrance and out during the exit; the effect must scale with `amt` (0 = no change) and `env.fx.motion`. Use `env.lt`/`env.ltb`, `env.step`, `env.beat`. Subtle > loud.

**decor** `{ name, tags, w, layer: 'back'|'front', subtle?: true (ok behind busy layouts), draw(env, bb, P) }` — `bb` = lyric bbox (may be null → `J.centerBB(env, bb)`).
`P = {id, seed, n (1..3), right, low, accent, corner, big (bools), mode, from, to, v (int 0..5 variant), r (0..1)}` — use them for variety.
Animate in over the first ~0.3–0.5 s of `env.lt`, out with `env.pOut`. Front decor must not cover the lyric bbox (stay around/outside it);
back decor sits under the text — keep it low-contrast (`sc.dim`, `sc.sub`, low alpha) unless it is small.

**treat** `{ name, tags, w, safe?, plan?(rng, st) → params, apply(env, it, P) }` — text treatment applied to EVERY main item of a cut
(whole lines, single chars, vertical, rotated, huge) before enter/hold/exit run. Skip items with `it.fill === false` or low alpha
(layouts' secondary copies). Keep `it.color` as the text colour; pick complementary colours from `env.sc` with `J.lum` checks.
`safe: true` only if it still looks right when the lyric sits on a coloured plate (layouts marked `treat:'safe'` get only safe ones).
Markers/boxes/underlines use `it.pre` / `it.post` hooks (they run in every pass — use the env helpers' ghost flag deliberately).

**bg** `{ name, tags, w, subtle?, plan?(rng, st) → params, draw(env, P) }` — full-screen background graphic, drawn ONCE per frame (main
pass only, not affected by the camera) after the scheme's bg fill, before any text. Chosen per lyric line, so continuous motion should
use `env.t` (absolute time). Keep contrast LOW so text on top stays readable. `subtle: true` = allowed behind busy layouts.

**cam** `{ name, tags, w, strong?, plan?(rng, st) → params, get(env, P) → {x, y, s, rot, sx, sy, skx, blur} }` — transform of the cut's
content around the screen centre (design px / degrees). Called per pass with lagged time. Keep the lyric on screen (|x|,|y| ≤ 5%,
s 0.92..1.15, rot ≤ 5°); big moves only briefly and they must settle. Scale by `env.fx.motion`; `strong: true` for aggressive moves.

**fx** `{ name, tags, w, glitchy?, edge? (default true), mid?, dur (frames @24fps, default 4), pre (frames before the cut boundary),
amp, scratch?, ae?, draw(ctx, ev, k, info) }` — post-processing in DEVICE pixels (identity transform). `info = {cw, ch, S (copy of the
frame when scratch:true), sc, st, step, t, scale, allowFilter, opt, tmp(w,h), tmp2(w,h)}`; `k` 0..1 progress, `ev.amp` intensity.
Leave ctx state clean. No getImageData on full frames. `ae` = the closest After Effects event type
(`chroma shake slice block invert flash zoom mosaic`) or omit.

**trans** (カット間のつなぎ) `{ name, tags, w, dur (seconds, default 0.35), plan?(rng, st) → params, draw(ctx, A, B, p, info) }` — how a
cut takes over from the previous one. `A` = canvas with the previous cut's resting frame, `B` = canvas with this cut's frame (both full
device-pixel size), `p` 0→1 (linear; ease it yourself). Draw the complete composite into `ctx` (identity transform, same size) — at p=0
it must look exactly like A, at p=1 exactly like B. `info = {cw, ch, sc, scPrev, st, P, step, t, scale, allowFilter, seed, tmp(w,h)}`.
The planner turns the previous cut's exit and this cut's entrance into plain cuts when a transition is used.

**style** (配色セット) — added directly to `J.STYLES` + `J.STYLE_ORDER` (see engine/styles.ts for the full schema): `{ name, desc,
moods: [mood keys], schemes: [2–4 × {bg, fg, sub, accent, accent2, ink, dim, ghostA, ghostB, grad?, paper?}], fonts: {display, serif,
body, mono}, texture: {grain, paper, scan}, ghost, bias: {layout, enter, exit}, decor: {decorKey: weight}, hud, glow?, glitchBoost?, useGrad? }`.

### After Effects implementation or fallback

Every new effect in **every group** must declare `aeSupport`:

- `{ kind: 'implementation', id: '<same stable ID>' }` requires a dedicated ES3 implementation
  registered in `ae/*.jsx`, plus that ID in the source catalog `effects/ae-implementations.ts`.
- `{ kind: 'fallback', id: '<existing AE ID in this group>', reason: '<why>' }` explicitly
  substitutes a ported effect. Validation reports the group, source ID, target and reason.
  Registration sets the existing `ae` metadata field for the AE planner; project JSON and
  AE plan version 2 keep the browser ID, with the AE registry resolving the fallback.

`npm run build` validates registrations before any target builds. `npm run check:effects`
loads the freshly built Japanese and English ES3 registries and compares their actual IDs
with the source catalog. A declaration is not evidence of a successful Adobe render.
Legacy `ae` counterpart fields and `engine/ae-plan.ts`'s `AE_MAP` remain unchanged for existing
entries. They are planning/export compatibility metadata, separate from the direct port
used when AE implements the original ID. Never change an existing ID or saved-plan schema.

### Fonts
Catalogue keys: `gothic_black gothic_bold gothic_med gothic_light dela zenkaku mincho_black mincho_bold mincho mincho_light tokumin
round pop dot brush mono sansui` + newer faces `reggae` (Reggae One, rough heavy display) `rampart` (Rampart One, 3D outline display)
`potta` (Potta One, brush pop) `kiwi` (Kiwi Maru, soft round) `klee` (Klee One, handwritten pencil) `shippori` (Shippori Mincho B1,
elegant heavy mincho). Faces are fetched lazily only when a plan uses them, so prefer the style's role fonts (`st.fonts.*`).
(When Google Fonts cannot be reached, sheets render with system fallback fonts — judge layout and motion, not the typeface.)

### 追加分 / 和風 (random-pick sets)
`effects/sets.ts` decides what random picks may use. Entries from packs not listed in `J.BASE_PACKS` count as 追加分 (extra) and
are only picked at random when the project's 「追加分の演出も使う」 switch is on. Entries built around a traditional Japanese
object, pattern or motif (提灯, 障子, 扇, 家紋, 青海波 …) must be listed in `J.WA` (or carry `wa: true`) so the 「和風の演出も使う」
switch can leave them out. New styles are extra unless listed in `J.BASE_STYLES`; new fonts belong in `J.EXTRA_FONTS`.

### Part sets with their own switch (文字PV系 / キネティック / ホラー)
Packs named `typo`, `kinetic` or `horror` (or entries with `set: '<name>'`) belong to a set with its own switch
(`project.typo` / `project.kinetic` default on, `project.horror` default off) instead of 追加分. Styles join a set with `set: '<name>'`.
The ホラー mood (`J.MOODS.horror`) is offered by おまかせ only when the horror switch is on, and おまかせ uses horror entries only in that mood.
Keys use a set prefix (`ty`, `kn`, `hr`); new sets need an entry in `J.SETS` (effects/sets.ts) and a switch in the UI.

### Avoid near-duplicates
Before designing, list what already exists in your group: `node -e` is not enough for visuals — run
`python3 dev/overview.py <group> out/ov t_all` (after `python3 dev/build_test.py all --all-packs`) and look at the grid. Every
new entry must be recognisably different from all existing ones (different motion principle, composition or graphic idea — not the
same thing with other numbers).

## Performance & robustness
Budget ≈ 2 ms per call at 1080p. No `getImageData`, no canvas creation per frame (cache on a module-level Map keyed by params if you must
pre-render), no unbounded loops (cap counts). Guard against `bb === null`, empty text, 1-glyph text, very long text. No exceptions.

## Testing loop (do this for every entry)
```
python3 dev/build_test.py <pack> effects/packs/<pack>.ts          # builds dev/www/t_<pack>.html (core + your pack only)
(cd dev/www && python3 -m http.server 8765 &)                 # once
python3 dev/pack_sheet.py --page t_<pack> --group layout --ids key1,key2 --out out/<pack>
```
Requirements: Python 3 with `playwright` (Chromium) and `Pillow`.
The sheet tool prints console problems per entry (must be zero) and the slowest frame, and writes one contact sheet PNG per id
(layouts: 4 texts × 16:9/9:16/4:3/1:1 + a timeline row; enter/exit/hold: frames across the motion on 4 layouts; decor: 4 setups × time).
Look at every sheet critically — overlapping text, text off-screen, ugly spacing, flat or identical-to-existing motion, leftovers at p=1,
graphics that pop instead of animating. `python3 dev/build_test.py all --all-packs && python3 dev/smoke_all.py t_all` renders every
entry in many combinations; `python3 dev/overview.py <group> out/ov t_all` makes one overview grid per group (groups: layout enter exit hold decor treat bg cam fx trans style).
`python3 dev/cost_scan.py t_all 45` lists entries whose frames take longer than 45 ms.
Run `npm run typecheck`, `npm run test:effects`, `npm run test:engine` and finally `npm run check`. All production/release outputs stay in ignored `dist/`.

## After Effects
The AE panel has its own ES3 registry: `jzReg(group, key, def)` in `ae/05_reg.jsx`, core
entries in `ae/20_motion.jsx` … `ae/45_core.jsx`, and one file per ported pack (`ae/p_*.jsx`).
`npm run build:ae` exports browser planning metadata into ignored `dist/.inputs/ae/data.json`
and builds both languages. The weights, tags, selection flags, fits tables and durations keep
both planners in step. For an effect without an AE port, the AE planner uses its declared
`ae` fallback (`AE_MAP` in `engine/ae-plan.ts` still overrides legacy counterparts).

Run `npm run check` for both language builds, ES3 syntax, catalog validation and AE
object-model mocks; `npm run test:ae` reruns the model suites after a build. These mocks do
not certify an actual After Effects installation. Keep Adobe rendering/CEP installation
results separate. Detailed actual-environment gates belong to tasks 09–11.
