import { describe, expect, it } from 'vitest';

import {
  buildRecords,
  densityTier,
  emptyReason,
  filterRecords,
  type Sources,
  teaser,
  tierBounds,
} from './explore';
import type { BoundaryFeature } from './geo';

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
    ],
  },
};

const sources: Sources = {
  municipalities: [
    {
      slug: 'testville',
      name: 'Testville',
      attractions: [
        { name: 'Falls', description: 'Waterfall' },
        { name: null, description: 'Free text paragraph, not a record' },
      ],
      festivals: [
        {
          name: 'Dated fest',
          description: 'x',
          dates: {
            status: 'confirmed',
            start: '2027-01-10',
            end: '2027-01-12',
          },
        },
        { name: 'Undated fest', description: 'y' },
      ],
      products: [],
    },
  ],
  resorts: [
    {
      name: 'Beach',
      found: true,
      latitude: 0.5,
      longitude: 0.5,
      notes: 'Sand',
    },
  ],
  accommodations: [
    {
      name: 'Hotel A',
      address: 'Main St',
      area: 'mainland',
      municipality: 'Testville',
      lat: 0.2,
      lon: 0.2,
      geocodePrecision: 'barangay',
    },
    {
      name: 'Hotel B',
      address: 'Nowhere',
      area: 'mainland',
      municipality: null,
      lat: null,
      lon: null,
      geocodePrecision: 'failed',
    },
  ],
  centroids: [{ slug: 'testville', name: 'Testville', lat: 0.5, lon: 0.5 }],
  boundaries: [square],
};

const none = { q: '', town: '', layer: 'all' as const };

describe('buildRecords', () => {
  const recs = buildRecords(sources);
  it('skips nameless free-text entries', () => {
    expect(recs.filter(r => r.name.startsWith('Free'))).toHaveLength(0);
    expect(
      recs.filter(r => r.layer === 'place' && r.name === 'Falls')
    ).toHaveLength(1);
  });
  it('marks municipality entries as approximate, centroid placed', () => {
    const falls = recs.find(r => r.name === 'Falls')!;
    expect(falls.placement).toBe('approximate');
    expect(falls.placementNote).toBe('Municipality centroid');
  });
  it('assigns resorts to a municipality by boundary', () => {
    expect(recs.find(r => r.name === 'Beach')!.town).toBe('testville');
  });
  it('labels non-exact accommodation pins and leaves unlocated ones unplaced', () => {
    expect(recs.find(r => r.name === 'Hotel A')!.placementNote).toBe(
      'barangay pin'
    );
    expect(recs.find(r => r.name === 'Hotel B')!.placement).toBe('none');
  });
});

describe('filterRecords and emptyReason', () => {
  const recs = buildRecords(sources);
  it('keeps undated festivals when a date range is active', () => {
    const out = filterRecords(recs, {
      ...none,
      layer: 'event',
      from: '2030-01-01',
      to: '2030-12-31',
    });
    expect(out.map(r => r.name)).toEqual(['Undated fest']);
  });
  it('reports missing category coverage distinctly from a filter with no matches', () => {
    expect(emptyReason(recs, { ...none, layer: 'product' })).toBe(
      'BetterAklan has no local products records yet.'
    );
    expect(emptyReason(recs, { ...none, q: 'zzz' })).toBe(
      'No records match these filters.'
    );
  });
});

describe('teaser', () => {
  it('keeps the first sentence only', () => {
    expect(teaser('White sand beach. Busy in summer.')).toBe(
      'White sand beach.'
    );
  });

  it('does not split on a decimal or an abbreviation without a space', () => {
    expect(teaser('Open 8.30am daily. Free entry.')).toBe('Open 8.30am daily.');
  });

  it('does not end a sentence at an initial, and tidies whitespace', () => {
    expect(teaser('  0808 M. Laserna St,\n Kalibo ')).toBe(
      '0808 M. Laserna St, Kalibo'
    );
  });
});

describe('densityTier', () => {
  it('is 0 without records and 5 at the maximum', () => {
    expect(densityTier(0, 454)).toBe(0);
    expect(densityTier(454, 454)).toBe(5);
  });

  it('spreads mid-sized towns above the lowest tier', () => {
    expect(densityTier(47, 454)).toBe(4);
    expect(densityTier(5, 454)).toBe(2);
    expect(densityTier(1, 454)).toBe(1);
  });

  it('agrees with tierBounds for every count', () => {
    for (let n = 1; n <= 454; n++) {
      const [lo, hi] = tierBounds(densityTier(n, 454), 454);
      expect(n).toBeGreaterThanOrEqual(lo);
      expect(n).toBeLessThanOrEqual(hi);
    }
  });
});
