# Kai Ming new website

Next.js frontend migration of the English Wix design reference. Company CMS and form backend integration will follow later.

```sh
npm ci
npm run dev
```

Open http://localhost:3000/en/. Each of the 24 English pages has its own URL. Page HTML/CSS lives in content/pages; photo assets live in public/media. Update the content provider in lib/content.js when the company CMS API is ready.

```sh
npm run check
npm run build
```

The build generates out/ for static hosting. The Next.js static export is the current preview mode, not a constraint on future server-based hosting. Read [migration findings](docs/migration-notes.md) and [photo provenance](docs/photo-migration.json) before launching.

The original index.html remains the existing GitHub Pages preview; it is not used by Next.js. The Next.js migration is on a separate review branch.
