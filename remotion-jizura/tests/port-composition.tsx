import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {getPortCase, sceneDuration} from './port-cases.ts';
import {PortScene, type PortInput} from './port-model.tsx';
const Root = () => <Composition id="PortCase" component={PortScene} width={640} height={360} fps={24}
  durationInFrames={33} defaultProps={{caseId: 'center'}} calculateMetadata={({props}: {props: PortInput}) => {
    const spec = getPortCase(props.caseId);
    return {width: spec.width, height: spec.height, fps: spec.fps, durationInFrames: sceneDuration(spec) + 1};
  }} />;
registerRoot(Root);
