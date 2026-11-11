import { filterByDateRange, getDateStatus } from './festivalDates';
import { findMunicipalityAt, type BoundaryFeature } from './geo';
import type {
  Accommodation,
  DateStatus,
  MunicipalityTourism,
  TourismDates,
  TourismImage,
} from '@/types/tourism';

export type Layer = 'all' | 'place' | 'event' | 'stay' | 'product';

export const LAYER_LABEL: Record<Exclude<Layer, 'all'>, string> = {
  place: 'Places',
  event: 'Festivals',
  stay: 'Accommodations',
  product: 'Local products',
};

/**
 * `exact`: coordinate from the dataset. `approximate`: placed at a municipality
 * centroid or area, not the record's own location. `none`: no location.
 */
export type Placement = 'exact' | 'approximate' | 'none';

export interface Rec {
  id: string;
  layer: Exclude<Layer, 'all'>;
  name: string;
  description: string;
  town: string | null; // municipality slug
  townName: string | null;
  lat: number | null;
  lon: number | null;
  placement: Placement;
  placementNote: string | null; // e.g. "Area pin", "Municipality centroid"
  dates?: TourismDates;
  dateStatus: DateStatus;
  sourceUrl?: string;
  image?: TourismImage;
}

export interface Centroid {
  slug: string;
  name: string;
  lat: number;
  lon: number;
}

export interface Sources {
  municipalities: MunicipalityTourism[];
  resorts: {
    name: string;
    found: boolean;
    latitude: number;
    longitude: number;
    notes: string;
  }[];
  accommodations: Accommodation[];
  centroids: Centroid[];
  boundaries: BoundaryFeature[];
}

export function slugOf(name: string) {
  return name.toLowerCase().trim().replace(/\s+/g, '-');
}

/** Builds one flat, searchable record list from the tourism datasets. */
export function buildRecords(s: Sources): Rec[] {
  const centroidBySlug = new Map(s.centroids.map(c => [c.slug, c]));
  const out: Rec[] = [];

  for (const m of s.municipalities) {
    const c = centroidBySlug.get(m.slug);
    // Nameless entries are free-text paragraphs, not records; they are not listed.
    const place = (
      layer: Rec['layer'],
      list: MunicipalityTourism['attractions'],
      prefix: string
    ) =>
      list.forEach((e, i) => {
        if (!e.name) return;
        out.push({
          id: `${prefix}-${m.slug}-${i}`,
          layer,
          name: e.name,
          description: e.description,
          town: m.slug,
          townName: m.name,
          lat: c?.lat ?? null,
          lon: c?.lon ?? null,
          placement: c ? 'approximate' : 'none',
          placementNote: c ? 'Municipality centroid' : null,
          dates: e.dates,
          dateStatus: getDateStatus(e),
          image: e.image,
        });
      });
    place('place', m.attractions, 'place');
    place('event', m.festivals, 'event');
    place('product', m.products, 'product');
  }

  s.resorts.forEach((r, i) => {
    const hasCoords =
      r.found && Number.isFinite(r.latitude) && Number.isFinite(r.longitude);
    const town = hasCoords
      ? findMunicipalityAt(r.latitude, r.longitude, s.boundaries)
      : null;
    const townName = town
      ? (s.municipalities.find(m => m.slug === town)?.name ?? null)
      : null;
    out.push({
      id: `resort-${i}`,
      layer: 'place',
      name: r.name,
      description: r.notes,
      town,
      townName,
      lat: hasCoords ? r.latitude : null,
      lon: hasCoords ? r.longitude : null,
      placement: hasCoords ? 'exact' : 'none',
      placementNote: null,
      dateStatus: 'unavailable',
    });
  });

  s.accommodations.forEach((a, i) => {
    const hasCoords = a.lat != null && a.lon != null;
    const town = a.municipality ? slugOf(a.municipality) : null;
    out.push({
      id: `stay-${i}`,
      layer: 'stay',
      name: a.name,
      description: a.address,
      town,
      townName: a.municipality,
      lat: a.lat,
      lon: a.lon,
      placement: !hasCoords
        ? 'none'
        : a.geocodePrecision === 'exact'
          ? 'exact'
          : 'approximate',
      placementNote:
        hasCoords && a.geocodePrecision !== 'exact'
          ? `${a.geocodePrecision} pin`
          : null,
      dateStatus: 'unavailable',
    });
  });

  return out;
}

export interface Filters {
  q: string;
  town: string;
  layer: Layer;
  from?: string;
  to?: string;
}

export function filterRecords(recs: Rec[], f: Filters): Rec[] {
  const q = f.q.trim().toLowerCase();
  const base = recs.filter(
    r =>
      (f.layer === 'all' || r.layer === f.layer) &&
      (!f.town || r.town === f.town) &&
      (!q ||
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q))
  );
  if (!f.from && !f.to) return base;
  // Date range applies to festivals; undated records remain visible.
  return base.filter(
    r =>
      r.layer !== 'event' ||
      filterByDateRange(
        [{ name: r.name, description: r.description, dates: r.dates }],
        f.from,
        f.to
      ).length > 0
  );
}

/** Explains an empty result: no data for the category vs. a filter that matched nothing. */
export function emptyReason(all: Rec[], f: Filters): string | null {
  const inLayer = all.filter(r => f.layer === 'all' || r.layer === f.layer);
  if (inLayer.length === 0) {
    return f.layer === 'all'
      ? 'BetterAklan has no records yet.'
      : `BetterAklan has no ${LAYER_LABEL[f.layer as Exclude<Layer, 'all'>].toLowerCase()} records yet.`;
  }
  const inTown = inLayer.filter(r => !f.town || r.town === f.town);
  if (inTown.length === 0) {
    return 'BetterAklan has no records for this category in the selected municipality.';
  }
  if (f.from || f.to) {
    const undated = inTown.filter(r => r.dateStatus === 'unavailable').length;
    return `No dated records fall in this range.${undated ? ` ${undated} record(s) have no recorded date and are shown below.` : ''}`;
  }
  return 'No records match these filters.';
}

/** One-line "why go" teaser: the description's first sentence. */
export function teaser(description: string): string {
  const text = description.replace(/\s+/g, ' ').trim();
  // A sentence ends at . ! or ? before a space, but not after an initial like "M.".
  const first = text.match(/^.+?(?<!\b[A-Z])[.!?](?=\s|$)/);
  return (first ? first[0] : text).trim();
}
