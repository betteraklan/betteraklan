import { describe, expect, it } from 'vitest';

import {
  LAYER_SHAPE,
  shapePoints,
  TOWN_COLOR,
  TOWN_SLUGS,
  townTint,
} from './layerMeta';

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

describe('municipality colours', () => {
  it('gives all 17 municipalities distinct colours', () => {
    const colours = TOWN_SLUGS.map(s => TOWN_COLOR[s]);
    expect(colours).toHaveLength(17);
    expect(new Set(colours).size).toBe(17);
    expect(townTint('kalibo')).toBe(TOWN_COLOR.kalibo);
  });

  it('keeps towns that share a border at least 80° apart in hue', () => {
    // Shared edges in municipalities-boundaries.json.
    const borders = [
      ['altavas', 'balete'],
      ['altavas', 'batan'],
      ['balete', 'banga'],
      ['balete', 'batan'],
      ['balete', 'libacao'],
      ['balete', 'madalag'],
      ['balete', 'new-washington'],
      ['banga', 'kalibo'],
      ['banga', 'lezo'],
      ['banga', 'madalag'],
      ['banga', 'malinao'],
      ['banga', 'new-washington'],
      ['batan', 'new-washington'],
      ['buruanga', 'malay'],
      ['buruanga', 'nabas'],
      ['ibajay', 'makato'],
      ['ibajay', 'malinao'],
      ['ibajay', 'nabas'],
      ['ibajay', 'tangalan'],
      ['kalibo', 'lezo'],
      ['kalibo', 'new-washington'],
      ['kalibo', 'numancia'],
      ['lezo', 'makato'],
      ['lezo', 'malinao'],
      ['lezo', 'numancia'],
      ['libacao', 'madalag'],
      ['madalag', 'malinao'],
      ['makato', 'malinao'],
      ['makato', 'numancia'],
      ['makato', 'tangalan'],
      ['malay', 'nabas'],
    ];
    const hue = (s: string) => Number(/hsl\((\d+)/.exec(TOWN_COLOR[s])![1]);
    for (const [a, b] of borders) {
      const d = Math.abs(hue(a) - hue(b)) % 360;
      expect(Math.min(d, 360 - d), `${a}/${b}`).toBeGreaterThanOrEqual(80);
    }
  });
});
