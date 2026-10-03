import {createEffect, type InteractivitySchema} from 'remotion';
import {h} from '../core/random.js';

/** Image-space parameters, independent of glyph motion/decor declarations. */
export type SliceGlitchParams = {
  readonly amount?: number;
  /** Maximum horizontal shift as a fraction of the target width. */
  readonly displacement?: number;
  readonly bands?: number;
  readonly seed?: number;
  /** Pass the Cut-local integer frame explicitly; this factory does not use hooks. */
  readonly frame?: number;
  readonly fps?: number;
  /** Number of distinct slice patterns per second. */
  readonly rate?: number;
};

const defaults = {amount: 0.65, displacement: 0.05, bands: 18, seed: 1234, frame: 0, fps: 24, rate: 12};
const resolved = (params: SliceGlitchParams) => Object.fromEntries(Object.keys(defaults).map(key =>
  [key, params[key as keyof SliceGlitchParams] ?? defaults[key as keyof SliceGlitchParams]])) as typeof defaults;
const numberField = (value: number, min: number, max: number, description: string, integer = false) =>
  ({type: 'number', default: value, min, max, description, integer, step: integer ? 1 : 0.01, hiddenFromList: false} as const);
const schema = {
  amount: numberField(defaults.amount, 0, 1, 'Slice intensity'),
  displacement: numberField(defaults.displacement, 0, 0.2, 'Maximum shift / canvas width'),
  bands: numberField(defaults.bands, 1, 128, 'Horizontal bands', true),
  seed: {...numberField(defaults.seed, 0, 0xffffffff, 'Pattern seed', true), keyframable: false},
  frame: {...numberField(0, 0, Number.MAX_SAFE_INTEGER, 'Cut-local frame', true), hiddenFromList: true, keyframable: false},
  fps: {...numberField(24, Number.MIN_VALUE, 1000, 'Composition fps'), hiddenFromList: true, keyframable: false},
  rate: numberField(defaults.rate, 0, 120, 'Patterns / second'),
} satisfies InteractivitySchema;

/** Remotion-native, stateless, alpha-preserving 2D image effect. */
export const sliceGlitch = createEffect<SliceGlitchParams, null>({
  type: 'io.jizura.sliceGlitch', label: 'sliceGlitch()', documentationLink: null, backend: '2d', schema,
  validateParams: (params) => {
    if (!params || typeof params !== 'object' || Array.isArray(params)) throw new TypeError('sliceGlitch requires an options object');
    for (const [key, field] of Object.entries(schema)) {
      const value = params[key as keyof SliceGlitchParams] ?? defaults[key as keyof SliceGlitchParams];
      if (params[key as keyof SliceGlitchParams] === null || typeof value !== 'number' || !Number.isFinite(value)
        || value < field.min || value > field.max || (field.integer && !Number.isSafeInteger(value))) {
        throw new TypeError(`Invalid sliceGlitch.${key}`);
      }
    }
    const disabled = (params as SliceGlitchParams & {disabled?: boolean}).disabled;
    if (disabled !== undefined && typeof disabled !== 'boolean') throw new TypeError('Invalid sliceGlitch.disabled');
    for (const key of Object.keys(params)) if (!Object.hasOwn(schema, key) && key !== 'disabled') throw new TypeError(`Unknown sliceGlitch.${key}`);
  },
  calculateKey: params => JSON.stringify(Object.keys(defaults).map(key => params[key as keyof SliceGlitchParams] ?? defaults[key as keyof SliceGlitchParams])),
  setup: () => null,
  cleanup: () => {},
  apply: ({source, target, width, height, params}) => {
    const {amount, displacement, bands, seed, frame, fps, rate} = resolved(params);
    const tick = Math.floor(frame * (rate / fps));
    const ctx = target.getContext('2d');
    if (!ctx) throw new Error('sliceGlitch requires a Canvas2D target');
    ctx.save();
    try {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
      ctx.clearRect(0, 0, width, height);
      for (let band = 0; band < bands; band++) {
        const y0 = Math.floor(band * height / bands), y1 = Math.floor((band + 1) * height / bands);
        if (y0 === y1) continue;
        // Indexed randomness is independent of previous frames, mount and target.
        const shift = h(seed, tick, band, 0) / 0x100000000 < 0.45
          ? Math.round((h(seed, tick, band, 1) / 0x100000000 * 2 - 1) * amount * displacement * width) : 0;
        ctx.drawImage(source, 0, y0, width, y1 - y0, shift, y0, width, y1 - y0);
        // Wrap instead of painting a backdrop: opaque input stays opaque, transparent
        // input carries its own alpha, and displaced edges never accumulate history.
        if (shift !== 0) ctx.drawImage(source, 0, y0, width, y1 - y0, shift > 0 ? shift - width : shift + width, y0, width, y1 - y0);
      }
    } finally {ctx.restore();}
  },
});
