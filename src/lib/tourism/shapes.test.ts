import { describe, expect, it } from 'vitest';

import type { BoundaryFeature } from './geo';
import { projectTowns } from './shapes';

const square = (slug: string, x: number): BoundaryFeature => ({
  properties: { slug, name: slug },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [x, 0],
        [x + 1, 0],
        [x + 1, 1],
        [x, 1],
        [x, 0],
      ],
    ],
  },
});

describe('projectTowns', () => {
  const { viewBox, height, towns } = projectTowns(
    [square('a', 0), square('b', 1)],
    200
  );

  it('fits the width and keeps proportions (two squares side by side)', () => {
    expect(viewBox).toBe(`0 0 200 ${height}`);
    expect(height).toBe(100);
  });

  it('draws one closed path per town with centres inside the drawing', () => {
    expect(towns.map(t => t.slug)).toEqual(['a', 'b']);
    for (const t of towns) {
      expect(t.d).toMatch(/^M.*Z$/);
      expect(t.cx).toBeGreaterThan(0);
      expect(t.cx).toBeLessThan(200);
    }
    expect(towns[0].cx).toBeLessThan(towns[1].cx);
  });

  it('drops points closer than the step', () => {
    const dense: BoundaryFeature = {
      properties: { slug: 'd', name: 'd' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          Array.from(
            { length: 101 },
            (_, i) => [i / 100, 0] as number[]
          ).concat([
            [1, 1],
            [0, 1],
            [0, 0],
          ]),
        ],
      },
    };
    const {
      towns: [t],
    } = projectTowns([dense], 100, 5);
    expect(t.d.split('L').length).toBeLessThan(40);
  });
});
