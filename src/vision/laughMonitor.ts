/**
 * Connects live tracking frames to a LaughEstimator and fans the resulting
 * snapshots out to UI subscribers (meter, diagnostics) without React state.
 */
import type { CueBaseline } from './blendshapeAnalyzer';
import { LaughEstimator, type EstimatorConfig, type EstimatorSnapshot } from './laughEstimator';
import { visionService } from './visionService';
import type { TrackingFrame } from './faceTracker';

type SnapshotListener = (snapshot: EstimatorSnapshot, frame: TrackingFrame | null) => void;

let activeSnapshot: EstimatorSnapshot | null = null;

/** Latest estimate from whichever monitor is running (for diagnostics). */
export function getActiveEstimate(): EstimatorSnapshot | null {
  return activeSnapshot;
}

export class LaughMonitor {
  private readonly estimator: LaughEstimator;
  private readonly listeners = new Set<SnapshotListener>();
  private latest: EstimatorSnapshot | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(config: EstimatorConfig, baseline: CueBaseline) {
    this.estimator = new LaughEstimator(config, baseline);
  }

  start(): void {
    if (this.unsubscribe) return;
    this.unsubscribe = visionService.subscribeFrames(this.handleFrame);
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    if (activeSnapshot === this.latest) activeSnapshot = null;
  }

  subscribe(listener: SnapshotListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getLatest(): EstimatorSnapshot | null {
    return this.latest;
  }

  /** Grace after a pause: forget smoothing and partial sustain progress. */
  reset(): void {
    this.estimator.reset();
  }

  private readonly handleFrame = (frame: TrackingFrame | null): void => {
    const snapshot = this.estimator.update({
      timestampMs: frame?.timestampMs ?? performance.now(),
      cues: frame?.cues ?? null,
    });
    this.latest = snapshot;
    activeSnapshot = snapshot;
    for (const listener of this.listeners) listener(snapshot, frame);
  };
}
