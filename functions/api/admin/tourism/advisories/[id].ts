/**
 * Admin Tourism Advisory API
 * GET   /api/admin/tourism/advisories/:id - Fetch one advisory
 * PATCH /api/admin/tourism/advisories/:id - Update fields; send
 *       { "isPublished": false } to unpublish (rows are never hard-deleted)
 */
import {
  afterWrite,
  findAdvisory,
  json,
  limitWrites,
  readJsonObject,
  validationError,
} from '../../../../lib/tourism-advisories-admin';
import {
  EDITABLE_FIELDS,
  toInput,
  validateAdvisory,
} from '../../../../lib/tourism-advisories';
import type { Env } from '../../../../types';
import { withAuth, type AuthContext } from '../../../../utils/admin-auth';
import { assertWriteSuccess } from '../../../../utils/db';
import { Permission } from '../../../../utils/rbac';

type Params = { id?: string | string[] };
type Ctx = { request: Request; env: Env; params?: Params; auth: AuthContext };

const notFound = () => json({ error: 'Advisory not found' }, 404);

function idFrom(params?: Params): string | null {
  const id = params?.id;
  return typeof id === 'string' && id.length > 0 && id.length <= 64 ? id : null;
}

async function handleGet({ env, params }: Ctx): Promise<Response> {
  const id = idFrom(params);
  if (!id) return notFound();
  try {
    const advisory = await findAdvisory(env, id);
    return advisory ? json({ advisory }) : notFound();
  } catch (error) {
    console.error('Admin advisory fetch error:', error);
    return json({ error: 'Failed to fetch advisory' }, 500);
  }
}

async function handlePatch({
  request,
  env,
  params,
  auth,
}: Ctx): Promise<Response> {
  const id = idFrom(params);
  if (!id) return notFound();

  const limited = await limitWrites(env, auth);
  if (limited) return limited;

  const body = await readJsonObject(request);
  if (body instanceof Response) return body;

  const changes: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) changes[field] = body[field];
  }
  if (Object.keys(changes).length === 0) {
    return validationError({ body: 'No editable fields provided' });
  }

  try {
    const existing = await findAdvisory(env, id);
    if (!existing) return notFound();

    // Validate the merged result so cross-field rules (dates) always hold.
    const result = validateAdvisory({ ...toInput(existing), ...changes });
    if (!result.ok) return validationError(result.errors);
    const v = result.value;

    const write = await env.BETTERLB_DB.prepare(
      `UPDATE tourism_advisories
          SET kind = ?2, title = ?3, summary = ?4, municipality = ?5,
              place = ?6, issuer = ?7, source_url = ?8, published_at = ?9,
              ends_at = ?10, is_published = ?11, updated_at = datetime('now')
        WHERE id = ?1`
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
    assertWriteSuccess(write, 'update tourism advisory');

    const updated = await findAdvisory(env, id);
    if (!updated) return notFound();

    const action =
      existing.isPublished === updated.isPublished
        ? 'update'
        : updated.isPublished
          ? 'publish'
          : 'unpublish';
    await afterWrite(env, auth, action, updated, changes);
    return json({ advisory: updated });
  } catch (error) {
    console.error('Admin advisory update error:', error);
    return json({ error: 'Failed to update advisory' }, 500);
  }
}

type RouteCtx = { request: Request; env: Env; params?: Params };

export const onRequestGet = withAuth<RouteCtx>(handleGet, {
  requirePermission: Permission.TOURISM_ADVISORIES_READ,
});

export const onRequestPatch = withAuth<RouteCtx>(handlePatch, {
  requirePermission: Permission.TOURISM_ADVISORIES_WRITE,
  requireCSRF: true,
});
