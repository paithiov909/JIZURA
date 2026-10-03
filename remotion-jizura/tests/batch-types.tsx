import {JizuraCut, mixed, slideLeft, shrink, jitter, brackets, type MixedParams, type JitterParams, type BracketsParams} from 'remotion-jizura';
const m: Partial<MixedParams> = {mode: 'wave', rotAmp: 0};
const j: JitterParams = {amount: 0};
const b: BracketsParams = {pad: 0, stroke: 0.5, accent: false};
export const Batch = () => <JizuraCut text="朝だ" layout={mixed({params: m})} enter={slideLeft()} exit={shrink()} hold={jitter({params: j})} decor={[brackets({params: b})]} />;
export const Strings = () => <JizuraCut text="朝だ" layout="mixed" enter="slideLeft" exit="shrink" hold="jitter" decor={['brackets']} />;
// @ts-expect-error enum values are closed.
mixed({params: {mode: 'vertical'}});
// @ts-expect-error no motion parameters on slideLeft.
slideLeft({params: {amount: 1}});
// @ts-expect-error group mismatch.
export const Wrong = () => <JizuraCut text="朝" exit={jitter()} />;
// @ts-expect-error center-specific fields are not mixed parameters.
mixed({params: {track: 0.1}});
