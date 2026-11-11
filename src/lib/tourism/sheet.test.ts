import { describe, expect, it } from 'vitest';

import { pickSnap, rubberBand } from './sheet';

const H = { peek: 132, half: 406, full: 740 };

describe('rubberBand', () => {
  it('is zero at the edge and never reaches the limit', () => {
    expect(rubberBand(0)).toBe(0);
    expect(rubberBand(-20)).toBe(0);
    expect(rubberBand(10_000, 160)).toBeLessThan(160);
  });

  it('gives less than the finger moved', () => {
    expect(rubberBand(100)).toBeLessThan(100);
    expect(rubberBand(200)).toBeGreaterThan(rubberBand(100));
  });
});

describe('pickSnap', () => {
  it('settles on the nearest snap after a slow release', () => {
    expect(pickSnap(380, 0, H)).toBe('half');
    expect(pickSnap(700, 0, H)).toBe('full');
    expect(pickSnap(160, 0, H)).toBe('peek');
  });

  it('a fast flick moves one snap in its direction', () => {
    expect(pickSnap(420, 1, H)).toBe('full');
    expect(pickSnap(400, -1, H)).toBe('peek');
    expect(pickSnap(200, 1, H)).toBe('half');
  });

  it('a flick past the last snap stays on it', () => {
    expect(pickSnap(760, 2, H)).toBe('full');
    expect(pickSnap(110, -2, H)).toBe('peek');
  });
});
