/** Most stops a shared trip link keeps (keeps URLs short). */
export const MAX_STOPS = 20;

/**
 * Trip stops from the `trip` URL value ("id1,id2"): known ids only, no
 * duplicates, in order, at most MAX_STOPS. Unknown ids (e.g. from an older
 * link) are dropped rather than guessed.
 */
export function parseTrip(value: string | null, known: Set<string>): string[] {
  // All stops in order, whatever day they are on (see parseTripDays).
  return parseTripDays(value, known).flat();
}

export const serializeTrip = (ids: string[]) => ids.join(',');

/** Great-circle distance in km. */
export function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number }
): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Straight-line length of a route through the points in order, in km. */
export function routeKm(points: { lat: number; lon: number }[]): number {
  let km = 0;
  for (let i = 1; i < points.length; i++)
    km += haversineKm(points[i - 1], points[i]);
  return km;
}

/** Move the item at `from` one place up (-1) or down (+1). */
export function moveStop(ids: string[], from: number, dir: -1 | 1): string[] {
  const to = from + dir;
  if (to < 0 || to >= ids.length) return ids;
  const next = [...ids];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

// ---- Trip days ----------------------------------------------------------
// A trip is a list of days, each a list of stops. In a link or in storage the
// days are joined by "|" ("a,b|c"); a value without "|" (every trip saved or
// shared before days existed) reads as a single day.

/** Days of stops, Day 1 first. Never holds an empty day. */
export type TripDays = string[][];
export const DAY_SEP = '|';

/** Days from a `trip` value: known ids only, each once, at most MAX_STOPS in all. */
export function parseTripDays(
  value: string | null,
  known: Set<string>
): TripDays {
  if (!value) return [];
  const seen = new Set<string>();
  const days: TripDays = [];
  for (const part of value.split(DAY_SEP)) {
    const day: string[] = [];
    for (const id of part.split(',')) {
      const t = id.trim();
      if (seen.size === MAX_STOPS) break;
      if (t && known.has(t) && !seen.has(t)) {
        seen.add(t);
        day.push(t);
      }
    }
    if (day.length) days.push(day);
  }
  return days;
}

/** The `trip` value for days; a one-day trip is the same as before days existed. */
export const serializeTripDays = (days: TripDays) =>
  days
    .filter(d => d.length)
    .map(d => d.join(','))
    .join(DAY_SEP);

const tidy = (days: TripDays): TripDays => days.filter(d => d.length);

/** Adds a stop to the end of the last day. */
export const addStop = (days: TripDays, id: string): TripDays =>
  days.length ? [...days.slice(0, -1), [...days[days.length - 1], id]] : [[id]];

export const removeStop = (days: TripDays, id: string): TripDays =>
  tidy(days.map(d => d.filter(x => x !== id)));

/**
 * Moves the stop at `index` (counted across all days) one place up or down.
 * At the edge of a day it crosses into the next or previous day instead.
 */
export function moveStopInDays(
  days: TripDays,
  index: number,
  dir: -1 | 1
): TripDays {
  const flat = days.flatMap((d, day) => d.map(id => ({ id, day })));
  const to = index + dir;
  if (index < 0 || index >= flat.length) return days;
  if (to < 0 || to >= flat.length) {
    // First stop moving up / last stop moving down: nothing beyond it.
    return days;
  }
  if (flat[to].day === flat[index].day)
    [flat[index], flat[to]] = [flat[to], flat[index]];
  else flat[index] = { ...flat[index], day: flat[to].day };
  const out: TripDays = days.map(() => []);
  for (const s of flat) out[s.day].push(s.id);
  return tidy(out);
}

/** Puts a stop at the end of day `day` (0-based); `days.length` starts a new day. */
export function setStopDay(days: TripDays, id: string, day: number): TripDays {
  const without = days.map(d => d.filter(x => x !== id));
  if (day >= without.length) return tidy([...without, [id]]);
  without[day] = [...without[day], id];
  return tidy(without);
}
