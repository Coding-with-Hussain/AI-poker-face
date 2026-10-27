import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Crown, Home, Laugh, Medal, RotateCcw, Save, Snowflake, Timer, Trophy, Users, XCircle } from 'lucide-react';
import { sound } from '../audio/soundEngine';
import { HallOfFame } from '../components/HallOfFame';
import { DIFFICULTIES } from '../game/gameConfig';
import type { OutcomeId, RoundResult } from '../game/gameTypes';
import { OUTCOMES, outcomeMessage } from '../game/scoring';
import { NICKNAME_MAX_LENGTH, qualifiesForLeaderboard, type LeaderboardEntry, type PlayerStats } from '../storage/leaderboard';

interface ResultsPageProps {
  result: RoundResult;
  stats: PlayerStats;
  isNewBest: boolean;
  leaderboard: readonly LeaderboardEntry[];
  nickname: string;
  storageAvailable: boolean;
  onSaveScore: (nickname: string) => string | null;
  onPlayAgain: () => void;
  onNextPlayer: () => void;
  onHome: () => void;
}

const OUTCOME_ICONS: Record<OutcomeId, typeof Crown> = {
  legend: Crown,
  'ice-cold': Snowflake,
  almost: Medal,
  'laugh-detected': Laugh,
  failed: XCircle,
};

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        left: (i * 37) % 100,
        delay: ((i * 13) % 20) / 10,
        duration: 2.4 + ((i * 7) % 10) / 10,
        hue: [265, 190, 45, 330, 150][i % 5],
      })),
    [],
  );
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            background: `hsl(${p.hue} 90% 65%)`,
          }}
        />
      ))}
    </div>
  );
}

export function ResultsPage(props: ResultsPageProps) {
  const { result, stats, isNewBest, leaderboard, storageAvailable } = props;
  const outcome = OUTCOMES[result.outcome];
  const Icon = OUTCOME_ICONS[result.outcome];
  const [name, setName] = useState(props.nickname);
  const [savedId, setSavedId] = useState<string | null>(null);
  const canSave = storageAvailable && savedId === null && qualifiesForLeaderboard(leaderboard, result.score.finalScore);
  const played = useRef(false);

  useEffect(() => {
    if (played.current) return;
    played.current = true;
    sound.play(result.survived ? 'win' : 'lose');
  }, [result.survived]);

  const save = () => {
    const id = props.onSaveScore(name);
    if (id) {
      setSavedId(id);
      sound.play('save');
    }
  };

  const seconds = (result.timeSurvivedMs / 1000).toFixed(1);

  return (
    <div className="results-page">
      {result.survived && <Confetti />}
      <section className={`results-hero tone-${outcome.tone}`}>
        <span className="results-icon">
          <Icon size={56} />
        </span>
        <p className="eyebrow">{result.survived ? 'Round survived' : 'Round over'}</p>
        <h1>{outcome.title}</h1>
        <p className="results-message">{outcomeMessage(result.outcome, result.score.finalScore, result.strikes)}</p>
        <div className="final-score">
          <span className="final-score-label">Final score</span>
          <span className="final-score-value tabular">{result.score.finalScore}</span>
          {isNewBest && (
            <span className="chip chip-gold">
              <Trophy size={14} /> New best!
            </span>
          )}
        </div>
      </section>

      <section className="results-details">
        <div className="results-stats">
          <div className="result-stat">
            <Timer size={18} />
            <span className="label">Time survived</span>
            <span className="value tabular">
              {seconds}s <small>/ {result.durationSec}s</small>
            </span>
          </div>
          <div className="result-stat">
            <Laugh size={18} />
            <span className="label">Laugh-like events</span>
            <span className="value tabular">{result.strikes}</span>
          </div>
          <div className="result-stat">
            {result.survived ? <Check size={18} /> : <XCircle size={18} />}
            <span className="label">Survived</span>
            <span className={`value ${result.survived ? 'good' : 'bad'}`}>{result.survived ? 'Yes' : 'No'}</span>
          </div>
          <div className="result-stat">
            <Trophy size={18} />
            <span className="label">Highest score</span>
            <span className="value tabular">{stats.bestScore}</span>
          </div>
        </div>

        <div className="score-breakdown" aria-label="Score breakdown">
          <span>Start {result.score.startingScore}</span>
          <span className="minus">− Penalties {result.score.penalties}</span>
          <span className={result.score.survivalBonus > 0 ? 'plus' : 'muted'}>+ Survival bonus {result.score.survivalBonus}</span>
          <span className="equals">= {result.score.finalScore}</span>
          <span className={`difficulty-badge small difficulty-${result.difficulty}`}>{DIFFICULTIES[result.difficulty].label}</span>
        </div>

        <div className="results-lower">
          <div className="save-score">
            {canSave ? (
              <>
                <label htmlFor="results-nickname">You made the Hall of Fame! Enter a nickname:</label>
                <div className="save-row">
                  <input
                    id="results-nickname"
                    type="text"
                    value={name}
                    maxLength={NICKNAME_MAX_LENGTH}
                    placeholder="Your nickname"
                    autoComplete="off"
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && save()}
                  />
                  <button type="button" className="secondary-button" onClick={save}>
                    <Save size={16} /> Save
                  </button>
                </div>
              </>
            ) : savedId ? (
              <p className="saved-note">
                <Check size={16} /> Saved to the Hall of Fame.
              </p>
            ) : (
              <p className="muted">
                {storageAvailable
                  ? result.score.finalScore > 0
                    ? 'Not quite Hall of Fame material this time.'
                    : 'Score some points to enter the Hall of Fame.'
                  : 'Scores cannot be saved in this browser mode.'}
              </p>
            )}
            <p className="muted small">Only your nickname and score are saved, on this computer. No images.</p>
          </div>
          <HallOfFame entries={leaderboard} limit={5} highlightId={savedId} />
        </div>
      </section>

      <nav className="results-actions">
        <button type="button" className="play-button" onClick={props.onPlayAgain} autoFocus>
          <RotateCcw size={22} /> PLAY AGAIN
        </button>
        <button type="button" className="secondary-button large" onClick={props.onNextPlayer}>
          <Users size={20} /> NEXT PLAYER
        </button>
        <button type="button" className="secondary-button large" onClick={props.onHome}>
          <Home size={20} /> HOME
        </button>
      </nav>
    </div>
  );
}
