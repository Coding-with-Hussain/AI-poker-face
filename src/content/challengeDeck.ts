import { DIFFICULTIES } from '../game/gameConfig';
import type { Difficulty } from '../game/gameTypes';
import { CHALLENGES, type Challenge } from './challenges';

export type RandomSource = () => number;

export function challengesForDifficulty(difficulty: Difficulty, library: readonly Challenge[] = CHALLENGES): Challenge[] {
  const { minIntensity, maxIntensity } = DIFFICULTIES[difficulty];
  return library.filter((c) => c.intensity >= minIntensity && c.intensity <= maxIntensity);
}

export function shuffle<T>(items: readonly T[], random: RandomSource = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const a = result[i] as T;
    result[i] = result[j] as T;
    result[j] = a;
  }
  return result;
}

/**
 * Deals challenges in random order without repeats until every entry has been
 * shown, then reshuffles while keeping recently shown entries out of the
 * start of the next pass.
 */
export class ChallengeDeck {
  private readonly pool: readonly Challenge[];
  private readonly random: RandomSource;
  private readonly avoidRecent: number;
  private queue: Challenge[] = [];
  private recent: string[] = [];

  constructor(pool: readonly Challenge[], random: RandomSource = Math.random, avoidRecent = 6) {
    if (pool.length === 0) throw new Error('ChallengeDeck needs at least one challenge.');
    this.pool = pool;
    this.random = random;
    this.avoidRecent = Math.min(avoidRecent, Math.max(0, pool.length - 1));
  }

  next(): Challenge {
    if (this.queue.length === 0) this.refill();
    const challenge = this.queue.shift() as Challenge;
    this.recent.push(challenge.id);
    if (this.recent.length > this.avoidRecent) this.recent.shift();
    return challenge;
  }

  private refill(): void {
    const shuffled = shuffle(this.pool, this.random);
    const recent = new Set(this.recent);
    const fresh = shuffled.filter((c) => !recent.has(c.id));
    const stale = shuffled.filter((c) => recent.has(c.id));
    this.queue = [...fresh, ...stale];
  }
}
