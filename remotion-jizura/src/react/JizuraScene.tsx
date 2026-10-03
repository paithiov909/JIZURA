import {useLayoutEffect, useMemo, useRef, useState} from 'react';
import {useBufferState, useCurrentFrame, useDelayRender, useRemotionEnvironment, useVideoConfig} from 'remotion';
import {sceneInspection} from '../inspection.js';
import {drawEmptyFrame} from '../canvas/empty-frame.js';
import {CanvasMeasurementService} from '../canvas/service.js';
import {clearEffectCache} from '../canvas/effect-frame.js';
import {drawFrame} from '../canvas/frame.js';
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
  return <SceneCanvas key={signature} scene={scene} frame={frame} onInspect={props.onInspect} />;
}

function SceneCanvas({scene, frame, onInspect}: {scene: PreparedScene; frame: number; onInspect?: JizuraSceneProps['onInspect']}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const inspectRef = useRef(onInspect);
  useLayoutEffect(() => {inspectRef.current = onInspect;}, [onInspect]);
  const frameRef = useRef(frame);
  const [plan, setPlan] = useState<ScenePlan<CutGeometry> | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const {delayRender, continueRender, cancelRender} = useDelayRender();
  const {isRendering, isPlayer} = useRemotionEnvironment();
  const {delayPlayback} = useBufferState();

  useLayoutEffect(() => {
    if (!scene.cuts.length) return;
    const canvas = ref.current!;
    const service = new CanvasMeasurementService(canvas.ownerDocument);
    const handle = delayRender('JIZURA fonts, measurement and first frame');
    // delayRender waits for exports. Player needs its own playback buffer so
    // a slow face does not consume the Cut's animation before the first draw.
    const playback = isPlayer ? delayPlayback() : null;
    let cancelled = false, released = false;
    const release = () => { if (!released) { released = true; continueRender(handle); playback?.unblock(); } };
    finalizeScene(scene, service).then(result => {
      if (cancelled) return;
      // Draw before releasing the render handle; preview readiness is also
      // explicit because delayRender itself has no effect in Studio/Player.
      drawFrame(ref.current!, result, frameRef.current);
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
    return () => { cancelled = true; clearEffectCache(canvas); service.dispose(); release(); };
  }, [scene, delayRender, continueRender, cancelRender, isRendering, isPlayer, delayPlayback]);

  useLayoutEffect(() => {
    // Async preparation must read the latest committed frame, never a frame
    // from a speculative React render that was abandoned.
    frameRef.current = frame;
    if (!ref.current) return;
    const active = frame >= 0 && frame < scene.durationInFrames;
    // Canvas drawing is synchronous in the commit's layout effect, before
    // Remotion's frame-ready acknowledgement. Only font/plan work is async.
    if (plan) drawFrame(ref.current, plan, frame);
    else drawEmptyFrame(ref.current, scene.background, active);
  }, [frame, scene, plan]);
  useLayoutEffect(() => {
    if (plan || !scene.cuts.length) inspectRef.current?.(sceneInspection(scene, plan ?? {prepared: scene, cuts: []}));
  }, [scene, plan]);
  if (error) throw error;
  return <canvas ref={ref} width={scene.width} height={scene.height}
    data-jizura-ready={scene.cuts.length ? plan !== null : true}
    style={{width: '100%', height: '100%', display: 'block'}} />;
}
