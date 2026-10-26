import fs from 'node:fs';
import path from 'node:path';
import routes from '../content/routes.json';
import {translate,localePaths} from './i18n';
import {localizeHtml} from './localize-html';
import {slugFor,keyForSlug,renamedRoutes} from './client-routes';
import {brandCss,brandHtml} from './brand';

export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
export const pageRoutes = routes;
export function hrefFor(key,locale='en') {
  return `${basePath}/${localePaths[locale]}/${key === 'home' ? '' : `${slugFor(key)}/`}`;
}
export {slugFor};
// Rewrite exported Wix links (/en/copy-of-…/) to the clean public slugs.
function cleanLinks(html) {
  return renamedRoutes.reduce((out,[key,slug])=>out.replaceAll(`/en/${key}/`,`/en/${slug}/`),html);
}
// Replace this local provider with the company CMS API when its contract is ready.
// Wix pages without an <h1> mark their first h2/h3 as the main heading for
// assistive technology. The tag is unchanged so the Wix styles still match.
export function promoteHeading(html) {
  if (/<h1[\s>]|aria-level="1"/i.test(html)) return html;
  return html.replace(/<(h[23])(?=[\s>])/i, '<$1 role="heading" aria-level="1"');
}
// Wix list repeaters (role="list") need role="listitem" on their item cards.
export function repeaterListItems(html) {
  return html.replace(/(<fluid-columns-repeater[^>]*role="list"[^>]*>)([\s\S]*?)(<\/fluid-columns-repeater>)/g, (_, open, body, close) =>
    open + body.replace(/<div (class="[^"]*\bwixui-repeater__item\b[^"]*")(?![^>]*\brole=)/g, '<div role="listitem" $1') + close);
}
export function getPage(slug,locale='en') {
  const key = slug === 'home' ? 'home' : keyForSlug(slug);
  if (!key) return null;
  const page = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'content/pages', `${key}.json`), 'utf8'));
  return {
    ...page,
    key, locale, title:translate(page.title,locale),
    slug: slugFor(key),
    html: brandLogo(brandHtml(repeaterListItems(promoteHeading(localizeHtml(cleanLinks(page.html.replaceAll('__BASE__', basePath)),locale,key==='home'))))),
    css: brandCss(page.css.replaceAll('__BASE__', basePath)),
  };
}
// The Wix header logo becomes the brand-book stacked logo (vector).
function brandLogo(html) {
  return html.replaceAll(`${basePath}/media/kai-ming-logo.png`, `${basePath}/brand/kai-ming-stacked.svg`);
}
export function getFonts() {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'content/fonts.json'), 'utf8')).replaceAll('__BASE__', basePath);
}
export function getMetadata(slug,locale='en') {
  const page = getPage(slug,locale);
  if (!page) return {};
  const key = page.key;
  const origin = process.env.SITE_URL;
  return {
    title: page.title,
    ...(origin ? { alternates: { canonical: new URL(hrefFor(key,locale), origin).href, languages:{...Object.fromEntries(['en','zh-Hant','es'].map(l=>[l,new URL(hrefFor(key,l),origin).href])),'x-default':new URL(hrefFor(key,'en'),origin).href} } } : {}),
  };
}
