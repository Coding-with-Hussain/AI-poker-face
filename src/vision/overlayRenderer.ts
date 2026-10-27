/**
 * Draws a subtle face outline on a canvas laid over the (mirrored) preview.
 * Only a few contours and corner brackets are drawn so the player's face is
 * never hidden behind graphics.
 */
import { FaceLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { CueState } from './laughEstimator';
import { faceBoundingBox } from './faceGeometry';

interface Connection {
  start: number;
  end: number;
}

const TONE_COLORS: Record<CueState, string> = {
  'no-face': 'rgba(46, 230, 255, 0.85)',
  calm: 'rgba(52, 211, 153, 0.9)',
  suspicious: 'rgba(251, 191, 36, 0.95)',
  'high-risk': 'rgba(255, 140, 66, 0.95)',
  'laugh-detected': 'rgba(255, 77, 109, 1)',
};

function drawConnections(
  ctx: CanvasRenderingContext2D,
  landmarks: readonly NormalizedLandmark[],
  connections: readonly Connection[],
  map: (p: NormalizedLandmark) => [number, number],
): void {
  ctx.beginPath();
  for (const { start, end } of connections) {
    const a = landmarks[start];
    const b = landmarks[end];
    if (!a || !b) continue;
    const [ax, ay] = map(a);
    const [bx, by] = map(b);
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
  }
  ctx.stroke();
}

/** Maps normalized video coordinates to the canvas, matching CSS object-fit: cover. */
function coverMapping(canvas: HTMLCanvasElement, video: HTMLVideoElement) {
  const vw = video.videoWidth || 640;
  const vh = video.videoHeight || 480;
  const scale = Math.max(canvas.width / vw, canvas.height / vh);
  const offsetX = (canvas.width - vw * scale) / 2;
  const offsetY = (canvas.height - vh * scale) / 2;
  return (p: { x: number; y: number }): [number, number] => [offsetX + p.x * vw * scale, offsetY + p.y * vh * scale];
}

export function resizeCanvasToDisplay(canvas: HTMLCanvasElement): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const width = Math.round(canvas.clientWidth * dpr);
  const height = Math.round(canvas.clientHeight * dpr);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

export function clearOverlay(canvas: HTMLCanvasElement): void {
  canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
}

export function drawFaceOverlay(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  landmarks: readonly NormalizedLandmark[] | null,
  state: CueState,
): void {
  resizeCanvasToDisplay(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!landmarks || landmarks.length === 0) return;

  const map = coverMapping(canvas, video);
  const unit = Math.max(1, canvas.width / 420);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.lineWidth = 1.2 * unit;
  ctx.strokeStyle = 'rgba(46, 230, 255, 0.35)';
  drawConnections(ctx, landmarks, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, map);

  ctx.strokeStyle = 'rgba(177, 140, 255, 0.55)';
  drawConnections(ctx, landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, map);
  drawConnections(ctx, landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, map);
  drawConnections(ctx, landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW, map);
  drawConnections(ctx, landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW, map);

  // Lips carry the signal the game cares about, so they take the state colour.
  ctx.lineWidth = 1.8 * unit;
  ctx.strokeStyle = TONE_COLORS[state];
  drawConnections(ctx, landmarks, FaceLandmarker.FACE_LANDMARKS_LIPS, map);

  const box = faceBoundingBox(landmarks);
  if (!box) return;
  const [x0, y0] = map({ x: box.minX, y: box.minY });
  const [x1, y1] = map({ x: box.maxX, y: box.maxY });
  const pad = 10 * unit;
  const left = x0 - pad;
  const top = y0 - pad;
  const right = x1 + pad;
  const bottom = y1 + pad;
  const len = Math.min(right - left, bottom - top) * 0.16;
  ctx.lineWidth = 2.2 * unit;
  ctx.strokeStyle = TONE_COLORS[state === 'calm' ? 'no-face' : state];
  ctx.beginPath();
  ctx.moveTo(left, top + len);
  ctx.lineTo(left, top);
  ctx.lineTo(left + len, top);
  ctx.moveTo(right - len, top);
  ctx.lineTo(right, top);
  ctx.lineTo(right, top + len);
  ctx.moveTo(right, bottom - len);
  ctx.lineTo(right, bottom);
  ctx.lineTo(right - len, bottom);
  ctx.moveTo(left + len, bottom);
  ctx.lineTo(left, bottom);
  ctx.lineTo(left, bottom - len);
  ctx.stroke();
}
