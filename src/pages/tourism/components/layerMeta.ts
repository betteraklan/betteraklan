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

// Civic tints for photo-less cards, picked per municipality so each town keeps its colour.
const TINTS = [
  '#1D4FB0',
  '#0F766E',
  '#B45309',
  '#6D28D9',
  '#0E7490',
  '#BE123C',
  '#4D7C0F',
  '#9A3412',
];

/** Stable tint for a municipality slug (or a neutral slate when unknown). */
export function townTint(slug: string | null): string {
  if (!slug) return '#475569';
  let h = 0;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
}
