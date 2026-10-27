/**
 * Player-friendly descriptions of camera and model failures. Technical
 * details go to the console, never to the screen.
 */

export type VisionErrorKind =
  | 'unsupported-browser'
  | 'insecure-context'
  | 'permission-denied'
  | 'no-camera'
  | 'camera-in-use'
  | 'camera-disconnected'
  | 'camera-failed'
  | 'model-missing'
  | 'wasm-missing'
  | 'model-init-failed'
  | 'inference-failed';

export class VisionError extends Error {
  readonly kind: VisionErrorKind;
  readonly detail: unknown;

  constructor(kind: VisionErrorKind, message: string, detail?: unknown) {
    super(message);
    this.name = 'VisionError';
    this.kind = kind;
    this.detail = detail;
  }
}

export interface ErrorCopy {
  title: string;
  message: string;
  recovery: string[];
}

export const ERROR_COPY: Record<VisionErrorKind, ErrorCopy> = {
  'unsupported-browser': {
    title: 'Browser not supported',
    message: 'This browser cannot give the game access to a webcam or run the local AI.',
    recovery: ['Use a recent version of Chrome, Edge or Firefox.', 'Open the game from http://localhost, not by double-clicking a file.'],
  },
  'insecure-context': {
    title: 'Camera blocked on this address',
    message: 'Browsers only allow webcam access on secure pages or on localhost.',
    recovery: ['Open the game at http://localhost:5173 (shown by "npm run dev").', 'Do not open index.html directly from the file system.'],
  },
  'permission-denied': {
    title: 'Camera access denied',
    message: 'The game needs your webcam to watch for a straight face. Video stays on this device.',
    recovery: [
      'Click the camera icon in the address bar and choose "Allow".',
      'On Windows, check Settings > Privacy & security > Camera and allow desktop apps / your browser.',
      'Then press "Try again".',
    ],
  },
  'no-camera': {
    title: 'No webcam found',
    message: 'No camera was detected on this device.',
    recovery: ['Connect a webcam (or enable the built-in one) and press "Try again".'],
  },
  'camera-in-use': {
    title: 'Camera is busy',
    message: 'Another app or browser tab seems to be using the webcam.',
    recovery: ['Close Teams, Zoom, Camera or other tabs using the webcam.', 'Then press "Try again".'],
  },
  'camera-disconnected': {
    title: 'Webcam disconnected',
    message: 'The camera stopped sending video.',
    recovery: ['Check the cable or reconnect the webcam.', 'Then press "Restart camera".'],
  },
  'camera-failed': {
    title: 'Camera could not start',
    message: 'The webcam could not be started.',
    recovery: ['Reconnect the webcam or restart the browser, then press "Try again".'],
  },
  'model-missing': {
    title: 'Model could not load',
    message: 'The local face model file (public/models/face_landmarker.task) is missing or incomplete.',
    recovery: ['In the project folder run: npm run setup-assets', 'Then restart the game with: npm run dev'],
  },
  'wasm-missing': {
    title: 'AI runtime files missing',
    message: 'The local MediaPipe WebAssembly files (public/mediapipe/wasm) could not be loaded.',
    recovery: ['In the project folder run: npm run setup-assets', 'Then restart the game with: npm run dev'],
  },
  'model-init-failed': {
    title: 'Model could not load',
    message: 'The local AI model failed to start on the CPU.',
    recovery: ['Reload the page and press "Try again".', 'If it keeps failing, run: npm run setup-assets'],
  },
  'inference-failed': {
    title: 'Face tracking stopped',
    message: 'The local AI hit repeated errors while analysing the video.',
    recovery: ['Press "Restart camera".', 'If the problem continues, reload the page.'],
  },
};

export function describeVisionError(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  if (typeof Event !== 'undefined' && error instanceof Event) return `Event "${error.type}" while loading ${String((error.target as { src?: string } | null)?.src ?? 'a script')}`;
  return String(error);
}

/** Maps a getUserMedia failure to a player-facing error kind. */
export function cameraErrorKind(error: unknown): VisionErrorKind {
  const name =
    error && typeof error === 'object' && 'name' in error && typeof (error as { name: unknown }).name === 'string'
      ? (error as { name: string }).name
      : '';
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return 'permission-denied';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return 'no-camera';
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'camera-in-use';
    default:
      return 'camera-failed';
  }
}

export function toVisionError(error: unknown, fallback: VisionErrorKind): VisionError {
  if (error instanceof VisionError) return error;
  return new VisionError(fallback, describeVisionError(error), error);
}
