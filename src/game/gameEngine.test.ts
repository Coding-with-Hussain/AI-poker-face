import { describe, expect, it } from 'vitest';
import { SCORING } from './gameConfig';
import {
  buildResult,
  createRound,
  currentScore,
  pauseRound,
  registerStrike,
  remainingMs,
  resumeRound,
  tick,
} from './gameEngine';
import type { RoundConfig, RoundState } from './gameTypes';

const config: RoundConfig = { difficulty: 'normal', durationSec: 30, scoring: SCORING };

function playFor(state: RoundState, ms: number, step = 16): RoundState {
  let s = state;
  for (let t = 0; t < ms; t += step) s = tick(s, Math.min(step, ms - t));
  return s;
}

describe('round completion', () => {
  it('ends as completed exactly when the timer runs out', () => {
    let round = createRound(config);
    round = playFor(round, 29_900);
    expect(round.phase).toBe('playing');
    expect(remainingMs(round)).toBeCloseTo(100, 0);
    round = playFor(round, 500);
    expect(round.phase).toBe('ended');
    expect(round.endReason).toBe('completed');
    expect(round.elapsedMs).toBe(30_000);
  });

  it('awards the survival bonus only for a completed round', () => {
    const survivor = buildResult(playFor(createRound(config), 30_000), 0);
    expect(survivor.survived).toBe(true);
    expect(survivor.score).toEqual({ startingScore: 100, penalties: 0, survivalBonus: 30, finalScore: 130 });
    expect(survivor.outcome).toBe('legend');
  });

  it('applies penalties and bonus together', () => {
    let round = createRound(config);
    round = registerStrike(playFor(round, 5000));
    round = registerStrike(playFor(round, 5000));
    round = playFor(round, 30_000);
    const result = buildResult(round, 0);
    expect(result.survived).toBe(true);
    expect(result.strikes).toBe(2);
    expect(result.score.finalScore).toBe(100 - 40 + 30);
    expect(result.outcome).toBe('almost');
  });
});

describe('three-strike game over', () => {
  it('ends the round early on the third strike without a bonus', () => {
    let round = createRound(config);
    round = registerStrike(playFor(round, 4000));
    round = registerStrike(playFor(round, 4000));
    expect(round.phase).toBe('playing');
    expect(currentScore(round)).toBe(60);
    round = registerStrike(playFor(round, 4000));
    expect(round.phase).toBe('ended');
    expect(round.endReason).toBe('strikes');
    const result = buildResult(round, 0);
    expect(result.survived).toBe(false);
    expect(result.score.survivalBonus).toBe(0);
    expect(result.score.finalScore).toBe(40);
    expect(result.timeSurvivedMs).toBe(12_000);
    expect(result.outcome).toBe('failed');
  });

  it('reports "laugh detected" when knocked out after halftime', () => {
    let round = playFor(createRound(config), 20_000);
    round = registerStrike(registerStrike(registerStrike(round)));
    expect(buildResult(round, 0).outcome).toBe('laugh-detected');
  });

  it('ignores strikes after the round ended', () => {
    let round = playFor(createRound(config), 30_000);
    round = registerStrike(round);
    expect(round.strikes).toHaveLength(0);
  });
});

describe('pausing', () => {
  it('freezes the timer and ignores strikes while paused', () => {
    let round = pauseRound(playFor(createRound(config), 1000), 'player');
    round = playFor(round, 5000);
    round = registerStrike(round);
    expect(round.elapsedMs).toBe(1000);
    expect(round.strikes).toHaveLength(0);
    round = resumeRound(round);
    expect(round.phase).toBe('playing');
  });

  it('an automatic resume cannot cancel a pause the player chose', () => {
    const paused = pauseRound(createRound(config), 'player');
    expect(resumeRound(paused, 'face-lost').phase).toBe('paused');
    expect(resumeRound(paused, 'player').phase).toBe('playing');
  });

  it('a second pause reason does not overwrite the first', () => {
    const paused = pauseRound(pauseRound(createRound(config), 'face-lost'), 'player');
    expect(paused.pauseReason).toBe('face-lost');
  });
});
