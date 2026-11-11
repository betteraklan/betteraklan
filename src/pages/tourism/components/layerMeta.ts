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
// Shown on pins and in the layer key so record type never relies on colour alone.
export const LAYER_LETTER: Record<RecordLayer, string> = {
  place: 'P',
  event: 'F',
  stay: 'A',
  product: 'L',
};

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
