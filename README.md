# Kai Ming new website

Single Next.js app: the public website (English, Traditional Chinese, Spanish), the CMS editor at `/admin/` and the CMS API at `/api/cms/`, backed by PostgreSQL.

```sh
npm ci
npm run dev
```

Open http://localhost:3000/. English pages live at the root (`/our-centers/`); Chinese and Spanish use `/zh/` and `/es/`. Page HTML/CSS lives in content/pages; photo assets live in public/media. The site renders without a database; to use the CMS locally see [CMS database and publishing](docs/cms-database.md).

```sh
npm run check
npm run cms:test
npm run build
```

Hosting is Vercel (Next.js server build). Read [migration findings](docs/migration-notes.md), [handoff](docs/handoff.md) and [photo provenance](docs/photo-migration.json) before launching.
