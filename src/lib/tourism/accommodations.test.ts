import { describe, expect, it } from 'vitest';

import accommodations from '@/data/tourism/accommodations.json';

import {
  boundsOfPoints,
  deriveStation,
  directionsUrl,
  pinLabel,
  deriveType,
  facetCounts,
  groupStays,
  hasFilters,
  matchesStay,
  NO_FILTERS,
  TYPE_LABEL,
} from './accommodations';

describe('deriveType', () => {
  it.each([
    ['Henann Garden Resort', 'resort'],
    ['Boracay Beach HOTEL', 'hotel'],
    ['Hue Hotels', 'hotel'],
    ['Turtle Cove Inn', 'inn'],
    ['Station Zero Hostel', 'hostel'],
    ['Casa Pilar Beach Villas', 'villa'],
    ['AIRPORTLINE PENSIONE HOUSE', 'guesthouse'],
    ['PAIERUS PENSIONNE', 'guesthouse'],
    ['Sea View Guest House', 'guesthouse'],
    ['Sunset Guesthouse', 'guesthouse'],
    ['Bamboo Homestay', 'guesthouse'],
    ['Blue Apartelle', 'apartment'],
    ['Bay Condotel', 'apartment'],
    ['Palm Cottages', 'lodge'],
    ['Nigi Nigi Lodge', 'lodge'],
  ])('%s is %s', (name, type) => {
    expect(deriveType(name)).toBe(type);
  });

  it('stays blank when the name says two types', () => {
    expect(deriveType('ECL Resort Hotel')).toBeNull();
    expect(deriveType('Diniview Villa Resort')).toBeNull();
    expect(deriveType('Canyon Hotels & Resorts – Boracay')).toBeNull();
  });

  it('stays blank when the name says none', () => {
    expect(deriveType('Aqua Boracay')).toBeNull();
    expect(deriveType('Boracay Coco Huts')).toBeNull();
    expect(deriveType('')).toBeNull();
  });

  it('matches whole words only', () => {
    expect(deriveType('Innovation Place')).toBeNull();
    expect(deriveType('Hotelier Row')).toBeNull();
  });

  it('has a label for every type it can return', () => {
    const seen = new Set(
      (accommodations as { name: string }[])
        .map(a => deriveType(a.name))
        .filter(Boolean)
    );
    for (const t of seen) expect(TYPE_LABEL[t!]).toBeTruthy();
  });
});

describe('deriveStation', () => {
  it.each([
    ['Station 1, Brgy. Balabag, Malay, Aklan', 'Station 1'],
    ['Boracay Station 2 Beachfront, Balabag', 'Station 2'],
    ['STATION3, Brgy. Balabag, Malay, Aklan', 'Station 3'],
    ['Station 2 & Station 2 Road, Balabag', 'Station 2'],
  ])('%s is %s', (address, station) => {
    expect(deriveStation(address)).toBe(station);
  });

  it('stays blank for other parts of the island', () => {
    expect(
      deriveStation('Sitio Bolabog, Brgy. Balabag, Malay, Aklan')
    ).toBeNull();
    expect(deriveStation('Diniwid, Brgy. Balabag, Malay, Aklan')).toBeNull();
    expect(deriveStation('Sitio Hagdan, Brgy. Yapak, Malay, Aklan')).toBeNull();
  });

  it('stays blank when the address names two stations', () => {
    expect(
      deriveStation('Between Station 1 and Station 2, Balabag')
    ).toBeNull();
  });

  it('ignores a station number that is not 1, 2 or 3', () => {
    expect(deriveStation('Station 4, Balabag')).toBeNull();
  });
});

describe('accommodations.json is not edited', () => {
  it('still has only its published fields', () => {
    for (const a of accommodations as Record<string, unknown>[])
      expect(Object.keys(a).sort()).toEqual([
        'address',
        'area',
        'geocodePrecision',
        'lat',
        'lon',
        'municipality',
        'name',
      ]);
  });

  it('every derived station comes from an explicit "Station N" in the address', () => {
    for (const a of accommodations as { address: string; area: string }[]) {
      const s = deriveStation(a.address);
      if (s) expect(a.address).toMatch(/station\s*[123]/i);
    }
  });
});

const stays = [
  {
    name: 'Alpha Resort',
    address: 'Station 1, Balabag',
    municipality: 'Malay',
  },
  { name: 'Beta Hotel', address: 'Station 2, Balabag', municipality: 'Malay' },
  { name: 'Gamma Inn', address: 'Station 2, Balabag', municipality: 'Malay' },
  {
    name: 'Delta Boracay',
    address: 'Sitio Bolabog, Balabag',
    municipality: 'Malay',
  },
  {
    name: 'Kalibo Pension House',
    address: 'Poblacion',
    municipality: 'Kalibo',
  },
];

