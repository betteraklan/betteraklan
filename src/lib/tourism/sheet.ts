export type Snap = 'peek' | 'half' | 'full';
export const SNAP_ORDER: Snap[] = ['peek', 'half', 'full'];

/** px/ms; a release faster than this moves one snap in the drag direction. */
const FLICK = 0.45;
/** How far ahead (ms) a slow release is projected before picking the nearest snap. */
const PROJECT_MS = 150;

/**
 * Damped overshoot past an edge (iOS-style rubber band): grows ever slower and
 * never exceeds `limit`.
 */
export function rubberBand(overshoot: number, limit = 160): number {
  if (overshoot <= 0) return 0;
  const c = 0.55;
  return (limit * overshoot * c) / (limit + overshoot * c);
}

/**
 * Snap to settle on after a drag ends. `visible` is the sheet's visible height
 * in px, `velocity` is px/ms with upward (growing) positive.
 */
export function pickSnap(
  visible: number,
  velocity: number,
  heights: Record<Snap, number>
): Snap {
  if (Math.abs(velocity) > FLICK) {
    const ahead = SNAP_ORDER.filter(s =>
      velocity > 0 ? heights[s] > visible + 1 : heights[s] < visible - 1
    );
    if (ahead.length) return velocity > 0 ? ahead[0] : ahead[ahead.length - 1];
    return velocity > 0 ? 'full' : 'peek';
  }
  const projected = visible + velocity * PROJECT_MS;
  return SNAP_ORDER.reduce((best, s) =>
    Math.abs(heights[s] - projected) < Math.abs(heights[best] - projected)
      ? s
      : best
  );
}
