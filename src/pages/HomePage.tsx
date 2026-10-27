import { Camera, CameraOff, Cpu, HelpCircle, Play, Settings as SettingsIcon, ShieldCheck, Trophy, Volume2, VolumeX } from 'lucide-react';
import { LeaderboardPreview } from '../components/LeaderboardPreview';
import { USER_MEDIA } from '../content/userMedia';
import { Logo } from '../components/Logo';
import { PRIVACY_STATEMENT } from '../components/PrivacyNote';
import { Segmented, Toggle } from '../components/Segmented';
import { DIFFICULTIES, DIFFICULTY_ORDER, ROUND_DURATIONS } from '../game/gameConfig';
import { useCamera } from '../hooks/useCamera';
import type { LeaderboardEntry, PlayerStats } from '../storage/leaderboard';
import type { Settings } from '../storage/settings';

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

interface HomePageProps {
  settings: Settings;
  stats: PlayerStats;
  leaderboard: readonly LeaderboardEntry[];
  storageAvailable: boolean;
  onChangeSettings: (patch: Partial<Settings>) => void;
  onPlay: () => void;
  onHowToPlay: () => void;
  onOpenSettings: () => void;
  onViewLeaderboard: () => void;
}

export function HomePage(props: HomePageProps) {
  const { settings, stats, leaderboard, storageAvailable, onChangeSettings, onPlay, onHowToPlay, onOpenSettings, onViewLeaderboard } = props;
  const camera = useCamera();
  const cameraOn = camera.state === 'ready' || camera.state === 'requesting';
  const preset = DIFFICULTIES[settings.difficulty];

  return (
    <div className="home-page">
      <div className="home-topbar">
        <div className="button-row">
          <button
            type="button"
            className="icon-button"
            onClick={() => onChangeSettings({ soundEnabled: !settings.soundEnabled })}
            aria-label={settings.soundEnabled ? 'Mute sound' : 'Unmute sound'}
          >
            {settings.soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <button type="button" className="icon-button" onClick={onOpenSettings} aria-label="Settings">
            <SettingsIcon size={20} />
          </button>
        </div>
      </div>

      <main className="home-grid">
        <section className="hero">
          <Logo size={132} className="hero-logo" />
          <p className="eyebrow">AI + Computer Vision Party Game</p>
          <h1 className="game-title">
            <span className="title-ai">AI</span> POKER FACE
          </h1>
          <p className="tagline">Keep Your Face. Beat the Laugh.</p>
          <p className="support-line">“Your face is the controller. Your laughter is the enemy.”</p>
          <p className="hero-description">
            Jokes, absurd questions and silly animations fly at you while a local AI watches your face for smile and laugh
            cues. Hold a straight face until the timer runs out — three strikes and you are out.
          </p>
          <div className="hero-actions">
            <button type="button" className="play-button" onClick={onPlay} autoFocus>
              <Play size={26} fill="currentColor" /> PLAY NOW
            </button>
            <button type="button" className="secondary-button large" onClick={onHowToPlay}>
              <HelpCircle size={20} /> How to Play
            </button>
          </div>
        </section>

        <aside className="home-side">
          <section className="card setup-card">
            <h2>Round setup</h2>
            <Segmented
              label="Difficulty"
              value={settings.difficulty}
              options={DIFFICULTY_ORDER.map((d) => ({ value: d, label: DIFFICULTIES[d].label, hint: DIFFICULTIES[d].description }))}
              onChange={(difficulty) => onChangeSettings({ difficulty })}
            />
            <p className="setup-hint">{preset.description}</p>
            <Segmented
              label="Round duration"
              value={settings.durationSec}
              options={ROUND_DURATIONS.map((d) => ({ value: d, label: `${d} s` }))}
              onChange={(durationSec) => onChangeSettings({ durationSec })}
            />
            <Toggle label="Sound effects" checked={settings.soundEnabled} onChange={(soundEnabled) => onChangeSettings({ soundEnabled })} />
            {(USER_MEDIA.challenges.length > 0 || USER_MEDIA.counts.sounds > 0) && (
              <button type="button" className="media-hint" onClick={onOpenSettings}>
                Your media: {plural(USER_MEDIA.counts.videos, 'video')} · {plural(USER_MEDIA.counts.memes, 'meme')} ·{' '}
                {plural(USER_MEDIA.counts.sounds, 'sound')}
              </button>
            )}
          </section>

          <section className="card stats-card">
            <div className="stat-pair">
              <div>
                <span className="stat-label">
                  <Trophy size={14} /> Best score
                </span>
                <span className="stat-value tabular">{stats.bestScore}</span>
              </div>
              <div>
                <span className="stat-label">Rounds completed</span>
                <span className="stat-value tabular">{stats.totalRounds}</span>
              </div>
            </div>
            <LeaderboardPreview entries={leaderboard} limit={3} onViewAll={onViewLeaderboard} />
            {!storageAvailable && <p className="note">Scores cannot be saved in this browser mode.</p>}
          </section>

          <section className="card privacy-card">
            <div className="privacy-status">
              {cameraOn ? <Camera size={18} /> : <CameraOff size={18} />}
              <span>
                Webcam: <strong>{cameraOn ? 'on' : 'off'}</strong> · needed only while you play
              </span>
            </div>
            <div className="privacy-status">
              <Cpu size={18} />
              <span>AI runs locally on your CPU</span>
            </div>
            <p>
              <ShieldCheck size={15} /> {PRIVACY_STATEMENT}
            </p>
          </section>
        </aside>
      </main>
    </div>
  );
}
