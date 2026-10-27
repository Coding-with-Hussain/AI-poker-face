import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { TrackingFrame } from '../vision/faceTracker';
import { visionService } from '../vision/visionService';

/** Keeps the shared tracking loop running while the calling screen is mounted. */
export function useFaceTracking(enabled = true): void {
  useEffect(() => {
    if (!enabled) return undefined;
    return visionService.acquireTracking();
  }, [enabled]);
}

/** Calls `listener` for every analysed frame without re-rendering the component. */
export function useFrameListener(listener: (frame: TrackingFrame | null) => void): void {
  const ref = useRef(listener);
  useLayoutEffect(() => {
    ref.current = listener;
  });
  useEffect(() => visionService.subscribeFrames((frame) => ref.current(frame)), []);
}

/**
 * Whether a face is currently visible. Re-renders only when the answer
 * changes; brief dropouts shorter than `holdMs` are ignored.
 */
export function useFaceDetected(holdMs = 400): boolean {
  const [detected, setDetected] = useState(() => visionService.getLatestFrame()?.faceDetected ?? false);
  const lastSeen = useRef(0);
  useFrameListener((frame) => {
    const now = frame?.timestampMs ?? performance.now();
    if (frame?.faceDetected) {
      lastSeen.current = now;
      setDetected(true);
    } else if (now - lastSeen.current > holdMs) {
      setDetected(false);
    }
  });
  return detected;
}
