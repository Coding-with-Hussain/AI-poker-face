import { describe, expect, it } from 'vitest';
import { DIFFICULTY_ORDER } from '../game/gameConfig';
import { ChallengeDeck, challengesForDifficulty } from './challengeDeck';
import { CHALLENGES } from './challenges';

/** Small deterministic PRNG (mulberry32) for repeatable shuffles. */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('challenge library', () => {
  it('has at least 40 entries with unique ids', () => {
    expect(CHALLENGES.length).toBeGreaterThanOrEqual(40);
    expect(new Set(CHALLENGES.map((c) => c.id)).size).toBe(CHALLENGES.length);
  });

  it('is fully local: no URLs anywhere in the content', () => {
    expect(JSON.stringify(CHALLENGES)).not.toMatch(/https?:\/\//i);
  });

  it('gives every difficulty plenty of content', () => {
    for (const difficulty of DIFFICULTY_ORDER) {
      expect(challengesForDifficulty(difficulty).length).toBeGreaterThanOrEqual(20);
    }
  });

  it('keeps entries well-formed for their category', () => {
    for (const c of CHALLENGES) {
      expect(c.text.length).toBeGreaterThan(5);
      if (c.category === 'punchline') expect(c.punchline).toBeTruthy();
      if (c.category === 'emoji') expect(c.emoji).toBeTruthy();
      if (c.category === 'visual-gag') expect(c.visual).toBeTruthy();
    }
  });
});

describe('ChallengeDeck', () => {
  it('shows every challenge once before repeating any', () => {
    const pool = challengesForDifficulty('normal');
    const deck = new ChallengeDeck(pool, seeded(42));
    const firstPass = Array.from({ length: pool.length }, () => deck.next().id);
    expect(new Set(firstPass).size).toBe(pool.length);
  });

  it('does not repeat a recent challenge across reshuffles', () => {
    const pool = challengesForDifficulty('hard');
    for (let seed = 1; seed <= 25; seed += 1) {
      const deck = new ChallengeDeck(pool, seeded(seed), 6);
      const ids = Array.from({ length: pool.length * 3 }, () => deck.next().id);
      for (let i = 1; i < ids.length; i += 1) {
        expect(ids.slice(Math.max(0, i - 6), i)).not.toContain(ids[i]);
      }
    }
  });

  it('randomises order between rounds', () => {
    const pool = challengesForDifficulty('normal');
    const a = new ChallengeDeck(pool, seeded(1));
    const b = new ChallengeDeck(pool, seeded(2));
    const seqA = Array.from({ length: 8 }, () => a.next().id).join();
    const seqB = Array.from({ length: 8 }, () => b.next().id).join();
    expect(seqA).not.toBe(seqB);
  });
});
