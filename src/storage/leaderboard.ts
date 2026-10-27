/**
 * Local Top 10 leaderboard and round statistics. Only game results are stored:
 * no images, landmarks or expression histories.
 */
import { DIFFICULTY_ORDER, ROUND_DURATIONS } from '../game/gameConfig';
import type { Difficulty, OutcomeId, RoundDurationSec, RoundResult } from '../game/gameTypes';
import { isRecord, readJSON, writeJSON } from './safeStorage';

export const LEADERBOARD_KEY = 'ai-poker-face:leaderboard:v1';
export const STATS_KEY = 'ai-poker-face:stats:v1';
export const LEADERBOARD_SIZE = 10;
export const NICKNAME_MAX_LENGTH = 16;

const OUTCOME_IDS: readonly OutcomeId[] = ['legend', 'ice-cold', 'almost', 'laugh-detected', 'failed'];

export interface LeaderboardEntry {
  id: string;
  nickname: string;
  score: number;
  difficulty: Difficulty;
  durationSec: RoundDurationSec;
  strikes: number;
  survived: boolean;
  outcome: OutcomeId;
  date: number;
}

export interface PlayerStats {
  totalRounds: number;
  roundsSurvived: number;
  bestScore: number;
}

export const EMPTY_STATS: PlayerStats = { totalRounds: 0, roundsSurvived: 0, bestScore: 0 };

export function sanitizeNickname(input: string): string {
  // Strip control characters, collapse whitespace, cap the length.
  const cleaned = Array.from(input.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim())
    .slice(0, NICKNAME_MAX_LENGTH)
    .join('');
  return cleaned.length > 0 ? cleaned : 'Anonymous';
}

function sanitizeEntry(value: unknown): LeaderboardEntry | null {
  if (!isRecord(value)) return null;
  const { id, nickname, score, difficulty, durationSec, strikes, survived, outcome, date } = value;
  if (typeof id !== 'string' || typeof nickname !== 'string') return null;
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0) return null;
  if (!DIFFICULTY_ORDER.includes(difficulty as Difficulty)) return null;
  if (!ROUND_DURATIONS.includes(durationSec as RoundDurationSec)) return null;
  if (typeof strikes !== 'number' || typeof survived !== 'boolean' || typeof date !== 'number') return null;
  if (!OUTCOME_IDS.includes(outcome as OutcomeId)) return null;
  return {
    id,
    nickname: sanitizeNickname(nickname),
    score: Math.round(score),
    difficulty: difficulty as Difficulty,
    durationSec: durationSec as RoundDurationSec,
    strikes: Math.max(0, Math.round(strikes)),
    survived,
    outcome: outcome as OutcomeId,
    date,
  };
}

/** Highest score first; ties go to the earlier entry. */
export function sortEntries(entries: readonly LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort((a, b) => b.score - a.score || a.date - b.date);
}

export function sanitizeLeaderboard(value: unknown): LeaderboardEntry[] {
  if (!Array.isArray(value)) return [];
  const entries = value.map(sanitizeEntry).filter((e): e is LeaderboardEntry => e !== null);
  return sortEntries(entries).slice(0, LEADERBOARD_SIZE);
}

/** 1-based position of an entry on the board, or null when it is not on it. */
export function leaderboardRank(entries: readonly LeaderboardEntry[], id: string | null): number | null {
  if (!id) return null;
  const index = sortEntries(entries).findIndex((entry) => entry.id === id);
  return index === -1 ? null : index + 1;
}

export function qualifiesForLeaderboard(entries: readonly LeaderboardEntry[], score: number): boolean {
  if (score <= 0) return false;
  if (entries.length < LEADERBOARD_SIZE) return true;
  const lowest = sortEntries(entries)[LEADERBOARD_SIZE - 1];
  return lowest === undefined || score > lowest.score;
}

export function createEntry(result: RoundResult, nickname: string): LeaderboardEntry {
  return {
    id: `${result.endedAt.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    nickname: sanitizeNickname(nickname),
    score: result.score.finalScore,
    difficulty: result.difficulty,
    durationSec: result.durationSec,
    strikes: result.strikes,
    survived: result.survived,
    outcome: result.outcome,
    date: result.endedAt,
  };
}

export function insertEntry(entries: readonly LeaderboardEntry[], entry: LeaderboardEntry): LeaderboardEntry[] {
  return sortEntries([...entries, entry]).slice(0, LEADERBOARD_SIZE);
}

export function sanitizeStats(value: unknown): PlayerStats {
  if (!isRecord(value)) return { ...EMPTY_STATS };
  const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v) : 0);
  return { totalRounds: num(value.totalRounds), roundsSurvived: num(value.roundsSurvived), bestScore: num(value.bestScore) };
}

export function applyResultToStats(stats: PlayerStats, result: RoundResult): PlayerStats {
  return {
    totalRounds: stats.totalRounds + 1,
    roundsSurvived: stats.roundsSurvived + (result.survived ? 1 : 0),
    bestScore: Math.max(stats.bestScore, result.score.finalScore),
  };
}

export function loadLeaderboard(): LeaderboardEntry[] {
  return sanitizeLeaderboard(readJSON(LEADERBOARD_KEY));
}

export function saveLeaderboard(entries: readonly LeaderboardEntry[]): boolean {
  return writeJSON(LEADERBOARD_KEY, entries);
}

export function loadStats(): PlayerStats {
  return sanitizeStats(readJSON(STATS_KEY));
}

export function saveStats(stats: PlayerStats): boolean {
  return writeJSON(STATS_KEY, stats);
}
