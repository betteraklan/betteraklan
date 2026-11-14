/**
 * Client for the admin tourism advisory API, plus form helpers.
 *
 * Writes need a CSRF token, and the server deletes each token after one use,
 * so every write fetches a fresh token first.
 */
import type { Advisory } from '@/types/tourism';

import { DATE_ONLY, PH_OFFSET } from './advisoryWindow';

export type AdminAdvisory = Advisory & {
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Body accepted by POST and (partially) by PATCH. */
export interface AdvisoryPayload {
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

/** API error carrying per-field messages from a 400 validation response. */
export class AdvisoryApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fieldErrors: Record<string, string> = {}
  ) {
    super(message);
    this.name = 'AdvisoryApiError';
  }
}

const BASE = '/api/admin/tourism/advisories';

async function parse<T>(res: Response): Promise<T> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // non-JSON body; handled below
  }
  if (!res.ok) {
    const b = (body ?? {}) as { error?: string; details?: unknown };
    const details =
      b.details && typeof b.details === 'object'
        ? (b.details as Record<string, string>)
        : {};
    const message =
      res.status === 429
        ? 'Too many changes in a minute. Wait a moment and try again.'
        : res.status === 401
          ? 'Your session has expired. Sign in again.'
          : res.status === 403 && b.error === 'Insufficient permissions'
            ? 'Your account can view advisories but not change them.'
            : b.error || `Request failed (${res.status})`;
    throw new AdvisoryApiError(message, res.status, details);
  }
  return body as T;
}

async function csrfToken(): Promise<string> {
  const { csrf_token } = await parse<{ csrf_token: string }>(
    await fetch('/api/admin/auth/csrf', { credentials: 'same-origin' })
  );
  return csrf_token;
}

async function write<T>(
  url: string,
  method: 'POST' | 'PATCH',
  body: unknown
): Promise<T> {
  const token = await csrfToken();
  return parse<T>(
    await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
      body: JSON.stringify(body),
    })
  );
}

export const advisoriesAdminApi = {
  async list(): Promise<AdminAdvisory[]> {
    const { advisories } = await parse<{ advisories: AdminAdvisory[] }>(
      await fetch(BASE, { credentials: 'same-origin' })
    );
    return advisories;
  },

  async create(payload: AdvisoryPayload): Promise<AdminAdvisory> {
    const { advisory } = await write<{ advisory: AdminAdvisory }>(
      BASE,
      'POST',
      payload
    );
    return advisory;
  },

  async update(
    id: string,
    changes: Partial<AdvisoryPayload>
  ): Promise<AdminAdvisory> {
    const { advisory } = await write<{ advisory: AdminAdvisory }>(
      `${BASE}/${encodeURIComponent(id)}`,
      'PATCH',
      changes
    );
    return advisory;
  },
};

// ---------------------------------------------------------------------------
// Form helpers: the form edits a date plus an optional time in Philippine
// time; the API stores either `YYYY-MM-DD` or a full timestamp.
// ---------------------------------------------------------------------------

export interface AdvisoryFormValues {
  kind: Advisory['kind'];
  title: string;
  summary: string;
  municipality: string;
  place: string;
  issuer: string;
  sourceUrl: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  isPublished: boolean;
}

/** Today's date in Philippine time, as YYYY-MM-DD. */
export function todayPH(now = Date.now()): string {
  return new Date(now + 8 * 3600_000).toISOString().slice(0, 10);
}

export const emptyForm = (now = Date.now()): AdvisoryFormValues => ({
  kind: 'closure',
  title: '',
  summary: '',
  municipality: '',
  place: '',
  issuer: '',
  sourceUrl: '',
  startDate: todayPH(now),
  startTime: '',
  endDate: '',
  endTime: '',
  isPublished: true,
});

/** Split a stored value into Philippine-time date and time (HH:MM). */
export function splitPH(value: string | undefined): {
  date: string;
  time: string;
} {
  if (!value) return { date: '', time: '' };
  if (DATE_ONLY.test(value)) return { date: value, time: '' };
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return { date: '', time: '' };
  const local = new Date(ms + 8 * 3600_000).toISOString();
  return { date: local.slice(0, 10), time: local.slice(11, 16) };
}

/** Join a date and optional time (Philippine time) into an API value. */
export function joinPH(date: string, time: string): string | null {
  if (!date) return null;
  return time ? `${date}T${time}:00${PH_OFFSET}` : date;
}

export function toForm(a: AdminAdvisory): AdvisoryFormValues {
  const start = splitPH(a.publishedAt);
  const end = splitPH(a.endsAt);
  return {
    kind: a.kind,
    title: a.title,
    summary: a.summary,
    municipality: a.affects.municipality ?? '',
    place: a.affects.place ?? '',
    issuer: a.issuer,
    sourceUrl: a.sourceUrl,
    startDate: start.date,
    startTime: start.time,
    endDate: end.date,
    endTime: end.time,
    isPublished: a.isPublished,
  };
}

export function toPayload(f: AdvisoryFormValues): AdvisoryPayload {
  return {
    kind: f.kind,
    title: f.title.trim(),
    summary: f.summary.trim(),
    municipality: f.municipality || null,
    place: f.place.trim() || null,
    issuer: f.issuer.trim(),
    sourceUrl: f.sourceUrl.trim(),
    publishedAt: joinPH(f.startDate, f.startTime) ?? '',
    endsAt: joinPH(f.endDate, f.endTime),
    isPublished: f.isPublished,
  };
}

/** Map API field names onto the form fields that show the message. */
export function formErrors(
  apiErrors: Record<string, string>
): Partial<Record<keyof AdvisoryFormValues, string>> {
  const map: Record<string, keyof AdvisoryFormValues> = {
    publishedAt: 'startDate',
    endsAt: 'endDate',
  };
  const out: Partial<Record<keyof AdvisoryFormValues, string>> = {};
  for (const [field, message] of Object.entries(apiErrors)) {
    out[map[field] ?? (field as keyof AdvisoryFormValues)] = message;
  }
  return out;
}
