// SQLite storage for the CMS: one database file on persistent disk (Railway volume).
// Exposes a small pool-like interface ({ query, connect, end }) so the CMS core stays
// storage-agnostic. better-sqlite3 is synchronous, so a promise queue serializes access:
// a transaction holds the connection until it releases it, and no other statement can
// interleave with it while it awaits.
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

// The core is written with PostgreSQL-style $N parameters; bind them as positional ? values
// in order of appearance (a $N may appear more than once).
function translate(sql, params) {
  const values = [];
  const text = sql.replace(/\$(\d+)/g, (_, n) => { values.push(params[Number(n) - 1]); return '?'; });
  return { text, values: values.map((v) => (typeof v === 'boolean' ? Number(v) : v)) };
}

export function openSqlite(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const db = new Database(file, { timeout: 15000 });
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');

  const run = (sql, params = []) => {
    if (!params.length && /;\s*\S/.test(sql.trim().replace(/;$/, ''))) { db.exec(sql); return { rows: [] }; }
    let statement = sql.trim();
    if (/^BEGIN$/i.test(statement)) statement = 'BEGIN IMMEDIATE'; // take the write lock up front
    const { text, values } = translate(statement, params);
    const prepared = db.prepare(text);
    if (prepared.reader) return { rows: prepared.all(...values) };
    const info = prepared.run(...values);
    return { rows: [], rowCount: info.changes };
  };

  let queue = Promise.resolve();
  const acquire = () => {
    let release;
    const next = new Promise((resolve) => { release = resolve; });
    const ready = queue.then(() => release);
    queue = queue.then(() => next);
    return ready;
  };

  return {
    kind: 'sqlite',
    raw: db,
    async query(sql, params) {
      const release = await acquire();
      try { return run(sql, params); } finally { release(); }
    },
    async connect() {
      const release = await acquire();
      let open = true;
      return {
        query: async (sql, params) => { if (!open) throw Error('Connection released.'); return run(sql, params); },
        release: () => { if (open) { open = false; if (db.inTransaction) db.exec('ROLLBACK'); release(); } },
      };
    },
    async end() { await acquire(); db.close(); },
  };
}
