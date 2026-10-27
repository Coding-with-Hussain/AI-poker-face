/**
 * Camera-position and lighting guidance computed from real frame data.
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface FaceBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export type PositionAdvice = 'ok' | 'too-far' | 'too-close' | 'off-center';
export type LightingAdvice = 'ok' | 'too-dark' | 'too-bright' | 'unknown';

/** Bounding box of normalized (0..1) landmarks, or null when there are none. */
export function faceBoundingBox(landmarks: readonly Point2D[] | null | undefined): FaceBox | null {
  if (!landmarks || landmarks.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of landmarks) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const width = maxX - minX;
  const height = maxY - minY;
  return { minX, minY, maxX, maxY, width, height, centerX: minX + width / 2, centerY: minY + height / 2 };
}

/** Thresholds are fractions of the frame width/height. */
export function adviseFacePosition(box: FaceBox | null): PositionAdvice | null {
  if (!box) return null;
  if (box.width < 0.16) return 'too-far';
  if (box.width > 0.72 || box.height > 0.95) return 'too-close';
  if (box.centerX < 0.25 || box.centerX > 0.75 || box.centerY < 0.2 || box.centerY > 0.8) return 'off-center';
  return 'ok';
}

/** Average luma (0..255) of RGBA pixel data, using Rec. 601 weights. */
export function averageLuma(rgba: ArrayLike<number>): number {
  const pixels = Math.floor(rgba.length / 4);
  if (pixels === 0) return 0;
  let total = 0;
  for (let i = 0; i < pixels * 4; i += 4) {
    total += 0.299 * (rgba[i] ?? 0) + 0.587 * (rgba[i + 1] ?? 0) + 0.114 * (rgba[i + 2] ?? 0);
  }
  return total / pixels;
}

export function adviseLighting(luma: number | null): LightingAdvice {
  if (luma === null || !Number.isFinite(luma)) return 'unknown';
  if (luma < 55) return 'too-dark';
  if (luma > 215) return 'too-bright';
  return 'ok';
}

export const POSITION_TIPS: Record<Exclude<PositionAdvice, 'ok'>, string> = {
  'too-far': 'Move a little closer to the camera.',
  'too-close': 'Lean back a little so your whole face fits.',
  'off-center': 'Centre your face in the frame.',
};

export const LIGHTING_TIPS: Record<Exclude<LightingAdvice, 'ok' | 'unknown'>, string> = {
  'too-dark': 'It looks dark. Face a window or turn on a light.',
  'too-bright': 'Very bright image. Avoid strong light directly behind or into the camera.',
};
