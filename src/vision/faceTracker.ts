/**
 * The single inference loop. It runs MediaPipe on new video frames only, at a
 * throttled rate that adapts downwards when the CPU cannot keep up.
 */
import type { FaceLandmarker, NormalizedLandmark } from '@mediapipe/tasks-vision';
import { extractCues, type FacialCues } from './blendshapeAnalyzer';

/** The first inferences include one-off WASM/graph warm-up and are not representative. */
const WARMUP_FRAMES = 5;

export interface TrackingFrame {
  /** performance.now() time of the analysed frame. */
  timestampMs: number;
  faceDetected: boolean;
  /** Raw facial cues; null when no face or the blendshapes were unreliable. */
  cues: FacialCues | null;
  /** Landmarks of the tracked face. Kept in memory only, never stored. */
  landmarks: readonly NormalizedLandmark[] | null;
  inferenceMs: number;
}

export interface TrackerStats {
  running: boolean;
  targetFps: number;
  currentFpsLimit: number;
  measuredFps: number;
  avgInferenceMs: number;
  framesProcessed: number;
  consecutiveFailures: number;
}

export interface FaceTrackerOptions {
  targetFps: number;
  minFps: number;
  maxConsecutiveFailures: number;
  onFrame: (frame: TrackingFrame) => void;
  onFatalError: (error: unknown) => void;
}

export class FaceTracker {
  private readonly landmarker: FaceLandmarker;
  private readonly video: HTMLVideoElement;
  private readonly options: FaceTrackerOptions;

  private rafId: number | null = null;
  private running = false;
  private fpsLimit: number;
  private lastRunAt = 0;
  private lastVideoTime = -1;
  private lastTimestamp = 0;
  private avgInferenceMs = 0;
  private framesProcessed = 0;
  private consecutiveFailures = 0;
  private fpsWindowStart = 0;
  private fpsWindowFrames = 0;
  private measuredFps = 0;
  private lastAdaptAt = 0;

  constructor(landmarker: FaceLandmarker, video: HTMLVideoElement, options: FaceTrackerOptions) {
    this.landmarker = landmarker;
    this.video = video;
    this.options = options;
    this.fpsLimit = options.targetFps;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.consecutiveFailures = 0;
    this.lastVideoTime = -1;
    this.fpsWindowStart = performance.now();
    this.fpsWindowFrames = 0;
    this.lastAdaptAt = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.measuredFps = 0;
  }

  isRunning(): boolean {
    return this.running;
  }

  getStats(): TrackerStats {
    return {
      running: this.running,
      targetFps: this.options.targetFps,
      currentFpsLimit: this.fpsLimit,
      measuredFps: this.measuredFps,
      avgInferenceMs: this.avgInferenceMs,
      framesProcessed: this.framesProcessed,
      consecutiveFailures: this.consecutiveFailures,
    };
  }

  private readonly loop = (now: number): void => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.loop);

    if (now - this.lastRunAt < 1000 / this.fpsLimit - 1) return;
    const video = this.video;
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth === 0) return;
    // Only analyse frames the camera has not delivered before.
    if (video.currentTime === this.lastVideoTime) return;
    this.lastRunAt = now;
    this.lastVideoTime = video.currentTime;

    // MediaPipe requires strictly increasing timestamps in VIDEO mode.
    const timestamp = Math.max(now, this.lastTimestamp + 1);
    this.lastTimestamp = timestamp;

    const started = performance.now();
    let frame: TrackingFrame;
    try {
      const result = this.landmarker.detectForVideo(video, timestamp);
      const landmarks = result.faceLandmarks[0] ?? null;
      const cues = landmarks ? extractCues(result.faceBlendshapes[0]?.categories) : null;
      frame = {
        timestampMs: timestamp,
        faceDetected: landmarks !== null,
        cues,
        landmarks,
        inferenceMs: performance.now() - started,
      };
      this.consecutiveFailures = 0;
    } catch (error) {
      this.consecutiveFailures += 1;
      console.warn(`[AI Poker Face] Inference failed (${this.consecutiveFailures} in a row)`, error);
      if (this.consecutiveFailures >= this.options.maxConsecutiveFailures) {
        this.stop();
        this.options.onFatalError(error);
      }
      return;
    }

    this.recordTiming(frame.inferenceMs, now);
    this.options.onFrame(frame);
  };

  private recordTiming(inferenceMs: number, now: number): void {
    this.framesProcessed += 1;
    if (this.framesProcessed > WARMUP_FRAMES) {
      this.avgInferenceMs = this.avgInferenceMs === 0 ? inferenceMs : this.avgInferenceMs * 0.9 + inferenceMs * 0.1;
    }

    this.fpsWindowFrames += 1;
    const windowMs = now - this.fpsWindowStart;
    if (windowMs >= 1000) {
      this.measuredFps = (this.fpsWindowFrames * 1000) / windowMs;
      this.fpsWindowStart = now;
      this.fpsWindowFrames = 0;
    }

    // Adapt every two seconds: slow down if inference eats most of the frame
    // budget (keeps the game smooth on weak CPUs), speed back up when it is cheap.
    if (this.avgInferenceMs === 0 || now - this.lastAdaptAt < 2000) return;
    this.lastAdaptAt = now;
    const budget = 1000 / this.fpsLimit;
    if (this.avgInferenceMs > budget * 0.6 && this.fpsLimit > this.options.minFps) {
      this.fpsLimit = Math.max(this.options.minFps, this.fpsLimit - 2);
      console.info(`[AI Poker Face] Inference averaging ${this.avgInferenceMs.toFixed(1)} ms; lowering rate to ${this.fpsLimit} fps`);
    } else if (this.avgInferenceMs < budget * 0.3 && this.fpsLimit < this.options.targetFps) {
      this.fpsLimit = Math.min(this.options.targetFps, this.fpsLimit + 1);
    }
  }
}
