import type { Layer } from '@/lib/tourism/explore';

import { LAYER_COLOR, LAYER_SHAPE, shapePoints } from './layerMeta';

/**
 * The layer's pin shape in its colour; `hollow` matches approximate or hidden
 * pins. `onDark` adds a white edge so dark layer colours stay visible on navy.
 */
export default function LayerGlyph({
  layer,
  hollow = false,
  size = 16,
  onDark = false,
}: {
  layer: Exclude<Layer, 'all'>;
  hollow?: boolean;
  size?: number;
  onDark?: boolean;
}) {
  const color = LAYER_COLOR[layer];
  const pts = shapePoints(LAYER_SHAPE[layer], 8, 6);
  const paint = {
    fill: hollow ? (onDark ? 'transparent' : '#ffffff') : color,
    stroke: onDark ? (hollow ? 'rgba(255,255,255,0.7)' : '#ffffff') : color,
    strokeWidth: 1.75,
    strokeDasharray: hollow ? '2.5 2' : undefined,
    strokeLinejoin: 'round' as const,
  };
  return (
    <svg
      aria-hidden='true'
      width={size}
      height={size}
      viewBox='0 0 16 16'
      className='shrink-0'
    >
      {pts ? (
        <polygon points={pts.map(p => p.join(',')).join(' ')} {...paint} />
      ) : (
        <circle cx={8} cy={8} r={6} {...paint} />
      )}
    </svg>
  );
}
