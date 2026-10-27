// Server-only CMS instance for route handlers and server components. Never import from client code.
import pg from 'pg';
import { revalidatePath } from 'next/cache';
import { createCms } from './core.mjs';
import people from '../../content/people.json';
import blogPosts from '../../content/blog-posts.json';
import homeContent from '../../content/home-content.json';
import homeFields from '../../content/home-fields.json';
import dictionary from '../../content/i18n/site.json';

export function databaseUrl() {
  const value = process.env.DATABASE_URL || '';
  return /^postgres(ql)?(\+psycopg)?:\/\//.test(value) ? value.replace(/^postgres(ql)?\+psycopg:/, 'postgresql:') : '';
}

function makePool() {
  const connectionString = databaseUrl();
  if (!connectionString) return null;
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString) || /sslmode=disable/.test(connectionString);
  return new pg.Pool({ connectionString, max: Number(process.env.CMS_DB_POOL_MAX) || 3, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 10_000,
    ...(local ? {} : { ssl: { rejectUnauthorized: false } }) });
}

const globalKey = Symbol.for('kai-ming.cms');
export function cms() {
  if (!globalThis[globalKey]) {
    globalThis[globalKey] = createCms({
      pool: makePool(),
      token: process.env.CMS_DEV_TOKEN || '',
      environment: process.env.CMS_ENV || 'development',
      legacyMediaOrigin: process.env.CMS_LEGACY_MEDIA_ORIGIN ?? 'https://kai-ming-new-website-production.up.railway.app',
      allowedOrigins: (process.env.CMS_ALLOWED_ORIGINS || '').split(',').map((v) => v.trim()).filter(Boolean),
      sources: { people, blogPosts, homeContent, homeFields, dictionary },
      // Published content changed: regenerate every page on its next visit.
      onPublicChange: () => { try { revalidatePath('/', 'layout'); } catch (error) { console.warn('Revalidation failed', error); } },
    });
  }
  return globalThis[globalKey];
}
