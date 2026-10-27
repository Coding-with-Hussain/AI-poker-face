/**
 * Central, tweakable game configuration.
 *
 * Difficulty changes only game logic and content. It never changes the
 * inference delegate: the vision pipeline always runs on the CPU.
 */
import type {
  DetectionTuning,
  Difficulty,
  DifficultyPreset,
  RoundDurationSec,
  ScoringRules,
} from './gameTypes';

export const SCORING: ScoringRules = {
  startingScore: 100,
  penaltyPerStrike: 20,
  maxStrikes: 3,
  survivalBonus: 30,
};

export const ROUND_DURATIONS: readonly RoundDurationSec[] = [30, 45, 60];
export const DEFAULT_DURATION: RoundDurationSec = 30;

export const DIFFICULTY_ORDER: readonly Difficulty[] = ['easy', 'normal', 'hard'];
export const DEFAULT_DIFFICULTY: Difficulty = 'normal';

export const DIFFICULTIES: Record<Difficulty, DifficultyPreset> = {
  easy: {
    id: 'easy',
    label: 'Easy',
    description: 'Forgiving detector, gentle jokes, slower challenges.',
    detection: {
      triggerThreshold: 0.56,
      resetThreshold: 0.34,
      warningThreshold: 0.3,
      sustainMs: 900,
      cooldownMs: 2500,
    },
    challengeIntervalMs: 7500,
    minIntensity: 1,
    maxIntensity: 2,
  },
  normal: {
    id: 'normal',
    label: 'Normal',
    description: 'Balanced sensitivity and a steady stream of jokes.',
    detection: {
      triggerThreshold: 0.46,
      resetThreshold: 0.28,
      warningThreshold: 0.25,
      sustainMs: 600,
      cooldownMs: 2000,
    },
    challengeIntervalMs: 6000,
    minIntensity: 1,
    maxIntensity: 3,
  },
  hard: {
    id: 'hard',
    label: 'Hard',
    description: 'Sharp detector, short fuse, rapid-fire absurdity.',
    detection: {
      triggerThreshold: 0.38,
      resetThreshold: 0.23,
      warningThreshold: 0.2,
      sustainMs: 400,
      cooldownMs: 1600,
    },
    challengeIntervalMs: 4500,
    minIntensity: 2,
    maxIntensity: 3,
  },
};

/** Player-facing detection sensitivity slider (1 = relaxed, 10 = strict). */
export const SENSITIVITY = {
  min: 1,
  max: 10,
  default: 5,
  /** Threshold change per slider step away from the default. */
  stepFactor: 0.06,
} as const;

/** Weights of the facial cues in the combined laugh-estimation score. */
export const CUE_WEIGHTS = {
  smile: 0.6,
  jawOpen: 0.25,
  cheekSquint: 0.15,
  /**
   * Jaw opening and cheek squint only count fully once the (baseline-adjusted)
   * smile reaches this level, so talking, yawning or squinting into bright
   * light cannot trigger an event on their own.
   */
  smileGate: 0.35,
} as const;

export const ESTIMATOR_TIMING = {
  /** Exponential smoothing time constant for the combined score. */
  smoothingTauMs: 160,
  /** Face-tracking gaps shorter than this keep the estimator state. */
  faceLossToleranceMs: 600,
  /** How long the meter shows "Laugh-Like Event Detected" after an event. */
  eventDisplayMs: 1400,
  /** Largest time step taken from a single frame (protects against stalls). */
  maxFrameGapMs: 250,
  /** How quickly sustain progress drains while the score sits in the hysteresis band. */
  bandDecayRate: 0.5,
} as const;

export const VISION_CONFIG = {
  cameraWidth: 640,
  cameraHeight: 480,
  /** Starting and maximum inference rate. */
  targetFps: 15,
  /** The adaptive loop never goes below this rate. */
  minFps: 6,
  /** Consecutive inference exceptions before tracking is stopped with an error. */
  maxConsecutiveFailures: 12,
} as const;

export const GAMEPLAY_TIMING = {
  /** The round pauses if the face is missing for longer than this. */
  faceLostPauseMs: 1500,
  /** After a face-lost pause the round resumes once the face is back this long. */
  faceReturnResumeMs: 700,
  /** Delay before a two-part challenge reveals its punchline. */
  punchlineRevealMs: 2200,
} as const;

export const CALIBRATION = {
  /** Neutral-face sampling time (only counts while a face is visible). */
  durationMs: 2000,
  minSamples: 8,
  /** A median smile above this suggests the player smiled during calibration. */
  smilingWarningLevel: 0.45,
  /** Baselines are capped so a smiling calibration cannot disable detection. */
  maxBaseline: 0.4,
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clampSensitivity(value: number): number {
  if (!Number.isFinite(value)) return SENSITIVITY.default;
  return clamp(Math.round(value), SENSITIVITY.min, SENSITIVITY.max);
}

/**
 * Combines a difficulty preset with the player's sensitivity slider.
 * Higher sensitivity lowers the thresholds; timings are left unchanged.
 */
export function resolveDetectionTuning(difficulty: Difficulty, sensitivity: number): DetectionTuning {
  const preset = DIFFICULTIES[difficulty].detection;
  const steps = clampSensitivity(sensitivity) - SENSITIVITY.default;
  const factor = 1 - steps * SENSITIVITY.stepFactor;
  const trigger = clamp(preset.triggerThreshold * factor, 0.15, 0.9);
  const scale = trigger / preset.triggerThreshold;
  return {
    triggerThreshold: trigger,
    resetThreshold: preset.resetThreshold * scale,
    warningThreshold: preset.warningThreshold * scale,
    sustainMs: preset.sustainMs,
    cooldownMs: preset.cooldownMs,
  };
}
