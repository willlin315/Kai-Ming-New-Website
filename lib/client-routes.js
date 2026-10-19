import routes from '../content/routes.json';
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
// Internal page keys keep the original Wix names so CMS placements stay stable.
// Public URLs use the clean `slug` when one is defined.
export const legacyRoutes = routes.map((route) => route.key);
export function slugFor(key) {
  return routes.find((route) => route.key === key)?.slug || key;
}
export function keyForSlug(slug) {
  return routes.find((route) => (route.slug || route.key) === slug)?.key || null;
}
export const renamedRoutes = routes.filter((route) => route.slug).map(({ key, slug }) => [key, slug]);
