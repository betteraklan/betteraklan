# Tourism Advisories API

Travel advisories (closures, access changes, events) shown on the tourism
Explore map and municipality pages. Admins post them from
`/admin/tourism/advisories`; the public pages read them from the API and fall
back to the bundled `src/data/tourism/advisories.json` if the API is down.

## Deploying (maintainers)

The deploy workflow (`.github/workflows/deploy.yml`) deploys code only. It
does **not** run D1 migrations, so whoever has access to the Cloudflare
account that owns the `BETTERLB_DB` database (`database_id` in
`wrangler.jsonc`) must migrate the live database. Do it **before** merging,
because pull-request previews use the same database.

Run from the repository root, logged in to that Cloudflare account
(`npx wrangler login`):

1. **Check what's applied (read-only):**

   ```sh
   npx wrangler d1 execute BETTERLB_DB --remote \
     --command "SELECT name FROM schema_migrations ORDER BY name"
   npx wrangler d1 execute BETTERLB_DB --remote \
     --command "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('admin_audit_log','tourism_advisories')"
   ```

2. **Apply pending migrations:**

   ```sh
   npm run db:migrate:remote
   ```

   The script lists the pending files and asks for `yes`. Expect at least:
   - `005_tourism_advisories.sql`: creates `tourism_advisories`
   - `006_admin_audit_log.sql`: creates `admin_audit_log` if missing (no-op
     if it already exists)

   Both only add tables. Nothing on the current site reads them, so it is
   safe to run before the code ships. If step 1 shows older migrations
   missing, the script applies those too; review the list before typing
   `yes`.

3. **Give editors access:** anyone who posts advisories must be in
   `AUTHORIZED_USERS` and in `EDITOR_USERS` or `ADMIN_USERS` (Pages project →
   Settings → Variables). Users only in `AUTHORIZED_USERS` can view but not
   change advisories.

4. **Smoke test** (on the preview, then production):
   - `GET /api/tourism/advisories` returns `{"advisories":[...]}`.
   - In `/admin/tourism/advisories`, create a test advisory for a town and
     check it appears on `/tourism/<town>` and in the Explore town card, then
     unpublish it and check it disappears (allow ~2 minutes for caching).

If the migration is skipped, the public API returns 500 and the pages show
the bundled list with a "Live notices couldn't be loaded" note; the admin
page shows an error. Nothing else on the site is affected.

## Public endpoint

`GET /api/tourism/advisories[?municipality=<slug>]`

Returns active advisories: published, started and not yet ended.

```json
{
  "advisories": [
    {
      "id": "…",
      "kind": "closure",
      "title": "Caticlan jetty port closed",
      "summary": "No trips to Boracay due to gale warning.",
      "affects": { "municipality": "malay", "place": "Caticlan Jetty Port" },
      "issuer": "PCG Aklan",
      "sourceUrl": "https://…",
      "publishedAt": "2026-11-14",
      "endsAt": "2026-11-16"
    }
  ]
}
```

- `municipality` must be a slug from `src/data/tourism/municipalities.json`,
  otherwise `400`.
- **Dates:** `YYYY-MM-DD` or a full timestamp with a time zone. A date-only
  start begins at 00:00 Philippine time, and a date-only end lasts through
  the end of that day.
- **Caching:** the published list is cached in KV for 5 minutes, and responses
  are cached for 2 minutes. Admin writes clear the KV entry. The time window
  is checked on every request, so ended advisories drop off immediately.

## Admin endpoints

All require an admin session. Writes also need an `X-CSRF-Token` header from
`GET /api/admin/auth/csrf`. Tokens are single-use, so fetch one per write.

| Method | Path                                  | Permission                 |
| ------ | ------------------------------------- | -------------------------- |
| GET    | `/api/admin/tourism/advisories`       | `tourism_advisories:read`  |
| POST   | `/api/admin/tourism/advisories`       | `tourism_advisories:write` |
| GET    | `/api/admin/tourism/advisories/:id`   | `tourism_advisories:read`  |
| PATCH  | `/api/admin/tourism/advisories/:id`   | `tourism_advisories:write` |

- Viewers can read; editors and admins can read and write.
- **Body fields:** `kind` (`closure` | `access` | `event`), `title`, `summary`,
  `municipality` (slug or `null` for province-wide), `place`, `issuer`,
  `sourceUrl` (http/https), `publishedAt`, `endsAt`, `isPublished`. Unknown
  fields are ignored.
- **PATCH** changes only the fields sent. Send `{"isPublished": false}` to
  unpublish. Advisories are never hard-deleted.
- **Validation errors** return `400` with per-field messages in `details`.
- **Rate limit:** 30 writes per minute per user (`429`).
- **Audit log:** every write is recorded in `admin_audit_log`
  (`create_`/`update_`/`publish_`/`unpublish_tourism_advisory`).

Code: `functions/api/tourism/advisories.ts`,
`functions/api/admin/tourism/advisories/`, `functions/lib/tourism-advisories*.ts`,
`src/lib/tourism/advisor*.ts`, `src/pages/admin/TourismAdvisories.tsx`.
