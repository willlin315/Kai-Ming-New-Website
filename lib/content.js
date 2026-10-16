import fs from 'node:fs';
import path from 'node:path';
import routes from '../content/routes.json';
import {translate,localePaths} from './i18n';
import {localizeHtml} from './localize-html';

export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
export const pageRoutes = routes;
export function hrefFor(key,locale='en') {
  return `${basePath}/${localePaths[locale]}/${key === 'home' ? '' : `${key}/`}`;
}
// Replace this local provider with the company CMS API when its contract is ready.
export function getPage(key,locale='en') {
  if (!routes.some((route) => route.key === key)) return null;
  const page = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'content/pages', `${key}.json`), 'utf8'));
  return {
    ...page,
    key, locale, title:translate(page.title,locale),
    html: localizeHtml(page.html.replaceAll('__BASE__', basePath),locale,key==='home'),
    css: page.css.replaceAll('__BASE__', basePath),
  };
}
export function getFonts() {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'content/fonts.json'), 'utf8')).replaceAll('__BASE__', basePath);
}
export function getMetadata(key,locale='en') {
  const page = getPage(key,locale);
  if (!page) return {};
  const origin = process.env.SITE_URL;
  return {
    title: page.title,
    ...(origin ? { alternates: { canonical: new URL(hrefFor(key,locale), origin).href, languages:Object.fromEntries(['en','zh-Hant','es'].map(l=>[l,new URL(hrefFor(key,l),origin).href])) } } : {}),
  };
}
