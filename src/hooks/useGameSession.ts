/**
 * Runs one round: drives the pure game engine with a requestAnimationFrame
 * clock, feeds it laugh-like events from the LaughMonitor, rotates
 * challenges, and pauses automatically when the face disappears.
 *
 * React state is only updated when something visible changes (about 10
 * times per second for the timer), never once per video frame.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createChallengeSource } from '../content/challengeDeck';
import type { Challenge } from '../content/challenges';
import { USER_MEDIA } from '../content/userMedia';
import { GAMEPLAY_TIMING, DIFFICULTIES } from '../game/gameConfig';
import {
  buildResult,
  createRound,
  currentScore,
  pauseRound,
  registerStrike,
  remainingMs,
  resumeRound,
  tick,
} from '../game/gameEngine';
import type { ContentMix, DetectionTuning, PauseReason, RoundConfig, RoundPhase, RoundResult, RoundState } from '../game/gameTypes';
import type { CueBaseline } from '../vision/blendshapeAnalyzer';
import { createEstimatorConfig } from '../vision/laughEstimator';
import { LaughMonitor } from '../vision/laughMonitor';

export interface GameView {
  phase: RoundPhase;
  pauseReason: PauseReason | null;
  /** Remaining time rounded up to 0.1 s. */
  remainingMs: number;
  totalMs: number;
  score: number;
  strikes: number;
  challenge: Challenge;
  challengeNumber: number;
  punchlineRevealed: boolean;
}

export interface GameSessionOptions {
  config: RoundConfig;
  tuning: DetectionTuning;
  baseline: CueBaseline;
  contentMix: ContentMix;
  onStrike?: (strikes: number, ended: boolean) => void;
  onWarning?: () => void;
  onChallenge?: (challenge: Challenge, number: number) => void;
  onFinished: (result: RoundResult) => void;
}

/** Longest clock step accepted from one animation frame (e.g. after a stall). */
const MAX_TICK_MS = 100;
const WARNING_SOUND_GAP_MS = 1500;

interface ActiveChallenge {
  number: number;
  challenge: Challenge;
  /** Round time (active play) at which this challenge appeared. */
  startedAt: number;
  /** How long it stays; videos extend this once their length is known. */
  durationMs: number;
}

function viewOf(round: RoundState, challenge: Challenge, challengeNumber: number, punchlineRevealed: boolean): GameView {
  return {
    phase: round.phase,
    pauseReason: round.pauseReason,
    remainingMs: Math.ceil(remainingMs(round) / 100) * 100,
    totalMs: round.config.durationSec * 1000,
    score: currentScore(round),
    strikes: round.strikes.length,
    challenge,
    challengeNumber,
    punchlineRevealed,
  };
}

function sameView(a: GameView, b: GameView): boolean {
  return (
    a.phase === b.phase &&
    a.pauseReason === b.pauseReason &&
    a.remainingMs === b.remainingMs &&
    a.score === b.score &&
    a.strikes === b.strikes &&
    a.challenge.id === b.challenge.id &&
    a.challengeNumber === b.challengeNumber &&
    a.punchlineRevealed === b.punchlineRevealed
  );
}

