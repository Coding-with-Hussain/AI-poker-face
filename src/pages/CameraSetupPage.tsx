import { useEffect, useState, type ReactNode } from 'react';
import { ArrowRight, Camera, CheckCircle2, Cpu, Lightbulb, Loader2, ScanFace, UserRound, XCircle } from 'lucide-react';
import { CameraPreview } from '../components/CameraPreview';
import { ErrorPanel } from '../components/ErrorPanel';
import { PrivacyNote } from '../components/PrivacyNote';
import { RulesSummary } from '../components/RulesSummary';
import { useVisionStatus } from '../hooks/useCamera';
import { useFaceDetected, useFaceTracking } from '../hooks/useFaceTracking';
import { NICKNAME_MAX_LENGTH } from '../storage/leaderboard';
import type { Settings } from '../storage/settings';
import {
  adviseFacePosition,
  adviseLighting,
  faceBoundingBox,
  LIGHTING_TIPS,
  POSITION_TIPS,
} from '../vision/faceGeometry';
import { ERROR_COPY } from '../vision/visionErrors';
import { visionService } from '../vision/visionService';

type ItemState = 'pending' | 'ok' | 'error';

function StatusItem({ state, icon, label }: { state: ItemState; icon: ReactNode; label: string }) {
  return (
    <li className={`status-item ${state}`}>
      <span className="status-icon">{icon}</span>
      <span className="status-text">{label}</span>
      <span className="status-mark">
        {state === 'ok' && <CheckCircle2 size={18} />}
        {state === 'error' && <XCircle size={18} />}
        {state === 'pending' && <Loader2 size={18} className="spin" />}
      </span>
    </li>
  );
}

/** Real guidance from the live frame: brightness and face position, refreshed every second. */
function useGuidance(active: boolean): string[] {
  const [tips, setTips] = useState<string[]>([]);
  useEffect(() => {
    if (!active) {
      setTips([]);
      return undefined;
    }
    const update = () => {
      const next: string[] = [];
      const lighting = adviseLighting(visionService.sampleBrightness());
      if (lighting === 'too-dark' || lighting === 'too-bright') next.push(LIGHTING_TIPS[lighting]);
      const position = adviseFacePosition(faceBoundingBox(visionService.getLatestFrame()?.landmarks));
      if (position && position !== 'ok') next.push(POSITION_TIPS[position]);
      setTips((prev) => (prev.join('|') === next.join('|') ? prev : next));
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [active]);
  return tips;
}

interface CameraSetupPageProps {
  settings: Settings;
  nickname: string;
  onNicknameChange: (nickname: string) => void;
  onContinue: () => void;
}

export function CameraSetupPage({ settings, nickname, onNicknameChange, onContinue }: CameraSetupPageProps) {
  const status = useVisionStatus();
  useFaceTracking(true);
  const faceDetected = useFaceDetected(600);

  // Start the local model and the webcam in parallel when the screen opens.
  useEffect(() => {
    void visionService.initModel();
    if (visionService.getStatus().camera === 'off') void visionService.startCamera();
  }, []);

  const modelState: ItemState = status.model === 'ready' ? 'ok' : status.model === 'error' ? 'error' : 'pending';
  const cameraState: ItemState = status.camera === 'ready' ? 'ok' : status.camera === 'error' ? 'error' : 'pending';
  const tracking = status.tracking === 'running';
  const faceState: ItemState = !tracking ? 'pending' : faceDetected ? 'ok' : 'error';
  const ready = modelState === 'ok' && cameraState === 'ok' && tracking && faceDetected;
  const tips = useGuidance(cameraState === 'ok' && tracking);

  const modelLabel =
    status.model === 'ready'
      ? `Local AI ready (${status.modelInfo?.delegate ?? 'CPU'} · WebAssembly)`
      : status.model === 'error'
        ? 'Model could not load.'
        : 'Initializing local AI...';
  const cameraLabel =
    status.camera === 'ready'
      ? 'Camera ready.'
      : status.camera === 'error' && status.cameraError
        ? status.cameraError.kind === 'permission-denied'
          ? 'Camera access denied.'
          : `${ERROR_COPY[status.cameraError.kind].title}.`
        : status.camera === 'off'
          ? 'Camera is off.'
          : 'Requesting camera access...';
  const faceLabel = !tracking
    ? status.tracking === 'error'
      ? 'Face tracking stopped.'
      : 'Waiting for camera and AI...'
    : faceDetected
      ? 'Face detected.'
      : 'No face detected.';

  const error = status.modelError ?? status.cameraError ?? status.trackingError;
  const retry = () => {
    if (status.model === 'error') void visionService.initModel();
    if (status.camera === 'error' || status.camera === 'off') void visionService.startCamera();
    if (status.tracking === 'error') visionService.retryTracking();
  };

  return (
    <div className="setup-page">
      <section className="setup-camera">
        <CameraPreview showOverlay={settings.showOverlay} className="large">
          {status.camera === 'ready' && tracking && !faceDetected && (
            <div className="camera-hint">
              <ScanFace size={28} /> Look straight at the camera
            </div>
          )}
        </CameraPreview>
        <PrivacyNote />
      </section>

      <section className="setup-panel">
        <h1>Camera check</h1>
        <p className="muted">The game needs your webcam to watch for a straight face. Everything runs on this computer.</p>
        <ul className="status-list">
          <StatusItem state={modelState} icon={<Cpu size={18} />} label={modelLabel} />
          <StatusItem state={cameraState} icon={<Camera size={18} />} label={cameraLabel} />
          <StatusItem state={faceState} icon={<ScanFace size={18} />} label={faceLabel} />
        </ul>

        {error && (
          <ErrorPanel error={error} onRetry={retry} retryLabel={status.camera === 'off' ? 'Start camera' : 'Try again'} />
        )}
        {!error && status.camera === 'off' && (
          <button type="button" className="secondary-button" onClick={retry}>
            <Camera size={16} /> Start camera
          </button>
        )}

        {tips.length > 0 && (
          <div className="guidance">
            {tips.map((tip) => (
              <p key={tip}>
                <Lightbulb size={16} /> {tip}
              </p>
            ))}
          </div>
        )}

        <label className="nickname-field">
          <span>
            <UserRound size={16} /> Player nickname <em>(optional)</em>
          </span>
          <input
            type="text"
            value={nickname}
            maxLength={NICKNAME_MAX_LENGTH}
            placeholder="e.g. StoneFace"
            autoComplete="off"
            onChange={(e) => onNicknameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && ready) onContinue();
            }}
          />
        </label>

        <RulesSummary difficulty={settings.difficulty} durationSec={settings.durationSec} />

        <button type="button" className="play-button wide" disabled={!ready} onClick={onContinue}>
          {ready ? 'Continue to calibration' : 'Waiting for camera, AI and face…'} <ArrowRight size={22} />
        </button>
      </section>
    </div>
  );
}
