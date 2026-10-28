# CMS database and publishing

The website, the CMS editor (`/admin/`) and the CMS API (`/api/cms/...`) are one Next.js app. The API lives in `app/api/cms/[...path]/route.js` and `lib/cms-server/`. Content and uploaded images are stored in one **SQLite** database file (`lib/cms-server/sqlite.mjs`, driver `better-sqlite3`).

History: FastAPI + PostgreSQL until 2026-10-27; single Next.js + PostgreSQL on 2026-10-27; single Next.js + SQLite on Railway since 2026-10-28. The API contract, tables and rules did not change.

## Hosting (Railway)

SQLite needs a persistent disk, which Vercel functions do not have ([Vercel](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel)). The site therefore runs as **one Railway service**:

- `Dockerfile` + `railway.json` (health check `/api/cms/health/`).
- A Railway **volume mounted at `/data`**; the database is `/data/cms.sqlite` (plus `-wal`/`-shm` files).
- The image is built without the database (the volume is only mounted at runtime), with `CMS_RENDER_ON_DEMAND=1`: pages are not prerendered in Docker. Each page renders from the live database on its first visit and is cached; Publish/Unpublish invalidates the cache. The container starts in about a second; the health check (`/api/cms/health/`) creates the schema before Railway switches traffic. Local and CI builds still prerender every page.
- Run exactly **one replica**. SQLite is a single-server database.

The editor at `/admin/`:

- **Local draft mode:** works without a database. Save draft stays in the browser.
- **Database connected:** click **Connect CMS database** and enter the development token. Save draft writes to SQLite. Publish copies the saved revision to a separate public snapshot and refreshes the public pages immediately (`revalidatePath`). Unpublish is available for Blog posts.

## Environment variables (server only)

| Variable | Purpose |
| --- | --- |
| `CMS_DATABASE_PATH` | SQLite file path. Railway: `/data/cms.sqlite`. Without it the site renders the versioned content in `content/` and `/api/cms` returns 503. |
| `CMS_DEV_TOKEN` | Shared editor token, at least 32 characters. |
| `CMS_ENV` | Must be `development`. Production mode is refused until company sign-in replaces the shared token. |
| `SITE_URL` | Public origin for canonical URLs and the sitemap. |
| `CMS_IMPORT_DATABASE_URL` | One-time move from the former PostgreSQL database. Used only while the SQLite file is empty; remove it afterwards. |
| `CMS_ALLOWED_ORIGINS` | Optional extra origins for cross-origin API calls. Same-origin requests need nothing. |

Never put the token in a `NEXT_PUBLIC_` variable.

## Local development

```bash
npm ci
CMS_DATABASE_PATH=.cms-data/cms.sqlite CMS_DEV_TOKEN='<at least 32 random characters>' CMS_ENV=development npm run dev
```

Open http://localhost:3000/admin/, click **Connect CMS database** and enter the same token. The first start creates the schema and imports the current 33 People records, the Home page and the three legacy Blog posts. Restarts never overwrite existing content.

## Backups

Everything (content, history, images) is in the one database file. Two layers:

1. **Daily copies on the volume:** the running server writes `/data/backups/cms-YYYY-MM-DD.sqlite` once a day and keeps 7 (`CMS_BACKUP_DIR`, `CMS_DAILY_BACKUPS=0` to turn off). They help after a bad edit or a damaged file, not if the volume is lost. Railway's own volume backups need a Pro workspace; enable them (daily + weekly) after upgrading.
2. **A copy outside Railway:** in `/admin/`, after connecting, click **Download database backup**, or run `CMS_URL=https://<site> CMS_DEV_TOKEN=<token> npm run cms:backup` (saves `backups/kai-ming-cms-YYYY-MM-DD.sqlite`; the folder is git-ignored). The file is a consistent online copy (`/api/cms/admin/backup/`). Download one before large changes.

To restore (a daily copy or a downloaded file): open a shell on the service (`railway ssh`), stop writes, replace `/data/cms.sqlite` with the copy and delete `cms.sqlite-wal` / `cms.sqlite-shm`, then redeploy.

## What Publish does

- Draft and published JSON snapshots are separate. Save draft never changes published content.
- Every save requires the current revision number. A stale save or publish returns HTTP 409. Writes run in `BEGIN IMMEDIATE` transactions.
- Public endpoints and pages return only published snapshots.
- Blog publishing requires a unique slug (generated from the title when empty), a supported language and an article body. A unique constraint protects slug publication.
- People placements come from the server's versioned registry. Existing slots cannot be removed.
- Story URLs are `/stories/<slug>/` (also `/zh/` and `/es/`); new slugs render on first request.

## Images

Uploads go to `/api/cms/admin/media/upload`. The server re-encodes them as JPEG (max 1600 px, 20 MP limit, metadata removed) and stores the bytes in the database (`cms_media.data`), addressed by SHA-256, served from `/api/cms/media/<hash>.jpg` with long-term caching. Maximum 1,000 images; deletion is intentionally unavailable so published pages never get broken links.

## Validation

```bash
npm run cms:test      # API tests on a temporary SQLite file
npm run check
npm run build
```

The single bearer token grants all editing and publishing permissions and is for development only. Company Google sign-in, roles and named audit must replace it before staff rollout.
