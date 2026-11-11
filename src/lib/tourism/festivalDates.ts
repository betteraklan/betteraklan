import type { DateStatus, TourismEntry } from '@/types/tourism';

/**
 * Resolves the public date status of an entry. Only explicitly recorded dates
 * count: a missing record, or a confirmed/tentative status without a start date,
 * is `unavailable`. Dates are never inferred from names or past editions.
 */
export function getDateStatus(entry: TourismEntry): DateStatus {
  const d = entry.dates;
  if (!d) return 'unavailable';
  if (d.status !== 'unavailable' && !d.start) return 'unavailable';
  return d.status;
}

/**
 * Keeps entries whose recorded dates overlap the range (ISO `YYYY-MM-DD`,
 * inclusive). Entries with unavailable dates are always kept, so a date filter
 * never hides records that have no recorded date.
 */
export function filterByDateRange(
  entries: TourismEntry[],
  from?: string,
  to?: string
): TourismEntry[] {
  if (!from && !to) return entries;
  return entries.filter(entry => {
    if (getDateStatus(entry) === 'unavailable') return true;
    const start = entry.dates!.start!;
    const end = entry.dates!.end ?? start;
    if (from && end < from) return false;
    if (to && start > to) return false;
    return true;
  });
}

export const DATE_STATUS_LABEL: Record<DateStatus, string> = {
  confirmed: 'Confirmed',
  tentative: 'Tentative',
  unavailable: 'Date not recorded',
};
