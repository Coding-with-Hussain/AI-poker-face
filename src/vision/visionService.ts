/**
 * Owns the webcam stream, one persistent <video> element, the local Face
 * Landmarker and the single tracking loop. React components talk to it through
 * hooks; game logic only ever sees TrackingFrame objects.
 *
 * Privacy: frames are read from the local <video> element and analysed in
 * this tab. Nothing is uploaded, recorded or written to storage.
 */
import { VISION_CONFIG } from '../game/gameConfig';
import { requestCameraStream, stopStream } from './camera';
import { createFaceLandmarker, type LoadedFaceLandmarker } from './faceLandmarker';
import { FaceTracker, type TrackerStats, type TrackingFrame } from './faceTracker';
import { averageLuma } from './faceGeometry';
import { toVisionError, VisionError } from './visionErrors';

export type ModelState = 'idle' | 'loading' | 'ready' | 'error';
export type CameraState = 'off' | 'requesting' | 'ready' | 'error';
export type TrackingState = 'stopped' | 'running' | 'error';

export type ModelInfo = Omit<LoadedFaceLandmarker, 'landmarker'>;

export interface VisionStatus {
  model: ModelState;
  modelError: VisionError | null;
  modelInfo: ModelInfo | null;
  camera: CameraState;
  cameraError: VisionError | null;
  tracking: TrackingState;
  trackingError: VisionError | null;
}

type Listener<T> = (value: T) => void;

const INITIAL_STATUS: VisionStatus = {
  model: 'idle',
  modelError: null,
  modelInfo: null,
  camera: 'off',
  cameraError: null,
  tracking: 'stopped',
  trackingError: null,
};

class VisionService {
  private status: VisionStatus = INITIAL_STATUS;
  private readonly statusListeners = new Set<() => void>();
  private readonly frameListeners = new Set<Listener<TrackingFrame | null>>();

  private loaded: LoadedFaceLandmarker | null = null;
  private modelPromise: Promise<void> | null = null;
  private cameraPromise: Promise<void> | null = null;
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private parking: HTMLDivElement | null = null;
  private tracker: FaceTracker | null = null;
  private trackingHolds = 0;
  private latestFrame: TrackingFrame | null = null;
  private brightnessCanvas: HTMLCanvasElement | null = null;

  // ---- status store (for useSyncExternalStore) ----

  getStatus = (): VisionStatus => this.status;

  subscribeStatus = (listener: () => void): (() => void) => {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  };

  private setStatus(patch: Partial<VisionStatus>): void {
    this.status = { ...this.status, ...patch };
    for (const listener of this.statusListeners) listener();
  }

  // ---- frames ----

  subscribeFrames(listener: Listener<TrackingFrame | null>): () => void {
    this.frameListeners.add(listener);
    return () => this.frameListeners.delete(listener);
  }

  getLatestFrame(): TrackingFrame | null {
    return this.latestFrame;
  }

  private emitFrame(frame: TrackingFrame | null): void {
    this.latestFrame = frame;
    for (const listener of this.frameListeners) {
      try {
        listener(frame);
      } catch (error) {
        console.error('[AI Poker Face] Frame listener failed', error);
      }
    }
  }

  getTrackerStats(): TrackerStats | null {
    return this.tracker?.getStats() ?? null;
  }

  // ---- the persistent video element ----

  /**
   * One <video> element is shared by the tracker and every camera preview.
   * Previews temporarily move it into their container; otherwise it waits in
   * an invisible parking spot so playback (and tracking) never stops.
   */
  getVideoElement(): HTMLVideoElement {
    if (this.video) return this.video;
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('aria-hidden', 'true');
    video.className = 'camera-video';
    const parking = document.createElement('div');
    parking.className = 'video-parking';
    parking.appendChild(video);
    document.body.appendChild(parking);
    this.video = video;
    this.parking = parking;
    return video;
  }

  /** Moves the shared video into a preview container. */
  adoptVideo(host: HTMLElement): void {
    const video = this.getVideoElement();
    if (video.parentElement !== host) host.appendChild(video);
    this.resumePlayback();
  }

  /** Returns the video to the parking spot if `host` still holds it. */
  releaseVideo(host: HTMLElement): void {
    if (this.video && this.parking && this.video.parentElement === host) {
      this.parking.appendChild(this.video);
      this.resumePlayback();
    }
  }

  resumePlayback(): void {
    const video = this.video;
    if (video && video.srcObject && video.paused) {
      video.play().catch((error: unknown) => console.warn('[AI Poker Face] Video playback could not resume', error));
    }
  }

  // ---- model ----

  initModel(): Promise<void> {
    if (this.status.model === 'ready') return Promise.resolve();
    if (this.modelPromise) return this.modelPromise;
    this.setStatus({ model: 'loading', modelError: null });
    this.modelPromise = createFaceLandmarker()
      .then((loaded) => {
        this.loaded = loaded;
        const { landmarker: _landmarker, ...info } = loaded;
        this.setStatus({ model: 'ready', modelInfo: info, modelError: null });
        this.syncTracking();
      })
      .catch((error: unknown) => {
        const visionError = toVisionError(error, 'model-init-failed');
        console.error(`[AI Poker Face] Model initialisation failed (${visionError.kind}):`, visionError.message, visionError.detail ?? '');
        this.setStatus({ model: 'error', modelError: visionError });
      })
      .finally(() => {
        this.modelPromise = null;
      });
    return this.modelPromise;
  }

