import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

export const DB_PATH = process.env.NOTEBOX_DB
  ? resolve(process.env.NOTEBOX_DB)
  : join(here, '..', 'data', 'notebox.db');

mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');
db.exec(readFileSync(join(here, 'schema.sql'), 'utf8'));

export default db;
