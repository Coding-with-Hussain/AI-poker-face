import { useEffect, useRef } from 'react';
import { Activity } from 'lucide-react';
import type { DetectionTuning } from '../game/gameTypes';
import type { CueState } from '../vision/laughEstimator';
import type { LaughMonitor } from '../vision/laughMonitor';

export const CUE_STATE_LABELS: Record<CueState, string> = {
  'no-face': 'No face',
  calm: 'Calm',
  suspicious: 'Suspicious Smile',
  'high-risk': 'High Risk',
  'laugh-detected': 'Laugh-Like Event Detected',
};

/** Where the trigger threshold sits on the bar, so the bar has headroom above it. */
const TRIGGER_POSITION = 0.72;

interface CueMeterProps {
  monitor: LaughMonitor;
  tuning: DetectionTuning;
}

/**
 * Facial-cue intensity meter. Updates the DOM directly from the monitor so
 * that 15 inference frames per second never cause React re-renders.
 */
export function CueMeter({ monitor, tuning }: CueMeterProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const sustainRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const scale = TRIGGER_POSITION / tuning.triggerThreshold;

  useEffect(() => {
    const apply = (state: CueState, score: number, sustain: number) => {
      const root = rootRef.current;
      if (!root) return;
      if (root.dataset.state !== state) {
        root.dataset.state = state;
        if (labelRef.current) labelRef.current.textContent = CUE_STATE_LABELS[state];
      }
      const filled = Math.min(1, score * scale) * 100;
      fillRef.current?.style.setProperty('clip-path', `inset(0 ${(100 - filled).toFixed(1)}% 0 0)`);
      sustainRef.current?.style.setProperty('transform', `scaleX(${sustain.toFixed(3)})`);
    };
    const latest = monitor.getLatest();
    apply(latest?.state ?? 'no-face', latest?.smoothedScore ?? 0, latest?.sustainProgress ?? 0);
    return monitor.subscribe((s) => apply(s.state, s.smoothedScore, s.sustainProgress));
  }, [monitor, scale]);

  return (
    <div ref={rootRef} className="cue-meter" data-state="no-face" role="group" aria-label="AI laugh estimation meter">
      <div className="cue-meter-head">
        <span className="cue-meter-title">
          <Activity size={14} /> AI laugh estimation
        </span>
        <span ref={labelRef} className="cue-meter-label" aria-live="polite">
          {CUE_STATE_LABELS['no-face']}
        </span>
      </div>
      <div className="cue-meter-track">
        <div ref={fillRef} className="cue-meter-fill" />
        <div className="cue-meter-mark warn" style={{ left: `${Math.min(100, tuning.warningThreshold * scale * 100)}%` }} />
        <div className="cue-meter-mark trigger" style={{ left: `${TRIGGER_POSITION * 100}%` }} />
      </div>
      <div className="cue-meter-sustain" title="How long the expression has been held">
        <div ref={sustainRef} className="cue-meter-sustain-fill" />
      </div>
    </div>
  );
}
