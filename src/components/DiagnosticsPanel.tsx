import { useEffect, useState } from 'react';
import { Bug, X } from 'lucide-react';
import { useVisionStatus } from '../hooks/useCamera';
import type { TrackerStats } from '../vision/faceTracker';
import type { EstimatorSnapshot } from '../vision/laughEstimator';
import { getActiveEstimate } from '../vision/laughMonitor';
import { visionService } from '../vision/visionService';
import type { FacialCues } from '../vision/blendshapeAnalyzer';
import { CUE_STATE_LABELS } from './CueMeter';

interface LiveValues {
  stats: TrackerStats | null;
  faceDetected: boolean | null;
  cues: FacialCues | null;
  estimate: EstimatorSnapshot | null;
  resolution: string;
}

function readLive(): LiveValues {
  const frame = visionService.getLatestFrame();
  const video = visionService.isCameraOn() ? visionService.getVideoElement() : null;
  return {
    stats: visionService.getTrackerStats(),
    faceDetected: frame ? frame.faceDetected : null,
    cues: frame?.cues ?? null,
    estimate: getActiveEstimate(),
    resolution: video && video.videoWidth ? `${video.videoWidth}×${video.videoHeight}` : '—',
  };
}

const fmt = (v: number | null | undefined, digits = 2) => (v === null || v === undefined ? '—' : v.toFixed(digits));

/** Developer panel. Every value is read from the running pipeline (4×/s). */
export function DiagnosticsPanel({ onClose }: { onClose: () => void }) {
  const status = useVisionStatus();
  const [live, setLive] = useState<LiveValues>(readLive);

  useEffect(() => {
    const timer = window.setInterval(() => setLive(readLive()), 250);
    return () => window.clearInterval(timer);
  }, []);

  const info = status.modelInfo;
  const tracking = live.stats?.running ?? false;
  const rows: [string, string][] = [
    ['Model', status.model === 'ready' ? 'Ready' : status.model === 'error' ? `Error: ${status.modelError?.kind ?? ''}` : status.model],
    ['Inference delegate', info?.delegate ?? '—'],
    ['Runtime', info ? `WASM (${info.wasmVariant.toUpperCase()})` : '—'],
    ['Model load time', info ? `${info.loadMs} ms` : '—'],
    ['Camera', `${status.camera}${status.cameraError ? ` (${status.cameraError.kind})` : ''} · ${live.resolution}`],
    ['Tracking', `${status.tracking}${status.trackingError ? ` (${status.trackingError.kind})` : ''}`],
    ['Inference FPS', tracking ? `${fmt(live.stats?.measuredFps, 1)} (limit ${live.stats?.currentFpsLimit ?? '—'})` : '—'],
    ['Inference time', tracking ? `${fmt(live.stats?.avgInferenceMs, 1)} ms avg` : '—'],
    ['Face', live.faceDetected === null ? '—' : live.faceDetected ? 'Detected' : 'Not detected'],
    ['Smile cue (raw)', fmt(live.cues?.smile)],
    ['Jaw-open cue (raw)', fmt(live.cues?.jawOpen)],
    ['Cheek-squint cue (raw)', fmt(live.cues?.cheekSquint)],
    ['Laugh score (smoothed)', live.estimate ? fmt(live.estimate.smoothedScore) : '— (no round)'],
    ['Sustain progress', live.estimate ? `${Math.round(live.estimate.sustainProgress * 100)}%` : '—'],
    ['Detection state', live.estimate ? CUE_STATE_LABELS[live.estimate.state] : '—'],
    ['Armed / cooldown', live.estimate ? `${live.estimate.armed ? 'armed' : 'waiting for reset'} / ${live.estimate.inCooldown ? 'yes' : 'no'}` : '—'],
  ];

  return (
    <aside className="diagnostics-panel" aria-label="Developer diagnostics">
      <header>
        <span>
          <Bug size={14} /> Diagnostics
        </span>
        <button type="button" className="icon-button small" onClick={onClose} aria-label="Hide diagnostics">
          <X size={14} />
        </button>
      </header>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd className="tabular">{value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
