import { describe, expect, it } from 'vitest';
import { CALIBRATION } from '../game/gameConfig';
import { computeBaseline, median } from './calibration';
import type { FacialCues } from './blendshapeAnalyzer';

const repeat = (cues: FacialCues, n: number): FacialCues[] => Array.from({ length: n }, () => ({ ...cues }));

describe('median', () => {
  it('handles odd, even and empty inputs', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBe(0);
    expect(median([Number.NaN, 1])).toBe(1);
  });
});

describe('computeBaseline', () => {
  it('uses robust medians from neutral samples', () => {
    const samples = [
      ...repeat({ smile: 0.08, jawOpen: 0.02, cheekSquint: 0.05 }, 20),
      // a blink-and-twitch outlier that should not move the baseline
      { smile: 0.9, jawOpen: 0.6, cheekSquint: 0.7 },
    ];
    const result = computeBaseline(samples);
    expect(result.quality).toBe('good');
    expect(result.sampleCount).toBe(21);
    expect(result.baseline.smile).toBeCloseTo(0.08);
    expect(result.baseline.jawOpen).toBeCloseTo(0.02);
  });

  it('reports insufficient data and falls back to a zero baseline', () => {
    const result = computeBaseline(repeat({ smile: 0.2, jawOpen: 0.1, cheekSquint: 0.1 }, CALIBRATION.minSamples - 1));
    expect(result.quality).toBe('insufficient');
    expect(result.baseline).toEqual({ smile: 0, jawOpen: 0, cheekSquint: 0 });
  });

  it('flags a calibration done while smiling and caps the baseline', () => {
    const result = computeBaseline(repeat({ smile: 0.85, jawOpen: 0.3, cheekSquint: 0.5 }, 20));
    expect(result.quality).toBe('smiling');
    expect(result.measured.smile).toBeCloseTo(0.85);
    expect(result.baseline.smile).toBe(CALIBRATION.maxBaseline);
    expect(result.baseline.cheekSquint).toBe(CALIBRATION.maxBaseline);
    expect(result.baseline.jawOpen).toBeCloseTo(0.3);
  });
});
