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
