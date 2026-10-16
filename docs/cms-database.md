# Development database and publishing

The CMS can run in two explicit modes:

- **Local draft mode:** the hosted preview works without an API. Save draft stays in the browser; no publishing action is shown.
- **Database connected:** the editor authenticates to a development FastAPI backend. Save draft persists to PostgreSQL. Publish copies the saved revision to a separate public snapshot. Unpublish is available for Blog posts. Existing People slots cannot be removed through this API.

## Local development, one command

Requires Node.js and Python 3.12+. From the repository root:

```bash
npm ci
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements-dev.txt
python scripts/run-cms-dev.py
```

Open http://localhost:3000/admin/. Click **Connect development API**, enter http://127.0.0.1:8000 and the local token from `.cms-data/dev-token.txt`. The launcher generates the credential privately; it is ignored by Git. Do not publish or share this file. Editor credentials remain in browser memory only and must be entered again after reloading.

The local database runs PGlite (an embedded PostgreSQL engine) behind the PostgreSQL wire protocol. Its persistent data lives in `.cms-data/postgres`. This is a development convenience, not a hosted database or a production replacement for PostgreSQL. Back up draft data before deleting this directory. Do not run multiple launchers against the same directory or port.

The runtime directory is not part of Git and is not durably hosted in the assistant workspace. Recreate it from the versioned source on a developer machine. Use company Cloud SQL or a separately provisioned development PostgreSQL service for shared/always-on access.

## Standard PostgreSQL / Docker

`compose.yaml` runs PostgreSQL 17 and the API, with a persistent named volume and API binding to loopback only. Create an ignored root `.env` with distinct, randomly generated `POSTGRES_PASSWORD` (URL-safe characters) and `CMS_DEV_TOKEN` values, then:

```bash
docker compose up --build
```

For another PostgreSQL instance, configure `DATABASE_URL` with a `postgresql+psycopg://` connection URL, `CMS_DEV_TOKEN` (at least 32 random characters), `CMS_ENV=development` and explicit comma-separated `CMS_ALLOWED_ORIGINS`, then run:

```bash
uvicorn backend.asgi:app --host 127.0.0.1 --port 8000
```

First startup creates the initial schema and imports the current 33 People records and three legacy Blog links. Repeated starts do not overwrite existing content. This is the initial schema; future structural changes need a reviewed migration before running against existing company data.

## What Publish does

- Draft and published JSON snapshots are separate. Save draft never changes published content.
- Every save requires the current revision number. A stale save or publish returns HTTP 409 and leaves content unchanged.
- Publish creates a snapshot and audit event in one database transaction. Public endpoints return only published snapshots, with no draft metadata.
- Blog publishing requires a valid unique slug, supported language and article body. A PostgreSQL unique constraint also protects simultaneous slug publication.
- People placement bindings come from the server's versioned registry, not arbitrary client-provided IDs. Existing slots and counts are retained.
- Raster image drafts are currently stored as data URLs in the JSON document, limited by the request-size guard. Cloud Storage media upload is still a later integration.
- API-connected pages read published content after loading. For this first integration they do not require a website rebuild. Set `NEXT_PUBLIC_CMS_API_URL` at build time for every visitor to use the same API.
- Blog list stays at `/en/blog/`; new article details are at `/en/story/?slug=...&language=en`. Query-based article routes are a development compromise; server-rendered clean URLs and per-article SEO remain future work.

## Hosted preview and shared database

The current Vercel preview includes the connection UI and API client but does **not** run this Python server or provision PostgreSQL. A durable backend host and database are still required. Choose a developer-owned account or company Cloud Run/Cloud SQL, deploy the API with HTTPS, configure its origins and secret values, and set the frontend's public API origin. Never set the admin token or DATABASE_URL in a NEXT_PUBLIC variable.

Entering an API URL in the editor only configures that browser's public content reads. To make all devices read published updates, configure `NEXT_PUBLIC_CMS_API_URL` on the website deployment. Localhost API connections from an HTTPS preview can be blocked by browser local-network/mixed-content rules; use the local development website for local testing or an HTTPS hosted API for the preview.

The single bearer credential grants all CMS editing/publishing permissions and is strictly for development. Production mode is refused. Company Google SSO, individual roles, actor identity, credential lifecycle and deployment review must replace it before staff rollout. API docs are available at `/docs` for integration work. Do not enter internal or sensitive data during this development phase.

Database-connected preview links use a same-browser snapshot cache refreshed on connect/save/publish; this cache is for preview only and is not the authoritative storage. Other devices connect to the API to retrieve the durable drafts. Browser-local drafts are not automatically uploaded or overwritten when switching modes. Bulk migration of old browser drafts remains an explicit follow-up step.

## Validation

```bash
# Self-contained isolated PostgreSQL-compatible engine test:
python scripts/test-cms-backend.py

# Native PostgreSQL integration test (use an isolated test database):
TEST_DATABASE_URL='postgresql+psycopg://.../cms_test' python -m pytest backend/tests -q
npm run check
npm run build
```

Tests cover authorization, seed counts, draft/public isolation, publish/unpublish, stale revision rejection, slug uniqueness, immutable People placements and idempotent import. GitHub Actions also runs the suite against native PostgreSQL 17. Existing source content is seeded as published solely to retain the current development site's output.
