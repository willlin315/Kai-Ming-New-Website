import { pageRoutes, hrefFor } from '../lib/content';
export const dynamic = 'force-static';
export default function sitemap() {
  const origin = process.env.SITE_URL;
  return origin ? pageRoutes.map(({ key }) => ({ url: new URL(hrefFor(key), origin).href })) : [];
}
