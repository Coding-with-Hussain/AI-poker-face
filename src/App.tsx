import { useCallback, useEffect, useMemo, useState } from 'react';
import { sound } from './audio/soundEngine';
import { DiagnosticsPanel } from './components/DiagnosticsPanel';
import { GameHeader } from './components/GameHeader';
import { HowToPlay } from './components/HowToPlay';
import { SettingsPanel } from './components/SettingsPanel';
import { DIFFICULTIES, resolveDetectionTuning, SCORING } from './game/gameConfig';
import type { RoundConfig, RoundResult } from './game/gameTypes';
import { CalibrationPage } from './pages/CalibrationPage';
import { CameraSetupPage } from './pages/CameraSetupPage';
import { GamePage } from './pages/GamePage';
import { HomePage } from './pages/HomePage';
import { ResultsPage } from './pages/ResultsPage';
import {
  applyResultToStats,
  createEntry,
  EMPTY_STATS,
  insertEntry,
  loadLeaderboard,
  loadStats,
  qualifiesForLeaderboard,
  saveLeaderboard,
  saveStats,
  type LeaderboardEntry,
  type PlayerStats,
} from './storage/leaderboard';
import { isStorageAvailable } from './storage/safeStorage';
import { loadSettings, saveSettings, type Settings } from './storage/settings';
import type { CalibrationResult } from './vision/calibration';
import { visionService } from './vision/visionService';

type Screen = 'home' | 'setup' | 'calibration' | 'game' | 'results';
type ModalName = 'how-to' | 'settings' | null;

interface RoundSetup {
  key: number;
  config: RoundConfig;
  sensitivity: number;
  calibration: CalibrationResult;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [modal, setModal] = useState<ModalName>(null);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [stats, setStats] = useState<PlayerStats>(loadStats);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(loadLeaderboard);
  const [storageAvailable] = useState(isStorageAvailable);
  const [nickname, setNickname] = useState('');
  const [round, setRound] = useState<RoundSetup | null>(null);
  const [result, setResult] = useState<{ round: RoundResult; isNewBest: boolean } | null>(null);

  useEffect(() => {
    sound.setEnabled(settings.soundEnabled);
  }, [settings.soundEnabled]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  // Privacy: the webcam is only on during setup, calibration, play and results.
  useEffect(() => {
    if (screen === 'home') visionService.stopCamera();
  }, [screen]);

  // Release the camera and the model if the player closes or leaves the page.
  useEffect(() => {
    const release = () => visionService.dispose();
    window.addEventListener('pagehide', release);
    return () => window.removeEventListener('pagehide', release);
  }, []);

  // Global shortcut: Shift + D toggles developer diagnostics.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.shiftKey && (event.key === 'D' || event.key === 'd') && !(event.target instanceof HTMLInputElement)) {
        setSettings((prev) => ({ ...prev, showDiagnostics: !prev.showDiagnostics }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const go = useCallback((next: Screen) => {
    setModal(null);
    setScreen(next);
  }, []);

  const handlePlay = () => {
    sound.unlock();
    sound.play('click');
    go('setup');
  };

  const handleCalibrated = (calibration: CalibrationResult) => {
    setRound({
      key: Date.now(),
      config: { difficulty: settings.difficulty, durationSec: settings.durationSec, scoring: SCORING },
      sensitivity: settings.sensitivity,
      calibration,
    });
    go('game');
  };

  const handleFinished = (roundResult: RoundResult) => {
    const isNewBest = roundResult.score.finalScore > stats.bestScore;
    const nextStats = applyResultToStats(stats, roundResult);
    setStats(nextStats);
    saveStats(nextStats);
    setResult({ round: roundResult, isNewBest });
    go('results');
  };

  const handleSaveScore = (name: string): string | null => {
    if (!result || !qualifiesForLeaderboard(leaderboard, result.round.score.finalScore)) return null;
    const entry = createEntry(result.round, name);
    const next = insertEntry(leaderboard, entry);
    setLeaderboard(next);
    setNickname(entry.nickname);
    return saveLeaderboard(next) ? entry.id : null;
  };

  const handleClearScores = () => {
    setLeaderboard([]);
    setStats({ ...EMPTY_STATS });
    saveLeaderboard([]);
    saveStats(EMPTY_STATS);
  };

  const handleStopCamera = () => {
    visionService.stopCamera();
    if (screen === 'game' || screen === 'calibration') go('home');
  };

  const tuning = useMemo(
    () => (round ? resolveDetectionTuning(round.config.difficulty, round.sensitivity) : null),
    [round],
  );

  const header = (onBack?: () => void, backLabel?: string) => (
    <GameHeader
      soundEnabled={settings.soundEnabled}
      onToggleSound={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
      onOpenSettings={() => setModal('settings')}
      onStopCamera={handleStopCamera}
      onBack={onBack}
      backLabel={backLabel}
      center={
        round && screen === 'game' ? (
          <span className="header-round-info">
            {DIFFICULTIES[round.config.difficulty].label} · {round.config.durationSec}-second round
          </span>
        ) : undefined
      }
    />
  );

  return (
    <div className={`app screen-${screen}`}>
      <div className="app-backdrop" aria-hidden="true" />

      {screen === 'home' && (
        <HomePage
          settings={settings}
          stats={stats}
          leaderboard={leaderboard}
          storageAvailable={storageAvailable}
          onChangeSettings={updateSettings}
          onPlay={handlePlay}
          onHowToPlay={() => setModal('how-to')}
          onOpenSettings={() => setModal('settings')}
        />
      )}

      {screen === 'setup' && (
        <>
          {header(() => go('home'), 'Home')}
          <CameraSetupPage settings={settings} nickname={nickname} onNicknameChange={setNickname} onContinue={() => go('calibration')} />
        </>
      )}

      {screen === 'calibration' && (
        <>
          {header(() => go('setup'), 'Back')}
          <CalibrationPage settings={settings} onComplete={handleCalibrated} />
        </>
      )}

      {screen === 'game' && round && tuning && (
        <>
          {header()}
          <GamePage
            key={round.key}
            config={round.config}
            tuning={tuning}
            baseline={round.calibration.baseline}
            showOverlay={settings.showOverlay}
            soundEnabled={settings.soundEnabled}
            modalOpen={modal !== null}
            onToggleOverlay={() => updateSettings({ showOverlay: !settings.showOverlay })}
            onToggleSound={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
            onFinished={handleFinished}
            onRestart={() => go('calibration')}
            onQuit={() => go('home')}
          />
        </>
      )}

      {screen === 'results' && result && (
        <>
          {header(() => go('home'), 'Home')}
          <ResultsPage
            key={result.round.endedAt}
            result={result.round}
            stats={stats}
            isNewBest={result.isNewBest}
            leaderboard={leaderboard}
            nickname={nickname}
            storageAvailable={storageAvailable}
            onSaveScore={handleSaveScore}
            onPlayAgain={() => go('calibration')}
            onNextPlayer={() => {
              setNickname('');
              go('setup');
            }}
            onHome={() => go('home')}
          />
        </>
      )}

      {modal === 'how-to' && <HowToPlay onClose={() => setModal(null)} />}
      {modal === 'settings' && (
        <SettingsPanel
          settings={settings}
          onChange={updateSettings}
          onClose={() => setModal(null)}
          onClearScores={handleClearScores}
          roundInProgress={screen === 'game'}
        />
      )}
      {settings.showDiagnostics && <DiagnosticsPanel onClose={() => updateSettings({ showDiagnostics: false })} />}
    </div>
  );
}
