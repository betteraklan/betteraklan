/**
 * Admin Tourism Advisories API tests
 *
 * Runs against real SQLite with the real migration, so the table's CHECK
 * constraints and the SQL in the handlers are exercised end to end.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ADVISORIES_CACHE_KEY } from '../../../../lib/tourism-advisories';
import { WRITE_LIMIT } from '../../../../lib/tourism-advisories-admin';
import { MockKVNamespace } from '../../../../test/test-utils';
import { SqliteD1 } from '../../../../test/sqlite-d1';
import type { Env } from '../../../../types';
import { generateCSRFToken } from '../../../../utils/csrf';
import * as item from '../advisories/[id]';
import * as collection from '../advisories/index';

const BASE = 'https://x.test/api/admin/tourism/advisories';

const valid = {
  kind: 'closure',
  title: 'Caticlan jetty port closed',
  summary: 'No trips to Boracay due to gale warning.',
  municipality: 'malay',
  place: 'Caticlan Jetty Port',
  issuer: 'PCG Aklan',
  sourceUrl: 'https://example.gov.ph/advisory/1',
  publishedAt: '2026-11-14',
  endsAt: '2026-11-16',
};

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

let env: Env;
let kv: MockKVNamespace;
let db: SqliteD1;

async function login(login: string) {
  const sessionId = `s-${login}-${Math.random()}`;
  await kv.put(
    `session:${sessionId}`,
    JSON.stringify({
      user: { id: 1, login, name: login, email: null, avatar_url: '' },
      login_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 3_600_000).toISOString(),
    })
  );
  return sessionId;
}

/** Build a request; happy-dom drops Cookie headers, so stub headers.get. */
async function req(
  method: string,
  url: string,
  opts: { session?: string; body?: unknown; csrf?: boolean | string } = {}
) {
  const request = new Request(url, {
    method,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    headers: { 'Content-Type': 'application/json' },
  });
  let csrf = '';
  if (typeof opts.csrf === 'string') csrf = opts.csrf;
  else if (opts.csrf !== false && opts.session && method !== 'GET') {
    csrf = await generateCSRFToken(env, opts.session);
  }
  const get = request.headers.get.bind(request.headers);
  vi.spyOn(request.headers, 'get').mockImplementation((name: string) => {
    if (name === 'Cookie')
      return opts.session ? `admin_session=${opts.session}` : '';
    if (name === 'X-CSRF-Token') return csrf;
    return get(name);
  });
  return request;
}

async function create(session: string, body: unknown = valid) {
  const res = await collection.onRequestPost({
    request: await req('POST', BASE, { session, body }),
    env,
  });
  return { res, body: (await res.json()) as Json };
}

async function patch(session: string, id: string, body: unknown) {
  const res = await item.onRequestPatch({
    request: await req('PATCH', `${BASE}/${id}`, { session, body }),
    env,
    params: { id },
  });
  return { res, body: (await res.json()) as Json };
}

function auditActions(): string[] {
  return (
    db.db
      .prepare('SELECT action FROM admin_audit_log ORDER BY rowid')
      .all() as { action: string }[]
  ).map(r => r.action);
}

