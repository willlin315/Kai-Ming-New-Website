// CMS API integration tests against a temporary SQLite database (removed afterwards).
// Run: npm run cms:test
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { createCms, SCHEMA } from '../lib/cms-server/core.mjs';
import { openSqlite } from '../lib/cms-server/sqlite.mjs';
import { postgresImporter } from '../lib/cms-server/import-postgres.mjs';

const read = (file) => JSON.parse(fs.readFileSync(new URL(`../content/${file}`, import.meta.url)));
const sources = { people: read('people.json'), blogPosts: read('blog-posts.json'), homeContent: read('home-content.json'),
  homeFields: read('home-fields.json'), dictionary: read('i18n/site.json') };
const TOKEN = 'test-only-token-' + 'x'.repeat(40);
const auth = { Authorization: 'Bearer ' + TOKEN };
const uid = () => crypto.randomUUID().replaceAll('-', '');

let pool, folder, changes = 0, hooks = [];
const legacy = new Map();
const fakeFetch = async (url) => (legacy.has(url) ? new Response(legacy.get(url)) : new Response('missing', { status: 404 }));
const make = (overrides = {}) => createCms({ pool, token: TOKEN, sources, legacyMediaOrigin: 'https://old-cms.example.test',
  fetchImpl: fakeFetch, onPublicChange: () => { changes += 1; }, ...overrides });
let app;

