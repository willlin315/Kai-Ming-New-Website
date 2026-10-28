import fs from 'node:fs';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
// Old-site (.aspx) and former Wix URLs. Served by Next.js so they work on any host.
const legacyRedirects = JSON.parse(fs.readFileSync(new URL('./redirects.json', import.meta.url), 'utf8'));

export default {
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
  // Native SQLite driver: load it from node_modules at runtime instead of bundling it.
  serverExternalPackages: ['better-sqlite3'],
  // Railway builds at start-up inside the running container; many parallel
  // workers exceed its memory. NEXT_BUILD_CPUS limits them (default: Next.js).
  ...(process.env.NEXT_BUILD_CPUS
    ? { experimental: { cpus: Number(process.env.NEXT_BUILD_CPUS), workerThreads: false } }
    : {}),
  async redirects() {
    return legacyRedirects;
  },
  // Static widget folders in public/ are served by their index.html (the old static export did this automatically).
  async rewrites() {
    return { beforeFiles: [{ source: '/widgets/eligibility/', destination: '/widgets/eligibility/index.html' }] };
  },
};
