import { Clock, Gauge, HeartCrack, Trophy } from 'lucide-react';
import { DIFFICULTIES, SCORING } from '../game/gameConfig';
import type { Difficulty, RoundDurationSec } from '../game/gameTypes';

interface RulesSummaryProps {
  difficulty: Difficulty;
  durationSec: RoundDurationSec;
}

export function RulesSummary({ difficulty, durationSec }: RulesSummaryProps) {
  const preset = DIFFICULTIES[difficulty];
  return (
    <section className="rules-summary" aria-label="Round rules">
      <h3>Round rules</h3>
      <ul>
        <li>
          <Clock size={16} />
          <span>
            Keep a straight face for <strong>{durationSec} seconds</strong>.
          </span>
        </li>
        <li>
          <HeartCrack size={16} />
          <span>
            Each laugh-like event costs <strong>{SCORING.penaltyPerStrike} points</strong>. <strong>{SCORING.maxStrikes} strikes</strong>{' '}
            end the round.
          </span>
        </li>
        <li>
          <Trophy size={16} />
          <span>
            Start with <strong>{SCORING.startingScore}</strong>. Survive the full timer for <strong>+{SCORING.survivalBonus}</strong>.
          </span>
        </li>
        <li>
          <Gauge size={16} />
          <span>
            <strong>{preset.label}:</strong> {preset.description} An expression must be held for about{' '}
            {(preset.detection.sustainMs / 1000).toFixed(1)} s to count.
          </span>
        </li>
      </ul>
    </section>
  );
}
