import {useLayoutEffect, useRef} from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {drawEmptyFrame} from '../canvas/empty-frame.js';
import {resolveEmptyScene} from '../core/empty-scene.js';
import {JizuraError} from '../core/error.js';
import type {JizuraSceneProps} from '../types.js';

function useSceneConfig() {
  try {
    return useVideoConfig();
  } catch {
    throw new JizuraError('E_INPUT', 'scene', 'JizuraScene requires a Remotion Composition or Player.');
  }
}

export function JizuraScene(props: JizuraSceneProps) {
  const config = useSceneConfig();
  const frame = useCurrentFrame();
  const scene = resolveEmptyScene(props, config);
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    if (ref.current) {
      drawEmptyFrame(ref.current, scene.background, frame >= 0 && frame < scene.durationInFrames);
    }
  }, [frame, scene.width, scene.height, scene.background, scene.durationInFrames]);
  return <canvas ref={ref} width={scene.width} height={scene.height}
    style={{width: '100%', height: '100%', display: 'block'}} />;
}
