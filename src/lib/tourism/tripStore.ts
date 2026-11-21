import { useCallback, useEffect, useState } from 'react';

import {
  addStop,
  MAX_STOPS,
  parseTripDays,
  removeStop,
  serializeTripDays,
  type TripDays,
} from './trip';

/**
 * My trip, remembered in this browser so town pages and Explore share it.
 * Explore's `trip=` URL stays the shareable form; this is only the local copy.
 * It holds days ("a,b|c"); a trip saved before days existed reads as Day 1.
 * Storage can be blocked or cleared, so every access is guarded.
 */
export const TRIP_KEY = 'betteraklan:trip';
const CHANGED = 'betteraklan:trip-changed';

export function readSavedDays(known: Set<string>): TripDays {
  try {
    return parseTripDays(localStorage.getItem(TRIP_KEY), known);
  } catch {
    return [];
  }
}

/** All saved stops in order, whatever their day. */
export const readSavedTrip = (known: Set<string>): string[] =>
  readSavedDays(known).flat();

export function saveTripDays(days: TripDays) {
  try {
    const value = serializeTripDays(days);
    if (value) localStorage.setItem(TRIP_KEY, value);
    else localStorage.removeItem(TRIP_KEY);
  } catch {
    // Storage blocked: the trip still works for this page view.
  }
  window.dispatchEvent(new Event(CHANGED));
}

/** Saves stops as a single day. */
export const saveTrip = (ids: string[]) => saveTripDays([ids]);

export type ToggleResult = 'added' | 'removed' | 'full';

/** The saved trip, kept in sync across tabs and components. */
export function useSavedTrip(known: Set<string>) {
  const [days, setDays] = useState(() => readSavedDays(known));
  useEffect(() => {
    const sync = () => setDays(readSavedDays(known));
    window.addEventListener('storage', sync);
    window.addEventListener(CHANGED, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(CHANGED, sync);
    };
  }, [known]);

  // Adding or removing keeps the trip's days: a new stop joins the last day.
  const toggle = useCallback(
    (id: string): ToggleResult => {
      const current = readSavedDays(known);
      if (current.some(d => d.includes(id))) {
        saveTripDays(removeStop(current, id));
        return 'removed';
      }
      if (current.flat().length >= MAX_STOPS) return 'full';
      saveTripDays(addStop(current, id));
      return 'added';
    },
    [known]
  );

  return { ids: days.flat(), days, toggle };
}
