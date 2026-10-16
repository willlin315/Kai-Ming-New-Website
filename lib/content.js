import fs from 'node:fs';
import path from 'node:path';
import routes from '../content/routes.json';

export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
export const pageRoutes = routes;
export function hrefFor(key) {
  return `${basePath}/en/${key === 'home' ? '' : `${key}/`}`;
}
// Replace this local provider with the company CMS API when its contract is ready.
export function getPage(key) {
  if (!routes.some((route) => route.key === key)) return null;
  const page = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'content/pages', `${key}.json`), 'utf8'));
  return {
    ...page,
    key,
    html: page.html.replaceAll('__BASE__', basePath),
    css: page.css.replaceAll('__BASE__', basePath),
  };
}
export function getFonts() {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'content/fonts.json'), 'utf8')).replaceAll('__BASE__', basePath);
}
export function getMetadata(key) {
  const page = getPage(key);
  if (!page) return {};
  const origin = process.env.SITE_URL;
  return {
    title: page.title,
    ...(origin ? { alternates: { canonical: new URL(hrefFor(key), origin).href } } : {}),
  };
}
