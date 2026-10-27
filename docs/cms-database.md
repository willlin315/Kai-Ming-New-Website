# CMS database and publishing

The website and the CMS API are one Next.js app. The API is served by the site itself at `/api/cms/...` (`app/api/cms/[...path]/route.js`, logic in `lib/cms-server/`). There is no separate backend service. The previous FastAPI service (`backend/`) was removed on 2026-10-27; its API contract, tables and tests were carried over unchanged.

The editor at `/admin/` runs in two modes:

- **Local draft mode:** works without a database. Save draft stays in the browser; no publishing action is shown.
- **Database connected:** click **Connect CMS database** and enter the development token. Save draft writes to PostgreSQL. Publish copies the saved revision to a separate public snapshot and refreshes the public pages immediately (`revalidatePath`). Unpublish is available for Blog posts. Existing People slots cannot be removed.

## Environment variables (server only)

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string. On Vercel use the Railway Postgres public (TCP proxy) URL. SSL is used unless the host is localhost or the URL has `sslmode=disable`. A `postgresql+psycopg://` prefix is accepted. |
| `CMS_DEV_TOKEN` | Shared editor token, at least 32 characters. |
| `CMS_ENV` | Must be `development`. Production mode is refused until company sign-in replaces the shared token. |
| `CMS_ALLOWED_ORIGINS` | Optional extra comma-separated origins for cross-origin API calls. Same-origin requests need nothing. |
| `CMS_LEGACY_MEDIA_ORIGIN` | Optional. Where images uploaded to the old FastAPI service are copied from on first start (default: the old Railway API). Set to empty to skip. |

Never put the token or `DATABASE_URL` in a `NEXT_PUBLIC_` variable. `NEXT_PUBLIC_CMS_API_URL` is no longer used.

Without `DATABASE_URL` the public site still builds and renders from the versioned content in `content/`, and `/api/cms` returns 503.

## Local development

```bash
npm ci
npm run cms:db        # local PostgreSQL engine (PGlite) on 127.0.0.1:55432, data in .cms-data/postgres
```

In a second terminal:

```bash
DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:55432/postgres?sslmode=disable' \
CMS_DEV_TOKEN='<at least 32 random characters>' CMS_ENV=development CMS_DB_POOL_MAX=1 \
npm run dev
```

Open http://localhost:3000/admin/, click **Connect CMS database** and enter the same token. PGlite accepts a single connection, so keep `CMS_DB_POOL_MAX=1` with it. For a standard PostgreSQL 17, run `docker compose up` (see `compose.yaml`) and point `DATABASE_URL` at it.

First start creates the schema and imports the current 33 People records, the Home page and the three legacy Blog posts. Restarts never overwrite existing content.

## What Publish does

- Draft and published JSON snapshots are separate. Save draft never changes published content.
- Every save requires the current revision number. A stale save or publish returns HTTP 409.
- Publish writes the snapshot and an audit event in one transaction. Public endpoints return only published snapshots.
- Blog publishing requires a unique slug (generated from the title when empty), a supported language and an article body. A unique constraint protects simultaneous slug publication.
- People placements come from the server's versioned registry. Existing slots and counts are retained.
- Pages read published content from the database on the server; publishing refreshes them right away. Story URLs are `/stories/<slug>/` (also `/zh/` and `/es/`); new slugs render on first request.

## Images

Uploads go to `/api/cms/admin/media/upload`. The server re-encodes them as JPEG (max 1600 px, 20 MP limit, metadata removed) and stores the bytes in PostgreSQL (`cms_media.data`), addressed by SHA-256. They are served from `/api/cms/media/<hash>.jpg` with long-term caching. Maximum 1,000 images; deletion is intentionally unavailable so published pages never get broken links.

On first start against the old Railway database, images that were uploaded to the FastAPI service are copied into the database (hash verified) and their URLs in drafts, published snapshots and history are rewritten to `/api/cms/media/...`. Back up the database before that first start.

## Validation

```bash
npm run cms:test      # API tests; uses PGlite, or TEST_DATABASE_URL for a real PostgreSQL
npm run check
npm run build
```

Tests cover authorization, seed counts, draft/public isolation, publish/unpublish, stale revisions, slug uniqueness, People placements, idempotent import, image storage, legacy image copy and page refresh. GitHub Actions runs them against PostgreSQL 17.

The single bearer token grants all editing and publishing permissions and is for development only. Company Google sign-in, roles and named audit must replace it before staff rollout.
