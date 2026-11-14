import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AdvisoryApiError,
  type AdminAdvisory,
  advisoriesAdminApi,
  emptyForm,
  formErrors,
  joinPH,
  splitPH,
  toForm,
  toPayload,
  todayPH,
} from './advisoriesAdmin';
import { advisoryPhase } from './advisoryWindow';

const stored: AdminAdvisory = {
  id: 'a1',
  kind: 'access',
  title: 'Road works',
  summary: 'One lane',
  affects: { municipality: 'kalibo' },
  issuer: 'DPWH',
  sourceUrl: 'https://example.gov.ph',
  publishedAt: '2026-11-14T06:30:00+08:00',
  endsAt: '2026-11-20',
  isPublished: true,
  createdAt: '2026-11-14 00:00:00',
  updatedAt: '2026-11-14 00:00:00',
};

afterEach(() => vi.restoreAllMocks());

describe('Philippine-time form helpers', () => {
  it('splits stored values into local date and time', () => {
    expect(splitPH('2026-11-20')).toEqual({ date: '2026-11-20', time: '' });
    expect(splitPH('2026-11-14T06:30:00+08:00')).toEqual({
      date: '2026-11-14',
      time: '06:30',
    });
    // A UTC value is shown in Philippine time.
    expect(splitPH('2026-11-13T22:30:00Z')).toEqual({
      date: '2026-11-14',
      time: '06:30',
    });
    expect(splitPH(undefined)).toEqual({ date: '', time: '' });
  });

  it('joins date and optional time', () => {
    expect(joinPH('2026-11-14', '')).toBe('2026-11-14');
    expect(joinPH('2026-11-14', '06:30')).toBe('2026-11-14T06:30:00+08:00');
    expect(joinPH('', '06:30')).toBeNull();
  });

  it('round-trips an advisory through the form', () => {
    const payload = toPayload(toForm(stored));
    expect(payload).toEqual({
      kind: 'access',
      title: 'Road works',
      summary: 'One lane',
      municipality: 'kalibo',
      place: null,
      issuer: 'DPWH',
      sourceUrl: 'https://example.gov.ph',
      publishedAt: '2026-11-14T06:30:00+08:00',
      endsAt: '2026-11-20',
      isPublished: true,
    });
  });

  it('trims text and turns blanks into nulls', () => {
    const payload = toPayload({
      ...emptyForm(),
      title: '  T  ',
      place: '   ',
      municipality: '',
    });
    expect(payload).toMatchObject({
      title: 'T',
      place: null,
      municipality: null,
      endsAt: null,
    });
  });

  it('defaults the start to today in Philippine time', () => {
    // 20:00 UTC on the 13th is already the 14th in Manila.
    expect(todayPH(Date.parse('2026-11-13T20:00:00Z'))).toBe('2026-11-14');
  });

  it('maps API field errors onto form fields', () => {
    expect(
      formErrors({ publishedAt: 'Bad', endsAt: 'Early', title: 'Req' })
    ).toEqual({
      startDate: 'Bad',
      endDate: 'Early',
      title: 'Req',
    });
  });
});

describe('advisoryPhase', () => {
  const at = (iso: string) => Date.parse(iso);
  it('classifies scheduled, live and ended', () => {
    const a = { publishedAt: '2026-11-14', endsAt: '2026-11-16' };
    expect(advisoryPhase(a, at('2026-11-13T23:00:00+08:00'))).toBe('scheduled');
    expect(advisoryPhase(a, at('2026-11-16T23:00:00+08:00'))).toBe('live');
    expect(advisoryPhase(a, at('2026-11-17T00:00:00+08:00'))).toBe('ended');
    expect(advisoryPhase({ publishedAt: 'x' }, 0)).toBeNull();
  });
});

describe('advisoriesAdminApi', () => {
  it('fetches a fresh CSRF token before every write', async () => {
    let n = 0;
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (url, init) => {
        if (url === '/api/admin/auth/csrf') {
          return Response.json({ csrf_token: `tok-${++n}` });
        }
        return Response.json({ advisory: { ...stored, id: 'x' }, init });
      });

    await advisoriesAdminApi.update('a1', { isPublished: false });
    await advisoriesAdminApi.create(toPayload(toForm(stored)));

    const writes = fetchSpy.mock.calls.filter(
      ([url]) => url !== '/api/admin/auth/csrf'
    );
    expect(writes.map(([url, init]) => [url, init?.method])).toEqual([
      ['/api/admin/tourism/advisories/a1', 'PATCH'],
      ['/api/admin/tourism/advisories', 'POST'],
    ]);
    expect(
      writes.map(
        ([, init]) => (init?.headers as Record<string, string>)['X-CSRF-Token']
      )
    ).toEqual(['tok-1', 'tok-2']);
  });

  it('surfaces field errors from a 400', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async url =>
      url === '/api/admin/auth/csrf'
        ? Response.json({ csrf_token: 't' })
        : Response.json(
            { error: 'Validation failed', details: { title: 'Required' } },
            { status: 400 }
          )
    );
    const err = await advisoriesAdminApi
      .create(toPayload(emptyForm()))
      .catch(e => e);
    expect(err).toBeInstanceOf(AdvisoryApiError);
    expect(err.status).toBe(400);
    expect(err.fieldErrors).toEqual({ title: 'Required' });
  });

  it.each([
    [401, {}, 'session has expired'],
    [403, { error: 'Insufficient permissions' }, 'not change them'],
    [429, {}, 'Too many changes'],
  ])('explains a %i in plain words', async (status, body, text) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json(body, { status })
    );
    await expect(advisoriesAdminApi.list()).rejects.toThrow(text);
  });
});
