// Lightweight, local-only PostgreSQL engine for development. Production uses PostgreSQL/Cloud SQL.
import {PGlite} from '@electric-sql/pglite';
import {PGLiteSocketServer} from '@electric-sql/pglite-socket';
import path from 'node:path';
import fs from 'node:fs';
fs.mkdirSync(path.resolve(process.env.CMS_DEV_DB_DIR||'.cms-data/postgres'),{recursive:true});
const db=await PGlite.create(path.resolve(process.env.CMS_DEV_DB_DIR||'.cms-data/postgres'));
const server=new PGLiteSocketServer({db,host:'127.0.0.1',port:Number(process.env.CMS_DEV_DB_PORT||55432)});
await server.start();
console.log('Local development PostgreSQL engine ready on 127.0.0.1:'+Number(process.env.CMS_DEV_DB_PORT||55432));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await server.stop();await db.close();process.exit(0)});
