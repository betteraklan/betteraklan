import type { Layer } from '@/lib/tourism/explore';

import { LAYER_COLOR, LAYER_SHAPE, shapePoints } from './layerMeta';

/** The layer's pin shape in its colour; `hollow` matches approximate or hidden pins. */
export default function LayerGlyph({
  layer,
  hollow = false,
  size = 16,
}: {
  layer: Exclude<Layer, 'all'>;
  hollow?: boolean;
  size?: number;
}) {
  const color = LAYER_COLOR[layer];
  const pts = shapePoints(LAYER_SHAPE[layer], 8, 6);
  const paint = {
    fill: hollow ? '#ffffff' : color,
    stroke: color,
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
