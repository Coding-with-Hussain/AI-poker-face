/**
 * Laugh estimation: decides when facial cues look like a sustained laugh-like
 * expression. This is a game mechanic built on expression cues; it does not
 * recognise genuine emotion and can be fooled or miss real laughter.
 *
 * Pipeline per frame:
 *   cues -> baseline adjustment -> weighted score -> exponential smoothing
 *   -> sustain timer with hysteresis -> event (once per continuous expression)
 *   -> cooldown
 */
import { CUE_WEIGHTS, ESTIMATOR_TIMING } from '../game/gameConfig';
import type { DetectionTuning } from '../game/gameTypes';
import {
  applyBaseline,
  combineCues,
  ZERO_BASELINE,
  type CueBaseline,
  type CueWeights,
  type FacialCues,
} from './blendshapeAnalyzer';

export type CueState = 'no-face' | 'calm' | 'suspicious' | 'high-risk' | 'laugh-detected';

export interface EstimatorConfig extends DetectionTuning {
  weights: CueWeights;
  smoothingTauMs: number;
  faceLossToleranceMs: number;
  eventDisplayMs: number;
  maxFrameGapMs: number;
  bandDecayRate: number;
}

export interface EstimatorFrame {
  timestampMs: number;
  /** Raw cues for the frame, or null when no reliable face was found. */
  cues: FacialCues | null;
}

export interface EstimatorSnapshot {
  timestampMs: number;
  faceVisible: boolean;
  /** True while a missing face is within the tolerated interruption window. */
  holdingThroughGap: boolean;
  rawScore: number;
  smoothedScore: number;
  /** 0..1 progress towards the sustain duration. */
  sustainProgress: number;
  state: CueState;
  armed: boolean;
  inCooldown: boolean;
  /** True on exactly the frame where a laugh-like event fires. */
  event: boolean;
  eventCount: number;
}

export function createEstimatorConfig(tuning: DetectionTuning, overrides: Partial<EstimatorConfig> = {}): EstimatorConfig {
  return {
    ...tuning,
    weights: CUE_WEIGHTS,
    smoothingTauMs: ESTIMATOR_TIMING.smoothingTauMs,
    faceLossToleranceMs: ESTIMATOR_TIMING.faceLossToleranceMs,
    eventDisplayMs: ESTIMATOR_TIMING.eventDisplayMs,
    maxFrameGapMs: ESTIMATOR_TIMING.maxFrameGapMs,
    bandDecayRate: ESTIMATOR_TIMING.bandDecayRate,
    ...overrides,
  };
}

export class LaughEstimator {
  private config: EstimatorConfig;
  private baseline: CueBaseline;

  private lastTimestamp: number | null = null;
  private lastFaceAt: number | null = null;
  private smoothed = 0;
  private raw = 0;
  private sustainedMs = 0;
  private armed = true;
  private cooldownUntil = -Infinity;
  private lastEventAt: number | null = null;
  private eventCount = 0;
  private state: CueState = 'no-face';

  constructor(config: EstimatorConfig, baseline: CueBaseline = ZERO_BASELINE) {
    this.config = config;
    this.baseline = { ...baseline };
  }

  setConfig(config: EstimatorConfig): void {
    this.config = config;
  }

  setBaseline(baseline: CueBaseline): void {
    this.baseline = { ...baseline };
  }

  getBaseline(): CueBaseline {
    return { ...this.baseline };
  }

  /** Clears the dynamic state (smoothing, sustain, cooldown). Keeps the baseline and event count. */
  reset(): void {
    this.lastTimestamp = null;
    this.lastFaceAt = null;
    this.smoothed = 0;
    this.raw = 0;
    this.sustainedMs = 0;
    this.armed = true;
    this.cooldownUntil = -Infinity;
    this.lastEventAt = null;
    this.state = 'no-face';
  }

  update(frame: EstimatorFrame): EstimatorSnapshot {
    const cfg = this.config;
    const t = frame.timestampMs;
    const isFirst = this.lastTimestamp === null;
    const rawGap = isFirst ? 0 : t - (this.lastTimestamp ?? t);
    const dt = Math.min(cfg.maxFrameGapMs, Math.max(0, rawGap));
    this.lastTimestamp = isFirst ? t : Math.max(this.lastTimestamp ?? t, t);

    if (!frame.cues) {
      const withinTolerance = this.lastFaceAt !== null && t - this.lastFaceAt <= cfg.faceLossToleranceMs;
      if (!withinTolerance) {
        // Long loss: forget partial progress so a returning face starts fresh.
        this.smoothed = 0;
        this.raw = 0;
        this.sustainedMs = 0;
        this.armed = true;
        this.state = 'no-face';
      }
      return this.snapshot(t, false, withinTolerance, false);
    }

    const returningAfterLoss = this.lastFaceAt === null || t - this.lastFaceAt > cfg.faceLossToleranceMs;
    this.lastFaceAt = t;
    this.raw = combineCues(applyBaseline(frame.cues, this.baseline), cfg.weights);

    // A first frame (or a face returning after a long loss) has no meaningful
    // time step: take a partial step and accumulate no sustain time, so a
    // single frame can never produce an event by itself.
    const step = returningAfterLoss ? 0 : dt;
    if (returningAfterLoss) {
      this.smoothed = this.raw * 0.5;
    } else {
      const alpha = 1 - Math.exp(-step / Math.max(1, cfg.smoothingTauMs));
      this.smoothed += alpha * (this.raw - this.smoothed);
    }

    const inCooldown = t < this.cooldownUntil;
    // Hysteresis: once an event fired, the same expression must clearly relax
    // before another one can be counted.
    if (!this.armed && this.smoothed < cfg.resetThreshold) this.armed = true;

    let event = false;
    if (this.armed && !inCooldown) {
      if (this.smoothed >= cfg.triggerThreshold) {
        this.sustainedMs += step;
      } else if (this.smoothed >= cfg.resetThreshold) {
        this.sustainedMs = Math.max(0, this.sustainedMs - step * cfg.bandDecayRate);
      } else {
        this.sustainedMs = 0;
      }
      if (this.sustainedMs >= cfg.sustainMs) {
        event = true;
        this.eventCount += 1;
        this.armed = false;
        this.cooldownUntil = t + cfg.cooldownMs;
        this.lastEventAt = t;
        this.sustainedMs = 0;
      }
    } else {
      this.sustainedMs = 0;
    }

    this.state = this.classify(t);
    return this.snapshot(t, true, false, event);
  }

  private classify(t: number): CueState {
    const cfg = this.config;
    if (this.lastEventAt !== null && t - this.lastEventAt < cfg.eventDisplayMs) return 'laugh-detected';
    if (!this.armed) return 'laugh-detected';
    if (this.smoothed >= cfg.triggerThreshold || this.sustainedMs > 0) return 'high-risk';
    if (this.smoothed >= cfg.warningThreshold) return 'suspicious';
    return 'calm';
  }

  private snapshot(t: number, faceVisible: boolean, holding: boolean, event: boolean): EstimatorSnapshot {
    return {
      timestampMs: t,
      faceVisible,
      holdingThroughGap: holding,
      rawScore: this.raw,
      smoothedScore: this.smoothed,
      sustainProgress: Math.min(1, this.sustainedMs / Math.max(1, this.config.sustainMs)),
      state: this.state,
      armed: this.armed,
      inCooldown: t < this.cooldownUntil,
      event,
      eventCount: this.eventCount,
    };
  }
}
