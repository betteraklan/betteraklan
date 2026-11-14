/**
 * Time-window rules for tourism advisories, shared by the API (functions/)
 * and the admin page so both agree on when an advisory is live.
 *
 * A date-only start begins at 00:00 Philippine time; a date-only end lasts
 * through the end of that day ("until 20 Nov" includes 20 Nov).
 */
import type { Advisory } from '../../types/tourism';

/** Philippine time; Aklan has no daylight saving. */
export const PH_OFFSET = '+08:00';
const DAY_MS = 24 * 60 * 60 * 1000;
export const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Start of an advisory in epoch ms (date-only = local midnight). */
export function startMs(value: string): number {
  return Date.parse(
    DATE_ONLY.test(value) ? `${value}T00:00:00${PH_OFFSET}` : value
  );
}

/** End of an advisory in epoch ms (date-only = end of that local day). */
export function endMs(value: string): number {
  return DATE_ONLY.test(value)
    ? Date.parse(`${value}T00:00:00${PH_OFFSET}`) + DAY_MS
    : Date.parse(value);
}

export type AdvisoryPhase = 'scheduled' | 'live' | 'ended';

/** Where `now` falls in the advisory's window (ignores the published flag). */
export function advisoryPhase(
  a: Pick<Advisory, 'publishedAt' | 'endsAt'>,
  now: number
): AdvisoryPhase | null {
  const start = startMs(a.publishedAt);
  if (Number.isNaN(start)) return null;
  if (start > now) return 'scheduled';
  if (!a.endsAt) return 'live';
  const end = endMs(a.endsAt);
  if (Number.isNaN(end)) return null;
  return end > now ? 'live' : 'ended';
}
