import {CanvasImage, HtmlInCanvas, type EffectsProp} from 'remotion';
import {sliceGlitch, JizuraCut, type SliceGlitchParams} from 'remotion-jizura';
const params: SliceGlitchParams = {amount: 0.5, bands: 12, seed: 0, frame: 24, fps: 24};
const effects: EffectsProp = [sliceGlitch(params), sliceGlitch({disabled: true}), sliceGlitch()];
export const Layers = () => <><CanvasImage src="image.png" effects={effects} /><HtmlInCanvas width={640} height={360} effects={effects}><div>Text</div></HtmlInCanvas></>;
// @ts-expect-error Image effects are not glyph/decor declarations.
const cut = <JizuraCut text="朝" decor={[sliceGlitch()]} />;
// @ts-expect-error Numeric image parameters are typed.
sliceGlitch({bands: '18'});
