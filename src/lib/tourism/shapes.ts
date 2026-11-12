import type { BoundaryFeature } from './geo';

export interface TownShape {
  slug: string;
  name: string;
  /** SVG path in the projected viewBox. */
  d: string;
  /** Rough centre (bounding-box middle) in the same space. */
  cx: number;
  cy: number;
}

/**
 * Municipality boundaries as light SVG paths for small, static drawings (the
 * hero art and the mini-map). Flat projection with longitude scaled by
 * cos(latitude) so shapes keep their proportions; points closer than `step`
 * units are dropped to keep the DOM small.
 */
export function projectTowns(
  features: BoundaryFeature[],
  width = 1000,
  step = 2
): { viewBox: string; height: number; towns: TownShape[] } {
  const rings = (f: BoundaryFeature) =>
    f.geometry.type === 'Polygon'
      ? f.geometry.coordinates
      : f.geometry.coordinates.flat();
  const pts = features.flatMap(f => rings(f).flat());
  const lats = pts.map(p => p[1]);
  const lons = pts.map(p => p[0]);
  const minX = Math.min(...lons);
  const maxY = Math.max(...lats);
  const midLat = (Math.min(...lats) + maxY) / 2;
  const kx = Math.cos((midLat * Math.PI) / 180);
  const spanX = (Math.max(...lons) - minX) * kx;
  const scale = width / spanX;
  const height = Math.round((maxY - Math.min(...lats)) * scale);
  const px = ([lon, lat]: number[]): [number, number] => [
    (lon - minX) * kx * scale,
    (maxY - lat) * scale,
  ];

  const towns = features.map(f => {
    let x0 = Infinity,
      x1 = -Infinity,
      y0 = Infinity,
      y1 = -Infinity;
    const d = rings(f)
      .map(ring => {
        const kept: [number, number][] = [];
        for (const p of ring.map(px)) {
          const last = kept[kept.length - 1];
          if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) >= step)
            kept.push(p);
          x0 = Math.min(x0, p[0]);
          x1 = Math.max(x1, p[0]);
          y0 = Math.min(y0, p[1]);
          y1 = Math.max(y1, p[1]);
        }
        return (
          'M' +
          kept.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L') +
          'Z'
        );
      })
      .join('');
    return {
      slug: f.properties.slug,
      name: f.properties.name,
      d,
      cx: (x0 + x1) / 2,
      cy: (y0 + y1) / 2,
    };
  });
  return { viewBox: `0 0 ${width} ${height}`, height, towns };
}