async function call(instance, method, url, { headers = {}, body } = {}) {
  const parsed = new URL(url, 'https://site.test');
  const parts = parsed.pathname.split('/').filter(Boolean);
  const request = new Request(parsed, { method, headers: { ...headers, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
  const response = await instance.handle(request, parts);
  const type = response.headers.get('content-type') || '';
  const data = type.includes('json') ? await response.json() : Buffer.from(await response.arrayBuffer());
  return { status: response.status, data, headers: response.headers };
}
const get = (url, headers) => call(app, 'GET', url, { headers });
const put = (url, body, headers = auth) => call(app, 'PUT', url, { headers, body });
const post = (url, body, headers = auth) => call(app, 'POST', url, { headers, body });

before(async () => {
  folder = fs.mkdtempSync(path.join(os.tmpdir(), 'km-cms-test-'));
  pool = openSqlite(path.join(folder, 'cms.sqlite'));
  // A media row left by the former API (file on its disk, no bytes in the database) and a post using it.
  const old = await sharp({ create: { width: 8, height: 6, channels: 3, background: 'red' } }).jpeg().toBuffer();
  const oldId = crypto.createHash('sha256').update(old).digest('hex');
  legacy.set(`https://old-cms.example.test/media/${oldId}.jpg`, old);
  await pool.query(SCHEMA);
  await pool.query("INSERT INTO cms_media (id,name,alt,width,height,size,created_at) VALUES ($1,'old.jpg','',8,6,$2,'2026-01-01T00:00:00.000Z')", [oldId, old.length]);
  const content = { title: 'Legacy image post', slug: 'legacy-image-post', language: 'en', image: `https://old-cms.example.test/media/${oldId}.jpg`, bodyHtml: '<p>x</p>' };
  await pool.query(`INSERT INTO cms_documents (kind,id,revision,draft,published,published_revision,published_slug,published_locale,updated_at)
    VALUES ('posts','legacy-image',1,$1,$1,1,'legacy-image-post','en','2026-01-01T00:00:00.000Z')`, [JSON.stringify(content)]);
  hooks.oldId = oldId;
  app = make();
});
after(async () => {
  await pool?.end();
  if (folder) fs.rmSync(folder, { recursive: true, force: true });
});

test('authentication and seed', async () => {
  assert.equal((await get('/admin/content')).status, 401);
  assert.equal((await get('/admin/content', { Authorization: 'Bearer wrong' })).status, 401);
  const content = (await get('/admin/content', auth)).data;
  assert.equal(content.people.length, 33);
  assert.ok(content.posts.length >= 3);
  assert.equal((await get('/public/people')).data.length, 33);
  assert.equal((await get('/health')).data.status, 'ok');
});

test('legacy media moves into the database and content links are rewritten', async () => {
  const doc = (await get('/public/posts/legacy-image-post')).data;
  assert.equal(doc.image, `/api/cms/media/${hooks.oldId}.jpg`);
  const file = await get(`/media/${hooks.oldId}.jpg`);
  assert.equal(file.status, 200);
  assert.equal(file.headers.get('content-type'), 'image/jpeg');
  assert.deepEqual(file.data, legacy.get(`https://old-cms.example.test/media/${hooks.oldId}.jpg`));
});

test('draft isolation, publish conflict and history', async () => {
  const key = 'test-' + uid();
  const item = { title: 'Private draft', slug: key, language: 'en', bodyHtml: '<p>Draft content</p>' };
  const saved = await put('/admin/posts/' + key, { expected_revision: 0, content: item });
  assert.equal(saved.status, 200, JSON.stringify(saved.data));
  assert.equal((await get('/public/posts/' + key)).status, 404);
  assert.equal((await post(`/admin/posts/${key}/publish`, { expected_revision: 9 })).status, 409);
  const before = changes;
  assert.equal((await post(`/admin/posts/${key}/publish`, { expected_revision: 1 })).status, 200);
  assert.equal(changes, before + 1, 'publishing revalidates the website');
  assert.equal((await get('/public/posts/' + key)).data.title, 'Private draft');
  item.title = 'Unpublished revision';
  assert.equal((await put('/admin/posts/' + key, { expected_revision: 1, content: item })).status, 200);
  assert.equal((await get('/public/posts/' + key)).data.title, 'Private draft');
  assert.equal((await put('/admin/posts/' + key, { expected_revision: 1, content: item })).status, 409);
  assert.equal((await post(`/admin/posts/${key}/publish`, { expected_revision: 2 })).status, 200);
  assert.equal((await get('/public/posts/' + key)).data.title, 'Unpublished revision');
  const actions = (await get(`/admin/history/posts/${key}`, auth)).data;
  assert.equal(actions.filter((a) => a.action === 'publish').length, 2);
  assert.equal((await post(`/admin/posts/${key}/unpublish`, { expected_revision: 2 })).status, 200);
  assert.equal(changes, before + 3);
  assert.equal((await get('/public/posts/' + key)).status, 404);
});

test('people slots cannot be moved', async () => {
  const person = (await get('/admin/content', auth)).data.people.find((p) => p.name === 'Sherry Tao');
  const old = person.placements;
  person.placements = [{ page: 'wrong-page' }];
  person.bio = 'Development preview test';
  const saved = await put('/admin/people/' + person.id, { expected_revision: person._revision, content: person });
  assert.equal(saved.status, 200, JSON.stringify(saved.data));
  assert.deepEqual(saved.data.placements, old);
  const pub = (await get('/public/people')).data.find((p) => p.id === person.id);
  assert.notEqual(pub.bio, 'Development preview test');
  assert.equal((await post(`/admin/people/${person.id}/unpublish`, { expected_revision: saved.data._revision })).status, 422);
});

test('slug uniqueness and invalid payloads', async () => {
  const slug = 'unique-' + uid();
  for (const i of [0, 1]) {
    const key = 'duplicate-' + uid();
    assert.equal((await put('/admin/posts/' + key, { expected_revision: 0, content: { title: 'Same slug', slug, language: 'en', bodyHtml: '<p>Content</p>' } })).status, 200);
    const result = await post(`/admin/posts/${key}/publish`, { expected_revision: 1 });
    assert.equal(result.status, i === 0 ? 200 : 409, JSON.stringify(result.data));
  }
  assert.equal((await put('/admin/posts/invalid', { expected_revision: 0, content: { title: 'Invalid', language: 'en', slug: 'Bad Slug' } })).status, 422);
  assert.equal((await put('/admin/posts/bad id', { expected_revision: 0, content: { title: 'x', language: 'en' } })).status, 422);
  assert.equal((await put('/admin/posts/extra', { expected_revision: 0, content: {}, other: 1 })).status, 422);
  assert.equal((await put('/admin/unknown/extra', { expected_revision: 0, content: {} })).status, 422);
  assert.equal((await call(app, 'PUT', '/admin/posts/huge', { headers: auth, body: 'x'.repeat(1_600_000) })).status, 413);
});

test('public records do not contain draft metadata or migration sources', async () => {
  for (const item of (await get('/public/people')).data) {
    assert.ok(!('_revision' in item) && !('draft' in item));
  }
  for (const kind of ['people', 'posts']) {
    assert.ok(!(await get('/public/' + kind)).data.some((r) => 'sourceUrl' in r || 'sourcePhoto' in r));
  }
});

test('seed is idempotent across restarts', async () => {
  const beforeContent = (await get('/admin/content', auth)).data;
  const restarted = make();
  const afterContent = (await call(restarted, 'GET', '/admin/content', { headers: auth })).data;
  assert.deepEqual(afterContent, beforeContent);
});

test('media storage validation and persistence', async () => {
  const png = await sharp({ create: { width: 20, height: 15, channels: 3, background: 'blue' } }).png().toBuffer();
  const body = { name: 'sample.png', alt: 'Blue test image', data: 'data:image/png;base64,' + png.toString('base64') };
  assert.equal((await post('/admin/media/upload', body, {})).status, 401);
  assert.equal((await post('/admin/media/upload', { ...body, data: 'data:image/png;base64,PHN2Zz4=' })).status, 422);
  const uploaded = await post('/admin/media/upload', body);
  assert.equal(uploaded.status, 200, JSON.stringify(uploaded.data));
  const item = uploaded.data;
  assert.equal(item.width, 20); assert.equal(item.height, 15);
  assert.equal(item.alt, 'Blue test image');
  assert.equal(item.url, `/api/cms/media/${item.id}.jpg`);
  const file = await get(`/media/${item.id}.jpg`);
  assert.equal(file.status, 200);
  assert.equal(file.headers.get('content-type'), 'image/jpeg');
  assert.equal((await get('/media/invalid.jpg')).status, 404);
  assert.equal((await post('/admin/media/upload', body)).data.id, item.id);
  assert.ok((await get('/admin/media', auth)).data.some((m) => m.id === item.id));
  const restarted = make();
  assert.deepEqual((await call(restarted, 'GET', `/media/${item.id}.jpg`)).data, file.data);
});

test('translations and publish isolation', async () => {
  const person = (await get('/admin/content', auth)).data.people.find((p) => p.id === 'jerry-yang');
  assert.equal(person.translations['zh-Hant'].title, '執行長');
  assert.ok(person.translations.es.bio);
  const key = 'translated-' + uid();
  const item = { title: 'English title', slug: key, language: 'en', bodyHtml: '<p>English body</p>',
    translations: { 'zh-Hant': { title: '中文標題', bodyHtml: '<p>中文內容</p>' }, es: { title: 'Título', bodyHtml: '<p>Contenido</p>' } } };
  assert.equal((await put('/admin/posts/' + key, { expected_revision: 0, content: item })).status, 200);
  assert.equal((await get('/public/posts/' + key)).status, 404);
  assert.equal((await post(`/admin/posts/${key}/publish`, { expected_revision: 1 })).status, 200);
  assert.equal((await get('/public/posts/' + key)).data.translations['zh-Hant'].title, '中文標題');
  item.translations.es.title = 'Borrador';
  assert.equal((await put('/admin/posts/' + key, { expected_revision: 1, content: item })).status, 200);
  assert.equal((await get('/public/posts/' + key)).data.translations.es.title, 'Título');
  item.translations = { xx: { title: 'invalid' } };
  assert.equal((await put('/admin/posts/' + key, { expected_revision: 2, content: item })).status, 422);
});

test('home draft, publish and template protection', async () => {
  const page = (await get('/admin/content', auth)).data.pages[0];
  const original = (await get('/public/pages')).data[0];
  const content = structuredClone(page);
  const field = Object.keys(content.values).find((k) => 'en' in content.values[k]);
  content.values[field]['zh-Hant'] = '首頁測試草稿';
  const saved = await put('/admin/pages/home', { expected_revision: page._revision, content });
  assert.equal(saved.status, 200, JSON.stringify(saved.data));
  assert.deepEqual((await get('/public/pages')).data[0], original);
  const rev = saved.data._revision;
  assert.equal((await post('/admin/pages/home/publish', { expected_revision: rev })).status, 200);
  assert.equal((await get('/public/pages')).data[0].values[field]['zh-Hant'], '首頁測試草稿');
  assert.equal((await put('/admin/pages/home', { expected_revision: page._revision, content })).status, 409);
  const image = Object.keys(content.values).find((k) => k.startsWith('image-'));
  const withMedia = structuredClone(content);
  withMedia.values[image].src = '/api/cms/media/' + 'a'.repeat(64) + '.jpg';
  assert.equal((await put('/admin/pages/home', { expected_revision: rev, content: withMedia })).status, 200);
  withMedia.values[image].src = 'javascript:alert(1)';
  assert.equal((await put('/admin/pages/home', { expected_revision: rev + 1, content: withMedia })).status, 422);
  content.values.unexpected = { en: 'bad' };
  assert.equal((await put('/admin/pages/home', { expected_revision: rev + 1, content })).status, 422);
  assert.equal((await post('/admin/pages/home/unpublish', { expected_revision: rev + 1 })).status, 422);
  assert.equal((await put('/admin/pages/other', { expected_revision: 0, content: page })).status, 422);
});

test('publish generates a slug from the title', async () => {
  const title = 'Auto Slug ' + uid().slice(0, 6) + ': Café & Play';
  const slugs = [];
  for (const key of ['auto-' + uid(), 'auto-' + uid()]) {
    assert.equal((await put('/admin/posts/' + key, { expected_revision: 0, content: { title, slug: '', language: 'en', bodyHtml: '<p>Body</p>' } })).status, 200);
    const result = await post(`/admin/posts/${key}/publish`, { expected_revision: 1 });
    assert.equal(result.status, 200, JSON.stringify(result.data));
    slugs.push(result.data.slug);
  }
  assert.ok(slugs[0].startsWith('auto-slug-') && slugs[0].endsWith('-cafe-and-play'));
  assert.equal(slugs[1], slugs[0] + '-2');
  assert.equal((await get('/public/posts/' + slugs[1])).status, 200);
  const chinese = 'zh-' + uid();
  assert.equal((await put('/admin/posts/' + chinese, { expected_revision: 0, content: { title: '中文標題', language: 'zh-Hant', bodyHtml: '<p>內容</p>' } })).status, 200);
  const result = await post(`/admin/posts/${chinese}/publish`, { expected_revision: 1 });
  assert.equal(result.data.slug, 'post-' + chinese.replaceAll('-', '').slice(0, 8));
  assert.equal((await get(`/public/posts/${result.data.slug}?language=zh-Hant`)).status, 200);
});

test('legacy posts get slugs and Home image alts are descriptive', async () => {
  const posts = (await get('/public/posts')).data;
  assert.ok(posts.length && posts.every((p) => p.slug));
  const home = (await get('/public/pages')).data.find((p) => p.id === 'home');
  const alts = Object.entries(home.values).filter(([k]) => k.startsWith('image-')).map(([, v]) => v.alt);
  assert.ok(!alts.some((a) => /\.(png|jpg)$/i.test(a)));
});

test('missing database or production mode is refused', async () => {
  assert.equal((await call(make({ pool: null }), 'GET', '/public/posts')).status, 503);
  assert.equal((await call(make({ environment: 'production' }), 'GET', '/admin/content', { headers: auth })).status, 503);
  assert.equal((await call(make({ token: 'short' }), 'GET', '/admin/content', { headers: { Authorization: 'Bearer short' } })).status, 503);
});
