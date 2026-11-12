/** Most stops a shared trip link keeps (keeps URLs short). */
export const MAX_STOPS = 20;

/**
 * Trip stops from the `trip` URL value ("id1,id2"): known ids only, no
 * duplicates, in order, at most MAX_STOPS. Unknown ids (e.g. from an older
 * link) are dropped rather than guessed.
 */
export function parseTrip(value: string | null, known: Set<string>): string[] {
  if (!value) return [];
  const out: string[] = [];
  for (const id of value.split(',')) {
    const t = id.trim();
    if (t && known.has(t) && !out.includes(t)) out.push(t);
    if (out.length === MAX_STOPS) break;
  }
  return out;
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
