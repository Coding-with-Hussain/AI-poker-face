/**
 * Pure round engine. Every function returns a new state; nothing here knows
 * about React, timers, cameras or the face detector.
 */
import { computeFinalScore, determineOutcome, liveScore } from './scoring';
import type { PauseReason, RoundConfig, RoundResult, RoundState } from './gameTypes';

export function createRound(config: RoundConfig): RoundState {
  return {
    config,
    phase: 'playing',
    pauseReason: null,
    elapsedMs: 0,
    strikes: [],
    endReason: null,
  };
}

export function roundDurationMs(state: RoundState): number {
  return state.config.durationSec * 1000;
}

export function remainingMs(state: RoundState): number {
  return Math.max(0, roundDurationMs(state) - state.elapsedMs);
}

export function currentScore(state: RoundState): number {
  return liveScore(state.config.scoring, state.strikes.length);
}

/** Advances active play time. Paused or finished rounds do not change. */
export function tick(state: RoundState, deltaMs: number): RoundState {
  if (state.phase !== 'playing' || !(deltaMs > 0)) return state;
  const duration = roundDurationMs(state);
  const elapsedMs = Math.min(duration, state.elapsedMs + deltaMs);
  if (elapsedMs >= duration) {
    return { ...state, elapsedMs, phase: 'ended', pauseReason: null, endReason: 'completed' };
  }
  return { ...state, elapsedMs };
}

/** Records one laugh-like event. Only counts while the round is being played. */
export function registerStrike(state: RoundState): RoundState {
  if (state.phase !== 'playing') return state;
  const strikeNumber = state.strikes.length + 1;
  const strikes = [...state.strikes, { atMs: state.elapsedMs, strikeNumber }];
  if (strikeNumber >= state.config.scoring.maxStrikes) {
    return { ...state, strikes, phase: 'ended', pauseReason: null, endReason: 'strikes' };
  }
  return { ...state, strikes };
}

export function pauseRound(state: RoundState, reason: PauseReason): RoundState {
  if (state.phase !== 'playing') return state;
  return { ...state, phase: 'paused', pauseReason: reason };
}

/**
 * Resumes a paused round. When a reason is given the round only resumes if it
 * was paused for that reason, so an automatic "face is back" resume can never
 * cancel a pause the player chose.
 */
export function resumeRound(state: RoundState, reason?: PauseReason): RoundState {
  if (state.phase !== 'paused') return state;
  if (reason !== undefined && state.pauseReason !== reason) return state;
  return { ...state, phase: 'playing', pauseReason: null };
}

export function buildResult(state: RoundState, endedAt: number = Date.now()): RoundResult {
  const survived = state.endReason === 'completed';
  const strikes = state.strikes.length;
  const score = computeFinalScore(state.config.scoring, strikes, survived);
  return {
    difficulty: state.config.difficulty,
    durationSec: state.config.durationSec,
    timeSurvivedMs: Math.round(state.elapsedMs),
    strikes,
    survived,
    endReason: state.endReason ?? 'strikes',
    score,
    outcome: determineOutcome({
      survived,
      strikes,
      timeSurvivedMs: state.elapsedMs,
      roundDurationMs: roundDurationMs(state),
    }),
    endedAt,
  };
}
