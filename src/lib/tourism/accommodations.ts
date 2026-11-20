// Facets for the accommodations list, derived at display time from the
// published name and address. accommodations.json is never edited, and a
// facet stays blank (null) whenever the text does not make it clear.

export type StayType =
  | 'resort'
  | 'hotel'
  | 'inn'
  | 'hostel'
  | 'villa'
  | 'guesthouse'
  | 'apartment'
  | 'lodge';

export const TYPE_LABEL: Record<StayType, string> = {
  resort: 'Resort',
  hotel: 'Hotel',
  inn: 'Inn',
  hostel: 'Hostel',
  villa: 'Villa',
  guesthouse: 'Guesthouse or pension',
  apartment: 'Apartment or condo',
  lodge: 'Lodge or cottages',
};

// One keyword pattern per type, matched on whole words in the name.
const TYPE_WORDS: [StayType, RegExp][] = [
  ['resort', /\bresorts?\b/],
  ['hotel', /\bhotels?\b/],
  ['inn', /\binns?\b/],
  ['hostel', /\bhostels?\b/],
  ['villa', /\bvillas?\b/],
  [
    'guesthouse',
    /\b(guest ?houses?|pension+e?( houses?)?|bed and breakfast|homestay)\b/,
  ],
  ['apartment', /\b(apartelles?|apartments?|condotels?|condominiums?|condo)\b/],
  ['lodge', /\b(lodges?|cottages?)\b/],
];

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ');

/**
 * The accommodation type, only when the name says exactly one. A name that
 * says two ("Resort Hotel", "Villa Resort") or none ("Aqua Boracay") is blank.
 */
export function deriveType(name: string): StayType | null {
  const n = words(name);
  const hits = TYPE_WORDS.filter(([, re]) => re.test(n)).map(([t]) => t);
  return hits.length === 1 ? hits[0] : null;
}

export type Station = 'Station 1' | 'Station 2' | 'Station 3';

/**
 * Boracay's White Beach station, only when the published address names
 * exactly one. Other areas of the island (Bulabog, Diniwid, Yapak…) are not
 * stations, so they stay blank rather than being guessed.
 */
export function deriveStation(address: string): Station | null {
  const found = new Set(
    [...address.matchAll(/\bstation\s*([123])\b/gi)].map(m => m[1])
  );
  return found.size === 1 ? (`Station ${[...found][0]}` as Station) : null;
}

/** A chip choice: one value, or 'none' for "not stated". Empty means no filter. */
export interface StayFilters {
  search: string;
  municipality: string;
  type: StayType | 'none' | '';
  station: Station | 'none' | '';
}

export const NO_FILTERS: StayFilters = {
  search: '',
  municipality: '',
  type: '',
  station: '',
};

export const hasFilters = (f: StayFilters) =>
  Object.values(f).some(v => v !== '');

interface StayLike {
  name: string;
  address: string;
  municipality: string | null;
}

/** Whether a stay passes the filters; `skip` leaves one chip group out (for facet counts). */
export function matchesStay(
  a: StayLike,
  f: StayFilters,
  skip?: 'type' | 'station'
): boolean {
  if (f.search && !a.name.toLowerCase().includes(f.search.toLowerCase()))
    return false;
  if (f.municipality && a.municipality !== f.municipality) return false;
  if (skip !== 'type' && f.type) {
    const t = deriveType(a.name);
    if (f.type === 'none' ? t !== null : t !== f.type) return false;
  }
  if (skip !== 'station' && f.station) {
    const s = deriveStation(a.address);
    if (f.station === 'none' ? s !== null : s !== f.station) return false;
  }
  return true;
}

/**
 * How many stays each chip would show given the other filters, so a count
 * never promises more than the chip delivers.
 */
export function facetCounts(items: StayLike[], f: StayFilters) {
  const type = new Map<StayType | 'none', number>();
  const station = new Map<Station | 'none', number>();
  for (const a of items) {
    if (matchesStay(a, f, 'type')) {
      const t = deriveType(a.name) ?? 'none';
      type.set(t, (type.get(t) ?? 0) + 1);
    }
    if (matchesStay(a, f, 'station')) {
      const s = deriveStation(a.address) ?? 'none';
      station.set(s, (station.get(s) ?? 0) + 1);
    }
  }
  return { type, station };
}

/**
 * Many published addresses only say "Station 1, Brgy. Balabag", so
 * geocoding puts dozens of establishments on one point. They share one pin
 * that lists them all, rather than being fanned out into fake positions.
 */
export interface StayGroup<T extends { lat: number; lon: number }> {
  id: string;
  lat: number;
  lon: number;
  items: T[];
}

export function groupStays<T extends { lat: number; lon: number }>(
  points: T[]
): StayGroup<T>[] {
  const groups = new Map<string, StayGroup<T>>();
  for (const p of points) {
    const key = `${p.lat},${p.lon}`;
    const g = groups.get(key);
    if (g) g.items.push(p);
    else
      groups.set(key, {
        id: `here:${key}`,
        lat: p.lat,
        lon: p.lon,
        items: [p],
      });
  }
  return [...groups.values()];
}

/** [[west, south], [east, north]] around the points, padded; null when empty. */
export function boundsOfPoints(
  points: { lat: number; lon: number }[],
  pad = 0.005
): [[number, number], [number, number]] | null {
  if (points.length === 0) return null;
  const lons = points.map(p => p.lon);
  const lats = points.map(p => p.lat);
  return [
    [Math.min(...lons) - pad, Math.min(...lats) - pad],
    [Math.max(...lons) + pad, Math.max(...lats) + pad],
  ];
}

export function googleMapsUrl(lat: number, lon: number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
}

/**
 * What a pin's precision means to a visitor. "failed" has no pin at all.
 * Barangay and municipality pins sit at that area's centre, not at the
 * establishment.
 */
export function pinLabel(
  precision: 'exact' | 'barangay' | 'municipality' | 'failed'
): { text: string; approximate: boolean } | null {
  switch (precision) {
    case 'exact':
      return { text: 'Exact pin', approximate: false };
    case 'barangay':
      return { text: 'Approximate pin · barangay centre', approximate: true };
    case 'municipality':
      return {
        text: 'Approximate pin · municipality centre',
        approximate: true,
      };
    default:
      return null;
  }
}

/** Google Maps directions to a coordinate (the visitor picks the start). */
export function directionsUrl(lat: number, lon: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
}

/** Rows shown at first, and added by each "Load more". */
export const LOAD_STEP = 20;
