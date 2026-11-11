import { describe, expect, it } from 'vitest';

import { findMunicipalityAt, type BoundaryFeature } from './geo';

// Unit square [0,1] x [0,1] (lon, lat) with a square hole at [0.4,0.6].
const square: BoundaryFeature = {
  properties: { slug: 'testville', name: 'Testville' },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ],
      [
        [0.4, 0.4],
        [0.6, 0.4],
        [0.6, 0.6],
        [0.4, 0.6],
        [0.4, 0.4],
      ],
    ],
  },
};

describe('findMunicipalityAt', () => {
  it('finds the containing municipality (lat, lon arguments)', () => {
    expect(findMunicipalityAt(0.2, 0.2, [square])).toBe('testville');
  });
  it('returns null outside every boundary', () => {
    expect(findMunicipalityAt(5, 5, [square])).toBeNull();
  });
  it('excludes points inside a hole', () => {
    expect(findMunicipalityAt(0.5, 0.5, [square])).toBeNull();
  });
});
