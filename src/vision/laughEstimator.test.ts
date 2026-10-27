import { describe, expect, it } from 'vitest';
import { DIFFICULTIES, resolveDetectionTuning } from '../game/gameConfig';
import { createEstimatorConfig, LaughEstimator, type EstimatorConfig } from './laughEstimator';
import {
  BIG_LAUGH,
  GRIN,
  HALF_SMILE,
  NEUTRAL,
  runSequence,
  SLIGHT_SMILE,
  SQUINT,
  TALKING,
  YAWN,
} from './testUtils';
import type { CueBaseline } from './blendshapeAnalyzer';

const normal = (): EstimatorConfig => createEstimatorConfig(DIFFICULTIES.normal.detection);
const easy = (): EstimatorConfig => createEstimatorConfig(DIFFICULTIES.easy.detection);
const hard = (): EstimatorConfig => createEstimatorConfig(DIFFICULTIES.hard.detection);

describe('LaughEstimator — detection threshold', () => {
  it('stays calm and never fires for a neutral face', () => {
    const run = runSequence(new LaughEstimator(normal()), [{ durationMs: 10_000, cues: NEUTRAL }]);
    expect(run.events).toHaveLength(0);
    expect(run.snapshots.at(-1)?.state).toBe('calm');
  });

  it('ignores mouth opening or squinting without a smile (talking, yawning, bright light)', () => {
    for (const cues of [TALKING, YAWN, SQUINT]) {
      const run = runSequence(new LaughEstimator(hard()), [{ durationMs: 6000, cues }]);
      expect(run.events).toHaveLength(0);
      expect(run.snapshots.every((s) => s.smoothedScore < DIFFICULTIES.hard.detection.warningThreshold)).toBe(true);
    }
  });

  it('fires for a sustained laugh-like expression', () => {
    const run = runSequence(new LaughEstimator(normal()), [
      { durationMs: 1000, cues: NEUTRAL },
      { durationMs: 2000, cues: BIG_LAUGH },
    ]);
    expect(run.events).toHaveLength(1);
  });

  it('respects difficulty: a broad closed-mouth grin counts on Normal but not on Easy', () => {
    const segments = [{ durationMs: 3000, cues: GRIN }];
    expect(runSequence(new LaughEstimator(normal()), segments).events).toHaveLength(1);
    expect(runSequence(new LaughEstimator(easy()), segments).events).toHaveLength(0);
  });

  it('shows a warning state for a slight smile on Hard without penalising it', () => {
    const run = runSequence(new LaughEstimator(hard()), [{ durationMs: 4000, cues: SLIGHT_SMILE }]);
    expect(run.events).toHaveLength(0);
    expect(run.snapshots.at(-1)?.state).toBe('suspicious');
  });

  it('higher sensitivity lowers the threshold', () => {
    const strict = createEstimatorConfig(resolveDetectionTuning('easy', 10));
    const standard = createEstimatorConfig(resolveDetectionTuning('easy', 5));
    const wideSmile = { smile: 0.65, jawOpen: 0.1, cheekSquint: 0.25 };
    const segments = [{ durationMs: 3000, cues: wideSmile }];
    expect(runSequence(new LaughEstimator(strict), segments).events).toHaveLength(1);
    expect(runSequence(new LaughEstimator(standard), segments).events).toHaveLength(0);
  });
});

describe('LaughEstimator — sustained-expression requirement', () => {
  it('does not fire for a brief spike shorter than the sustain time', () => {
    const run = runSequence(new LaughEstimator(normal()), [
      { durationMs: 1000, cues: NEUTRAL },
      { durationMs: 300, cues: BIG_LAUGH },
      { durationMs: 2000, cues: NEUTRAL },
    ]);
    expect(run.events).toHaveLength(0);
    // ...but it was flagged as high risk while it lasted.
    expect(run.snapshots.some((s) => s.state === 'high-risk')).toBe(true);
  });

  it('a single frame can never trigger an event', () => {
    const estimator = new LaughEstimator(hard());
    const first = estimator.update({ timestampMs: 0, cues: BIG_LAUGH });
    expect(first.event).toBe(false);
    expect(first.sustainProgress).toBe(0);
  });

  it('needs longer expressions on Easy than on Hard', () => {
    const fireTime = (config: EstimatorConfig): number => {
      const run = runSequence(new LaughEstimator(config), [{ durationMs: 4000, cues: BIG_LAUGH }], 30, 0);
      return run.events[0]?.timestampMs ?? Infinity;
    };
    expect(fireTime(hard())).toBeLessThan(fireTime(normal()));
    expect(fireTime(normal())).toBeLessThan(fireTime(easy()));
    expect(fireTime(easy())).toBeGreaterThanOrEqual(DIFFICULTIES.easy.detection.sustainMs);
  });

  it('reports progress toward the sustain duration before firing', () => {
    const run = runSequence(new LaughEstimator(normal()), [{ durationMs: 2000, cues: BIG_LAUGH }]);
    const firedAt = run.snapshots.findIndex((s) => s.event);
    const before = run.snapshots.slice(0, firedAt).map((s) => s.sustainProgress);
    expect(Math.max(...before)).toBeGreaterThan(0.5);
    expect(Math.max(...before)).toBeLessThan(1);
  });
});