  // ---- camera ----

  startCamera(): Promise<void> {
    if (this.status.camera === 'ready' && this.stream) return Promise.resolve();
    if (this.cameraPromise) return this.cameraPromise;
    this.setStatus({ camera: 'requesting', cameraError: null });
    this.cameraPromise = (async () => {
      try {
        const stream = await requestCameraStream();
        const video = this.getVideoElement();
        video.srcObject = stream;
        this.stream = stream;
        for (const track of stream.getVideoTracks()) {
          track.addEventListener('ended', this.handleTrackEnded);
        }
        await video.play();
        if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          await new Promise<void>((resolve) => video.addEventListener('loadeddata', () => resolve(), { once: true }));
        }
        this.setStatus({ camera: 'ready', cameraError: null, trackingError: null, tracking: 'stopped' });
        this.syncTracking();
      } catch (error) {
        this.releaseStream();
        const visionError = toVisionError(error, 'camera-failed');
        console.error(`[AI Poker Face] Camera error (${visionError.kind}):`, visionError.message);
        this.setStatus({ camera: 'error', cameraError: visionError });
      } finally {
        this.cameraPromise = null;
      }
    })();
    return this.cameraPromise;
  }

  private readonly handleTrackEnded = (): void => {
    if (!this.stream) return;
    console.warn('[AI Poker Face] Webcam track ended (device disconnected or taken by another app).');
    this.releaseStream();
    this.stopTracker();
    this.emitFrame(null);
    this.setStatus({
      camera: 'error',
      cameraError: new VisionError('camera-disconnected', 'The video track ended.'),
      tracking: 'stopped',
    });
  };

  private releaseStream(): void {
    if (this.stream) {
      for (const track of this.stream.getVideoTracks()) track.removeEventListener('ended', this.handleTrackEnded);
    }
    stopStream(this.stream);
    this.stream = null;
    if (this.video) {
      this.video.pause();
      this.video.srcObject = null;
    }
  }

  /** Turns the webcam off completely (privacy control and screen exits). */
  stopCamera(): void {
    this.stopTracker();
    this.releaseStream();
    this.emitFrame(null);
    this.setStatus({ camera: 'off', cameraError: null, tracking: 'stopped' });
  }

  async restartCamera(): Promise<void> {
    this.stopCamera();
    await this.startCamera();
  }

  isCameraOn(): boolean {
    return this.stream !== null;
  }

  // ---- tracking ----

  /** Screens that need face tracking hold it while mounted. */
  acquireTracking(): () => void {
    this.trackingHolds += 1;
    this.syncTracking();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.trackingHolds = Math.max(0, this.trackingHolds - 1);
      this.syncTracking();
    };
  }

  /** Clears an inference error and starts a fresh tracking loop. */
  retryTracking(): void {
    this.stopTracker();
    this.setStatus({ tracking: 'stopped', trackingError: null });
    this.syncTracking();
  }

  private syncTracking(): void {
    const shouldRun =
      this.trackingHolds > 0 &&
      this.status.camera === 'ready' &&
      this.loaded !== null &&
      this.status.tracking !== 'error';
    if (shouldRun && !this.tracker?.isRunning()) {
      this.startTracker();
    } else if (!shouldRun && this.tracker?.isRunning()) {
      this.stopTracker();
      this.emitFrame(null);
      this.setStatus({ tracking: 'stopped' });
    }
  }

  private startTracker(): void {
    if (!this.loaded) return;
    this.tracker = new FaceTracker(this.loaded.landmarker, this.getVideoElement(), {
      targetFps: VISION_CONFIG.targetFps,
      minFps: VISION_CONFIG.minFps,
      maxConsecutiveFailures: VISION_CONFIG.maxConsecutiveFailures,
      onFrame: (frame) => this.emitFrame(frame),
      onFatalError: (error) => {
        console.error('[AI Poker Face] Tracking stopped after repeated inference failures', error);
        this.emitFrame(null);
        this.setStatus({ tracking: 'error', trackingError: toVisionError(error, 'inference-failed') });
      },
    });
    this.tracker.start();
    this.setStatus({ tracking: 'running', trackingError: null });
  }

  private stopTracker(): void {
    this.tracker?.stop();
  }

  // ---- lighting guidance ----

  /** Average brightness (0..255) of the current frame, sampled at 32x24 px. */
  sampleBrightness(): number | null {
    const video = this.video;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth === 0) return null;
    this.brightnessCanvas ??= document.createElement('canvas');
    const canvas = this.brightnessCanvas;
    canvas.width = 32;
    canvas.height = 24;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return averageLuma(ctx.getImageData(0, 0, canvas.width, canvas.height).data);
  }

  /** Releases everything, including the model (used when the page unloads). */
  dispose(): void {
    this.stopCamera();
    this.loaded?.landmarker.close();
    this.loaded = null;
    this.setStatus({ model: 'idle', modelInfo: null });
  }
}

export const visionService = new VisionService();
