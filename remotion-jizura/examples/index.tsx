import {Composition, registerRoot} from 'remotion';
import {JizuraScene} from 'remotion-jizura';

const EmptyScene = () => <JizuraScene durationInFrames={24} background="#16324F" />;
const Root = () => <Composition id="EmptyScene" component={EmptyScene}
  width={640} height={360} fps={24} durationInFrames={24} />;
registerRoot(Root);
