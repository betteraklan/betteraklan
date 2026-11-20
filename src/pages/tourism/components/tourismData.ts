// Tourism records shared by Explore and the Towns grid, so both count the
// same records and shade them with the same ramp.
import {
  buildRecords,
  densityTier,
  type Rec,
  type Sources,
} from '@/lib/tourism/explore';
import type { BoundaryFeature } from '@/lib/tourism/geo';

import boundaryData from '@/data/geo/municipalities-boundaries.json';
import centroidData from '@/data/geo/municipality-centroids.json';
import accommodationsData from '@/data/tourism/accommodations.json';
import municipalitiesData from '@/data/tourism/municipalities.json';
import resortsData from '@/data/tourism/resorts.json';
import type { Accommodation, MunicipalityTourism } from '@/types/tourism';

export const SOURCES: Sources = {
  municipalities: municipalitiesData as MunicipalityTourism[],
  resorts: resortsData as Sources['resorts'],
  accommodations: accommodationsData as Accommodation[],
  centroids: centroidData as Sources['centroids'],
  boundaries: (boundaryData as { features: BoundaryFeature[] }).features,
};
export const ALL_RECORDS = buildRecords(SOURCES);

// Shading ramp for record counts: brighter means more BetterAklan records.
// Moved unchanged from explore.tsx; index 0 is "no records".
export const TIER_COLOR = [
  '#EEF3FB',
  '#D6E4FA',
  '#A9C7F5',
  '#6FA0EC',
  '#3B78DB',
  '#1D4FB0',
];

/** All records per municipality, as the unfiltered Explore map shades them. */
export function townCounts(): { counts: Map<string, number>; max: number } {
  const counts = new Map<string, number>();
  for (const r of ALL_RECORDS)
    if (r.town) counts.set(r.town, (counts.get(r.town) ?? 0) + 1);
  return { counts, max: Math.max(1, ...counts.values()) };
}

export const tierFor = (n: number, max: number) => densityTier(n, max);

/**
 * Up to `n` records of one layer, at most one per municipality, in record
 * order. BetterAklan has no popularity data, so this is a spread across
 * towns, not a ranking.
 */
export function pickSpread(
  recs: Rec[],
  layer: 'place' | 'event' | 'product',
  n = 6
): Rec[] {
  const towns = new Set<string>();
  const out: Rec[] = [];
  for (const r of recs) {
    if (r.layer !== layer || !r.town || towns.has(r.town)) continue;
    towns.add(r.town);
    out.push(r);
    if (out.length === n) break;
  }
  return out;
}

export const BY_ID = new Map(ALL_RECORDS.map(r => [r.id, r]));
export const KNOWN_IDS = new Set(BY_ID.keys());

/**
 * Every count the tourism pages show, computed from the JSON once here.
 * "Named" counts are the records a visitor can open; raw counts also include
 * the unnamed free-text paragraphs (which the pages show as text, not records).
 */
const MUNI = SOURCES.municipalities;
const named = (key: 'attractions' | 'festivals' | 'products') =>
  MUNI.reduce((n, m) => n + m[key].filter(e => e.name).length, 0);
const raw = (key: 'attractions' | 'festivals' | 'products') =>
  MUNI.reduce((n, m) => n + m[key].length, 0);

export const COUNTS = {
  towns: MUNI.length,
  spots: named('attractions'),
  spotsRaw: raw('attractions'),
  festivals: named('festivals'),
  festivalsRaw: raw('festivals'),
  products: named('products'),
  stays: SOURCES.accommodations.length,
  boracayStays: SOURCES.accommodations.filter(a => a.area === 'boracay').length,
  mainlandStays: SOURCES.accommodations.filter(a => a.area === 'mainland')
    .length,
  records: ALL_RECORDS.length,
} as const;
