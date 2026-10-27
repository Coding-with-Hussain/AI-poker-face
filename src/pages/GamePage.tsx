import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, EyeOff, Home, Play, RotateCcw, ScanFace } from 'lucide-react';
import { sound } from '../audio/soundEngine';
import { CameraPreview } from '../components/CameraPreview';
import { ChallengeCard } from '../components/ChallengeCard';
import { ErrorPanel } from '../components/ErrorPanel';
import { GameHUD } from '../components/GameHUD';
import type { Challenge } from '../content/challenges';
import type { ContentMix, DetectionTuning, RoundConfig, RoundResult } from '../game/gameTypes';
import { useVisionStatus } from '../hooks/useCamera';
import { useFaceTracking } from '../hooks/useFaceTracking';
import { useGameSession } from '../hooks/useGameSession';
import type { CueBaseline } from '../vision/blendshapeAnalyzer';
import type { CueState } from '../vision/laughEstimator';
import { visionService } from '../vision/visionService';

interface GamePageProps {
  config: RoundConfig;
  tuning: DetectionTuning;
  baseline: CueBaseline;
  contentMix: ContentMix;
  showOverlay: boolean;
  soundEnabled: boolean;
  modalOpen: boolean;
  onToggleOverlay: () => void;
  onToggleSound: () => void;
  onFinished: (result: RoundResult) => void;
  onRestart: () => void;
  onQuit: () => void;
}

/** Your meme's own sound, nothing for videos (they have audio), a swoosh otherwise. */
function announceChallenge(challenge: Challenge, number: number): void {
  const media = challenge.media;
  if (media?.kind === 'image' && media.sound) sound.playFile(media.sound, 'meme');
  else if (!media && number > 1) sound.play('challenge');
}

const TIPS: Record<CueState, string> = {
  'no-face': 'Keep your face in view.',
  calm: 'Steady… stone cold.',
  suspicious: 'Careful — that looks like a smile.',
  'high-risk': 'Hold it together!',
  'laugh-detected': 'Laugh-like expression detected. Relax your face.',
};

/** Delay between the round ending and the results screen, for the final effect. */
const END_SCREEN_DELAY_MS = 1400;

