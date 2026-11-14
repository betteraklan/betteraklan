import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Advisory } from '@/types/tourism';

import {
  advisoriesFor,
  fallbackAdvisories,
  fetchAdvisories,
  resetAdvisoriesCache,
  useAdvisories,
} from './advisories';

const advisory = (id: string, municipality?: string): Advisory => ({
  id,
  kind: 'closure',
  title: `Notice ${id}`,
  summary: 'Summary',
  affects: municipality ? { municipality } : {},
  issuer: 'PCG Aklan',
  sourceUrl: 'https://example.gov.ph',
  publishedAt: '2026-11-14',
});

const respond = (body: unknown, init: ResponseInit = {}) =>
  vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(Response.json(body, init) as Response);

beforeEach(() => {
  resetAdvisoriesCache();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('advisoriesFor', () => {
  it('returns an empty list when no verified notices are published', () => {
    expect(advisoriesFor('kalibo')).toEqual([]);
  });

  it('filters a given list by municipality', () => {
    const list = [
      advisory('a', 'kalibo'),
      advisory('b', 'malay'),
      advisory('c'),
    ];
    expect(advisoriesFor('kalibo', list).map(a => a.id)).toEqual(['a']);
  });
});

describe('fetchAdvisories', () => {
  it('returns the advisories from the API', async () => {
    const fetchSpy = respond({ advisories: [advisory('a', 'malay')] });
    expect(await fetchAdvisories()).toEqual([advisory('a', 'malay')]);
    expect(fetchSpy.mock.calls[0][0]).toBe('/api/tourism/advisories');
  });

  it('drops malformed entries', async () => {
    respond({ advisories: [advisory('a'), { id: 'x' }, null, 'nope'] });
    expect((await fetchAdvisories()).map(a => a.id)).toEqual(['a']);
  });

  it('throws on an error status', async () => {
    respond({ error: 'down', advisories: [] }, { status: 500 });
    await expect(fetchAdvisories()).rejects.toThrow('500');
  });

  it('throws when the response is not the API (e.g. index.html)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<!doctype html>', { status: 200 })
    );
    await expect(fetchAdvisories()).rejects.toThrow();
  });
});

describe('useAdvisories', () => {
  it('starts with the bundled list while loading, then shows live data', async () => {
    respond({ advisories: [advisory('live', 'kalibo')] });
    const { result } = renderHook(() => useAdvisories());
    expect(result.current).toEqual({
      advisories: fallbackAdvisories,
      status: 'loading',
    });
    await waitFor(() => expect(result.current.status).toBe('live'));
    expect(result.current.advisories.map(a => a.id)).toEqual(['live']);
  });

  it('falls back to the bundled list when the API fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'));
    const { result } = renderHook(() => useAdvisories());
    await waitFor(() => expect(result.current.status).toBe('fallback'));
    expect(result.current.advisories).toBe(fallbackAdvisories);
  });

  it('shares one request across pages', async () => {
    const fetchSpy = respond({ advisories: [] });
    const a = renderHook(() => useAdvisories());
    const b = renderHook(() => useAdvisories());
    await waitFor(() => expect(a.result.current.status).toBe('live'));
    await waitFor(() => expect(b.result.current.status).toBe('live'));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('retries on the next mount after a failure', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(Response.json({ advisories: [advisory('b')] }));
    const first = renderHook(() => useAdvisories());
    await waitFor(() => expect(first.result.current.status).toBe('fallback'));
    const second = renderHook(() => useAdvisories());
    await waitFor(() => expect(second.result.current.status).toBe('live'));
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
