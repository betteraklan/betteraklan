/**
 * Admin Tourism Advisories API
 * GET  /api/admin/tourism/advisories - List every advisory (incl. unpublished/ended)
 * POST /api/admin/tourism/advisories - Create an advisory
 */
import {
  ADMIN_COLUMNS,
  afterWrite,
  findAdvisory,
  json,
  limitWrites,
  readJsonObject,
  validationError,
} from '../../../../lib/tourism-advisories-admin';
import {
  EDITABLE_FIELDS,
  toAdminAdvisory,
  validateAdvisory,
  type AdminAdvisoryRow,
} from '../../../../lib/tourism-advisories';
import type { Env } from '../../../../types';
import { withAuth, type AuthContext } from '../../../../utils/admin-auth';
import { assertWriteSuccess } from '../../../../utils/db';
import { Permission } from '../../../../utils/rbac';

type Ctx = { request: Request; env: Env; auth: AuthContext };

/** Upper bound for the admin list; advisories are a small, short-lived set. */
const LIST_LIMIT = 500;

async function handleList({ env }: Ctx): Promise<Response> {
  try {
    const { results } = await env.BETTERLB_DB.prepare(
      `SELECT ${ADMIN_COLUMNS} FROM tourism_advisories
        ORDER BY published_at DESC, created_at DESC
        LIMIT ?1`
    )
      .bind(LIST_LIMIT)
      .all<AdminAdvisoryRow>();
    return json({ advisories: results.map(toAdminAdvisory) });
  } catch (error) {
    console.error('Admin advisories list error:', error);
    return json({ error: 'Failed to fetch advisories' }, 500);
  }
}

async function handleCreate({ request, env, auth }: Ctx): Promise<Response> {
  const limited = await limitWrites(env, auth);
  if (limited) return limited;

  const body = await readJsonObject(request);
  if (body instanceof Response) return body;

  const input: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) input[field] = body[field];
  const result = validateAdvisory(input);
  if (!result.ok) return validationError(result.errors);

  const v = result.value;
  const id = crypto.randomUUID();

  try {
    const write = await env.BETTERLB_DB.prepare(
      `INSERT INTO tourism_advisories
         (id, kind, title, summary, municipality, place, issuer, source_url,
          published_at, ends_at, is_published)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`
    )
      .bind(
        id,
        v.kind,
        v.title,
        v.summary,
        v.municipality,
        v.place,
        v.issuer,
        v.sourceUrl,
        v.publishedAt,
        v.endsAt,
        v.isPublished ? 1 : 0
      )
      .run();
    assertWriteSuccess(write, 'insert tourism advisory');

    const created = await findAdvisory(env, id);
    if (!created) throw new Error('Advisory missing after insert');
    await afterWrite(env, auth, 'create', created);
    return json({ advisory: created }, 201);
  } catch (error) {
    console.error('Admin advisory create error:', error);
    return json({ error: 'Failed to create advisory' }, 500);
  }
}

export const onRequestGet = withAuth<{ request: Request; env: Env }>(
  handleList,
  { requirePermission: Permission.TOURISM_ADVISORIES_READ }
);

export const onRequestPost = withAuth<{ request: Request; env: Env }>(
  handleCreate,
  {
    requirePermission: Permission.TOURISM_ADVISORIES_WRITE,
    requireCSRF: true,
  }
);
