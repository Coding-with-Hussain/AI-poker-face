export type Difficulty = 'easy' | 'normal' | 'hard';

export type RoundDurationSec = 30 | 45 | 60;

export type ChallengeIntensity = 1 | 2 | 3;

/** Thresholds that turn a smoothed facial-cue score into laugh-like events. */
export interface DetectionTuning {
  /** Smoothed score at or above which an expression counts as qualifying. */
  triggerThreshold: number;
  /** Score below which the detector re-arms (hysteresis). */
  resetThreshold: number;
  /** Score at which the meter shows "Suspicious Smile". */
  warningThreshold: number;
  /** How long qualifying cues must be sustained before an event fires. */
  sustainMs: number;
  /** Minimum time between two events. */
  cooldownMs: number;
}

export interface DifficultyPreset {
  id: Difficulty;
  label: string;
  description: string;
  detection: DetectionTuning;
  /** How long each challenge stays on screen. */
  challengeIntervalMs: number;
  minIntensity: ChallengeIntensity;
  maxIntensity: ChallengeIntensity;
}

export interface ScoringRules {
  startingScore: number;
  penaltyPerStrike: number;
  maxStrikes: number;
  survivalBonus: number;
}

export interface RoundConfig {
  difficulty: Difficulty;
  durationSec: RoundDurationSec;
  scoring: ScoringRules;
}

export type RoundPhase = 'playing' | 'paused' | 'ended';

/** Why a round is paused. Automatic pauses resume only for the same reason. */
export type PauseReason = 'player' | 'face-lost' | 'hidden' | 'vision-error';

export type EndReason = 'completed' | 'strikes';

export interface StrikeEvent {
  /** Round time (ms of active play) at which the strike happened. */
  atMs: number;
  strikeNumber: number;
}

export interface RoundState {
  config: RoundConfig;
  phase: RoundPhase;
  pauseReason: PauseReason | null;
  /** Active (unpaused) play time in milliseconds. */
  elapsedMs: number;
  strikes: StrikeEvent[];
  endReason: EndReason | null;
}

export type OutcomeId = 'legend' | 'ice-cold' | 'almost' | 'laugh-detected' | 'failed';

export interface ScoreBreakdown {
  startingScore: number;
  penalties: number;
  survivalBonus: number;
  finalScore: number;
}

export interface RoundResult {
  difficulty: Difficulty;
  durationSec: RoundDurationSec;
  timeSurvivedMs: number;
  strikes: number;
  survived: boolean;
  endReason: EndReason;
  score: ScoreBreakdown;
  outcome: OutcomeId;
  endedAt: number;
}
