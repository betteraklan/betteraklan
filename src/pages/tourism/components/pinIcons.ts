import type { Map as MLMap } from 'maplibre-gl';

import type { Layer } from '@/lib/tourism/explore';

import { LAYER_COLOR, LAYER_SHAPE, shapePoints } from './layerMeta';

const SIZE = 32; // CSS px; drawn at 2x for sharp edges
const PR = 2;

function draw(layer: Exclude<Layer, 'all'>, approximate: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE * PR;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(PR, PR);
  const color = LAYER_COLOR[layer];
  const c = SIZE / 2;
  const r = 9;
  ctx.beginPath();
  const pts = shapePoints(LAYER_SHAPE[layer], c, r);
  if (pts) {
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  } else ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.lineJoin = 'round';

  // Soft drop shadow under the fill only, so the outline stays crisp.
  ctx.save();
  ctx.shadowColor = approximate ? 'rgba(15,35,75,0.18)' : 'rgba(15,35,75,0.35)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 1.5;
  ctx.fillStyle = approximate ? 'rgba(255,255,255,0.92)' : color;
  ctx.fill();
  ctx.restore();

  // Exact: solid with a white edge. Approximate: hollow with a dashed coloured edge.
  ctx.lineWidth = 2;
  ctx.strokeStyle = approximate ? color : '#ffffff';
  if (approximate) ctx.setLineDash([3, 2.5]);
  ctx.stroke();
  return ctx.getImageData(0, 0, SIZE * PR, SIZE * PR);
}

/** Registers `pin-<layer>` and `pin-<layer>-approx` images on the map. */
export function addPinIcons(map: MLMap) {
  for (const layer of Object.keys(LAYER_SHAPE) as Exclude<Layer, 'all'>[])
    for (const approximate of [false, true]) {
      const id = `pin-${layer}${approximate ? '-approx' : ''}`;
      if (!map.hasImage(id))
        map.addImage(id, draw(layer, approximate), { pixelRatio: PR });
    }
}
