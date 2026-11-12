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

const DAY = new Intl.DateTimeFormat('en-PH', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Display form of recorded ISO dates: "Jan 10, 2027" or "Jan 10, 2027 – Jan 16, 2027". */
export function formatDateRange(start: string, end?: string): string {
  const a = DAY.format(new Date(`${start}T00:00:00Z`));
  return end && end !== start
    ? `${a} – ${DAY.format(new Date(`${end}T00:00:00Z`))}`
    : a;
}

export interface MonthCell {
  key: string; // 'YYYY-MM'
  label: string; // 'Jan'
  year: number;
  month: number; // 1–12
  from: string; // first day, ISO
  to: string; // last day, ISO
}

const MON = new Intl.DateTimeFormat('en-PH', {
  month: 'short',
  timeZone: 'UTC',
});
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** The next `count` months starting with the month of `today` (UTC dates). */
export function monthsFrom(today: Date, count = 12): MonthCell[] {
  return Array.from({ length: count }, (_, i) => {
    const first = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + i, 1)
    );
    const last = new Date(
      Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)
    );
    return {
      key: iso(first).slice(0, 7),
      label: MON.format(first),
      year: first.getUTCFullYear(),
      month: first.getUTCMonth() + 1,
      from: iso(first),
      to: iso(last),
    };
  });
}

interface Dated {
  dates?: { start?: string; end?: string };
  dateStatus: DateStatus;
}

/** Recorded (confirmed or tentative) dates that overlap [from, to]. Never inferred. */
export function overlaps(e: Dated, from: string, to: string): boolean {
  if (e.dateStatus === 'unavailable' || !e.dates?.start) return false;
  const end = e.dates.end ?? e.dates.start;
  return e.dates.start <= to && end >= from;
}

/**
 * Festivals with recorded dates, sorted into happening now, later this month,
 * and upcoming (after this month, within `aheadDays`). Undated ones are left out.
 */
export function festivalBuckets<T extends Dated>(
  events: T[],
  today: Date,
  aheadDays = 90
) {
  const t = iso(today);
  const [month] = monthsFrom(today, 1);
  const horizon = iso(new Date(today.getTime() + aheadDays * 86_400_000));
  const dayAfterMonth = iso(new Date(Date.UTC(month.year, month.month, 1)));
  const now = events.filter(e => overlaps(e, t, t));
  const thisMonth = events.filter(
    e => !now.includes(e) && overlaps(e, t, month.to) && e.dates!.start! > t
  );
  const upcoming = events.filter(
    e => overlaps(e, dayAfterMonth, horizon) && e.dates!.start! >= dayAfterMonth
  );
  const byStart = (a: T, b: T) =>
    a.dates!.start!.localeCompare(b.dates!.start!);
  return {
    now: now.sort(byStart),
    thisMonth: thisMonth.sort(byStart),
    upcoming: upcoming.sort(byStart),
  };
}
