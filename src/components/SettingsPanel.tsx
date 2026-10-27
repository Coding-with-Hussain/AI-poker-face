import { useState } from 'react';
import { Camera, CameraOff, RefreshCw, Trash2 } from 'lucide-react';
import { DIFFICULTIES, DIFFICULTY_ORDER, ROUND_DURATIONS, SENSITIVITY } from '../game/gameConfig';
import { useCamera } from '../hooks/useCamera';
import { isStorageAvailable } from '../storage/safeStorage';
import type { Settings } from '../storage/settings';
import { ERROR_COPY } from '../vision/visionErrors';
import { Modal } from './Modal';
import { PrivacyNote } from './PrivacyNote';
import { Segmented, Toggle } from './Segmented';

interface SettingsPanelProps {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onClose: () => void;
  onClearScores: () => void;
  roundInProgress: boolean;
}

const CAMERA_LABEL = { off: 'Off', requesting: 'Starting…', ready: 'On', error: 'Error' } as const;

export function SettingsPanel({ settings, onChange, onClose, onClearScores, roundInProgress }: SettingsPanelProps) {
  const camera = useCamera();
  const [confirmClear, setConfirmClear] = useState(false);
  const storageOk = isStorageAvailable();

  return (
    <Modal title="Settings" onClose={onClose} wide>
      <div className="settings-grid">
        <section>
          <h3>Game</h3>
          {roundInProgress && <p className="note">Difficulty, duration and sensitivity changes apply from the next round.</p>}
          <Segmented
            label="Difficulty"
            value={settings.difficulty}
            options={DIFFICULTY_ORDER.map((d) => ({ value: d, label: DIFFICULTIES[d].label, hint: DIFFICULTIES[d].description }))}
            onChange={(difficulty) => onChange({ difficulty })}
          />
          <Segmented
            label="Round duration"
            value={settings.durationSec}
            options={ROUND_DURATIONS.map((d) => ({ value: d, label: `${d}s` }))}
            onChange={(durationSec) => onChange({ durationSec })}
          />
          <div className="slider-row">
            <label htmlFor="sensitivity">
              Detection sensitivity <strong className="tabular">{settings.sensitivity}</strong>
            </label>
            <input
              id="sensitivity"
              type="range"
              min={SENSITIVITY.min}
              max={SENSITIVITY.max}
              step={1}
              value={settings.sensitivity}
              onChange={(e) => onChange({ sensitivity: Number(e.target.value) })}
            />
            <div className="slider-scale">
              <span>Relaxed</span>
              <span>Default {SENSITIVITY.default}</span>
              <span>Strict</span>
            </div>
            <p className="note">Lower it if you get strikes without smiling (e.g. beards, glasses, dim light); raise it for very composed players.</p>
          </div>
          <Toggle label="Sound effects" checked={settings.soundEnabled} onChange={(soundEnabled) => onChange({ soundEnabled })} />
        </section>

        <section>
          <h3>Camera &amp; AI</h3>
          <Toggle
            label="Face overlay"
            description="Draw a subtle outline of the tracked face."
            checked={settings.showOverlay}
            onChange={(showOverlay) => onChange({ showOverlay })}
          />
          <Toggle
            label="Developer diagnostics"
            description="Live model, FPS and cue values (Shift + D)."
            checked={settings.showDiagnostics}
            onChange={(showDiagnostics) => onChange({ showDiagnostics })}
          />
          <div className="camera-controls">
            <span>
              Webcam: <strong>{CAMERA_LABEL[camera.state]}</strong>
              {camera.error && <span className="error-text"> — {ERROR_COPY[camera.error.kind].title}</span>}
            </span>
            <div className="button-row">
              <button type="button" className="secondary-button" onClick={() => void camera.restart()}>
                {camera.state === 'off' ? <Camera size={16} /> : <RefreshCw size={16} />}
                {camera.state === 'off' ? 'Start camera' : 'Restart camera'}
              </button>
              {camera.state !== 'off' && (
                <button type="button" className="secondary-button danger" onClick={camera.stop}>
                  <CameraOff size={16} /> Stop camera
                </button>
              )}
            </div>
          </div>
          <PrivacyNote compact />
          <div className="danger-zone">
            {!storageOk && <p className="note">This browser is not allowing local storage, so settings and scores are not kept.</p>}
            {confirmClear ? (
              <div className="button-row">
                <span>Delete all saved scores and stats?</span>
                <button
                  type="button"
                  className="secondary-button danger"
                  onClick={() => {
                    onClearScores();
                    setConfirmClear(false);
                  }}
                >
                  Yes, clear
                </button>
                <button type="button" className="secondary-button" onClick={() => setConfirmClear(false)}>
                  Cancel
                </button>
              </div>
            ) : (
              <button type="button" className="ghost-button" onClick={() => setConfirmClear(true)}>
                <Trash2 size={16} /> Clear leaderboard &amp; stats
              </button>
            )}
          </div>
        </section>
      </div>
    </Modal>
  );
}
