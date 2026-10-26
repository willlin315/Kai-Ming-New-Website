export const dynamic = 'force-static';
// Search engines are blocked until launch. Set SITE_INDEXABLE=true (and SITE_URL)
// on the production build to allow indexing; /admin and /styleguide stay blocked.
export default function robots() {
  const origin = process.env.SITE_URL;
  if (process.env.SITE_INDEXABLE !== 'true') return { rules: { userAgent: '*', disallow: '/' } };
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin/', '/styleguide/'] },
    ...(origin ? { sitemap: new URL('/sitemap.xml', origin).href } : {}),
  };
}
