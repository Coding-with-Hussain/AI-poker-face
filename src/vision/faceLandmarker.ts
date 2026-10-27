/**
 * Local MediaPipe Face Landmarker setup.
 *
 * - The model is served from /models/face_landmarker.task (this machine).
 * - The WASM runtime is served from /mediapipe/wasm (this machine).
 * - Inference is explicitly pinned to the CPU delegate (XNNPACK on WASM).
 *   GPU / WebGPU are never selected, whatever the difficulty or settings.
 */
import { FaceLandmarker, FilesetResolver, type FaceLandmarkerOptions } from '@mediapipe/tasks-vision';
import { describeVisionError, VisionError } from './visionErrors';

export const INFERENCE_DELEGATE = 'CPU' as const;

const BASE = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
export const MODEL_URL = `${BASE}models/face_landmarker.task`;
export const WASM_BASE_URL = `${BASE}mediapipe/wasm`;

const MODEL_MIN_BYTES = 1_000_000;

export const FACE_LANDMARKER_OPTIONS = {
  baseOptions: {
    delegate: INFERENCE_DELEGATE,
  },
  runningMode: 'VIDEO',
  numFaces: 1,
  outputFaceBlendshapes: true,
  outputFacialTransformationMatrixes: false,
  minFaceDetectionConfidence: 0.5,
  minFacePresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
} as const satisfies FaceLandmarkerOptions;

export interface LoadedFaceLandmarker {
  landmarker: FaceLandmarker;
  delegate: typeof INFERENCE_DELEGATE;
  wasmVariant: 'simd' | 'no-simd';
  wasmBinaryPath: string;
  modelUrl: string;
  modelBytes: number;
  loadMs: number;
}

function looksLikeHtml(response: Response): boolean {
  return (response.headers.get('content-type') ?? '').toLowerCase().includes('text/html');
}

/**
 * Checks that a local runtime file exists. Dev servers often answer a missing
 * file with index.html, so a text/html response also counts as missing.
 */
async function assertLocalFile(url: string, kind: 'wasm-missing' | 'model-missing'): Promise<void> {
  let response: Response;
  try {
    response = await fetch(url, { method: 'HEAD', cache: 'no-store' });
  } catch (cause) {
    throw new VisionError(kind, `Could not reach ${url}`, cause);
  }
  if (!response.ok || looksLikeHtml(response)) {
    throw new VisionError(kind, `${url} responded with HTTP ${response.status} (${response.headers.get('content-type') ?? 'no content-type'})`);
  }
}

async function loadModelBuffer(): Promise<Uint8Array> {
  let response: Response;
  try {
    response = await fetch(MODEL_URL, { cache: 'no-cache' });
  } catch (cause) {
    throw new VisionError('model-missing', `Could not fetch ${MODEL_URL}`, cause);
  }
  if (!response.ok || looksLikeHtml(response)) {
    throw new VisionError('model-missing', `${MODEL_URL} responded with HTTP ${response.status}`);
  }
  const buffer = new Uint8Array(await response.arrayBuffer());
  if (buffer.byteLength < MODEL_MIN_BYTES) {
    throw new VisionError('model-missing', `${MODEL_URL} is only ${buffer.byteLength} bytes; the model file is incomplete.`);
  }
  return buffer;
}

export async function createFaceLandmarker(): Promise<LoadedFaceLandmarker> {
  const started = performance.now();
  if (typeof WebAssembly !== 'object') {
    throw new VisionError('unsupported-browser', 'WebAssembly is not available in this browser.');
  }

  const fileset = await FilesetResolver.forVisionTasks(WASM_BASE_URL);
  await assertLocalFile(fileset.wasmLoaderPath, 'wasm-missing');
  await assertLocalFile(fileset.wasmBinaryPath, 'wasm-missing');
  const modelBuffer = await loadModelBuffer();

  let landmarker: FaceLandmarker;
  try {
    landmarker = await FaceLandmarker.createFromOptions(fileset, {
      ...FACE_LANDMARKER_OPTIONS,
      baseOptions: { ...FACE_LANDMARKER_OPTIONS.baseOptions, modelAssetBuffer: modelBuffer },
    });
  } catch (cause) {
    // A failed <script> load surfaces as a DOM Event rather than an Error.
    const kind = typeof Event !== 'undefined' && cause instanceof Event ? 'wasm-missing' : 'model-init-failed';
    throw new VisionError(kind, describeVisionError(cause), cause);
  }

  const result: LoadedFaceLandmarker = {
    landmarker,
    delegate: INFERENCE_DELEGATE,
    wasmVariant: fileset.wasmBinaryPath.includes('nosimd') ? 'no-simd' : 'simd',
    wasmBinaryPath: fileset.wasmBinaryPath,
    modelUrl: MODEL_URL,
    modelBytes: modelBuffer.byteLength,
    loadMs: Math.round(performance.now() - started),
  };
  console.info(
    `[AI Poker Face] Face Landmarker ready on ${result.delegate} (${result.wasmVariant} WASM, model ${(result.modelBytes / 1e6).toFixed(1)} MB) in ${result.loadMs} ms`,
  );
  return result;
}
