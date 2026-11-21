import { useEffect, useState } from 'react';

import advisoriesData from '@/data/tourism/advisories.json';
import type { Advisory } from '@/types/tourism';

import { advisoryPhase } from './advisoryWindow';

/** Bundled snapshot, used until the live list loads or when the API fails. */
export const fallbackAdvisories = advisoriesData as Advisory[];

/** Notices that affect a municipality or any place within it. */
export function advisoriesFor(
  municipalitySlug: string,
  list: Advisory[] = fallbackAdvisories
): Advisory[] {
  return list.filter(a => a.affects.municipality === municipalitySlug);
}

/**
 * Municipalities with at least one advisory live right now (published, not
 * scheduled for later, not ended). Empty when there are none.
 */
export function townsWithLiveNotices(
  towns: string[],
  list: Advisory[] = fallbackAdvisories,
  now: number = Date.now()
): Set<string> {
  return new Set(
    towns.filter(slug =>
      advisoriesFor(slug, list).some(a => advisoryPhase(a, now) === 'live')
    )
  );
}

const KINDS = new Set<Advisory['kind']>(['closure', 'access', 'event']);

function isAdvisory(value: unknown): value is Advisory {
  if (typeof value !== 'object' || value === null) return false;
  const a = value as Record<string, unknown>;
  return (
    typeof a.id === 'string' &&
    KINDS.has(a.kind as Advisory['kind']) &&
    typeof a.title === 'string' &&
    typeof a.issuer === 'string' &&
    typeof a.sourceUrl === 'string' &&
    typeof a.publishedAt === 'string' &&
    typeof a.affects === 'object' &&
    a.affects !== null
  );
}

/**
 * Fetch active advisories from the API. Throws when the API is unreachable or
 * returns something unexpected (e.g. the SPA's index.html under `vite dev`).
 */
export async function fetchAdvisories(
  signal?: AbortSignal
): Promise<Advisory[]> {
  const res = await fetch('/api/tourism/advisories', {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Advisories API returned ${res.status}`);
  const body: unknown = await res.json();
  const list = (body as { advisories?: unknown })?.advisories;
  if (!Array.isArray(list)) throw new Error('Unexpected advisories response');
  return list.filter(isAdvisory);
}

/** How long a fetched list is reused across pages before refetching. */
const REUSE_MS = 2 * 60 * 1000;
let shared: { at: number; promise: Promise<Advisory[]> } | null = null;

function loadShared(): Promise<Advisory[]> {
  if (shared && Date.now() - shared.at < REUSE_MS) return shared.promise;
  const promise = fetchAdvisories().catch(error => {
    shared = null; // let the next page try again
    throw error;
  });
  shared = { at: Date.now(), promise };
  return promise;
}

/** Test hook: forget the shared list. */
export function resetAdvisoriesCache(): void {
  shared = null;
}

export type AdvisoriesStatus = 'loading' | 'live' | 'fallback';

/**
 * Live advisories for the tourism pages. Starts with the bundled list so the
 * page never waits on the network; `status` says which list is showing.
 */
export function useAdvisories(): {
  advisories: Advisory[];
  status: AdvisoriesStatus;
} {
  const [state, setState] = useState<{
    advisories: Advisory[];
    status: AdvisoriesStatus;
  }>({ advisories: fallbackAdvisories, status: 'loading' });

  useEffect(() => {
    let active = true;
    loadShared().then(
      advisories => {
        if (active) setState({ advisories, status: 'live' });
      },
      error => {
        console.warn('Live advisories unavailable, using bundled list:', error);
        if (active)
          setState({ advisories: fallbackAdvisories, status: 'fallback' });
      }
    );
    return () => {
      active = false;
    };
  }, []);

  return state;
}
