import { describe, expect, it } from 'vitest';
import { adviseFacePosition, adviseLighting, averageLuma, faceBoundingBox } from './faceGeometry';
import { cameraErrorKind } from './visionErrors';

const square = (cx: number, cy: number, size: number) => [
  { x: cx - size / 2, y: cy - size / 2 },
  { x: cx + size / 2, y: cy + size / 2 },
];

describe('face position guidance', () => {
  it('accepts a centred face of reasonable size', () => {
    expect(adviseFacePosition(faceBoundingBox(square(0.5, 0.5, 0.35)))).toBe('ok');
  });
  it('asks the player to move closer, back, or to the centre', () => {
    expect(adviseFacePosition(faceBoundingBox(square(0.5, 0.5, 0.1)))).toBe('too-far');
    expect(adviseFacePosition(faceBoundingBox(square(0.5, 0.5, 0.8)))).toBe('too-close');
    expect(adviseFacePosition(faceBoundingBox(square(0.15, 0.5, 0.25)))).toBe('off-center');
  });
  it('returns null without landmarks', () => {
    expect(faceBoundingBox([])).toBeNull();
    expect(adviseFacePosition(null)).toBeNull();
  });
});

describe('lighting guidance', () => {
  it('computes average luma from RGBA pixels', () => {
    expect(averageLuma([255, 255, 255, 255, 0, 0, 0, 255])).toBeCloseTo(127.5);
  });
  it('classifies dark, bright and normal frames', () => {
    expect(adviseLighting(20)).toBe('too-dark');
    expect(adviseLighting(240)).toBe('too-bright');
    expect(adviseLighting(120)).toBe('ok');
    expect(adviseLighting(null)).toBe('unknown');
  });
});

describe('camera error mapping', () => {
  it('maps getUserMedia DOMException names to player-facing errors', () => {
    expect(cameraErrorKind({ name: 'NotAllowedError' })).toBe('permission-denied');
    expect(cameraErrorKind({ name: 'NotFoundError' })).toBe('no-camera');
    expect(cameraErrorKind({ name: 'NotReadableError' })).toBe('camera-in-use');
    expect(cameraErrorKind(new Error('weird'))).toBe('camera-failed');
    expect(cameraErrorKind(undefined)).toBe('camera-failed');
  });
});
