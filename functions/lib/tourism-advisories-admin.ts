/**
 * Helpers shared by the admin tourism advisory endpoints.
 */
import type { Env } from '../types';
import type { AuthContext } from '../utils/admin-auth';
import { logAudit } from '../utils/audit-log';
import { ErrorCodes } from '../utils/error-response';
import { createKVCache } from '../utils/kv-cache';
import { checkRateLimit, createRateLimitResponse } from '../utils/rate-limit';
import {
  ADVISORIES_CACHE_KEY,
  toAdminAdvisory,
  type AdminAdvisory,
  type AdminAdvisoryRow,
} from './tourism-advisories';

/** Writes allowed per admin per minute. */
export const WRITE_LIMIT = 30;

export const ADMIN_COLUMNS = `id, kind, title, summary, municipality, place, issuer,
  source_url, published_at, ends_at, is_published, created_at, updated_at`;

export const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });

export const validationError = (errors: Record<string, string>) =>
  json(
    {
      error: 'Validation failed',
      code: ErrorCodes.INVALID_INPUT,
      details: errors,
    },
    400
  );

/** Parse a JSON object body, or return a 400 response. */
export async function readJsonObject(
  request: Request
): Promise<Record<string, unknown> | Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(
      { error: 'Body must be JSON', code: ErrorCodes.INVALID_FORMAT },
      400
    );
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return json(
      { error: 'Body must be a JSON object', code: ErrorCodes.INVALID_FORMAT },
      400
    );
  }
  return body as Record<string, unknown>;
}

/** Per-user write rate limit; returns a 429 response when exceeded. */
export async function limitWrites(
  env: Env,
  auth: AuthContext
): Promise<Response | null> {
  const result = await checkRateLimit(
    env.WEATHER_KV,
    `ratelimit:tourism-advisories:${auth.user.login}`,
    { limit: WRITE_LIMIT, window: 60 }
  );
  return result.allowed ? null : createRateLimitResponse(result, WRITE_LIMIT);
}

export async function findAdvisory(
  env: Env,
  id: string
): Promise<AdminAdvisory | null> {
  const row = await env.BETTERLB_DB.prepare(
    `SELECT ${ADMIN_COLUMNS} FROM tourism_advisories WHERE id = ?1`
  )
    .bind(id)
    .first<AdminAdvisoryRow>();
  return row ? toAdminAdvisory(row) : null;
}

/** Clear the public cache and record the change in the audit log. */
export async function afterWrite(
  env: Env,
  auth: AuthContext,
  action: 'create' | 'update' | 'publish' | 'unpublish',
  advisory: AdminAdvisory,
  changes?: Record<string, unknown>
): Promise<void> {
  await createKVCache(env).invalidate(ADVISORIES_CACHE_KEY);
  await logAudit(env, {
    action: `${action}_tourism_advisory`,
    performedBy: auth.user.login,
    targetType: 'tourism_advisory',
    targetId: advisory.id,
    details: {
      title: advisory.title,
      municipality: advisory.affects.municipality ?? null,
      ...(changes ? { changes } : {}),
    },
  });
}
