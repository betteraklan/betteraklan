import { useCallback, useState } from 'react';

const KEY = 'betteraklan:saved-records';

function read(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return new Set(
      Array.isArray(raw) ? raw.filter(x => typeof x === 'string') : []
    );
  } catch {
    return new Set();
  }
}

/**
 * Records this viewer has bookmarked. Kept in this browser only (a personal
 * convenience, not shared); works without storage, just without memory.
 */
export function useSaved() {
  const [saved, setSaved] = useState(read);
  const toggle = useCallback((id: string) => {
    setSaved(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(KEY, JSON.stringify([...next]));
      } catch {
        // Storage blocked: keep the in-memory state only.
      }
      return next;
    });
  }, []);
  return { saved, toggle };
}