beforeEach(() => {
  kv = new MockKVNamespace();
  db = new SqliteD1().loadSql(
    'db/migrations/archive/003_admin_audit_log.sql',
    'db/migrations/005_tourism_advisories.sql'
  );
  env = {
    WEATHER_KV: kv,
    BETTERLB_DB: db,
    AUTHORIZED_USERS: JSON.stringify(['ana', 'eddie', 'vic']),
    ADMIN_USERS: JSON.stringify(['ana']),
    EDITOR_USERS: JSON.stringify(['eddie']),
  } as unknown as Env;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('access control', () => {
  it('rejects requests without a session', async () => {
    const res = await collection.onRequestGet({
      request: await req('GET', BASE),
      env,
    });
    expect(res.status).toBe(401);
  });

  it('lets viewers read but not write', async () => {
    const vic = await login('vic');
    const list = await collection.onRequestGet({
      request: await req('GET', BASE, { session: vic }),
      env,
    });
    expect(list.status).toBe(200);
    expect((await create(vic)).res.status).toBe(403);
  });

  it('lets editors create', async () => {
    expect((await create(await login('eddie'))).res.status).toBe(201);
  });

  it('requires a valid CSRF token for writes', async () => {
    const ana = await login('ana');
    for (const csrf of [false, 'forged'] as const) {
      const res = await collection.onRequestPost({
        request: await req('POST', BASE, { session: ana, body: valid, csrf }),
        env,
      });
      expect(res.status).toBe(403);
    }
    expect(
      db.db.prepare('SELECT COUNT(*) n FROM tourism_advisories').get()
    ).toEqual({ n: 0 });
  });
});

describe('POST /api/admin/tourism/advisories', () => {
  it('creates an advisory, clears the public cache and audits it', async () => {
    const ana = await login('ana');
    await kv.put(ADVISORIES_CACHE_KEY, '[]');

    const { res, body } = await create(ana);
    expect(res.status).toBe(201);
    expect(body.advisory).toMatchObject({
      kind: 'closure',
      affects: { municipality: 'malay', place: 'Caticlan Jetty Port' },
      sourceUrl: valid.sourceUrl,
      endsAt: '2026-11-16',
      isPublished: true,
    });
    expect(body.advisory.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(await kv.get(ADVISORIES_CACHE_KEY, 'text')).toBeNull();
    expect(auditActions()).toEqual(['create_tourism_advisory']);
  });

  it('ignores unknown fields such as a client-chosen id', async () => {
    const { body } = await create(await login('ana'), {
      ...valid,
      id: 'mine',
      created_at: '1999-01-01',
    });
    expect(body.advisory.id).not.toBe('mine');
    expect(body.advisory.createdAt).not.toBe('1999-01-01');
  });

  it.each([
    [{ kind: 'typhoon' }, 'kind'],
    [{ title: '   ' }, 'title'],
    [{ title: 'x'.repeat(201) }, 'title'],
    [{ municipality: 'atlantis' }, 'municipality'],
    [{ sourceUrl: 'javascript:alert(1)' }, 'sourceUrl'],
    [{ sourceUrl: 'not a url' }, 'sourceUrl'],
    [{ publishedAt: '14/11/2026' }, 'publishedAt'],
    [{ publishedAt: '2026-11-14T08:00:00' }, 'publishedAt'], // no time zone
    [{ endsAt: '2026-11-13' }, 'endsAt'],
    [
      {
        endsAt: '2026-11-14T08:00:00+08:00',
        publishedAt: '2026-11-14T09:00:00+08:00',
      },
      'endsAt',
    ],
    [{ isPublished: 'yes' }, 'isPublished'],
  ])('rejects %o', async (override, field) => {
    const { res, body } = await create(await login('ana'), {
      ...valid,
      ...override,
    });
    expect(res.status).toBe(400);
    expect(body.details).toHaveProperty(field);
  });

  it('rejects non-JSON and non-object bodies', async () => {
    const ana = await login('ana');
    expect((await create(ana, ['array'])).res.status).toBe(400);

    const request = await req('POST', BASE, { session: ana });
    const bad = new Request(request, { body: '{nope', method: 'POST' });
    vi.spyOn(bad.headers, 'get').mockImplementation(n =>
      request.headers.get(n)
    );
    const res = await collection.onRequestPost({ request: bad, env });
    expect(res.status).toBe(400);
  });

  it('accepts a province-wide advisory with no end date', async () => {
    const { res, body } = await create(await login('ana'), {
      ...valid,
      municipality: null,
      place: '',
      endsAt: null,
    });
    expect(res.status).toBe(201);
    expect(body.advisory.affects).toEqual({});
    expect(body.advisory).not.toHaveProperty('endsAt');
  });

  it('rate-limits writes per user', async () => {
    const ana = await login('ana');
    for (let i = 0; i < WRITE_LIMIT; i++) {
      expect((await create(ana)).res.status).toBe(201);
    }
    expect((await create(ana)).res.status).toBe(429);
    // Another user is unaffected.
    expect((await create(await login('eddie'))).res.status).toBe(201);
  });
});

describe('GET /api/admin/tourism/advisories', () => {
  it('lists unpublished and ended advisories too', async () => {
    const ana = await login('ana');
    await create(ana);
    await create(ana, { ...valid, isPublished: false });
    await create(ana, {
      ...valid,
      publishedAt: '2020-01-01',
      endsAt: '2020-01-02',
    });

    const res = await collection.onRequestGet({
      request: await req('GET', BASE, { session: ana }),
      env,
    });
    const body = (await res.json()) as Json;
    expect(body.advisories).toHaveLength(3);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });
});

describe('/api/admin/tourism/advisories/:id', () => {
  it('fetches one advisory, 404s on a missing id', async () => {
    const ana = await login('ana');
    const { body: created } = await create(ana);
    const get = (id: string) =>
      item.onRequestGet({
        request: new Request(`${BASE}/${id}`),
        env,
        params: { id },
      });
    // Route through auth with a real session.
    const ok = await item.onRequestGet({
      request: await req('GET', `${BASE}/${created.advisory.id}`, {
        session: ana,
      }),
      env,
      params: { id: created.advisory.id },
    });
    expect(ok.status).toBe(200);
    expect(((await ok.json()) as Json).advisory.id).toBe(created.advisory.id);

    const missing = await item.onRequestGet({
      request: await req('GET', `${BASE}/nope`, { session: ana }),
      env,
      params: { id: 'nope' },
    });
    expect(missing.status).toBe(404);
    expect((await get('x')).status).toBe(401);
  });

  it('updates only the sent fields and bumps updatedAt', async () => {
    const ana = await login('ana');
    const { body: created } = await create(ana);
    db.db
      .prepare(
        "UPDATE tourism_advisories SET updated_at = '2000-01-01 00:00:00'"
      )
      .run();

    const { res, body } = await patch(ana, created.advisory.id, {
      title: 'Caticlan port reopening at noon',
    });
    expect(res.status).toBe(200);
    expect(body.advisory.title).toBe('Caticlan port reopening at noon');
    expect(body.advisory.summary).toBe(valid.summary);
    expect(body.advisory.updatedAt).not.toBe('2000-01-01 00:00:00');
    expect(auditActions()).toEqual([
      'create_tourism_advisory',
      'update_tourism_advisory',
    ]);
  });

  it('unpublishes and republishes, clearing the cache each time', async () => {
    const ana = await login('ana');
    const { body: created } = await create(ana);
    const id = created.advisory.id;

    await kv.put(ADVISORIES_CACHE_KEY, '[]');
    const off = await patch(ana, id, { isPublished: false });
    expect(off.body.advisory.isPublished).toBe(false);
    expect(await kv.get(ADVISORIES_CACHE_KEY, 'text')).toBeNull();

    await kv.put(ADVISORIES_CACHE_KEY, '[]');
    const on = await patch(ana, id, { isPublished: true });
    expect(on.body.advisory.isPublished).toBe(true);
    expect(await kv.get(ADVISORIES_CACHE_KEY, 'text')).toBeNull();

    expect(auditActions().slice(1)).toEqual([
      'unpublish_tourism_advisory',
      'publish_tourism_advisory',
    ]);
  });

  it('validates the merged result, not just the changed fields', async () => {
    const ana = await login('ana');
    const { body: created } = await create(ana);
    // Moving the start past the stored end must fail.
    const { res, body } = await patch(ana, created.advisory.id, {
      publishedAt: '2026-12-01',
    });
    expect(res.status).toBe(400);
    expect(body.details).toHaveProperty('endsAt');
  });

  it('clears an optional field when sent as null', async () => {
    const ana = await login('ana');
    const { body: created } = await create(ana);
    const { body } = await patch(ana, created.advisory.id, { endsAt: null });
    expect(body.advisory).not.toHaveProperty('endsAt');
  });

  it('rejects empty patches and unknown ids', async () => {
    const ana = await login('ana');
    const { body: created } = await create(ana);
    expect(
      (await patch(ana, created.advisory.id, { id: 'x' })).res.status
    ).toBe(400);
    expect((await patch(ana, 'missing', { title: 'x' })).res.status).toBe(404);
  });

  it('blocks viewers from editing', async () => {
    const { body: created } = await create(await login('ana'));
    const { res } = await patch(await login('vic'), created.advisory.id, {
      isPublished: false,
    });
    expect(res.status).toBe(403);
  });
});
