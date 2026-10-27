import { describe, expect, it } from 'vitest';
import { resolveDetectionTuning, SCORING, SENSITIVITY } from './gameConfig';
import { computeFinalScore, determineOutcome, liveScore, OUTCOMES, outcomeMessage } from './scoring';
import type { ScoringRules } from './gameTypes';

describe('scoring calculations', () => {
  it('uses the default rules: 100 start, -20 per strike, +30 survival bonus', () => {
    expect(computeFinalScore(SCORING, 0, true).finalScore).toBe(130);
    expect(computeFinalScore(SCORING, 1, true).finalScore).toBe(110);
    expect(computeFinalScore(SCORING, 2, false).finalScore).toBe(60);
    expect(computeFinalScore(SCORING, 3, false)).toEqual({ startingScore: 100, penalties: 60, survivalBonus: 0, finalScore: 40 });
  });

  it('only adds the survival bonus when the round was completed', () => {
    expect(computeFinalScore(SCORING, 1, false).survivalBonus).toBe(0);
    expect(computeFinalScore(SCORING, 1, true).survivalBonus).toBe(30);
  });

  it('never produces a negative score', () => {
    const harsh: ScoringRules = { startingScore: 50, penaltyPerStrike: 40, maxStrikes: 5, survivalBonus: 10 };
    expect(computeFinalScore(harsh, 5, false).finalScore).toBe(0);
    expect(computeFinalScore(harsh, 4, true).finalScore).toBe(0);
    expect(liveScore(harsh, 10)).toBe(0);
    expect(liveScore(SCORING, -3)).toBe(100);
  });
});

describe('outcomes', () => {
  const base = { timeSurvivedMs: 30_000, roundDurationMs: 30_000 };
  it('derives the title from the actual result', () => {
    expect(determineOutcome({ ...base, survived: true, strikes: 0 })).toBe('legend');
    expect(determineOutcome({ ...base, survived: true, strikes: 1 })).toBe('ice-cold');
    expect(determineOutcome({ ...base, survived: true, strikes: 2 })).toBe('almost');
    expect(determineOutcome({ survived: false, strikes: 3, timeSurvivedMs: 16_000, roundDurationMs: 30_000 })).toBe('laugh-detected');
    expect(determineOutcome({ survived: false, strikes: 3, timeSurvivedMs: 9_000, roundDurationMs: 30_000 })).toBe('failed');
  });

  it('picks messages deterministically', () => {
    expect(outcomeMessage('legend', 130, 0)).toBe(outcomeMessage('legend', 130, 0));
    expect(OUTCOMES.legend.messages).toContain(outcomeMessage('legend', 130, 0));
  });
});

describe('detection tuning', () => {
  it('higher sensitivity lowers thresholds but keeps their ordering', () => {
    const low = resolveDetectionTuning('normal', SENSITIVITY.min);
    const mid = resolveDetectionTuning('normal', SENSITIVITY.default);
    const high = resolveDetectionTuning('normal', SENSITIVITY.max);
    expect(high.triggerThreshold).toBeLessThan(mid.triggerThreshold);
    expect(low.triggerThreshold).toBeGreaterThan(mid.triggerThreshold);
    for (const t of [low, mid, high]) {
      expect(t.resetThreshold).toBeLessThan(t.triggerThreshold);
      expect(t.warningThreshold).toBeLessThan(t.triggerThreshold);
    }
  });

  it('clamps nonsense sensitivity values', () => {
    expect(resolveDetectionTuning('hard', 999)).toEqual(resolveDetectionTuning('hard', SENSITIVITY.max));
    expect(resolveDetectionTuning('hard', Number.NaN)).toEqual(resolveDetectionTuning('hard', SENSITIVITY.default));
  });
});
