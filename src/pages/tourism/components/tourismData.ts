// Tourism records shared by Explore and the Towns grid, so both count the
// same records and shade them with the same ramp.
import { buildRecords, densityTier, type Sources } from '@/lib/tourism/explore';
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
