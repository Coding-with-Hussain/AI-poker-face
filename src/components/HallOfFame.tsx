import { Crown, Trophy } from 'lucide-react';
import { DIFFICULTIES } from '../game/gameConfig';
import type { LeaderboardEntry } from '../storage/leaderboard';

interface HallOfFameProps {
  entries: readonly LeaderboardEntry[];
  limit?: number;
  highlightId?: string | null;
}

export function HallOfFame({ entries, limit = 5, highlightId = null }: HallOfFameProps) {
  const shown = entries.slice(0, limit);
  return (
    <section className="hall-of-fame" aria-label="Hall of fame">
      <h3>
        <Trophy size={16} /> Hall of Fame
      </h3>
      {shown.length === 0 ? (
        <p className="muted">No scores yet. Be the first poker face!</p>
      ) : (
        <ol>
          {shown.map((entry, i) => (
            <li key={entry.id} className={entry.id === highlightId ? 'highlight' : ''}>
              <span className="rank">{i === 0 ? <Crown size={14} /> : i + 1}</span>
              <span className="name">{entry.nickname}</span>
              <span className={`difficulty-badge small difficulty-${entry.difficulty}`}>{DIFFICULTIES[entry.difficulty].label}</span>
              <span className="points tabular">{entry.score}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
