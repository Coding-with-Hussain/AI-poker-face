/**
 * Synthetic facial-cue profiles for unit tests. Values are typical of
 * MediaPipe blendshape outputs: a relaxed face sits near 0-0.1, a broad smile
 * reaches 0.8+, and an open laughing mouth gives jawOpen around 0.3-0.5.
 */
import type { FacialCues } from './blendshapeAnalyzer';
import type { EstimatorSnapshot, LaughEstimator } from './laughEstimator';

export const NEUTRAL: FacialCues = { smile: 0.04, jawOpen: 0.02, cheekSquint: 0.03 };
export const SLIGHT_SMILE: FacialCues = { smile: 0.35, jawOpen: 0.04, cheekSquint: 0.1 };
export const HALF_SMILE: FacialCues = { smile: 0.5, jawOpen: 0.05, cheekSquint: 0.1 };
export const TALKING: FacialCues = { smile: 0.08, jawOpen: 0.35, cheekSquint: 0.04 };
export const YAWN: FacialCues = { smile: 0.03, jawOpen: 0.85, cheekSquint: 0.05 };
export const SQUINT: FacialCues = { smile: 0.05, jawOpen: 0.03, cheekSquint: 0.6 };
export const GRIN: FacialCues = { smile: 0.8, jawOpen: 0.05, cheekSquint: 0.35 };
export const BIG_LAUGH: FacialCues = { smile: 0.85, jawOpen: 0.45, cheekSquint: 0.45 };

export interface Segment {
  durationMs: number;
  cues: FacialCues | null;
}

export interface SequenceRun {
  snapshots: EstimatorSnapshot[];
  events: EstimatorSnapshot[];
  endTime: number;
}

/** Feeds segments to the estimator at a fixed frame rate (default 15 fps). */
export function runSequence(estimator: LaughEstimator, segments: readonly Segment[], fps = 15, startTime = 1000): SequenceRun {
  const frameMs = 1000 / fps;
  const snapshots: EstimatorSnapshot[] = [];
  let t = startTime;
  for (const segment of segments) {
    const end = t + segment.durationMs;
    while (t < end) {
      snapshots.push(estimator.update({ timestampMs: t, cues: segment.cues }));
      t += frameMs;
    }
  }
  return { snapshots, events: snapshots.filter((s) => s.event), endTime: t };
}
