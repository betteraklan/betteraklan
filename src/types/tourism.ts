/** Date status for a dated entry. Missing `dates` means `unavailable`. */
export type DateStatus = 'confirmed' | 'tentative' | 'unavailable';

/** Event dates are ISO `YYYY-MM-DD`. Source publication, review, and event dates stay distinct. */
export interface TourismDates {
  status: DateStatus;
  start?: string;
  end?: string;
  sourceUrl?: string;
  sourcePublishedAt?: string;
  lastCheckedAt?: string;
}

export interface TourismEntry {
  name: string | null;
  description: string;
  dates?: TourismDates;
}

export interface Advisory {
  id: string;
  kind: 'closure' | 'access' | 'event';
  title: string;
  summary: string;
  affects: { municipality?: string; place?: string };
  issuer: string;
  sourceUrl: string;
  publishedAt: string;
  endsAt?: string;
}

export interface MunicipalityTourism {
  slug: string;
  name: string;
  festivals: TourismEntry[];
  attractions: TourismEntry[];
  products: TourismEntry[];
}

export interface FeaturedAttraction {
  id: number;
  name: string;
  found: boolean;
  address: string;
  latitude: number;
  longitude: number;
  google_maps_link: string;
  notes: string;
  searched: boolean;
}

// Source: aklan.gov.ph's "Authorized Accommodation Establishments" listings
// (mainland + Boracay). Only name/address are published; lat/lon are
// generated once via scripts/data-prep/geocode-accommodations.py (Nominatim),
// with `geocodePrecision` recording how precise that placement is since
// informal PH addresses don't always resolve exactly.
export type GeocodePrecision = 'exact' | 'barangay' | 'municipality' | 'failed';

export interface Accommodation {
  name: string;
  address: string;
  area: 'mainland' | 'boracay';
  municipality: string | null;
  lat: number | null;
  lon: number | null;
  geocodePrecision: GeocodePrecision;
}
