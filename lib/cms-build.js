// Build-time access to published CMS content. Used only by server components
// during `next build`, so the static HTML already contains the published version.
import { validApiUrl } from './cms-api';
import { SLUG_PATTERN as SLUG, slugify } from './slug';
const cache = new Map();

export function buildApiUrl() {
  return validApiUrl(process.env.CMS_BUILD_API_URL || process.env.NEXT_PUBLIC_CMS_API_URL || '');
}

// Migration provenance (original Wix URLs) is never rendered; keep it out of page data.
const strip = (item) => { if (!item || typeof item !== 'object') return item; const { sourceUrl, sourcePhoto, ...rest } = item; return rest; };

async function getPublic(path) {
  const url = buildApiUrl();
  if (!url) return null;
  if (!cache.has(path)) {
    cache.set(path, fetch(`${url}${path}`, { signal: AbortSignal.timeout(15000) })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => (Array.isArray(data) ? data.map(strip) : data))
      .catch((error) => { console.warn(`CMS build fetch failed for ${path}: ${error.message}`); return null; }));
  }
  return cache.get(path);
}

// Published posts with a valid slug. When the same slug exists in more than
// one source language, the English post owns the clean URL.
export async function publishedPosts() {
  const items = await getPublic('/public/posts');
  if (!Array.isArray(items)) return [];
  const bySlug = new Map();
  for (const raw of items) {
    // Older imports were published without a slug; derive one from the title
    // (same rule as the CMS backend) so they still get a public page.
    const item = raw && !raw.slug ? { ...raw, slug: slugify(raw.title, raw.id) } : raw;
    if (typeof item?.slug !== 'string' || !SLUG.test(item.slug)) continue;
    const existing = bySlug.get(item.slug);
    if (!existing || (existing.language !== 'en' && item.language === 'en')) bySlug.set(item.slug, item);
  }
  return [...bySlug.values()];
}

export async function publishedPost(slug) {
  return (await publishedPosts()).find((post) => post.slug === slug) || null;
}

export async function publishedHome() {
  const items = await getPublic('/public/pages');
  const page = Array.isArray(items) ? items.find((item) => item?.id === 'home') : null;
  return page?.values ? page : null;
}

export async function publishedPeople() {
  const items = await getPublic('/public/people');
  return Array.isArray(items) && items.length ? items : null;
}

// Absolute URL for social cards. Data URLs cannot be used by crawlers.
export function absoluteImage(value, origin) {
  if (typeof value !== 'string' || !value) return undefined;
  if (/^https:\/\//i.test(value)) return value;
  if (value.startsWith('/') && !value.startsWith('//') && origin) return new URL(value, origin).href;
  return undefined;
}

export function plainText(html = '', limit = 200) {
  const text = String(html).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  return text.length > limit ? `${text.slice(0, limit - 1).trimEnd()}…` : text;
}
