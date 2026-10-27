import { VISION_CONFIG } from '../game/gameConfig';
import { cameraErrorKind, VisionError } from './visionErrors';

/** Requests a moderate-resolution, video-only webcam stream. */
export async function requestCameraStream(): Promise<MediaStream> {
  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    throw new VisionError('insecure-context', `Page is not a secure context: ${window.location.href}`);
  }
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new VisionError('unsupported-browser', 'navigator.mediaDevices.getUserMedia is not available.');
  }
  const preferred: MediaStreamConstraints = {
    audio: false,
    video: {
      facingMode: 'user',
      width: { ideal: VISION_CONFIG.cameraWidth },
      height: { ideal: VISION_CONFIG.cameraHeight },
      frameRate: { ideal: 30, max: 30 },
    },
  };
  try {
    return await navigator.mediaDevices.getUserMedia(preferred);
  } catch (error) {
    const kind = cameraErrorKind(error);
    // Some webcams reject the ideal constraints; retry with "any camera".
    if (kind === 'no-camera' && (error as { name?: string }).name === 'OverconstrainedError') {
      try {
        return await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
      } catch (retryError) {
        throw new VisionError(cameraErrorKind(retryError), String(retryError), retryError);
      }
    }
    throw new VisionError(kind, String(error), error);
  }
}

export function stopStream(stream: MediaStream | null): void {
  if (!stream) return;
  for (const track of stream.getTracks()) track.stop();
}
