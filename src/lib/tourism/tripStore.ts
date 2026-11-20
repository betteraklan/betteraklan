import { useCallback, useEffect, useState } from 'react';

import { MAX_STOPS, parseTrip, serializeTrip } from './trip';

/**
 * My trip, remembered in this browser so town pages and Explore share it.
 * Explore's `trip=` URL stays the shareable form; this is only the local copy.
 * Storage can be blocked or cleared, so every access is guarded.
 */
export const TRIP_KEY = 'betteraklan:trip';
const CHANGED = 'betteraklan:trip-changed';

export function readSavedTrip(known: Set<string>): string[] {
  try {
    return parseTrip(localStorage.getItem(TRIP_KEY), known);
  } catch {
    return [];
  }
}

export function saveTrip(ids: string[]) {
  try {
    if (ids.length) localStorage.setItem(TRIP_KEY, serializeTrip(ids));
    else localStorage.removeItem(TRIP_KEY);
  } catch {
    // Storage blocked: the trip still works for this page view.
  }
  window.dispatchEvent(new Event(CHANGED));
}

export type ToggleResult = 'added' | 'removed' | 'full';

/** The saved trip, kept in sync across tabs and components. */
export function useSavedTrip(known: Set<string>) {
  const [ids, setIds] = useState(() => readSavedTrip(known));
  useEffect(() => {
    const sync = () => setIds(readSavedTrip(known));
    window.addEventListener('storage', sync);
    window.addEventListener(CHANGED, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(CHANGED, sync);
    };
  }, [known]);

  const toggle = useCallback(
    (id: string): ToggleResult => {
      const current = readSavedTrip(known);
      if (current.includes(id)) {
        saveTrip(current.filter(x => x !== id));
        return 'removed';
      }
      if (current.length >= MAX_STOPS) return 'full';
      saveTrip([...current, id]);
      return 'added';
    },
    [known]
  );

  return { ids, toggle };
}
