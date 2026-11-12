import { describe, expect, it } from 'vitest';

import { aklanHour, skyWash } from './atmosphere';

describe('aklanHour', () => {
  it('reads the time in Aklan (UTC+8), not the viewer zone', () => {
    // 10:30 UTC is 18:30 in Manila.
    expect(aklanHour(new Date('2026-11-12T10:30:00Z'))).toBeCloseTo(18.5, 5);
    // 17:00 UTC is 01:00 the next day in Manila.
    expect(aklanHour(new Date('2026-11-12T17:00:00Z'))).toBe(1);
  });
});

describe('skyWash', () => {
  it('has no wash in the daytime', () => {
    expect(skyWash(12).opacity).toBe(0);
  });

  it('is warmest around sunset', () => {
    expect(skyWash(18).phase).toBe('sunset');
    expect(skyWash(18).opacity).toBeGreaterThan(skyWash(16.5).opacity);
  });

  it('covers every hour with a low opacity', () => {
    for (let h = 0; h < 24; h += 0.25) {
      const w = skyWash(h);
      expect(w.opacity).toBeLessThanOrEqual(0.16);
    }
    expect(skyWash(23).phase).toBe('night');
    expect(skyWash(5.5).phase).toBe('dawn');
  });
});
