/**
 * Turns MediaPipe face blendshape scores into the few facial cues the game
 * uses. These are expression cues, not emotions: a high smile cue means the
 * mouth corners are raised, not that the player is amused.
 */
import { CUE_WEIGHTS } from '../game/gameConfig';

export interface BlendshapeCategory {
  categoryName: string;
  score: number;
}

/** Facial cues in the range 0..1. */
export interface FacialCues {
  /** Mean of mouthSmileLeft and mouthSmileRight. */
  smile: number;
  /** jawOpen: how far the mouth is opened. */
  jawOpen: number;
  /** Mean of cheekSquintLeft and cheekSquintRight (raised cheeks). */
  cheekSquint: number;
}

export type CueBaseline = FacialCues;

export type CueWeights = typeof CUE_WEIGHTS;

export const ZERO_BASELINE: CueBaseline = Object.freeze({ smile: 0, jawOpen: 0, cheekSquint: 0 });

const REQUIRED = ['mouthSmileLeft', 'mouthSmileRight', 'jawOpen'] as const;
const OPTIONAL = ['cheekSquintLeft', 'cheekSquintRight'] as const;
const WANTED = new Set<string>([...REQUIRED, ...OPTIONAL]);

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * Extracts the cues from one face's blendshape categories.
 * Returns null when the required blendshapes are absent, so callers treat the
 * frame as unreliable instead of as a neutral face.
 */
export function extractCues(categories: readonly BlendshapeCategory[] | undefined | null): FacialCues | null {
  if (!categories || categories.length === 0) return null;
  const scores = new Map<string, number>();
  for (const category of categories) {
    if (WANTED.has(category.categoryName)) scores.set(category.categoryName, category.score);
  }
  for (const name of REQUIRED) {
    const value = scores.get(name);
    if (value === undefined || !Number.isFinite(value)) return null;
  }
  const get = (name: string): number => clamp01(scores.get(name) ?? 0);
  return {
    smile: (get('mouthSmileLeft') + get('mouthSmileRight')) / 2,
    jawOpen: get('jawOpen'),
    cheekSquint: (get('cheekSquintLeft') + get('cheekSquintRight')) / 2,
  };
}

/** Rescales a cue so the calibrated neutral value maps to 0 and 1 stays 1. */
function adjust(value: number, baseline: number): number {
  const b = clamp01(baseline);
  if (b >= 1) return 0;
  return clamp01((value - b) / (1 - b));
}

export function applyBaseline(cues: FacialCues, baseline: CueBaseline): FacialCues {
  return {
    smile: adjust(cues.smile, baseline.smile),
    jawOpen: adjust(cues.jawOpen, baseline.jawOpen),
    cheekSquint: adjust(cues.cheekSquint, baseline.cheekSquint),
  };
}

/**
 * Weighted laugh-likeness score in 0..1 from baseline-adjusted cues.
 * The smile is the primary cue; mouth opening and cheek raising only add to
 * the score in proportion to how much the player is smiling.
 */
export function combineCues(adjusted: FacialCues, weights: CueWeights = CUE_WEIGHTS): number {
  const gate = weights.smileGate > 0 ? Math.min(1, adjusted.smile / weights.smileGate) : 1;
  const score =
    weights.smile * adjusted.smile + gate * (weights.jawOpen * adjusted.jawOpen + weights.cheekSquint * adjusted.cheekSquint);
  return clamp01(score);
}
