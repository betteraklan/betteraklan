/**
 * Shared helpers for tourism advisories (public + admin APIs).
 */
import municipalities from '../../src/data/tourism/municipalities.json';
import { endMs, startMs } from '../../src/lib/tourism/advisoryWindow';
import type { Advisory } from '../../src/types/tourism';

/** KV key for the published advisory list. Admin writes invalidate it. */
export const ADVISORIES_CACHE_KEY = 'tourism:advisories:published';

export const ADVISORY_KINDS = ['closure', 'access', 'event'] as const;

export const MUNICIPALITY_SLUGS = new Set(
  (municipalities as Array<{ slug: string }>).map(m => m.slug)
);

/** Date-only, or a full timestamp with an explicit zone (no ambiguity). */
const DATE_OR_DATETIME =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2}))?$/;

export interface AdvisoryRow {
  id: string;
  kind: Advisory['kind'];
  title: string;
  summary: string;
  municipality: string | null;
  place: string | null;
  issuer: string;
  source_url: string;
  published_at: string;
  ends_at: string | null;
}

export interface AdminAdvisoryRow extends AdvisoryRow {
  is_published: number;
  created_at: string;
  updated_at: string;
}

export type AdminAdvisory = Advisory & {
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Map a database row to the frontend `Advisory` shape. */
export function toAdvisory(row: AdvisoryRow): Advisory {
  const affects: Advisory['affects'] = {};
  if (row.municipality) affects.municipality = row.municipality;
  if (row.place) affects.place = row.place;

  const advisory: Advisory = {
    id: row.id,
    kind: row.kind,
    title: row.title,
    summary: row.summary,
    affects,
    issuer: row.issuer,
    sourceUrl: row.source_url,
    publishedAt: row.published_at,
  };
  if (row.ends_at) advisory.endsAt = row.ends_at;
  return advisory;
}

export function toAdminAdvisory(row: AdminAdvisoryRow): AdminAdvisory {
  return {
    ...toAdvisory(row),
    isPublished: row.is_published === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Editable fields, as accepted from the admin API (camelCase). */
export interface AdvisoryInput {
  kind: Advisory['kind'];
  title: string;
  summary: string;
  municipality: string | null;
  place: string | null;
  issuer: string;
  sourceUrl: string;
  publishedAt: string;
  endsAt: string | null;
  isPublished: boolean;
}

export type ValidationResult =
  | { ok: true; value: AdvisoryInput }
  | { ok: false; errors: Record<string, string> };

const LIMITS = { title: 200, summary: 2000, issuer: 200, place: 200 };

function text(
  raw: unknown,
  field: keyof typeof LIMITS,
  errors: Record<string, string>,
  required: boolean
): string | null {
  if (raw === undefined || raw === null || raw === '') {
    if (required) errors[field] = 'Required';
    return null;
  }
  if (typeof raw !== 'string') {
    errors[field] = 'Must be text';
    return null;
  }
  const value = raw.trim();
  if (required && value === '') errors[field] = 'Required';
  else if (value.length > LIMITS[field])
    errors[field] = `Must be ${LIMITS[field]} characters or fewer`;
  return value === '' ? null : value;
}

function date(
  raw: unknown,
  field: 'publishedAt' | 'endsAt',
  errors: Record<string, string>,
  required: boolean
): string | null {
  if (raw === undefined || raw === null || raw === '') {
    if (required) errors[field] = 'Required';
    return null;
  }
  if (
    typeof raw !== 'string' ||
    !DATE_OR_DATETIME.test(raw) ||
    Number.isNaN(startMs(raw))
  ) {
    errors[field] =
      'Use YYYY-MM-DD or a full timestamp with a time zone (e.g. 2026-11-20T18:00:00+08:00)';
    return null;
  }
  return raw;
}

/**
 * Validate a complete advisory. For PATCH, merge the stored advisory with the
 * changes first and validate the result, so cross-field rules always hold.
 */
export function validateAdvisory(
  body: Record<string, unknown>
): ValidationResult {
  const errors: Record<string, string> = {};

  const kind = body.kind;
  if (!ADVISORY_KINDS.includes(kind as Advisory['kind'])) {
    errors.kind = `Must be one of: ${ADVISORY_KINDS.join(', ')}`;
  }

  const title = text(body.title, 'title', errors, true);
  const summary = text(body.summary, 'summary', errors, true);
  const issuer = text(body.issuer, 'issuer', errors, true);
  const place = text(body.place, 'place', errors, false);

  let municipality: string | null = null;
  if (
    body.municipality !== undefined &&
    body.municipality !== null &&
    body.municipality !== ''
  ) {
    if (
      typeof body.municipality !== 'string' ||
      !MUNICIPALITY_SLUGS.has(body.municipality)
    ) {
      errors.municipality = 'Unknown municipality';
    } else {
      municipality = body.municipality;
    }
  }

  let sourceUrl = '';
  if (typeof body.sourceUrl !== 'string' || body.sourceUrl.trim() === '') {
    errors.sourceUrl = 'Required';
  } else {
    sourceUrl = body.sourceUrl.trim();
    let parsed: URL | null = null;
    try {
      parsed = new URL(sourceUrl);
    } catch {
      parsed = null;
    }
    if (!parsed || !['http:', 'https:'].includes(parsed.protocol)) {
      errors.sourceUrl = 'Must be an http(s) link';
    } else if (sourceUrl.length > 2000) {
      errors.sourceUrl = 'Must be 2000 characters or fewer';
    }
  }

  const publishedAt = date(body.publishedAt, 'publishedAt', errors, true);
  const endsAt = date(body.endsAt, 'endsAt', errors, false);
  if (publishedAt && endsAt) {
    // Both the real time window and the table's CHECK (a string compare)
    // must hold, or the insert would fail with a 500.
    if (endMs(endsAt) <= startMs(publishedAt) || endsAt < publishedAt) {
      errors.endsAt = 'Must be after the start';
    }
  }

  let isPublished = true;
  if (body.isPublished !== undefined) {
    if (typeof body.isPublished !== 'boolean') {
      errors.isPublished = 'Must be true or false';
    } else {
      isPublished = body.isPublished;
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      kind: kind as Advisory['kind'],
      title: title!,
      summary: summary!,
      municipality,
      place,
      issuer: issuer!,
      sourceUrl,
      publishedAt: publishedAt!,
      endsAt,
      isPublished,
    },
  };
}

/** Fields an admin may send; anything else in the body is ignored. */
export const EDITABLE_FIELDS = [
  'kind',
  'title',
  'summary',
  'municipality',
  'place',
  'issuer',
  'sourceUrl',
  'publishedAt',
  'endsAt',
  'isPublished',
] as const;

/** Turn a stored advisory back into the editable-input shape for PATCH merges. */
export function toInput(a: AdminAdvisory): Record<string, unknown> {
  return {
    kind: a.kind,
    title: a.title,
    summary: a.summary,
    municipality: a.affects.municipality ?? null,
    place: a.affects.place ?? null,
    issuer: a.issuer,
    sourceUrl: a.sourceUrl,
    publishedAt: a.publishedAt,
    endsAt: a.endsAt ?? null,
    isPublished: a.isPublished,
  };
}
