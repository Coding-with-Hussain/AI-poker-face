import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { DIFFICULTIES } from '../game/gameConfig';
import type { DetectionTuning, Difficulty } from '../game/gameTypes';
import type { LaughMonitor } from '../vision/laughMonitor';
import { CueMeter } from './CueMeter';
import { ScoreDisplay } from './ScoreDisplay';

interface TimerRingProps {
  remainingMs: number;
  totalMs: number;
}

export function TimerRing({ remainingMs, totalMs }: TimerRingProps) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const fraction = totalMs > 0 ? remainingMs / totalMs : 0;
  const seconds = Math.ceil(remainingMs / 1000);
  const urgent = remainingMs <= 5000;
  return (
    <div className={`timer-ring ${urgent ? 'urgent' : ''}`} role="timer" aria-label={`${seconds} seconds left`}>
      <svg viewBox="0 0 80 80" aria-hidden="true">
        <circle className="timer-ring-bg" cx="40" cy="40" r={radius} />
        <circle
          className="timer-ring-fg"
          cx="40"
          cy="40"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
        />
      </svg>
      <span className="timer-ring-value tabular">{seconds}</span>
      <span className="timer-ring-unit">sec</span>
    </div>
  );
}

export function StrikeTokens({ strikes, max }: { strikes: number; max: number }) {
  return (
    <div className="hud-stat strikes" aria-label={`${strikes} of ${max} strikes`}>
      <span className="hud-label">Strikes</span>
      <span className="strike-tokens">
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className={`strike-token ${i < strikes ? 'used' : ''}`} aria-hidden="true">
            {i < strikes ? '😂' : '😐'}
          </span>
        ))}
      </span>
    </div>
  );
}

interface GameHUDProps {
  remainingMs: number;
  totalMs: number;
  score: number;
  strikes: number;
  maxStrikes: number;
  difficulty: Difficulty;
  monitor: LaughMonitor;
  tuning: DetectionTuning;
  paused: boolean;
  soundEnabled: boolean;
  onTogglePause: () => void;
  onToggleSound: () => void;
}

export function GameHUD(props: GameHUDProps) {
  const { remainingMs, totalMs, score, strikes, maxStrikes, difficulty, monitor, tuning, paused, soundEnabled } = props;
  return (
    <section className="game-hud" aria-label="Game status">
      <TimerRing remainingMs={remainingMs} totalMs={totalMs} />
      <ScoreDisplay score={score} />
      <StrikeTokens strikes={strikes} max={maxStrikes} />
      <div className="hud-stat hud-difficulty">
        <span className="hud-label">Difficulty</span>
        <span className={`difficulty-badge difficulty-${difficulty}`}>{DIFFICULTIES[difficulty].label}</span>
      </div>
      <CueMeter monitor={monitor} tuning={tuning} />
      <div className="hud-controls">
        <button
          type="button"
          className="icon-button"
          onClick={props.onToggleSound}
          aria-label={soundEnabled ? 'Mute sound (M)' : 'Unmute sound (M)'}
          title={soundEnabled ? 'Mute (M)' : 'Unmute (M)'}
        >
          {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
        <button
          type="button"
          className="icon-button icon-button-strong"
          onClick={props.onTogglePause}
          aria-label={paused ? 'Resume (Space)' : 'Pause (Space)'}
          title={paused ? 'Resume (Space)' : 'Pause (Space)'}
        >
          {paused ? <Play size={20} /> : <Pause size={20} />}
        </button>
      </div>
    </section>
  );
}
