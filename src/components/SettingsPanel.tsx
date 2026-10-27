import { useState } from 'react';
import { Camera, CameraOff, Film, Image, Music, RefreshCw, Trash2 } from 'lucide-react';
import { USER_MEDIA } from '../content/userMedia';
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

        <YourMediaSection settings={settings} onChange={onChange} />
      </div>
    </Modal>
  );
}

const SOUND_EVENT_LABELS: Record<string, string> = {
  strike: 'laugh detected',
  warning: 'high risk',
  win: 'round survived',
  lose: 'round lost',
  countdown: '3-2-1',
  go: 'START!',
  challenge: 'new challenge',
  click: 'button click',
  save: 'score saved',
};

/** Shows what was found in the media/ folder and how it is used. */
function YourMediaSection({ settings, onChange }: { settings: Settings; onChange: (patch: Partial<Settings>) => void }) {
  const { counts, challenges, sounds, skipped } = USER_MEDIA;
  const hasChallenges = challenges.length > 0;
  const soundEvents = Object.entries(sounds).filter(([, files]) => files && files.length > 0);
  return (
    <section className="your-media">
      <h3>Your media</h3>
      <div className="media-counts">
        <span>
          <Film size={16} /> {counts.videos} video{counts.videos === 1 ? '' : 's'}
        </span>
        <span>
          <Image size={16} /> {counts.memes} meme{counts.memes === 1 ? '' : 's'}
        </span>
        <span>
          <Music size={16} /> {counts.sounds} sound effect{counts.sounds === 1 ? '' : 's'}
        </span>
      </div>
      <Segmented
        label="Challenges"
        value={settings.contentMix}
        disabled={!hasChallenges}
        options={[
          { value: 'mixed', label: 'Mixed' },
          { value: 'mine', label: 'Only my media' },
          { value: 'builtin', label: 'Built-in only' },
        ]}
        onChange={(contentMix) => onChange({ contentMix })}
      />
      <Toggle
        label="Use my sound effects"
        description={
          soundEvents.length > 0
            ? `Replacing: ${soundEvents.map(([event]) => SOUND_EVENT_LABELS[event] ?? event).join(', ')}.`
            : 'No sound effects found yet.'
        }
        checked={settings.useCustomSounds}
        onChange={(useCustomSounds) => onChange({ useCustomSounds })}
      />
      <p className="note">
        Add your files to the <code>media</code> folder of the project: <code>media/videos</code> (MP4/WebM),{' '}
        <code>media/memes</code> (PNG, JPG, GIF, WebP) and <code>media/sounds/strike</code>, <code>win</code>,{' '}
        <code>lose</code>… (MP3/WAV). The file name becomes the caption. Restart the game if it is not already running
        with <code>npm run dev</code>; see <code>media/README.md</code>.
      </p>
      {(challenges.length > 0 || skipped.length > 0) && (
        <details className="media-files">
          <summary>Show files</summary>
          <ul>
            {challenges.map((c) => (
              <li key={c.id}>
                {c.category === 'video' ? <Film size={14} /> : <Image size={14} />} {c.id.replace(/^user:/, '')} — “{c.text}”
                {c.media?.sound ? ' (with sound)' : ''}
              </li>
            ))}
            {skipped.map((reason) => (
              <li key={reason} className="error-text">
                Skipped: {reason}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
