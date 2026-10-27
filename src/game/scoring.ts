import type { OutcomeId, ScoreBreakdown, ScoringRules } from './gameTypes';

/** Score shown during play: penalties only, never below zero. */
export function liveScore(rules: ScoringRules, strikes: number): number {
  return Math.max(0, rules.startingScore - Math.max(0, strikes) * rules.penaltyPerStrike);
}

/**
 * Final Score = max(0, Starting Score - Penalties + Survival Bonus).
 * The survival bonus is only granted when the full round was completed.
 */
export function computeFinalScore(rules: ScoringRules, strikes: number, survived: boolean): ScoreBreakdown {
  const penalties = Math.max(0, strikes) * rules.penaltyPerStrike;
  const survivalBonus = survived ? rules.survivalBonus : 0;
  return {
    startingScore: rules.startingScore,
    penalties,
    survivalBonus,
    finalScore: Math.max(0, rules.startingScore - penalties + survivalBonus),
  };
}

export interface OutcomeInput {
  survived: boolean;
  strikes: number;
  timeSurvivedMs: number;
  roundDurationMs: number;
}

/** Picks the results title strictly from what happened in the round. */
export function determineOutcome({ survived, strikes, timeSurvivedMs, roundDurationMs }: OutcomeInput): OutcomeId {
  if (survived) {
    if (strikes === 0) return 'legend';
    if (strikes === 1) return 'ice-cold';
    return 'almost';
  }
  // Knocked out by strikes: lasting past the halfway mark still earns respect.
  return timeSurvivedMs >= roundDurationMs / 2 ? 'laugh-detected' : 'failed';
}

export interface OutcomeCopy {
  title: string;
  tone: 'gold' | 'cyan' | 'violet' | 'amber' | 'red';
  messages: readonly string[];
}

export const OUTCOMES: Record<OutcomeId, OutcomeCopy> = {
  legend: {
    title: 'Poker Face Legend',
    tone: 'gold',
    messages: [
      'Not a single twitch. The AI is filing a complaint.',
      'Stone-cold. Somewhere, a comedian just quit.',
      'Your face has the emotional range of a brick wall. Magnificent.',
    ],
  },
  'ice-cold': {
    title: 'Ice-Cold Champion',
    tone: 'cyan',
    messages: [
      'One tiny crack, but you held the line.',
      'A single slip. The jokes almost had you.',
      'Cool, calm and only slightly compromised.',
    ],
  },
  almost: {
    title: 'Almost Lost It',
    tone: 'violet',
    messages: [
      'You survived... barely. Your cheeks are still recovering.',
      'Made it to the end, held together with tape and willpower.',
      'The laugh was knocking. You only opened the door twice.',
    ],
  },
  'laugh-detected': {
    title: 'Laugh Detected!',
    tone: 'amber',
    messages: [
      'You fought bravely past halftime before the giggles won.',
      'So close. The jokes wore you down in the end.',
      'A valiant effort, undone by a very persistent smile.',
    ],
  },
  failed: {
    title: 'Challenge Failed',
    tone: 'red',
    messages: [
      'The jokes won this round. Rematch?',
      'Your poker face folded early. Shuffle up and try again!',
      'Three strikes, and the laughter takes the pot.',
    ],
  },
};

/** Deterministic pick so the same result always shows the same message. */
export function outcomeMessage(outcome: OutcomeId, finalScore: number, strikes: number): string {
  const { messages } = OUTCOMES[outcome];
  const index = Math.abs(finalScore * 7 + strikes * 3) % messages.length;
  return messages[index] ?? messages[0] ?? '';
}
