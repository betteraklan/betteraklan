/**
 * Tourism Advisories API
 * GET /api/tourism/advisories                    - All active advisories
 * GET /api/tourism/advisories?municipality=malay - Active advisories for one town
 *
 * "Active" means published, already started and not yet ended. A date-only
 * `published_at` starts at 00:00 Philippine time and a date-only `ends_at`
 * lasts through the end of that day, matching "until <date>" in the UI.
 *
 * The published list is cached in KV under a single key (small data set), and
 * the time window and municipality filter are applied per request, so an
 * advisory drops off the moment it ends even while the cache is warm.
 */
import type { Advisory } from '../../../src/types/tourism';
import {
  ADVISORIES_CACHE_KEY,
  MUNICIPALITY_SLUGS,
  endMs,
  startMs,
  toAdvisory,
  type AdvisoryRow,
} from '../../lib/tourism-advisories';
import type { Env } from '../../types';
import { cachedJson } from '../../utils/cache';
import { ErrorCodes } from '../../utils/error-response';
import { CACHE_TTL, createKVCache } from '../../utils/kv-cache';

/** True when the advisory has started and not yet ended at `now`. */
export function isActive(advisory: Advisory, now: number): boolean {
  const start = startMs(advisory.publishedAt);
  if (Number.isNaN(start) || start > now) return false;
  if (!advisory.endsAt) return true;
  const end = endMs(advisory.endsAt);
  return !Number.isNaN(end) && end > now;
}

async function loadPublished(env: Env): Promise<Advisory[]> {
  const { results } = await env.BETTERLB_DB.prepare(
    `SELECT id, kind, title, summary, municipality, place, issuer,
            source_url, published_at, ends_at
       FROM tourism_advisories
      WHERE is_published = 1
      ORDER BY published_at DESC`
  ).all<AdvisoryRow>();
  return results.map(toAdvisory);
}

export async function onRequestGet(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const { request, env } = context;
  const municipality = new URL(request.url).searchParams.get('municipality');

  if (municipality !== null && !MUNICIPALITY_SLUGS.has(municipality)) {
    return cachedJson(
      { error: 'Unknown municipality', code: ErrorCodes.INVALID_INPUT },
      'none',
      400
    );
  }

  try {
    const published = await createKVCache(env).get(
      ADVISORIES_CACHE_KEY,
      () => loadPublished(env),
      CACHE_TTL.detail
    );

    const now = Date.now();
    const advisories = published.filter(
      a =>
        isActive(a, now) &&
        (municipality === null || a.affects.municipality === municipality)
    );

    // Short browser/CDN cache so admin changes show up within a couple of minutes.
    return cachedJson({ advisories }, 'count');
  } catch (error) {
    console.error('Tourism advisories API error:', error);
    return cachedJson(
      { error: 'Failed to fetch advisories', advisories: [] },
      'none',
      500
    );
  }
}
