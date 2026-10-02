import {useLayoutEffect, useMemo, useRef, useState} from 'react';
import {useCurrentFrame, useDelayRender, useRemotionEnvironment, useVideoConfig} from 'remotion';
import {drawEmptyFrame} from '../canvas/empty-frame.js';
import {CanvasMeasurementService} from '../canvas/service.js';
import {drawStaticFrame} from '../canvas/static-frame.js';
import type {CutGeometry} from '../canvas/geometry.js';
import {finalizeScene, type PreparedScene, type ScenePlan} from '../core/scene-plan.js';
import {prepareSceneFromProps} from './collect-cuts.js';
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
  const prepared = prepareSceneFromProps(props, config);
  const signature = JSON.stringify(prepared);
  const scene = useMemo(() => prepared, [signature]);
  // Remount resources when declarations change; frame updates retain the plan.
  return <SceneCanvas key={signature} scene={scene} frame={frame} />;
}

function SceneCanvas({scene, frame}: {scene: PreparedScene; frame: number}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const [plan, setPlan] = useState<ScenePlan<CutGeometry> | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const {delayRender, continueRender, cancelRender} = useDelayRender();
  const {isRendering} = useRemotionEnvironment();

  useLayoutEffect(() => {
    if (!scene.cuts.length) return;
    const service = new CanvasMeasurementService(ref.current!.ownerDocument);
    const handle = delayRender('JIZURA fonts, measurement and static drawing');
    let cancelled = false, released = false;
    const release = () => { if (!released) { released = true; continueRender(handle); } };
    finalizeScene(scene, service).then(result => {
      if (cancelled) return;
      // Draw before releasing the render handle; preview readiness is also
      // explicit because delayRender itself has no effect in Studio/Player.
      drawStaticFrame(ref.current!, result, frameRef.current >= 0 && frameRef.current < scene.durationInFrames);
      ref.current!.dataset.jizuraReady = 'true';
      setPlan(result);
      release();
    }).catch(cause => {
      if (cancelled) return;
      const failure = cause instanceof Error ? cause : new Error(String(cause));
      service.dispose(); release(); setError(failure);
      if (isRendering) {
        // cancelRender records the fatal render error and throws it. Route that
        // same error through React, without an orphaned rejected promise.
        try { cancelRender(failure); } catch (cancellation) { if (cancellation !== failure) throw cancellation; }
      }
    });
    return () => { cancelled = true; service.dispose(); release(); };
  }, [scene, delayRender, continueRender, cancelRender, isRendering]);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const active = frame >= 0 && frame < scene.durationInFrames;
    if (plan) drawStaticFrame(ref.current, plan, active);
    else drawEmptyFrame(ref.current, scene.background, active);
  }, [frame, scene, plan]);
  if (error) throw error;
  return <canvas ref={ref} width={scene.width} height={scene.height}
    data-jizura-ready={scene.cuts.length ? plan !== null : true}
    style={{width: '100%', height: '100%', display: 'block'}} />;
}
