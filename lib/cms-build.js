// Server-side access to published CMS content (build time and on-demand regeneration).
// Reads PostgreSQL directly; publishing revalidates the pages, so the HTML stays current.
import { cache } from 'react';
import { SLUG_PATTERN as SLUG, slugify } from './slug';
import { cms, databaseUrl } from './cms-server';

// Migration provenance (original Wix URLs) is never rendered; keep it out of page data.
const strip = (item) => { if (!item || typeof item !== 'object') return item; const { sourceUrl, sourcePhoto, ...rest } = item; return rest; };

// One read per kind per render; never cached across requests so revalidation sees new content.
const getPublic = cache(async (kind) => {
  if (!databaseUrl()) return null;
  try {
    const instance = cms();
    await instance.init();
    return (await instance.routes.publicList(kind)).map(strip);
  } catch (error) {
    // At build time fall back to the versioned content. At request time fail the
    // regeneration instead, so Next.js keeps serving the last good page.
    if (process.env.NEXT_PHASE !== 'phase-production-build') throw error;
    console.warn(`CMS read failed for ${kind}: ${error.message}`);
    return null;
  }
});

// Published posts with a valid slug. When the same slug exists in more than
// one source language, the English post owns the clean URL.
export async function publishedPosts() {
  const items = await getPublic('posts');
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
  const items = await getPublic('pages');
  const page = Array.isArray(items) ? items.find((item) => item?.id === 'home') : null;
  return page?.values ? page : null;
}

export async function publishedPeople() {
  const items = await getPublic('people');
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