export function useGameSession(options: GameSessionOptions) {
  const optionsRef = useRef(options);
  useLayoutEffect(() => {
    optionsRef.current = options;
  });

  // Everything below is created once per mounted round.
  const [monitor] = useState(() => new LaughMonitor(createEstimatorConfig(options.tuning), options.baseline));
  // Created together so React's double-invoked initializers (StrictMode) cannot skip a card.
  const [{ deck, firstChallenge }] = useState(() => {
    const source = createChallengeSource(options.config.difficulty, options.contentMix, USER_MEDIA.challenges);
    return { deck: source, firstChallenge: source.next() };
  });
  const interval = DIFFICULTIES[options.config.difficulty].challengeIntervalMs;
  const roundRef = useRef<RoundState>(createRound(options.config));
  const challengeRef = useRef<ActiveChallenge>({ number: 1, challenge: firstChallenge, startedAt: 0, durationMs: interval });
  const [view, setView] = useState<GameView>(() => viewOf(roundRef.current, challengeRef.current.challenge, 1, false));
  const viewRef = useRef(view);
  const faceRef = useRef<{ lastSeen: number; backSince: number | null }>({ lastSeen: performance.now(), backSince: null });

  const publish = useCallback(() => {
    const round = roundRef.current;
    const { number, challenge, startedAt } = challengeRef.current;
    const next = viewOf(round, challenge, number, round.elapsedMs - startedAt >= GAMEPLAY_TIMING.punchlineRevealMs);
    if (!sameView(viewRef.current, next)) {
      viewRef.current = next;
      setView(next);
    }
  }, []);

  /** Shows the next challenge from the current round time. */
  const advanceChallenge = useCallback(() => {
    const current = challengeRef.current;
    const challenge = deck.next();
    challengeRef.current = { number: current.number + 1, challenge, startedAt: roundRef.current.elapsedMs, durationMs: interval };
    optionsRef.current.onChallenge?.(challenge, current.number + 1);
  }, [deck, interval]);

  const announcedFirst = useRef(false);
  useEffect(() => {
    // The first challenge is already on screen when the round starts.
    if (announcedFirst.current) return;
    announcedFirst.current = true;
    optionsRef.current.onChallenge?.(challengeRef.current.challenge, 1);
  }, []);

  useEffect(() => {
    let rafId = 0;
    let lastTick = performance.now();
    const face = faceRef.current;
    face.lastSeen = performance.now();
    let lastWarningAt = -Infinity;
    let finished = false;

    monitor.start();
    const unsubscribe = monitor.subscribe((snapshot) => {
      if (snapshot.faceVisible) {
        face.lastSeen = snapshot.timestampMs;
        face.backSince ??= snapshot.timestampMs;
      } else {
        face.backSince = null;
      }
      const round = roundRef.current;
      if (round.phase !== 'playing') return;
      if (snapshot.event) {
        const next = registerStrike(round);
        roundRef.current = next;
        optionsRef.current.onStrike?.(next.strikes.length, next.phase === 'ended');
        publish();
      } else if (snapshot.state === 'high-risk' && snapshot.timestampMs - lastWarningAt > WARNING_SOUND_GAP_MS) {
        lastWarningAt = snapshot.timestampMs;
        optionsRef.current.onWarning?.();
      }
    });

    const loop = (now: number) => {
      const dt = Math.min(MAX_TICK_MS, Math.max(0, now - lastTick));
      lastTick = now;
      let round = roundRef.current;

      // A missing face freezes the clock, so hiding is never a strategy.
      if (round.phase === 'playing' && now - face.lastSeen > GAMEPLAY_TIMING.faceLostPauseMs) {
        round = pauseRound(round, 'face-lost');
      } else if (
        round.phase === 'paused' &&
        round.pauseReason === 'face-lost' &&
        face.backSince !== null &&
        now - face.backSince >= GAMEPLAY_TIMING.faceReturnResumeMs
      ) {
        round = resumeRound(round, 'face-lost');
        monitor.reset();
      }

      round = tick(round, dt);
      roundRef.current = round;

      const active = challengeRef.current;
      if (round.phase === 'playing' && round.elapsedMs - active.startedAt >= active.durationMs) {
        advanceChallenge();
      }
      publish();

      if (round.phase === 'ended') {
        if (!finished) {
          finished = true;
          optionsRef.current.onFinished(buildResult(round));
        }
        return;
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    const onVisibility = () => {
      if (document.hidden && roundRef.current.phase === 'playing') {
        roundRef.current = pauseRound(roundRef.current, 'hidden');
        publish();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange', onVisibility);
      unsubscribe();
      monitor.stop();
    };
  }, [advanceChallenge, monitor, publish]);

  const pause = useCallback(
    (reason: PauseReason = 'player') => {
      roundRef.current = pauseRound(roundRef.current, reason);
      publish();
    },
    [publish],
  );

  /** Resumes any pause (the player pressed Resume) with a fresh detector state. */
  const resume = useCallback(() => {
    const before = roundRef.current;
    roundRef.current = resumeRound(before);
    if (before.phase === 'paused') {
      monitor.reset();
      // Give tracking a fresh grace window instead of judging a stale timestamp.
      faceRef.current.lastSeen = performance.now();
    }
    publish();
  }, [monitor, publish]);

  /** A video reports its length: keep it on screen until it ends (within limits). */
  const setMediaDuration = useCallback(
    (challengeId: string, mediaMs: number) => {
      const active = challengeRef.current;
      if (active.challenge.id !== challengeId || !Number.isFinite(mediaMs)) return;
      active.durationMs = Math.min(GAMEPLAY_TIMING.maxVideoMs, Math.max(interval, mediaMs + 400));
    },
    [interval],
  );

  /** Skips a challenge whose media failed to load. */
  const skipChallenge = useCallback(
    (challengeId: string) => {
      if (challengeRef.current.challenge.id !== challengeId) return;
      advanceChallenge();
      publish();
    },
    [advanceChallenge, publish],
  );

  return { view, monitor, pause, resume, setMediaDuration, skipChallenge };
}
