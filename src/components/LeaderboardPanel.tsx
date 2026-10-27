import { Trophy } from 'lucide-react';
import { DIFFICULTIES } from '../game/gameConfig';
import { OUTCOMES } from '../game/scoring';
import { LEADERBOARD_SIZE, type LeaderboardEntry } from '../storage/leaderboard';
import { Modal } from './Modal';

interface LeaderboardPanelProps {
  entries: readonly LeaderboardEntry[];
  /** Entry to highlight, e.g. the score that was just saved. */
  highlightId?: string | null;
  storageAvailable: boolean;
  onClose: () => void;
}

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const TONE_CHIP = { gold: 'chip-gold', cyan: 'chip-cyan', violet: 'chip-violet', amber: 'chip-amber', red: 'chip-red' } as const;

/** Full Top 10 table. Empty places are shown so the board always reads as ten slots. */
export function LeaderboardPanel({ entries, highlightId = null, storageAvailable, onClose }: LeaderboardPanelProps) {
  const places = Array.from({ length: LEADERBOARD_SIZE }, (_, i) => entries[i] ?? null);
  return (
    <Modal title="Top 10 Leaderboard" onClose={onClose} wide>
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Player</th>
            <th scope="col" className="num">
              Score
            </th>
            <th scope="col">Difficulty</th>
            <th scope="col" className="lb-optional num">
              Round
            </th>
            <th scope="col" className="lb-optional num">
              Laughs
            </th>
            <th scope="col" className="lb-wide">
              Result
            </th>
            <th scope="col" className="lb-optional">
              When
            </th>
          </tr>
        </thead>
        <tbody>
          {places.map((entry, i) => {
            const rank = i + 1;
            const badge = <span className={`rank-badge rank-${rank}`}>{rank}</span>;
            if (!entry) {
              return (
                <tr key={`empty-${rank}`} className="empty">
                  <td>{badge}</td>
                  <td colSpan={7}>Open spot — could be you!</td>
                </tr>
              );
            }
            const outcome = OUTCOMES[entry.outcome];
            return (
              <tr key={entry.id} className={entry.id === highlightId ? 'highlight' : ''}>
                <td>{badge}</td>
                <td className="lb-name">
                  {entry.nickname}
                  {entry.id === highlightId && <span className="lb-you">latest</span>}
                </td>
                <td className="num lb-score tabular">{entry.score}</td>
                <td>
                  <span className={`difficulty-badge small difficulty-${entry.difficulty}`}>{DIFFICULTIES[entry.difficulty].label}</span>
                </td>
                <td className="lb-optional num tabular">{entry.durationSec}s</td>
                <td className="lb-optional num tabular">{entry.strikes}</td>
                <td className="lb-wide">
                  <span className={`chip ${TONE_CHIP[outcome.tone]}`}>{outcome.title}</span>
                </td>
                <td className="lb-optional lb-date">{DATE_FORMAT.format(entry.date)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="leaderboard-note">
        <Trophy size={14} /> Highest score first; ties go to the earlier score.{' '}
        {storageAvailable ? 'Scores are saved on this computer only.' : 'This browser is not allowing scores to be saved.'}
      </p>
    </Modal>
  );
}
