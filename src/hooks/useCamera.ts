import { useCallback, useSyncExternalStore } from 'react';
import { visionService, type VisionStatus } from '../vision/visionService';

export function useVisionStatus(): VisionStatus {
  return useSyncExternalStore(visionService.subscribeStatus, visionService.getStatus);
}

/** Camera state plus the controls the UI needs (start, stop, restart). */
export function useCamera() {
  const status = useVisionStatus();
  const start = useCallback(() => visionService.startCamera(), []);
  const stop = useCallback(() => visionService.stopCamera(), []);
  const restart = useCallback(() => visionService.restartCamera(), []);
  return { state: status.camera, error: status.cameraError, start, stop, restart };
}