describe('matchesStay', () => {
  it('passes everything with no filters', () => {
    expect(stays.every(s => matchesStay(s, NO_FILTERS))).toBe(true);
    expect(hasFilters(NO_FILTERS)).toBe(false);
  });

  it('combines search, municipality, type and station', () => {
    const f = {
      ...NO_FILTERS,
      municipality: 'Malay',
      station: 'Station 2' as const,
    };
    expect(stays.filter(s => matchesStay(s, f)).map(s => s.name)).toEqual([
      'Beta Hotel',
      'Gamma Inn',
    ]);
    const g = { ...f, type: 'inn' as const, search: 'gam' };
    expect(stays.filter(s => matchesStay(s, g)).map(s => s.name)).toEqual([
      'Gamma Inn',
    ]);
    expect(hasFilters(g)).toBe(true);
  });

  it('"none" finds the stays whose facet is blank', () => {
    const t = { ...NO_FILTERS, type: 'none' as const };
    expect(stays.filter(s => matchesStay(s, t)).map(s => s.name)).toEqual([
      'Delta Boracay',
    ]);
    const s = { ...NO_FILTERS, station: 'none' as const };
    expect(stays.filter(x => matchesStay(x, s)).map(x => x.name)).toEqual([
      'Delta Boracay',
      'Kalibo Pension House',
    ]);
  });
});

describe('facetCounts', () => {
  it('counts each chip against the other filters, not its own group', () => {
    const f = {
      ...NO_FILTERS,
      station: 'Station 2' as const,
      type: 'hotel' as const,
    };
    const c = facetCounts(stays, f);
    // Type counts respect the station filter but not the type filter.
    expect(c.type.get('hotel')).toBe(1);
    expect(c.type.get('inn')).toBe(1);
    expect(c.type.get('resort')).toBeUndefined();
    // Station counts respect the type filter but not the station filter.
    expect(c.station.get('Station 2')).toBe(1);
    expect(c.station.get('Station 1')).toBeUndefined();
  });

  it('counts blanks as "none"', () => {
    const c = facetCounts(stays, NO_FILTERS);
    expect(c.type.get('none')).toBe(1);
    expect(c.station.get('none')).toBe(2);
    expect([...c.type.values()].reduce((a, b) => a + b, 0)).toBe(stays.length);
  });
});

describe('groupStays', () => {
  it('puts stays sharing one coordinate on one pin, keeping order', () => {
    const pts = [
      { name: 'A', lat: 11.96, lon: 121.92 },
      { name: 'B', lat: 11.97, lon: 121.93 },
      { name: 'C', lat: 11.96, lon: 121.92 },
    ];
    const g = groupStays(pts);
    expect(g).toHaveLength(2);
    expect(g[0].items.map(p => p.name)).toEqual(['A', 'C']);
    expect(g[0].id).toBe('here:11.96,121.92');
    expect(g[1].items.map(p => p.name)).toEqual(['B']);
  });

  it('every Boracay stay with a location lands in exactly one group', () => {
    const pts = (
      accommodations as {
        area: string;
        lat: number | null;
        lon: number | null;
      }[]
    ).filter(
      (a): a is { area: string; lat: number; lon: number } =>
        a.area === 'boracay' && a.lat != null && a.lon != null
    );
    const g = groupStays(pts);
    expect(g.reduce((n, x) => n + x.items.length, 0)).toBe(pts.length);
    expect(new Set(g.map(x => x.id)).size).toBe(g.length);
  });
});

describe('boundsOfPoints', () => {
  it('pads the extent and is null for no points', () => {
    expect(boundsOfPoints([])).toBeNull();
    expect(
      boundsOfPoints(
        [
          { lat: 1, lon: 2 },
          { lat: 3, lon: 4 },
        ],
        0.5
      )
    ).toEqual([
      [1.5, 0.5],
      [4.5, 3.5],
    ]);
  });
});

describe('pinLabel', () => {
  it('names each precision in plain words', () => {
    expect(pinLabel('exact')).toEqual({
      text: 'Exact pin',
      approximate: false,
    });
    expect(pinLabel('barangay')).toEqual({
      text: 'Approximate pin · barangay centre',
      approximate: true,
    });
    expect(pinLabel('municipality')?.text).toBe(
      'Approximate pin · municipality centre'
    );
    expect(pinLabel('failed')).toBeNull();
  });

  it('covers every precision in the data', () => {
    const seen = new Set(
      (accommodations as { geocodePrecision: string }[]).map(
        a => a.geocodePrecision
      )
    );
    for (const p of seen)
      expect(['exact', 'barangay', 'municipality', 'failed']).toContain(p);
  });
});

describe('directionsUrl', () => {
  it('routes to the coordinate', () => {
    expect(directionsUrl(11.95, 121.93)).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=11.95,121.93'
    );
  });
});
