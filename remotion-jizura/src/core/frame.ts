import type {PreparedScene} from './scene-plan.js';
import {integer} from './validation.js';

export type FrameState = Readonly<{
  sceneActive: boolean; activeCutIndex: number | null; localFrame: number | null;
  evaluationSeconds: number | null; durationSeconds: number | null;
  enterSeconds: number; exitSeconds: number; step: number;
  pIn: number; pOut: number; holdAmount: number;
  applyEnter: boolean; applyHold: boolean; applyExit: boolean;
}>;
const clamp = (n: number) => Math.min(1, Math.max(0, n));

// Select with integer half-open intervals before quantizing Cut-local time.
// activeCutIndex addresses the time-sorted plan, not the declaration index.
export function evaluateFrame(scene: PreparedScene, frame: number): FrameState {
  integer(frame, 'frame', -Number.MAX_SAFE_INTEGER);
  const sceneActive = frame >= 0 && frame < scene.durationInFrames;
  const index = sceneActive ? scene.cuts.findIndex(c => frame >= c.from && frame < c.end) : -1;
  if (index === -1) return {
    sceneActive, activeCutIndex: null, localFrame: null, evaluationSeconds: null,
    durationSeconds: null, enterSeconds: 0, exitSeconds: 0, step: 0,
    pIn: 0, pOut: 0, holdAmount: 0, applyEnter: false, applyHold: false, applyExit: false,
  };
  const cut = scene.cuts[index], localFrame = frame - cut.from;
  const rawSeconds = localFrame / scene.fps;
  const t = scene.motionFps === null ? rawSeconds : Math.floor(rawSeconds * scene.motionFps + 1e-6) / scene.motionFps;
  const dur = cut.durationInFrames / scene.fps;
  const inDur = cut.enterDurationInFrames / scene.fps, outDur = cut.exitDurationInFrames / scene.fps;
  const pIn = inDur === 0 ? 1 : clamp(t / inDur);
  // Subtract phase frames before converting to seconds. This makes the exact
  // exit-start frame pOut=0 without cancellation noise from dur-outDur.
  const outStart = (cut.durationInFrames - cut.exitDurationInFrames) / scene.fps;
  const pOut = outDur === 0 ? 0 : clamp((t - outStart) / outDur);
  const holdAmount = clamp((t - inDur * 0.85) / 0.25) * (1 - pOut);
  return {
    sceneActive, activeCutIndex: index, localFrame, evaluationSeconds: t, durationSeconds: dur,
    enterSeconds: inDur, exitSeconds: outDur, step: Math.floor(t * 24 + 1e-6),
    pIn, pOut, holdAmount,
    applyEnter: cut.enter !== null && inDur > 0 && pIn < 1,
    applyHold: cut.hold !== null && holdAmount > 0,
    applyExit: cut.exit !== null && outDur > 0 && pOut > 0,
  };
}
