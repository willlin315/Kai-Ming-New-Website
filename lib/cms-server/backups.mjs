// Daily database copies on the same volume (/data/backups), kept for a week.
// They protect against bad edits or a damaged database file, not against losing the
// volume itself; keep a downloaded copy (admin "Download database backup") for that.
// Railway's own volume backups need a Pro workspace.
import fs from 'node:fs/promises';
import path from 'node:path';

const DAY = 24 * 60 * 60 * 1000;
const NAME = /^cms-(\d{4}-\d{2}-\d{2})\.sqlite$/;

export async function backupOnce(pool, dir, keep = 7, now = new Date()) {
  await fs.mkdir(dir, { recursive: true });
  const name = `cms-${now.toISOString().slice(0, 10)}.sqlite`;
  const files = (await fs.readdir(dir)).filter((f) => NAME.test(f)).sort();
  if (!files.includes(name)) {
    const tmp = path.join(dir, `.${name}.tmp`);
    await pool.backup(tmp);
    await fs.rename(tmp, path.join(dir, name));
    files.push(name);
    files.sort();
  }
  for (const old of files.slice(0, Math.max(0, files.length - keep))) await fs.rm(path.join(dir, old), { force: true });
  return name;
}

export function scheduleBackups(pool, dir, keep = 7) {
  const run = () => backupOnce(pool, dir, keep).catch((error) => console.error('CMS backup failed', error));
  run();
  // Checked hourly; a new file is written once per calendar day (UTC).
  setInterval(run, DAY / 24).unref();
}
