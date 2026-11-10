// Announcement bar: one line of text (per language) and an optional link, edited in the CMS under
// Page → Announcement bar and stored with the published Home record.
import homeSeed from '../content/home-content.json';
import { localePrefix } from './i18n';
import { basePath } from './client-routes';

// Internal links ("/how-to-enroll/") open the same page in the visitor's language; full URLs are kept as they are.
export function announcementHref(value, locale = 'en') {
  const href = String(value || '').trim();
  if (/^(?:https?:\/\/|mailto:|tel:)/i.test(href)) return href;
  if (!href.startsWith('/') || href.startsWith('//')) return '';
  if (/^\/(?:zh|es)(?:\/|$)/.test(href)) return `${basePath}${href}`;
  return `${basePath}${localePrefix(locale)}${href}`;
}

export function announcementFrom(record, locale = 'en') {
  const values = record?.values || {};
  const text = values['announcement-text'] || homeSeed.values['announcement-text'];
  const link = values['announcement-link'] || homeSeed.values['announcement-link'];
  const line = (typeof text?.[locale] === 'string' && text[locale].trim()) || text?.en?.trim() || '';
  if (!line) return null;
  return { text: line, href: announcementHref(link?.href, locale) };
}
