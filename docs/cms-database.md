# CMS database and publishing

The website, the CMS editor (`/admin/`) and the CMS API (`/api/cms/...`) are one Next.js app. The API lives in `app/api/cms/[...path]/route.js` and `lib/cms-server/`. Content and uploaded images are stored in one **SQLite** database file (`lib/cms-server/sqlite.mjs`, driver `better-sqlite3`).

History: FastAPI + PostgreSQL until 2026-10-27; single Next.js + PostgreSQL on 2026-10-27; single Next.js + SQLite on Railway since 2026-10-28. The API contract, tables and rules did not change.

## Hosting (Railway)

SQLite needs a persistent disk, which Vercel functions do not have ([Vercel](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel)). The site therefore runs as **one Railway service**:

- `Dockerfile` + `railway.json` (health check `/api/cms/health/`).
- A Railway **volume mounted at `/data`**; the database is `/data/cms.sqlite` (plus `-wal`/`-shm` files).
- The volume is only mounted at runtime, so the container runs `npm run start:railway` (`next build && next start`): pages are prerendered from the published database content at start-up. A deploy takes a few minutes; Railway keeps the previous deployment live until the health check passes.
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

Everything (content, history, images) is in the volume. Back up with Railway volume backups, or copy a consistent snapshot from the running service: `sqlite3 /data/cms.sqlite ".backup /data/backup.sqlite"`. Do not copy the `.sqlite` file alone while the server is writing; include the `-wal` file or use `.backup`.

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
