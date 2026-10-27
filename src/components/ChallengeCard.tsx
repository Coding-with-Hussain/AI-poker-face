import { useMemo } from 'react';
import { CATEGORY_LABELS, type Challenge } from '../content/challenges';
import { VisualGag } from './VisualGag';

interface ChallengeCardProps {
  challenge: Challenge;
  number: number;
  punchlineRevealed: boolean;
}

/** Splits an emoji string into user-perceived characters (keeps ZWJ/VS16 intact). */
function graphemes(text: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return Array.from(segmenter.segment(text), (s) => s.segment);
  }
  return [text];
}

export function ChallengeCard({ challenge, number, punchlineRevealed }: ChallengeCardProps) {
  const emoji = useMemo(() => (challenge.emoji ? graphemes(challenge.emoji) : null), [challenge.emoji]);
  const style = challenge.style ?? (challenge.category === 'punchline' ? 'slide' : 'pop');

  return (
    <article className={`challenge-card category-${challenge.category}`} aria-live="polite">
      <header className="challenge-meta">
        <span className="chip chip-violet">{CATEGORY_LABELS[challenge.category]}</span>
        <span className="challenge-number tabular">#{number}</span>
      </header>
      <div key={challenge.id} className={`challenge-body enter-${style}`}>
        {emoji && (
          <div className="challenge-emoji" aria-hidden="true">
            {emoji.map((e, i) => (
              <span key={`${e}-${i}`} style={{ animationDelay: `${i * 0.12}s` }}>
                {e}
              </span>
            ))}
          </div>
        )}
        {challenge.visual && <VisualGag id={challenge.visual} />}
        <p className={`challenge-text ${challenge.visual || emoji ? 'is-caption' : ''}`}>{challenge.text}</p>
        {challenge.punchline && (
          <p className={`challenge-punchline ${punchlineRevealed ? 'revealed' : ''}`}>
            {punchlineRevealed ? challenge.punchline : <span className="dots">• • •</span>}
          </p>
        )}
      </div>
    </article>
  );
}
