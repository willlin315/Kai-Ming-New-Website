// One-time move from the former Railway PostgreSQL database into SQLite.
// Runs inside CMS initialization, only while the SQLite database has no content yet,
// so restarts never overwrite edits. Remove CMS_IMPORT_DATABASE_URL after the move.
const iso = (value) => (value instanceof Date ? value.toISOString() : String(value));
const text = (value) => (value == null ? null : typeof value === 'string' ? value : JSON.stringify(value));

export function postgresImporter(url) {
  return async function importPostgres(db) {
    const { rows: [{ count }] } = await db.query('SELECT count(*) AS count FROM cms_documents');
    if (count > 0) return;
    const pg = (await import('pg')).default;
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url) || /sslmode=disable/.test(url);
    const client = new pg.Client({ connectionString: url.replace(/^postgres(ql)?\+psycopg:/, 'postgresql:'),
      connectionTimeoutMillis: 15000, ...(local ? {} : { ssl: { rejectUnauthorized: false } }) });
    await client.connect();
    try {
      const docs = (await client.query('SELECT * FROM cms_documents')).rows;
      const audit = (await client.query('SELECT * FROM cms_audit')).rows;
      const hasData = (await client.query("SELECT 1 FROM information_schema.columns WHERE table_name='cms_media' AND column_name='data'")).rows.length > 0;
      const media = (await client.query(`SELECT id,name,alt,width,height,size,created_at${hasData ? ',data' : ''} FROM cms_media`)).rows;
      for (const d of docs) {
        await db.query(`INSERT INTO cms_documents (kind,id,revision,draft,published,published_revision,published_slug,published_locale,updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [d.kind, d.id, d.revision, text(d.draft), d.published == null ? null : text(d.published),
          d.published_revision, d.published_slug, d.published_locale, iso(d.updated_at)]);
      }
      for (const a of audit) {
        await db.query('INSERT INTO cms_audit (id,kind,document_id,action,revision,snapshot,actor,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
          [a.id, a.kind, a.document_id, a.action, a.revision, text(a.snapshot), a.actor, iso(a.created_at)]);
      }
      for (const m of media) {
        await db.query('INSERT INTO cms_media (id,name,alt,width,height,size,created_at,data) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
          [m.id, m.name, m.alt, m.width, m.height, m.size, iso(m.created_at), m.data ?? null]);
      }
      console.log(`CMS: imported ${docs.length} documents, ${audit.length} history entries and ${media.length} images from PostgreSQL.`);
    } finally { await client.end(); }
  };
}
