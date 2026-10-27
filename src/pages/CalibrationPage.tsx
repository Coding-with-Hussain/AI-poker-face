import { useCallback, useRef, useState } from 'react';
import { RotateCcw, ScanFace, Smile } from 'lucide-react';
import { CameraPreview } from '../components/CameraPreview';
import { CountdownOverlay } from '../components/CountdownOverlay';
import { RulesSummary } from '../components/RulesSummary';
import { CALIBRATION } from '../game/gameConfig';
import { useFaceTracking, useFrameListener } from '../hooks/useFaceTracking';
import type { Settings } from '../storage/settings';
import type { FacialCues } from '../vision/blendshapeAnalyzer';
import { computeBaseline, type CalibrationResult } from '../vision/calibration';

type Phase = 'collecting' | 'review' | 'countdown';

interface CalibrationPageProps {
  settings: Settings;
  onComplete: (result: CalibrationResult) => void;
}

/** Longest frame gap that still counts as continuous sampling. */
const MAX_SAMPLE_STEP_MS = 200;

export function CalibrationPage({ settings, onComplete }: CalibrationPageProps) {
  useFaceTracking(true);
  const [phase, setPhase] = useState<Phase>('collecting');
  const [progress, setProgress] = useState(0);
  const [faceVisible, setFaceVisible] = useState(true);
  const [result, setResult] = useState<CalibrationResult | null>(null);
  const samples = useRef<FacialCues[]>([]);
  const collectedMs = useRef(0);
  const lastFrameAt = useRef<number | null>(null);
  const phaseRef = useRef<Phase>('collecting');

  const setPhaseBoth = (next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const restart = useCallback(() => {
    samples.current = [];
    collectedMs.current = 0;
    lastFrameAt.current = null;
    setProgress(0);
    setResult(null);
    setPhaseBoth('collecting');
  }, []);

  useFrameListener((frame) => {
    if (phaseRef.current !== 'collecting') return;
    const visible = Boolean(frame?.cues);
    setFaceVisible((prev) => (prev === visible ? prev : visible));
    if (!frame?.cues) {
      lastFrameAt.current = null;
      return;
    }
    if (lastFrameAt.current !== null) {
      collectedMs.current += Math.min(MAX_SAMPLE_STEP_MS, frame.timestampMs - lastFrameAt.current);
    }
    lastFrameAt.current = frame.timestampMs;
    samples.current.push(frame.cues);

    const fraction = Math.min(1, collectedMs.current / CALIBRATION.durationMs);
    setProgress((prev) => (Math.abs(prev - fraction) >= 0.04 || fraction === 1 ? fraction : prev));
    if (fraction < 1) return;

    const computed = computeBaseline(samples.current);
    console.info('[AI Poker Face] Calibration', { quality: computed.quality, samples: computed.sampleCount, baseline: computed.baseline });
    if (computed.quality === 'insufficient') {
      restart();
      return;
    }
    setResult(computed);
    setPhaseBoth(computed.quality === 'smiling' ? 'review' : 'countdown');
  });

  const radius = 46;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="calibration-page">
      <section className="calibration-camera">
        <CameraPreview showOverlay={settings.showOverlay} className="large">
          {phase === 'collecting' && (
            <div className="calibration-overlay">
              <svg viewBox="0 0 100 100" className="calibration-ring" aria-hidden="true">
                <circle cx="50" cy="50" r={radius} className="ring-bg" />
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  className="ring-fg"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - progress)}
                />
              </svg>
              <span className="calibration-percent tabular">{Math.round(progress * 100)}%</span>
            </div>
          )}
          {phase === 'countdown' && <CountdownOverlay onDone={() => result && onComplete(result)} />}
        </CameraPreview>
      </section>

      <section className="calibration-panel">
        {phase === 'collecting' && (
          <>
            <h1>Calibrating your poker face</h1>
            <p className="lead">Relax your face and look at the camera. Do not smile on purpose — just be neutral.</p>
            <p className={`calibration-status ${faceVisible ? '' : 'warn'}`} role="status">
              <ScanFace size={18} />
              {faceVisible ? 'Measuring your neutral expression…' : 'No face detected — look at the camera to continue.'}
            </p>
            <p className="muted small">
              This short baseline helps reduce false alarms for faces that naturally look a little smiley. It measures
              facial cues only and cannot read emotions.
            </p>
          </>
        )}
        {phase === 'review' && (
          <>
            <h1>
              <Smile size={28} /> Was that a smile?
            </h1>
            <p className="lead">
              Your calibration looked a bit smiley. The game capped the baseline so detection still works, but a relaxed
              face gives fairer results.
            </p>
            <div className="button-row">
              <button type="button" className="play-button" onClick={restart}>
                <RotateCcw size={20} /> Recalibrate
              </button>
              <button type="button" className="secondary-button large" onClick={() => setPhaseBoth('countdown')}>
                Continue anyway
              </button>
            </div>
          </>
        )}
        {phase === 'countdown' && (
          <>
            <h1>Get ready…</h1>
            <p className="lead">Straight face in 3, 2, 1. Good luck!</p>
          </>
        )}
        <RulesSummary difficulty={settings.difficulty} durationSec={settings.durationSec} />
      </section>
    </div>
  );
}
