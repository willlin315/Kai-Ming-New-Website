// Kai Ming CMS API, served by Next.js route handlers (replaces the former FastAPI backend).
// SQLite (lib/cms-server/sqlite.mjs) holds separate draft/published snapshots, an audit trail and uploaded images.
// The standalone bearer credential is for development only; company SSO is required
// before a production rollout. Never expose the database file or the token to the browser.
import crypto from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import sharp from 'sharp';
import { slugify } from '../slug.js';

export const KINDS = ['posts', 'people', 'pages'];
const LOCALES = ['en', 'zh-Hant', 'es'];
const POST_FIELDS = new Set(['translations', 'title', 'slug', 'language', 'image', 'summary', 'body', 'bodyHtml', 'sourceUrl']);
const PEOPLE_FIELDS = new Set(['translations', 'name', 'title', 'center', 'department', 'email', 'phone', 'photo', 'bio', 'order', 'featured', 'placements', 'sourceUrl', 'sourcePhoto']);
// Migration provenance (original Wix URLs) stays in the CMS but is not published.
const PRIVATE_FIELDS = new Set(['sourceUrl', 'sourcePhoto']);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FILENAME_ALT = /(\.(jpe?g|png|webp|gif)$)|^(screenshot|image by|img_|dsc)/i;
const MAX_BODY = 1_500_000;
const MAX_MEDIA = 1000;
export const MEDIA_PATH = '/api/cms/media/';

export class HttpError extends Error {
  constructor(status, detail) { super(detail); this.status = status; this.detail = detail; }
}
const fail = (status, detail) => { throw new HttpError(status, detail); };
const clone = (value) => (value == null ? value : structuredClone(value));
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const same = (a, b) => isDeepStrictEqual(a ?? null, b ?? null);

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS cms_documents (
  kind TEXT NOT NULL, id TEXT NOT NULL, revision INTEGER NOT NULL,
  draft TEXT NOT NULL, published TEXT, published_revision INTEGER,
  published_slug TEXT, published_locale TEXT, updated_at TEXT NOT NULL,
  PRIMARY KEY (kind, id), CONSTRAINT cms_public_slug UNIQUE (kind, published_locale, published_slug));
