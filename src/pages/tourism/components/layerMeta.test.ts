import { describe, expect, it } from 'vitest';

import { LAYER_SHAPE, shapePoints, townTint } from './layerMeta';

describe('pin shapes', () => {
  it('gives every layer a different shape', () => {
    const shapes = Object.values(LAYER_SHAPE);
    expect(new Set(shapes).size).toBe(shapes.length);
  });

  it('builds the right number of vertices around the centre', () => {
    expect(shapePoints('circle', 8, 6)).toBeNull();
    expect(shapePoints('diamond', 8, 6)).toHaveLength(4);
    expect(shapePoints('square', 8, 6)).toHaveLength(4);
    const hex = shapePoints('hexagon', 8, 6)!;
    expect(hex).toHaveLength(6);
    for (const [x, y] of hex)
      expect(Math.hypot(x - 8, y - 8)).toBeCloseTo(6, 5);
  });
});

describe('townTint', () => {
  it('is stable per town and neutral when unknown', () => {
    expect(townTint('kalibo')).toBe(townTint('kalibo'));
    expect(townTint(null)).toBe('#475569');
  });
});
