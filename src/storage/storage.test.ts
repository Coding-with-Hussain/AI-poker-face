import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RoundResult } from '../game/gameTypes';
import {
  applyResultToStats,
  createEntry,
  EMPTY_STATS,
  insertEntry,
  LEADERBOARD_SIZE,
  qualifiesForLeaderboard,
  sanitizeLeaderboard,
  sanitizeNickname,
  type LeaderboardEntry,
} from './leaderboard';
import { readJSON, resetStorageCacheForTests, writeJSON } from './safeStorage';
import { DEFAULT_SETTINGS, sanitizeSettings } from './settings';

const result = (finalScore: number, survived = true): RoundResult => ({
  difficulty: 'normal',
  durationSec: 30,
  timeSurvivedMs: 30_000,
  strikes: 0,
  survived,
  endReason: survived ? 'completed' : 'strikes',
  score: { startingScore: 100, penalties: 0, survivalBonus: survived ? 30 : 0, finalScore },
  outcome: survived ? 'legend' : 'failed',
  endedAt: 1_700_000_000_000 + finalScore,
});

describe('settings', () => {
  it('falls back to defaults for invalid data', () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings('nope')).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings({ difficulty: 'insane', durationSec: 999, sensitivity: 42, soundEnabled: 'yes' })).toEqual({
      ...DEFAULT_SETTINGS,
      sensitivity: 10,
    });
  });

  it('keeps valid values and always starts with diagnostics hidden', () => {
    const settings = sanitizeSettings({ difficulty: 'hard', durationSec: 60, sensitivity: 3, soundEnabled: false, showOverlay: false, showDiagnostics: true });
    expect(settings).toEqual({ difficulty: 'hard', durationSec: 60, sensitivity: 3, soundEnabled: false, showOverlay: false, showDiagnostics: false });
  });
});

describe('leaderboard', () => {
  const entries = (scores: number[]): LeaderboardEntry[] => scores.map((s, i) => ({ ...createEntry(result(s), `P${i}`), date: i }));

  it('sanitises nicknames', () => {
    expect(sanitizeNickname('   ')).toBe('Anonymous');
    expect(sanitizeNickname('  Ada\u0007   Lovelace  ')).toBe('Ada Lovelace');
    expect(sanitizeNickname('x'.repeat(50))).toHaveLength(16);
  });

  it('keeps the top entries sorted and capped', () => {
    let board: LeaderboardEntry[] = [];
    for (let i = 0; i < 15; i += 1) board = insertEntry(board, createEntry(result(i * 10), `P${i}`));
    expect(board).toHaveLength(LEADERBOARD_SIZE);
    expect(board[0]?.score).toBe(140);
    expect(board.at(-1)?.score).toBe(50);
  });

  it('only lets qualifying scores in', () => {
    const full = entries([130, 120, 110, 100, 90, 80, 70, 60, 50, 40]);
    expect(qualifiesForLeaderboard(full, 40)).toBe(false);
    expect(qualifiesForLeaderboard(full, 41)).toBe(true);
    expect(qualifiesForLeaderboard([], 0)).toBe(false);
    expect(qualifiesForLeaderboard([], 10)).toBe(true);
  });

  it('drops malformed stored entries', () => {
    const good = createEntry(result(90), 'Kim');
    expect(sanitizeLeaderboard([good, { id: 'x' }, null, { ...good, score: -5 }, { ...good, difficulty: 'nightmare' }])).toEqual([good]);
    expect(sanitizeLeaderboard('garbage')).toEqual([]);
  });

  it('tracks rounds, survivals and best score', () => {
    let stats = applyResultToStats(EMPTY_STATS, result(130));
    stats = applyResultToStats(stats, result(40, false));
    expect(stats).toEqual({ totalRounds: 2, roundsSurvived: 1, bestScore: 130 });
  });
});

describe('safe storage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetStorageCacheForTests();
  });

  it('works with a functioning storage', () => {
    const map = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
    });
    resetStorageCacheForTests();
    expect(writeJSON('k', { a: 1 })).toBe(true);
    expect(readJSON('k')).toEqual({ a: 1 });
  });

  it('degrades gracefully when localStorage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('SecurityError');
      },
      removeItem: () => undefined,
    });
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    resetStorageCacheForTests();
    expect(writeJSON('k', 1)).toBe(false);
    expect(readJSON('k')).toBeNull();
  });
});
