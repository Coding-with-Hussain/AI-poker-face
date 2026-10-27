import { describe, expect, it } from 'vitest';
import { isAllowedUrl } from './networkGuard';

const ORIGIN = 'http://localhost:5173';

describe('local-only network guard', () => {
  it('allows the local model, WASM runtime and app files', () => {
    expect(isAllowedUrl('/models/face_landmarker.task', ORIGIN)).toBe(true);
    expect(isAllowedUrl('/mediapipe/wasm/vision_wasm_internal.wasm', ORIGIN)).toBe(true);
    expect(isAllowedUrl('http://localhost:5173/assets/index.js', ORIGIN)).toBe(true);
    expect(isAllowedUrl('data:application/octet-stream;base64,AAAA', ORIGIN)).toBe(true);
    expect(isAllowedUrl('blob:http://localhost:5173/1234', ORIGIN)).toBe(true);
  });

  it('blocks every other origin, including telemetry and CDNs', () => {
    expect(isAllowedUrl('https://odml.pa.googleapis.com/v1/log', ORIGIN)).toBe(false);
    expect(isAllowedUrl('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm', ORIGIN)).toBe(false);
    expect(isAllowedUrl('https://storage.googleapis.com/mediapipe-models/x.task', ORIGIN)).toBe(false);
    expect(isAllowedUrl('http://localhost:4173/other-port', ORIGIN)).toBe(false);
  });
});
