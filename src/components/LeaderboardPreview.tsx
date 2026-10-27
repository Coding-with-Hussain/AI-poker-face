import { ChevronRight, Crown, Trophy } from 'lucide-react';
import { DIFFICULTIES } from '../game/gameConfig';
import type { LeaderboardEntry } from '../storage/leaderboard';

interface LeaderboardPreviewProps {
  entries: readonly LeaderboardEntry[];
  limit?: number;
  highlightId?: string | null;
  onViewAll?: () => void;
}

/** The first few leaderboard places, with a link to the full Top 10. */
export function LeaderboardPreview({ entries, limit = 5, highlightId = null, onViewAll }: LeaderboardPreviewProps) {
  const shown = entries.slice(0, limit);
  return (
    <section className="leaderboard-preview" aria-label="Leaderboard">
      <div className="leaderboard-preview-head">
        <h3>
          <Trophy size={16} /> Leaderboard
        </h3>
        {onViewAll && (
          <button type="button" className="link-button" onClick={onViewAll}>
            View Top 10 <ChevronRight size={15} />
          </button>
        )}
      </div>
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
