import type { AirportSchedule } from '@/types/flights';

/** Today's date in the Philippines, as YYYY-MM-DD. */
export function manilaDate(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export interface TodayCounts {
  departures: number;
  arrivals: number;
}

/**
 * Flights listed for today at one airport. The schedule's local times are
 * already the airport's own ("2026-11-21 08:30+08:00"), so the date is the
 * first ten characters. A flight with no time is not counted.
 */
export function todaysFlights(
  schedule: Pick<AirportSchedule, 'flights'>,
  now: Date
): TodayCounts {
  const today = manilaDate(now);
  let departures = 0;
  let arrivals = 0;
  for (const f of schedule.flights) {
    if (!f.scheduledLocal || f.scheduledLocal.slice(0, 10) !== today) continue;
    if (f.direction === 'departure') departures += 1;
    else arrivals += 1;
  }
  return { departures, arrivals };
}

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

/**
 * "Today: KLO 3 departures, 2 arrivals". Null when nothing is listed, so a
 * quiet gap in the data never reads as "no flights".
 */
export function flightsLine(iata: string, c: TodayCounts): string | null {
  if (c.departures === 0 && c.arrivals === 0) return null;
  return `Today: ${iata} ${plural(c.departures, 'departure', 'departures')}, ${plural(c.arrivals, 'arrival', 'arrivals')}`;
}

/** The existing Aklan emergency hotlines page, for a city. */
export function hotlinesUrl(city: string, province = 'Aklan') {
  return `https://hotlines.bettergov.ph/?city=${encodeURIComponent(city)}&province=${encodeURIComponent(province)}`;
}

/** A website value from the directory as a link, or null when there is none. */
export function websiteUrl(value: string | null | undefined): string | null {
  const v = value?.trim();
  if (!v) return null;
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}