export function GamePage(props: GamePageProps) {
  const { config, tuning, baseline, contentMix, showOverlay, soundEnabled, modalOpen } = props;
  useFaceTracking(true);
  const status = useVisionStatus();
  const [strikeFx, setStrikeFx] = useState<{ key: number; final: boolean } | null>(null);
  const [ending, setEnding] = useState<RoundResult | null>(null);
  const [tipState, setTipState] = useState<CueState>('no-face');
  const propsRef = useRef(props);
  useLayoutEffect(() => {
    propsRef.current = props;
  });

  const { view, monitor, pause, resume, setMediaDuration, skipChallenge } = useGameSession({
    config,
    tuning,
    baseline,
    contentMix,
    onStrike: (_strikes, ended) => {
      sound.play('strike');
      setStrikeFx({ key: performance.now(), final: ended });
    },
    onWarning: () => sound.play('warning'),
    onChallenge: announceChallenge,
    onFinished: (result) => setEnding(result),
  });

  // Hand the result over after a short "round over" moment.
  useEffect(() => {
    if (!ending) return undefined;
    const timer = window.setTimeout(() => propsRef.current.onFinished(ending), END_SCREEN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [ending]);

  useEffect(() => {
    if (!strikeFx) return undefined;
    const timer = window.setTimeout(() => setStrikeFx(null), 1300);
    return () => window.clearTimeout(timer);
  }, [strikeFx]);

  // Coarse tip text: re-render only when the cue state changes.
  useEffect(() => monitor.subscribe((s) => setTipState((prev) => (prev === s.state ? prev : s.state))), [monitor]);

  // Camera or AI failure mid-round pauses the game until it is fixed.
  const visionBroken = status.camera !== 'ready' || status.tracking === 'error';
  useEffect(() => {
    if (visionBroken) pause('vision-error');
  }, [visionBroken, pause]);

  // Opening a dialog (e.g. settings) pauses the round.
  useEffect(() => {
    if (modalOpen) pause('player');
  }, [modalOpen, pause]);

  const paused = view.phase === 'paused';
  const togglePause = () => (paused ? resume() : pause('player'));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (modalOpen || event.target instanceof HTMLInputElement) return;
      if (event.code === 'Space' || event.key === 'p' || event.key === 'P') {
        event.preventDefault();
        if (view.phase === 'paused' && view.pauseReason !== 'vision-error') resume();
        else if (view.phase === 'playing') pause('player');
      } else if (event.key === 'Escape' && view.phase === 'playing') {
        pause('player');
      } else if (event.key === 'm' || event.key === 'M') {
        propsRef.current.onToggleSound();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen, pause, resume, view.phase, view.pauseReason]);

  const visionError = status.cameraError ?? status.trackingError;

  return (
    <div className={`game-page ${strikeFx ? 'shake' : ''}`}>
      <GameHUD
        remainingMs={view.remainingMs}
        totalMs={view.totalMs}
        score={view.score}
        strikes={view.strikes}
        maxStrikes={config.scoring.maxStrikes}
        difficulty={config.difficulty}
        monitor={monitor}
        tuning={tuning}
        paused={paused}
        soundEnabled={soundEnabled}
        onTogglePause={togglePause}
        onToggleSound={props.onToggleSound}
      />

      <div className="game-main">
        <section className="challenge-area">
          <ChallengeCard
            challenge={view.challenge}
            number={view.challengeNumber}
            punchlineRevealed={view.punchlineRevealed}
            paused={paused || ending !== null}
            soundEnabled={soundEnabled}
            onMediaDuration={setMediaDuration}
            onMediaError={skipChallenge}
          />
        </section>

        <aside className="player-area">
          <CameraPreview showOverlay={showOverlay} className="game-camera">
            {paused && view.pauseReason === 'face-lost' && (
              <div className="camera-hint strong">
                <ScanFace size={30} />
                <span>Face not visible — timer paused</span>
                <small>Look at the camera to continue</small>
              </div>
            )}
          </CameraPreview>
          <div className="player-tools">
            <p className={`player-tip tip-${tipState}`}>{TIPS[tipState]}</p>
            <button type="button" className="ghost-button" onClick={props.onToggleOverlay} aria-pressed={showOverlay}>
              {showOverlay ? <EyeOff size={16} /> : <Eye size={16} />} {showOverlay ? 'Hide' : 'Show'} face overlay
            </button>
          </div>
        </aside>
      </div>

      {createPortal(
        <>
          {strikeFx && (
            <div key={strikeFx.key} className="strike-flash" role="alert">
              <span className="strike-stamp">
                LAUGH DETECTED!
                <small>−{config.scoring.penaltyPerStrike} points</small>
              </span>
            </div>
          )}

          {paused && view.pauseReason !== 'face-lost' && !ending && (
            <div className="pause-overlay" role="dialog" aria-modal="true" aria-label="Game paused">
              <div className="pause-card">
                {view.pauseReason === 'vision-error' && visionError ? (
                  <>
                    <ErrorPanel
                      error={visionError}
                      retryLabel="Restart camera"
                      onRetry={() => {
                        if (status.tracking === 'error') visionService.retryTracking();
                        void visionService.restartCamera();
                      }}
                    />
                    <div className="button-row">
                      <button type="button" className="play-button" disabled={visionBroken} onClick={resume}>
                        <Play size={20} /> Resume
                      </button>
                      <button type="button" className="secondary-button" onClick={props.onQuit}>
                        <Home size={18} /> Quit to home
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h2>{view.pauseReason === 'hidden' ? 'Paused while you were away' : 'Paused'}</h2>
                    <p className="muted">The timer is frozen. Jokes will wait for you.</p>
                    <div className="button-col">
                      <button type="button" className="play-button" onClick={resume} autoFocus>
                        <Play size={22} /> Resume
                      </button>
                      <button type="button" className="secondary-button" onClick={props.onRestart}>
                        <RotateCcw size={18} /> Restart round
                      </button>
                      <button type="button" className="secondary-button" onClick={props.onQuit}>
                        <Home size={18} /> Quit to home
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {ending && (
            <div className="round-over-overlay" role="status">
              <span className={`round-over-text ${ending.survived ? 'win' : 'lose'}`}>
                {ending.survived ? 'TIME! YOU SURVIVED' : 'THREE STRIKES!'}
              </span>
            </div>
          )}
        </>,
        document.body,
      )}
    </div>
  );
}
