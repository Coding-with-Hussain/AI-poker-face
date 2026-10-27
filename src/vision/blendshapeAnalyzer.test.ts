import { describe, expect, it } from 'vitest';
import { applyBaseline, combineCues, extractCues, ZERO_BASELINE } from './blendshapeAnalyzer';

const categories = (scores: Record<string, number>) =>
  Object.entries(scores).map(([categoryName, score]) => ({ categoryName, score }));

describe('extractCues', () => {
  it('averages left/right smile and cheek squint and reads jawOpen', () => {
    const cues = extractCues(
      categories({
        _neutral: 0.9,
        mouthSmileLeft: 0.6,
        mouthSmileRight: 0.8,
        jawOpen: 0.3,
        cheekSquintLeft: 0.2,
        cheekSquintRight: 0.4,
        eyeBlinkLeft: 0.1,
      }),
    );
    expect(cues?.smile).toBeCloseTo(0.7);
    expect(cues?.jawOpen).toBeCloseTo(0.3);
    expect(cues?.cheekSquint).toBeCloseTo(0.3);
  });

  it('returns null for missing results so they are not mistaken for a neutral face', () => {
    expect(extractCues(undefined)).toBeNull();
    expect(extractCues([])).toBeNull();
    expect(extractCues(categories({ mouthSmileLeft: 0.5, jawOpen: 0.1 }))).toBeNull();
    expect(extractCues(categories({ mouthSmileLeft: Number.NaN, mouthSmileRight: 0.2, jawOpen: 0.1 }))).toBeNull();
  });

  it('treats cheek squint as optional and clamps out-of-range scores', () => {
    const cues = extractCues(categories({ mouthSmileLeft: 1.4, mouthSmileRight: -0.2, jawOpen: 0.2 }));
    expect(cues).toEqual({ smile: 0.5, jawOpen: 0.2, cheekSquint: 0 });
  });
});

describe('applyBaseline', () => {
  it('maps the baseline to zero and keeps 1 at 1', () => {
    const baseline = { smile: 0.2, jawOpen: 0.1, cheekSquint: 0 };
    expect(applyBaseline({ smile: 0.2, jawOpen: 0.05, cheekSquint: 0 }, baseline)).toEqual({ smile: 0, jawOpen: 0, cheekSquint: 0 });
    expect(applyBaseline({ smile: 1, jawOpen: 1, cheekSquint: 1 }, baseline)).toEqual({ smile: 1, jawOpen: 1, cheekSquint: 1 });
    expect(applyBaseline({ smile: 0.6, jawOpen: 0.1, cheekSquint: 0 }, baseline).smile).toBeCloseTo(0.5);
  });
});

describe('combineCues', () => {
  it('needs a smile before jaw opening counts', () => {
    const openMouthOnly = combineCues(applyBaseline({ smile: 0, jawOpen: 1, cheekSquint: 1 }, ZERO_BASELINE));
    const laugh = combineCues(applyBaseline({ smile: 0.8, jawOpen: 0.5, cheekSquint: 0.4 }, ZERO_BASELINE));
    expect(openMouthOnly).toBe(0);
    expect(laugh).toBeGreaterThan(0.6);
  });

  it('stays within 0..1', () => {
    expect(combineCues({ smile: 1, jawOpen: 1, cheekSquint: 1 })).toBeLessThanOrEqual(1);
    expect(combineCues({ smile: 0, jawOpen: 0, cheekSquint: 0 })).toBe(0);
  });
});