CREATE TABLE IF NOT EXISTS cms_audit (
  id TEXT PRIMARY KEY, kind TEXT NOT NULL, document_id TEXT NOT NULL,
  action TEXT NOT NULL, revision INTEGER NOT NULL, snapshot TEXT NOT NULL,
  actor TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS cms_audit_document ON cms_audit (kind, document_id, created_at);
CREATE TABLE IF NOT EXISTS cms_media (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, alt TEXT NOT NULL,
  width INTEGER NOT NULL, height INTEGER NOT NULL, size INTEGER NOT NULL, created_at TEXT NOT NULL, data BLOB);`;
// ISO-8601 UTC timestamps sort correctly as text.
const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";
const parse = (value) => (typeof value === 'string' ? JSON.parse(value) : value);

const row = (r) => r && {
  kind: r.kind, id: r.id, revision: r.revision, draft: parse(r.draft),
  published: isObject(parse(r.published)) ? parse(r.published) : null, // JSON null and SQL NULL both mean "not published".
  published_revision: r.published_revision, published_slug: r.published_slug, published_locale: r.published_locale,
};

function snapshot(doc) {
  return { ...doc.draft, id: doc.id, _revision: doc.revision, _published_revision: doc.published_revision ?? null,
    _has_changes: doc.revision !== (doc.published_revision ?? null) };
}
function publicRecord(doc) {
  return { ...Object.fromEntries(Object.entries(doc.published).filter(([k]) => !PRIVATE_FIELDS.has(k))), id: doc.id };
}

async function audit(db, doc, action) {
  await db.query(`INSERT INTO cms_audit (id,kind,document_id,action,revision,snapshot,actor,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,${NOW})`,
    [crypto.randomUUID(), doc.kind, doc.id, action, doc.revision, JSON.stringify(doc.draft), 'development-editor']);
}
async function insertDoc(db, doc) {
  await db.query(`INSERT INTO cms_documents (kind,id,revision,draft,published,published_revision,published_slug,published_locale,updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,${NOW})`, [doc.kind, doc.id, doc.revision, JSON.stringify(doc.draft),
    doc.published == null ? null : JSON.stringify(doc.published), doc.published_revision ?? null, doc.published_slug ?? null, doc.published_locale ?? null]);
}
async function updateDoc(db, doc, touch = false) {
  await db.query(`UPDATE cms_documents SET revision=$3, draft=$4, published=$5, published_revision=$6, published_slug=$7,
    published_locale=$8${touch ? `, updated_at=${NOW}` : ''} WHERE kind=$1 AND id=$2`, [doc.kind, doc.id, doc.revision,
    JSON.stringify(doc.draft), doc.published == null ? null : JSON.stringify(doc.published), doc.published_revision ?? null,
    doc.published_slug ?? null, doc.published_locale ?? null]);
}
async function getDoc(db, kind, id) {
  const { rows } = await db.query(`SELECT * FROM cms_documents WHERE kind=$1 AND id=$2`, [kind, id]);
  return row(rows[0]);
}
async function allDocs(db, kind) {
  const { rows } = await db.query(`SELECT * FROM cms_documents${kind ? ' WHERE kind=$1' : ''} ORDER BY kind, id`, kind ? [kind] : []);
  return rows.map(row);
}
async function transaction(pool, work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally { client.release(); }
}

function validate(kind, payload, documentId, sources, original = null) {
  if (!isObject(payload)) fail(422, 'Content must be an object.');
  if (kind === 'pages') {
    if (documentId !== 'home') fail(422, 'Only the Home page is editable in this version.');
    const values = payload.values;
    const ids = sources.homeFields.map((f) => f.id);
    if (!isObject(values) || Object.keys(values).length !== ids.length || !ids.every((id) => id in values)) fail(422, 'Home fields must match the current template.');
    for (const field of sources.homeFields) {
      const value = values[field.id];
      const keys = field.type === 'text' ? ['en', 'zh-Hant', 'es'] : ['src', 'alt', 'position'];
      if (!isObject(value) || Object.keys(value).length !== keys.length || !keys.every((k) => k in value)
        || Object.values(value).some((v) => typeof v !== 'string' || v.length > 20_000)) fail(422, 'Invalid Home field value.');
      if (field.type === 'image') {
        if (value.src && !['/media/', MEDIA_PATH, 'https://'].some((p) => value.src.startsWith(p))) fail(422, 'Use an uploaded image or HTTPS image URL.');
        if (!/^(?:100|[0-9]{1,2})% (?:100|[0-9]{1,2})%$/.test(value.position)) fail(422, 'Invalid photo crop position.');
      }
    }
    return { title: 'Home', values: clone(values) };
  }
  const allowed = kind === 'posts' ? POST_FIELDS : PEOPLE_FIELDS;
  const result = Object.fromEntries(Object.entries(payload).filter(([k]) => allowed.has(k)));
  for (const [key, value] of Object.entries(result)) {
    if (key === 'translations') {
      const fields = new Set(kind === 'posts' ? ['title', 'summary', 'bodyHtml', 'body'] : ['name', 'title', 'bio']);
      if (!isObject(value) || Object.entries(value).some(([locale, values]) => !LOCALES.includes(locale) || !isObject(values)
        || Object.entries(values).some(([k, v]) => !fields.has(k) || typeof v !== 'string' || v.length > 600_000))) fail(422, 'Invalid translated content.');
      continue;
    }
    if (key === 'placements') continue;
    if (key === 'order') { if (!Number.isInteger(value) || value < 0) fail(422, 'Order must be a non-negative integer.'); }
    else if (key === 'featured') { if (typeof value !== 'boolean') fail(422, 'Featured must be true or false.'); }
    else if (typeof value !== 'string' || value.length > 600_000) fail(422, `Invalid ${key}.`);
  }
  const name = kind === 'posts' ? 'title' : 'name';
  if (!String(result[name] ?? '').trim() || !String(result.title ?? '').trim()) fail(422, 'Name and title are required.');
  if (result[name].length > 180) fail(422, 'Name or title is too long.');
  if (kind === 'posts') {
    if (!LOCALES.includes(result.language)) fail(422, 'Unsupported content language.');
    if (result.slug && !SLUG.test(result.slug)) fail(422, 'Use a lowercase URL slug with hyphens.');
  } else {
    // Slots are server-owned so editing never silently moves an existing person.
    const source = sources.people.find((p) => p.id === documentId);
    result.placements = clone((source || original || {}).placements || []);
  }
  return result;
}

async function uniqueSlug(db, base, language, key) {
  const taken = new Set();
  for (const doc of await allDocs(db, 'posts')) {
    if (doc.id === key) continue;
    if (doc.published_locale === language && doc.published_slug) taken.add(doc.published_slug);
    for (const content of [doc.draft, doc.published]) if (content && (content.language || 'en') === language && content.slug) taken.add(content.slug);
  }
  let slug = base;
  for (let n = 2; taken.has(slug); n += 1) slug = `${base}-${n}`;
  return slug;
}

// ---- One-time startup work (idempotent): schema, initial import, backfills, media move ----
async function seed(db, sources) {
  const posts = sources.blogPosts.map((p, i) => ({ ...p, id: `legacy-${i}`, slug: '', language: 'en', image: p.image.replaceAll('__BASE__', ''),
    sourceUrl: p.href, summary: '', body: '', bodyHtml: '' }));
  for (const [kind, records] of [['people', sources.people], ['posts', posts], ['pages', [sources.homeContent]]]) {
    for (const record of records) {
      if (await getDoc(db, kind, record.id)) continue;
      const content = validate(kind, record, record.id, sources);
      const doc = { kind, id: record.id, revision: 1, draft: content, published: clone(content), published_revision: 1 };
      await insertDoc(db, doc);
      await audit(db, doc, 'initial-import');
    }
  }
}
async function rewriteDocs(db, change, action) {
  for (const doc of await allDocs(db, null, true)) {
    const wasSame = same(doc.draft, doc.published);
    const draft = change(doc.draft, doc.kind);
    const published = doc.published == null ? null : change(doc.published, doc.kind);
    if (same(draft, doc.draft) && same(published, doc.published)) continue;
    doc.draft = draft; doc.published = published; doc.revision += 1;
    if (wasSame && published != null) doc.published_revision = doc.revision;
    await updateDoc(db, doc);
    await audit(db, doc, action);
  }
}
async function backfillTranslations(db, sources) {
  await rewriteDocs(db, (content, kind) => {
    if (kind === 'pages' || content == null) return content;
    const result = clone(content);
    for (const locale of ['zh-Hant', 'es']) {
      for (const field of kind === 'posts' ? ['title', 'summary', 'bodyHtml', 'body'] : ['name', 'title', 'bio']) {
        const text = sources.dictionary[result[field] || '']?.[locale];
        if (!text || field in (result.translations?.[locale] || {})) continue;
        result.translations ||= {};
        (result.translations[locale] ||= {})[field] = text;
      }
    }
    return result;
  }, 'add-translations');
}
async function backfillPostSlugs(db) {
  for (const doc of await allDocs(db, 'posts', true)) {
    if (doc.draft.slug && (doc.published == null || doc.published.slug)) continue;
    const wasSame = same(doc.draft, doc.published);
    const source = doc.published?.slug ? doc.published : doc.draft;
    const slug = source.slug || await uniqueSlug(db, slugify(source.title || '', doc.id), source.language || 'en', doc.id);
    doc.draft = { ...doc.draft, slug: doc.draft.slug || slug };
    if (doc.published != null) {
      doc.published = { ...doc.published, slug };
      doc.published_slug = slug; doc.published_locale = doc.published.language || 'en';
    }
    doc.revision += 1;
    if (wasSame && doc.published != null) doc.published_revision = doc.revision;
    await updateDoc(db, doc);
    await audit(db, doc, 'generate-slug');
  }
}
async function backfillHomeAlts(db, sources) {
  const defaults = sources.homeContent.values;
  const fix = (content) => {
    if (!content || !isObject(content.values)) return content;
    const result = clone(content);
    for (const [key, value] of Object.entries(result.values)) {
      const seed = defaults[key] || {};
      if (key.startsWith('image-') && isObject(value) && value.src === seed.src && seed.alt
        && (!String(value.alt || '').trim() || FILENAME_ALT.test(String(value.alt || '').trim()))) value.alt = seed.alt;
    }
    return result;
  };
  const doc = await getDoc(db, 'pages', 'home', true);
  if (!doc) return;
  const wasSame = same(doc.draft, doc.published);
  const draft = fix(doc.draft), published = fix(doc.published);
  if (same(draft, doc.draft) && same(published, doc.published)) return;
  doc.draft = draft; doc.published = published; doc.revision += 1;
  if (wasSame && published != null) doc.published_revision = doc.revision;
  await updateDoc(db, doc);
  await audit(db, doc, 'fix-image-alt');
}
// Images uploaded to the former FastAPI service lived on its disk. Copy them into the
// database once, then point content at this site's media route.
async function moveLegacyMedia(db, origin, fetchImpl) {
  if (!origin) return;
  const prefix = `${origin.replace(/\/$/, '')}/media/`;
  const pattern = new RegExp(`${prefix.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}([a-f0-9]{64})\\.jpg`, 'g');
  const docs = await allDocs(db);
  const wanted = new Set();
  for (const doc of docs) for (const m of JSON.stringify([doc.draft, doc.published]).matchAll(pattern)) wanted.add(m[1]);
  const { rows } = await db.query('SELECT id FROM cms_media WHERE data IS NULL');
  for (const r of rows) wanted.add(r.id);
  const moved = new Set();
  for (const id of wanted) {
    const { rows: [existing] } = await db.query('SELECT data IS NOT NULL AS ok FROM cms_media WHERE id=$1', [id]);
    if (existing?.ok) { moved.add(id); continue; }
    try {
      const response = await fetchImpl(`${prefix}${id}.jpg`, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) continue;
      const blob = Buffer.from(await response.arrayBuffer());
      if (crypto.createHash('sha256').update(blob).digest('hex') !== id) continue;
      const meta = await sharp(blob).metadata();
      await db.query(`INSERT INTO cms_media (id,name,alt,width,height,size,created_at,data) VALUES ($1,$2,'',$3,$4,$5,${NOW},$6)
        ON CONFLICT (id) DO UPDATE SET data=EXCLUDED.data`, [id, `${id.slice(0, 12)}.jpg`, meta.width, meta.height, blob.length, blob]);
      moved.add(id);
    } catch { /* Leave the old link in place; it is retried on the next start. */ }
  }
  if (!moved.size) return;
  const swap = (value) => (value == null ? value : JSON.parse(JSON.stringify(value).replace(pattern, (all, id) => (moved.has(id) ? `${MEDIA_PATH}${id}.jpg` : all))));
  await rewriteDocs(db, swap, 'move-media');
}

export function createCms({ pool, token = '', sources, environment = 'development', legacyMediaOrigin = '', importSource = null, fetchImpl = fetch, onPublicChange = () => {}, allowedOrigins = [] }) {
  let ready = null;
  async function initialize() {
    await transaction(pool, async (db) => {
      // BEGIN IMMEDIATE holds SQLite's write lock, so parallel build workers initialize one at a time.
      await db.query(SCHEMA);
      if (importSource) await importSource(db);
      await seed(db, sources);
      await backfillTranslations(db, sources);
      await backfillPostSlugs(db);
      await backfillHomeAlts(db, sources);
    });
    await transaction(pool, async (db) => {
      await moveLegacyMedia(db, legacyMediaOrigin, fetchImpl);
    });
  }
  const init = () => (ready ||= initialize().catch((error) => { ready = null; throw error; }));

  function configured() {
    if (!pool) fail(503, 'The CMS database is not configured.');
    if (environment !== 'development') fail(503, 'Standalone token mode is development-only. Configure company SSO before production.');
  }
  function editor(request) {
    if (token.length < 32) fail(503, 'Set a random CMS_DEV_TOKEN of at least 32 characters.');
    const header = request.headers.get('authorization') || '';
    const given = header.match(/^Bearer\s+(.+)$/i)?.[1] || '';
    const a = crypto.createHash('sha256').update(given).digest(), b = crypto.createHash('sha256').update(token).digest();
    if (!given || !crypto.timingSafeEqual(a, b)) fail(401, 'A valid development CMS token is required.');
  }
  async function readJson(request) {
    const raw = Buffer.from(await request.arrayBuffer());
    if (raw.length > MAX_BODY) throw new HttpError(413, 'Request exceeds 1.5 MB.');
    try { return JSON.parse(raw.toString('utf8') || 'null'); } catch { fail(422, 'Request body must be JSON.'); }
  }
  function revisionBody(body, minimum) {
    if (!isObject(body) || Object.keys(body).some((k) => k !== 'expected_revision' && k !== 'content')) fail(422, 'Invalid request body.');
    const revision = typeof body.expected_revision === 'string' && /^\d+$/.test(body.expected_revision) ? Number(body.expected_revision) : body.expected_revision;
    if (!Number.isInteger(revision) || revision < minimum) fail(422, 'Invalid expected_revision.');
    return revision;
  }
  async function locked(db, kind, key, expected) {
    const doc = await getDoc(db, kind, key);
    if (!doc) fail(404, 'Content not found.');
    if (doc.revision !== expected) fail(409, 'This record changed. Reload the latest version before saving or publishing.');
    return doc;
  }
  const mediaSnapshot = (m) => ({ id: m.id, name: m.name, alt: m.alt, width: m.width, height: m.height, size: m.size, url: `${MEDIA_PATH}${m.id}.jpg` });

  async function processImage(data) {
    const match = typeof data === 'string' && data.match(/^data:image\/(jpeg|png|webp|gif);base64,([A-Za-z0-9+/=]+)$/);
    if (!match || match[2].length % 4) throw new HttpError(422, 'Choose a valid raster image smaller than 20 megapixels.');
    try {
      const raw = Buffer.from(match[2], 'base64');
      const meta = await sharp(raw, { limitInputPixels: 20_000_000 }).metadata();
      if (!['jpeg', 'png', 'webp', 'gif'].includes(meta.format) || meta.width * meta.height > 20_000_000) throw Error();
      const { data: blob, info } = await sharp(raw, { limitInputPixels: 20_000_000 }).rotate()
        .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).flatten({ background: '#000000' })
        .jpeg({ quality: 85 }).toBuffer({ resolveWithObject: true });
      return { blob, width: info.width, height: info.height };
    } catch { throw new HttpError(422, 'Choose a valid raster image smaller than 20 megapixels.'); }
  }

  const routes = {
    async health() {
      await pool.query('SELECT 1');
      return { status: 'ok', environment: 'development' };
    },
    async mediaList() {
      const { rows } = await pool.query('SELECT id,name,alt,width,height,size FROM cms_media WHERE data IS NOT NULL ORDER BY created_at DESC LIMIT 1000');
      return rows.map(mediaSnapshot);
    },
    async mediaUpload(body) {
      if (!isObject(body) || Object.keys(body).some((k) => !['name', 'alt', 'data'].includes(k))) fail(422, 'Invalid request body.');
      const { name, alt = '', data } = body;
      if (typeof name !== 'string' || name.length < 1 || name.length > 180 || typeof alt !== 'string' || alt.length > 500
        || typeof data !== 'string' || data.length > 1_400_000) fail(422, 'Invalid image upload.');
      const { blob, width, height } = await processImage(data);
      // Hash-addressed immutable images remain valid across editorial revisions.
      const id = crypto.createHash('sha256').update(blob).digest('hex');
      return transaction(pool, async (db) => {
        const { rows: [existing] } = await db.query('SELECT id,name,alt,width,height,size,data IS NOT NULL AS stored FROM cms_media WHERE id=$1', [id]);
        if (existing?.stored) return mediaSnapshot(existing);
        const { rows: [{ count }] } = await db.query('SELECT count(*) AS count FROM cms_media WHERE data IS NOT NULL');
        if (count >= MAX_MEDIA) fail(409, 'Media storage limit reached. Contact your administrator.');
        await db.query(`INSERT INTO cms_media (id,name,alt,width,height,size,created_at,data) VALUES ($1,$2,$3,$4,$5,$6,${NOW},$7)
          ON CONFLICT (id) DO UPDATE SET data=EXCLUDED.data`, [id, name, alt, width, height, blob.length, blob]);
        return mediaSnapshot({ id, name, alt, width, height, size: blob.length });
      });
    },
    async mediaFile(filename) {
      if (!/^[a-f0-9]{64}\.jpg$/.test(filename)) fail(404, 'Image not found.');
      const { rows: [item] } = await pool.query('SELECT data FROM cms_media WHERE id=$1 AND data IS NOT NULL', [filename.slice(0, 64)]);
      if (!item) fail(404, 'Image not found.');
      return item.data;
    },
    async content() {
      const docs = await allDocs(pool);
      return Object.fromEntries(KINDS.map((kind) => [kind, docs.filter((d) => d.kind === kind).map(snapshot)]));
    },
    async save(kind, key, body) {
      if (key.length > 150 || !/^[a-zA-Z0-9_-]+$/.test(key)) fail(422, 'Invalid record ID.');
      const expected = revisionBody(body, 0);
      if (!isObject(body.content)) fail(422, 'Invalid content.');
      return transaction(pool, async (db) => {
        let doc;
        if (expected === 0) {
          if (await getDoc(db, kind, key)) fail(409, 'This record already exists. Reload before saving.');
          doc = { kind, id: key, revision: 1, draft: validate(kind, body.content, key, sources), published: null, published_revision: null };
          await insertDoc(db, doc);
        } else {
          doc = await locked(db, kind, key, expected);
          doc.draft = validate(kind, body.content, key, sources, doc.draft);
          doc.revision += 1;
          await updateDoc(db, doc, true);
        }
        await audit(db, doc, 'save-draft');
        return snapshot(doc);
      });
    },
    async publish(kind, key, body) {
      const expected = revisionBody(body, 1);
      try {
        const result = await transaction(pool, async (db) => {
          const doc = await locked(db, kind, key, expected);
          if (kind === 'posts') {
            if (!doc.draft.slug) {
              const language = doc.draft.language || 'en';
              doc.draft = { ...doc.draft, slug: await uniqueSlug(db, slugify(doc.draft.title || '', key), language, key) };
            }
            if (!(String(doc.draft.bodyHtml || '').trim() || String(doc.draft.body || '').trim())) fail(422, 'Article content is required before publishing.');
            const { rows } = await db.query("SELECT 1 FROM cms_documents WHERE kind='posts' AND published_slug=$1 AND published_locale=$2 AND id<>$3", [doc.draft.slug, doc.draft.language, key]);
            if (rows.length) fail(409, 'Another published post uses this slug and language.');
            doc.published_slug = doc.draft.slug;
            doc.published_locale = doc.draft.language;
          } else if (kind === 'people' && !doc.draft.placements?.length) {
            fail(422, 'This person has no existing page slot. Configure a placement before publishing.');
          }
          doc.published = clone(doc.draft);
          doc.published_revision = doc.revision;
          await updateDoc(db, doc);
          await audit(db, doc, 'publish');
          return snapshot(doc);
        });
        await onPublicChange();
        return result;
      } catch (error) {
        if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE' || error?.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') fail(409, 'Another published post uses this slug and language.');
        throw error;
      }
    },
    async unpublish(kind, key, body) {
      if (kind !== 'posts') fail(422, 'Unpublishing fixed website content is disabled.');
      const expected = revisionBody(body, 1);
      const result = await transaction(pool, async (db) => {
        const doc = await locked(db, kind, key, expected);
        Object.assign(doc, { published: null, published_revision: null, published_slug: null, published_locale: null });
        await updateDoc(db, doc);
        await audit(db, doc, 'unpublish');
        return snapshot(doc);
      });
      await onPublicChange();
      return result;
    },
    async history(kind, key) {
      const { rows } = await pool.query('SELECT action,revision,created_at,actor FROM cms_audit WHERE kind=$1 AND document_id=$2 ORDER BY created_at DESC LIMIT 100', [kind, key]);
      return rows;
    },
    async publicList(kind) {
      return (await allDocs(pool, kind)).filter((d) => d.published).map(publicRecord);
    },
    async article(slug, language = 'en') {
      const { rows } = await pool.query("SELECT * FROM cms_documents WHERE kind='posts' AND published_slug=$1 AND published_locale=$2", [slug, language]);
      const doc = row(rows[0]);
      if (!doc?.published) fail(404, 'Published article not found.');
      return publicRecord(doc);
    },
  };

  function corsHeaders(request) {
    const origin = request.headers.get('origin');
    return origin && allowedOrigins.includes(origin)
      ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, PUT, POST', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', Vary: 'Origin' }
      : {};
  }
  const json = (request, status, data) => new Response(JSON.stringify(data), { status, headers: {
    'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...corsHeaders(request) } });

  // `parts` is the path after /api/cms, e.g. ['admin', 'posts', 'my-post', 'publish'].
  async function handle(request, parts) {
    const method = request.method;
    if (method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });
    try {
      const [a, b, c, d, extra] = parts;
      const kind = (value) => (KINDS.includes(value) ? value : fail(422, 'Unknown content type.'));
      const body = method === 'PUT' || method === 'POST' ? await readJson(request) : undefined;
      configured();
      if (method === 'GET' && a === 'media' && b && !c) {
        await init();
        const data = await routes.mediaFile(b);
        return new Response(data, { headers: { 'Content-Type': 'image/jpeg', 'Content-Disposition': 'inline',
          'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } });
      }
      let result;
      if (method === 'GET' && a === 'health' && !b) result = await routes.health();
      else if (a === 'public' && method === 'GET') {
        await init();
        if (b === 'posts' && c && !d) result = await routes.article(c, new URL(request.url).searchParams.get('language') || 'en');
        else if (b && !c) result = await routes.publicList(kind(b));
        else fail(404, 'Not Found');
      } else if (a === 'admin') {
        editor(request);
        await init();
        if (method === 'GET' && b === 'content' && !c) result = await routes.content();
        else if (method === 'GET' && b === 'media' && !c) result = await routes.mediaList();
        else if (method === 'POST' && b === 'media' && c === 'upload' && !d) result = await routes.mediaUpload(body);
        else if (method === 'GET' && b === 'history' && c && d && !extra) result = await routes.history(kind(c), d);
        else if (method === 'PUT' && b && c && !d) result = await routes.save(kind(b), c, body);
        else if (method === 'POST' && b && c && d === 'publish' && !extra) result = await routes.publish(kind(b), c, body);
        else if (method === 'POST' && b && c && d === 'unpublish' && !extra) result = await routes.unpublish(kind(b), c, body);
        else fail(404, 'Not Found');
      } else fail(404, 'Not Found');
      return json(request, 200, result);
    } catch (error) {
      if (error instanceof HttpError) {
        if (error.status === 413) return new Response(error.detail, { status: 413, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
        return json(request, error.status, { detail: error.detail });
      }
      console.error('CMS request failed', error);
      return json(request, 500, { detail: 'CMS request failed.' });
    }
  }

  return { handle, init, routes, pool };
}
