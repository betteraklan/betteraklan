import advisoriesData from '@/data/tourism/advisories.json';
import type { Advisory } from '@/types/tourism';

export const advisories = advisoriesData as Advisory[];

/** Notices that affect a municipality or any place within it. */
export function advisoriesFor(municipalitySlug: string): Advisory[] {
  return advisories.filter(a => a.affects.municipality === municipalitySlug);
}
