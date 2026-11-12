/** A decorative colour wash over the map for the time of day in Aklan. */
export interface SkyWash {
  phase: 'dawn' | 'day' | 'golden' | 'sunset' | 'night';
  color: string;
  /** Kept low so pins, labels and boundaries stay legible. */
  opacity: number;
}

/** Hour of day (0–24, with minutes as a fraction) in Aklan, whatever the viewer's clock. */
export function aklanHour(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Asia/Manila',
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value ?? 0);
  return get('hour') + get('minute') / 60;
}

/**
 * Boracay faces west, so sunset (about 5:30–7 pm) gets the warmest wash.
 * Daytime has no wash at all.
 */
export function skyWash(hour: number): SkyWash {
  if (hour >= 5 && hour < 7)
    return { phase: 'dawn', color: '#ffb38a', opacity: 0.1 };
  if (hour >= 7 && hour < 16)
    return { phase: 'day', color: '#ffffff', opacity: 0 };
  if (hour >= 16 && hour < 17.5)
    return { phase: 'golden', color: '#ffb347', opacity: 0.1 };
  if (hour >= 17.5 && hour < 19)
    return { phase: 'sunset', color: '#ff7e5f', opacity: 0.16 };
  return { phase: 'night', color: '#1a2a6c', opacity: 0.16 };
}
