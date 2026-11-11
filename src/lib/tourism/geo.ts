export type Ring = number[][]; // [lon, lat] pairs, GeoJSON order
export type Polygonal =
  | { type: 'Polygon'; coordinates: Ring[] }
  | { type: 'MultiPolygon'; coordinates: Ring[][] };

export interface BoundaryFeature {
  properties: { slug: string; name: string };
  geometry: Polygonal;
}

/** Even-odd ray casting on one ring. Points on an edge are not guaranteed either way. */
function inRing(lon: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function inPolygon(lon: number, lat: number, rings: Ring[]): boolean {
  // First ring is the outer boundary; later rings are holes.
  if (!inRing(lon, lat, rings[0])) return false;
  return !rings.slice(1).some(hole => inRing(lon, lat, hole));
}

/** Returns the slug of the municipality whose boundary contains the point, or null. */
export function findMunicipalityAt(
  lat: number,
  lon: number,
  features: BoundaryFeature[]
): string | null {
  for (const f of features) {
    const g = f.geometry;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    if (polys.some(rings => inPolygon(lon, lat, rings)))
      return f.properties.slug;
  }
  return null;
}
