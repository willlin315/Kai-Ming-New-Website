// Server-only CMS instance for route handlers and server components. Never import from client code.
import { revalidatePath } from 'next/cache';
import { createCms } from './core.mjs';
import { openSqlite } from './sqlite.mjs';
import { postgresImporter } from './import-postgres.mjs';
import people from '../../content/people.json';
import blogPosts from '../../content/blog-posts.json';
import homeContent from '../../content/home-content.json';
import homeFields from '../../content/home-fields.json';
import dictionary from '../../content/i18n/site.json';

// Path of the SQLite database file, e.g. /data/cms.sqlite on the Railway volume.
export function databasePath() {
  return (process.env.CMS_DATABASE_PATH || '').trim();
}

const globalKey = Symbol.for('kai-ming.cms');
export function cms() {
  if (!globalThis[globalKey]) {
    const file = databasePath();
    const importUrl = process.env.CMS_IMPORT_DATABASE_URL || '';
    globalThis[globalKey] = createCms({
      pool: file ? openSqlite(file) : null,
      token: process.env.CMS_DEV_TOKEN || '',
      environment: process.env.CMS_ENV || 'development',
      legacyMediaOrigin: process.env.CMS_LEGACY_MEDIA_ORIGIN || '',
      importSource: importUrl ? postgresImporter(importUrl) : null,
      allowedOrigins: (process.env.CMS_ALLOWED_ORIGINS || '').split(',').map((v) => v.trim()).filter(Boolean),
      sources: { people, blogPosts, homeContent, homeFields, dictionary },
      // Published content changed: regenerate every page on its next visit.
      onPublicChange: () => { try { revalidatePath('/', 'layout'); } catch (error) { console.warn('Revalidation failed', error); } },
    });
  }
  return globalThis[globalKey];
}