describe('LaughEstimator — one strike per continuous laugh, hysteresis and cooldown', () => {
  it('counts one uninterrupted laugh only once, however long it lasts', () => {
    const run = runSequence(new LaughEstimator(normal()), [{ durationMs: 15_000, cues: BIG_LAUGH }]);
    expect(run.events).toHaveLength(1);
    expect(run.snapshots.at(-1)?.state).toBe('laugh-detected');
  });

  it('does not re-arm while the expression only relaxes into the hysteresis band', () => {
    const run = runSequence(new LaughEstimator(normal()), [
      { durationMs: 2000, cues: BIG_LAUGH },
      { durationMs: 3000, cues: HALF_SMILE },
      { durationMs: 2000, cues: BIG_LAUGH },
    ]);
    expect(run.events).toHaveLength(1);
  });

  it('counts two separate laughs with a real calm-down in between', () => {
    const run = runSequence(new LaughEstimator(normal()), [
      { durationMs: 2000, cues: BIG_LAUGH },
      { durationMs: 2500, cues: NEUTRAL },
      { durationMs: 2000, cues: BIG_LAUGH },
    ]);
    expect(run.events).toHaveLength(2);
  });

  it('enforces the cooldown between events even after a quick reset', () => {
    const config = normal();
    const run = runSequence(new LaughEstimator(config), [
      { durationMs: 1200, cues: BIG_LAUGH },
      { durationMs: 400, cues: NEUTRAL },
      { durationMs: 3000, cues: BIG_LAUGH },
    ]);
    expect(run.events).toHaveLength(2);
    const [first, second] = run.events;
    expect((second?.timestampMs ?? 0) - (first?.timestampMs ?? 0)).toBeGreaterThanOrEqual(config.cooldownMs);
  });

  it('marks cooldown in snapshots right after an event', () => {
    const run = runSequence(new LaughEstimator(normal()), [{ durationMs: 1500, cues: BIG_LAUGH }]);
    const firedAt = run.snapshots.findIndex((s) => s.event);
    expect(run.snapshots[firedAt]?.inCooldown).toBe(true);
    expect(run.snapshots[firedAt]?.armed).toBe(false);
  });
});

describe('LaughEstimator — missing or unreliable face results', () => {
  it('never fires when no face is found', () => {
    const run = runSequence(new LaughEstimator(hard()), [{ durationMs: 5000, cues: null }]);
    expect(run.events).toHaveLength(0);
    expect(run.snapshots.every((s) => s.state === 'no-face' && !s.faceVisible)).toBe(true);
  });

  it('holds its state through a brief tracking interruption', () => {
    const run = runSequence(new LaughEstimator(normal()), [
      { durationMs: 400, cues: BIG_LAUGH },
      { durationMs: 300, cues: null },
      { durationMs: 600, cues: BIG_LAUGH },
    ]);
    const gap = run.snapshots.filter((s) => !s.faceVisible);
    expect(gap.length).toBeGreaterThan(0);
    expect(gap.every((s) => s.holdingThroughGap && s.smoothedScore > 0.4)).toBe(true);
    expect(run.events).toHaveLength(1);
  });

  it('forgets partial progress after a long face loss', () => {
    const estimator = new LaughEstimator(normal());
    const run = runSequence(estimator, [
      { durationMs: 450, cues: BIG_LAUGH },
      { durationMs: 2000, cues: null },
    ]);
    const last = run.snapshots.at(-1);
    expect(last?.state).toBe('no-face');
    expect(last?.sustainProgress).toBe(0);
    expect(last?.smoothedScore).toBe(0);
    expect(run.events).toHaveLength(0);
  });

  it('does not create an instant event when a laughing face reappears', () => {
    const estimator = new LaughEstimator(hard());
    runSequence(estimator, [{ durationMs: 3000, cues: null }]);
    const back = estimator.update({ timestampMs: 10_000, cues: BIG_LAUGH });
    expect(back.event).toBe(false);
    expect(back.sustainProgress).toBe(0);
  });
});

describe('LaughEstimator — calibration baseline', () => {
  const naturalSmiler: CueBaseline = { smile: 0.3, jawOpen: 0.03, cheekSquint: 0.1 };
  const restingExpression = { smile: 0.6, jawOpen: 0.05, cheekSquint: 0.15 };

  it('a calibrated baseline prevents false triggers for a naturally upturned mouth', () => {
    const uncalibrated = runSequence(new LaughEstimator(hard()), [{ durationMs: 3000, cues: restingExpression }]);
    const calibrated = runSequence(new LaughEstimator(hard(), naturalSmiler), [{ durationMs: 3000, cues: restingExpression }]);
    expect(uncalibrated.events).toHaveLength(1);
    expect(calibrated.events).toHaveLength(0);
  });

  it('still detects a real laugh after calibration', () => {
    const run = runSequence(new LaughEstimator(normal(), naturalSmiler), [{ durationMs: 3000, cues: BIG_LAUGH }]);
    expect(run.events).toHaveLength(1);
  });

  it('reset() keeps the baseline and the event count but clears dynamics', () => {
    const estimator = new LaughEstimator(normal(), naturalSmiler);
    runSequence(estimator, [{ durationMs: 2000, cues: BIG_LAUGH }]);
    estimator.reset();
    expect(estimator.getBaseline()).toEqual(naturalSmiler);
    const after = estimator.update({ timestampMs: 50_000, cues: NEUTRAL });
    expect(after.eventCount).toBe(1);
    expect(after.armed).toBe(true);
    expect(after.inCooldown).toBe(false);
  });
});
