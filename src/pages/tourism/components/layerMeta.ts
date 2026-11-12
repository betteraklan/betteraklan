import {
  BedDoubleIcon,
  CalendarDaysIcon,
  LandmarkIcon,
  ShoppingBasketIcon,
} from 'lucide-react';

import type { Layer } from '@/lib/tourism/explore';

type RecordLayer = Exclude<Layer, 'all'>;

export const LAYER_ICON = {
  place: LandmarkIcon,
  event: CalendarDaysIcon,
  stay: BedDoubleIcon,
  product: ShoppingBasketIcon,
} as const;

// Pin colours per layer. Approximate pins are drawn hollow with a dashed ring.
export const LAYER_COLOR: Record<RecordLayer, string> = {
  place: '#0f766e',
  event: '#b45309',
  stay: '#1d4ed8',
  product: '#6d28d9',
};
// Each layer has its own shape as well as colour, so type never relies on colour alone.
export type Shape = 'circle' | 'diamond' | 'square' | 'hexagon';
export const LAYER_SHAPE: Record<RecordLayer, Shape> = {
  place: 'circle',
  event: 'diamond',
  stay: 'square',
  product: 'hexagon',
};

/**
 * Vertices of a shape centred at (c, c) with "radius" r (circle → null).
 * Shared by the canvas pin icons and the SVG glyphs so both always match.
 */
export function shapePoints(
  shape: Shape,
  c: number,
  r: number
): [number, number][] | null {
  if (shape === 'circle') return null;
  if (shape === 'diamond')
    return [
      [c, c - r * 1.1],
      [c + r * 1.1, c],
      [c, c + r * 1.1],
      [c - r * 1.1, c],
    ];
  if (shape === 'square') {
    const h = r * 0.86;
    return [
      [c - h, c - h],
      [c + h, c - h],
      [c + h, c + h],
      [c - h, c + h],
    ];
  }
  return Array.from({ length: 6 }, (_, i) => {
    const a = ((60 * i - 90) * Math.PI) / 180;
    return [c + r * Math.cos(a), c + r * Math.sin(a)] as [number, number];
  });
}

// Aklan's 17 municipalities, alphabetical.
export const TOWN_SLUGS = [
  'altavas',
  'balete',
  'banga',
  'batan',
  'buruanga',
  'ibajay',
  'kalibo',
  'lezo',
  'libacao',
  'madalag',
  'makato',
  'malay',
  'malinao',
  'nabas',
  'new-washington',
  'numancia',
  'tangalan',
] as const;

/**
 * Hue per municipality: 17 evenly spaced hues, arranged so towns that share a
 * border are at least 85° apart (found by search over the boundary data's
 * shared edges; see layerMeta.test.ts).
 */
const TOWN_HUE: Record<string, number> = {
  altavas: 85,
  balete: 0,
  banga: 254,
  batan: 191,
  buruanga: 127,
  ibajay: 212,
  kalibo: 21,
  lezo: 169,
  libacao: 233,
  madalag: 148,
  makato: 64,
  malay: 296,
  malinao: 339,
  nabas: 42,
  'new-washington': 106,
  numancia: 275,
  tangalan: 318,
};

/** One colour per municipality, used on the map and on photo-less cards. */
export const TOWN_COLOR: Record<string, string> = Object.fromEntries(
  TOWN_SLUGS.map(slug => [slug, `hsl(${TOWN_HUE[slug]}, 58%, 44%)`])
);

/** A municipality's colour (or a neutral slate when unknown). */
export function townTint(slug: string | null): string {
  return (slug && TOWN_COLOR[slug]) || '#475569';
}
