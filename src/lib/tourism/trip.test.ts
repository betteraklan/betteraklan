import { describe, expect, it } from 'vitest';

import {
  haversineKm,
  MAX_STOPS,
  moveStop,
  parseTrip,
  routeKm,
  serializeTrip,
} from './trip';

describe('trip URL value', () => {
  const known = new Set(['a', 'b', 'c']);

  it('keeps known ids in order without duplicates', () => {
    expect(parseTrip('b,a,b,zzz,c', known)).toEqual(['b', 'a', 'c']);
    expect(parseTrip(null, known)).toEqual([]);
    expect(parseTrip('', known)).toEqual([]);
  });

  it('round-trips and caps the number of stops', () => {
    expect(parseTrip(serializeTrip(['c', 'a']), known)).toEqual(['c', 'a']);
    const many = new Set(Array.from({ length: 30 }, (_, i) => `r${i}`));
    expect(parseTrip([...many].join(','), many)).toHaveLength(MAX_STOPS);
  });
});

describe('distance', () => {
  // Kalibo to Caticlan (Malay) is roughly 60 km in a straight line.
  const kalibo = { lat: 11.706, lon: 122.364 };
  const caticlan = { lat: 11.93, lon: 121.954 };

  it('measures great-circle km', () => {
    expect(haversineKm(kalibo, kalibo)).toBe(0);
    const km = haversineKm(kalibo, caticlan);
    expect(km).toBeGreaterThan(45);
    expect(km).toBeLessThan(60);
  });

  it('sums legs in order', () => {
    expect(routeKm([kalibo])).toBe(0);
    expect(routeKm([kalibo, caticlan, kalibo])).toBeCloseTo(
      2 * haversineKm(kalibo, caticlan),
      6
    );
  });
});

describe('moveStop', () => {
  it('swaps with a neighbour and ignores moves past the ends', () => {
    expect(moveStop(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveStop(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b']);
    expect(moveStop(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
  });
});
