import {JizuraScene, JizuraCut, center, parseLines, type JizuraCutProps} from '../src/index.js';

// Compile-only public API contracts; rendering is implemented in later stages.
export const declaration = <JizuraScene durationInFrames={60}>
  <JizuraCut text="朝" layout={center({params: {sx: 1, under: false}})} decor={[]} />
</JizuraScene>;
export const chunks = () => parseLines('朝/夜', {numCuts: 'auto'});
// @ts-expect-error duration is required
export const missingDuration = <JizuraScene />;
// @ts-expect-error layout cannot be disabled
export const invalidLayout: JizuraCutProps = {text: '朝', layout: null};
// @ts-expect-error unsupported effect group only accepts null
export const invalidCamera: JizuraCutProps = {text: '朝', cam: 'push'};
// @ts-expect-error numeric numCuts is not supported
export const numericChunks = () => parseLines('朝', {numCuts: 2});
