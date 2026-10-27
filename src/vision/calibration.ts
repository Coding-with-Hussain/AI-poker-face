/**
 * Neutral-face calibration. A short sample of the player's relaxed face gives
 * a per-player baseline, so someone whose resting mouth already reads as a
 * slight smile is not punished for it.
 */
import { CALIBRATION } from '../game/gameConfig';
import { ZERO_BASELINE, type CueBaseline, type FacialCues } from './blendshapeAnalyzer';

export type CalibrationQuality = 'good' | 'smiling' | 'insufficient';

export interface CalibrationResult {
  baseline: CueBaseline;
  /** Medians before capping, for diagnostics. */
  measured: CueBaseline;
  sampleCount: number;
  quality: CalibrationQuality;
}

export interface CalibrationOptions {
  minSamples: number;
  smilingWarningLevel: number;
  maxBaseline: number;
}

const DEFAULT_OPTIONS: CalibrationOptions = {
  minSamples: CALIBRATION.minSamples,
  smilingWarningLevel: CALIBRATION.smilingWarningLevel,
  maxBaseline: CALIBRATION.maxBaseline,
};

export function median(values: readonly number[]): number {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return 0;
  const sorted = [...finite].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? 0;
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

/**
 * Builds a baseline from neutral-face samples. Medians ignore brief blinks
 * or twitches. Every cue is capped so a calibration done while smiling cannot
 * make the detector blind for the rest of the round.
 */
export function computeBaseline(
  samples: readonly FacialCues[],
  options: Partial<CalibrationOptions> = {},
): CalibrationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  if (samples.length < opts.minSamples) {
    return { baseline: { ...ZERO_BASELINE }, measured: { ...ZERO_BASELINE }, sampleCount: samples.length, quality: 'insufficient' };
  }
  const measured: CueBaseline = {
    smile: median(samples.map((s) => s.smile)),
    jawOpen: median(samples.map((s) => s.jawOpen)),
    cheekSquint: median(samples.map((s) => s.cheekSquint)),
  };
  const cap = (value: number): number => Math.min(opts.maxBaseline, Math.max(0, value));
  return {
    baseline: { smile: cap(measured.smile), jawOpen: cap(measured.jawOpen), cheekSquint: cap(measured.cheekSquint) },
    measured,
    sampleCount: samples.length,
    quality: measured.smile > opts.smilingWarningLevel ? 'smiling' : 'good',
  };
}
