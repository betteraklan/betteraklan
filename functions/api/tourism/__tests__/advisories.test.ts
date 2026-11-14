/**
 * Tourism Advisories API tests
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Env } from '../../../types';
import {
  ADVISORIES_CACHE_KEY,
  isActive,
  onRequestGet,
  toAdvisory,
  type AdvisoryRow,
} from '../advisories';

const row = (overrides: Partial<AdvisoryRow> = {}): AdvisoryRow => ({
  id: 'a1',
  kind: 'closure',
  title: 'Boracay ferry suspended',
  summary: 'No trips from Caticlan due to rough seas.',
  municipality: 'malay',
  place: 'Caticlan Jetty Port',
  issuer: 'PCG Aklan',
  source_url: 'https://example.gov.ph/advisory',
  published_at: '2026-11-14',
  ends_at: '2026-11-16',
  ...overrides,
});

/** Minimal D1 + KV stubs: the DB returns `rows`, KV starts empty. */
function makeEnv(rows: AdvisoryRow[], kvStore = new Map<string, string>()) {
  const all = vi.fn(async () => ({ results: rows, success: true }));
  const prepare = vi.fn<(sql: string) => { all: typeof all }>(() => ({
    all,
  }));
  const env = {
    BETTERLB_DB: { prepare },
    WEATHER_KV: {
      get: vi.fn(async (key: string) => {
        const v = kvStore.get(key);
        return v === undefined ? null : JSON.parse(v);
      }),
      put: vi.fn(async (key: string, value: string) => {
        kvStore.set(key, value);
      }),
    },
  } as unknown as Env;
  return { env, prepare, kvStore };
}

const get = (env: Env, query = '') =>
  onRequestGet({
    request: new Request(`https://x.test/api/tourism/advisories${query}`),
    env,
  });

describe('toAdvisory', () => {
  it('maps a row to the frontend Advisory shape', () => {
    expect(toAdvisory(row())).toEqual({
      id: 'a1',
      kind: 'closure',
      title: 'Boracay ferry suspended',
      summary: 'No trips from Caticlan due to rough seas.',
      affects: { municipality: 'malay', place: 'Caticlan Jetty Port' },
      issuer: 'PCG Aklan',
      sourceUrl: 'https://example.gov.ph/advisory',
      publishedAt: '2026-11-14',
      endsAt: '2026-11-16',
    });
  });

  it('omits empty optional fields', () => {
    const a = toAdvisory(
      row({ municipality: null, place: null, ends_at: null })
    );
    expect(a.affects).toEqual({});
    expect('endsAt' in a).toBe(false);
  });
});

describe('isActive', () => {
  const at = (iso: string) => Date.parse(iso);
  const adv = (publishedAt: string, endsAt?: string) =>
    toAdvisory(row({ published_at: publishedAt, ends_at: endsAt ?? null }));

  it('starts a date-only advisory at midnight Philippine time', () => {
    const a = adv('2026-11-14');
    expect(isActive(a, at('2026-11-13T23:59:00+08:00'))).toBe(false);
    expect(isActive(a, at('2026-11-14T00:00:00+08:00'))).toBe(true);
  });

  it('keeps a date-only advisory through the whole end day', () => {
    const a = adv('2026-11-14', '2026-11-16');
    expect(isActive(a, at('2026-11-16T23:59:00+08:00'))).toBe(true);
    expect(isActive(a, at('2026-11-17T00:00:00+08:00'))).toBe(false);
  });

  it('honours exact timestamps', () => {
    const a = adv('2026-11-14T06:00:00+08:00', '2026-11-14T18:00:00+08:00');
    expect(isActive(a, at('2026-11-14T05:59:00+08:00'))).toBe(false);
    expect(isActive(a, at('2026-11-14T12:00:00+08:00'))).toBe(true);
    expect(isActive(a, at('2026-11-14T18:00:00+08:00'))).toBe(false);
  });

  it('treats a missing end as open-ended', () => {
    expect(isActive(adv('2026-01-01'), at('2030-01-01T00:00:00Z'))).toBe(true);
  });

  it('skips advisories with unparseable dates', () => {
    expect(isActive(adv('soon'), Date.now())).toBe(false);
    expect(isActive(adv('2026-01-01', 'later'), Date.now())).toBe(false);
  });
});

describe('GET /api/tourism/advisories', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-15T12:00:00+08:00'));
  });
  afterEach(() => vi.useRealTimers());

  const rows = [
    row({ id: 'active-malay' }),
    row({ id: 'active-kalibo', municipality: 'kalibo', place: null }),
    row({ id: 'ended', ends_at: '2026-11-14' }),
    row({ id: 'scheduled', published_at: '2026-11-20', ends_at: null }),
  ];

  it('returns only advisories active right now', async () => {
    const res = await get(makeEnv(rows).env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { advisories: { id: string }[] };
    expect(body.advisories.map(a => a.id)).toEqual([
      'active-malay',
      'active-kalibo',
    ]);
  });

  it('filters by municipality', async () => {
    const res = await get(makeEnv(rows).env, '?municipality=kalibo');
    const body = (await res.json()) as { advisories: { id: string }[] };
    expect(body.advisories.map(a => a.id)).toEqual(['active-kalibo']);
  });

  it('rejects unknown municipalities without touching the database', async () => {
    const { env, prepare } = makeEnv(rows);
    const res = await get(env, '?municipality=atlantis');
    expect(res.status).toBe(400);
    expect(prepare).not.toHaveBeenCalled();
  });

  it('queries only published rows and caches them under one key', async () => {
    const { env, prepare, kvStore } = makeEnv(rows);
    await get(env);
    await get(env, '?municipality=malay');
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(prepare.mock.calls[0][0]).toMatch(/is_published = 1/);
    expect([...kvStore.keys()]).toEqual([ADVISORIES_CACHE_KEY]);
  });

  it('drops an advisory that ended while the cache was warm', async () => {
    const { env } = makeEnv([row({ ends_at: '2026-11-15' })]);
    let body = (await (await get(env)).json()) as { advisories: unknown[] };
    expect(body.advisories).toHaveLength(1);

    vi.setSystemTime(new Date('2026-11-16T00:00:01+08:00'));
    body = (await (await get(env)).json()) as { advisories: unknown[] };
    expect(body.advisories).toHaveLength(0);
  });

  it('sets a short public cache on success', async () => {
    const res = await get(makeEnv(rows).env);
    expect(res.headers.get('Cache-Control')).toContain('max-age=120');
  });

  it('returns 500 with an empty list when the database fails', async () => {
    const { env } = makeEnv([]);
    (env.BETTERLB_DB.prepare as ReturnType<typeof vi.fn>).mockImplementation(
      () => {
        throw new Error('D1 down');
      }
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await get(env);
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ advisories: [] });
    expect(res.headers.get('Cache-Control')).toContain('no-store');
  });
});
