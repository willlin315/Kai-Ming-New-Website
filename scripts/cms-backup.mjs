// Downloads a complete copy of the CMS database (content, history and images) so a copy
// exists outside Railway. Railway volume backups are deleted together with the volume.
// Usage: CMS_URL=https://<site> CMS_DEV_TOKEN=<token> npm run cms:backup [-- <folder>]
import fs from 'node:fs/promises';
import path from 'node:path';

const base = (process.env.CMS_URL || '').replace(/\/$/, '');
const token = process.env.CMS_DEV_TOKEN || '';
if (!base || !token) { console.error('Set CMS_URL and CMS_DEV_TOKEN.'); process.exit(1); }
const folder = process.argv[2] || 'backups';
const response = await fetch(`${base}/api/cms/admin/backup/`, { headers: { Authorization: `Bearer ${token}` } });
if (!response.ok) { console.error(`Backup failed: HTTP ${response.status} ${await response.text()}`); process.exit(1); }
const name = (response.headers.get('content-disposition') || '').match(/filename="([^"]+)"/)?.[1] || 'kai-ming-cms.sqlite';
await fs.mkdir(folder, { recursive: true });
const file = path.join(folder, name);
await fs.writeFile(file, Buffer.from(await response.arrayBuffer()));
console.log(`Saved ${file}`);
