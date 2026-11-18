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

const ENTRY_COLUMNS = [
  'id',
  'kind',
  'title',
  'body',
  'status',
  'priority',
  'due_at',
  'remind_at',
  'pinned',
  'archived_at',
  'deleted_at',
  'created_at',
  'updated_at',
];

/**
 * SQLite 不能就地修改 CHECK 约束，旧库的 kind 只允许 todo/note。
 * 这里按官方推荐的“建新表 → 拷数据 → 删旧表 → 改名”重建一次，数据原样保留。
 */
function migrateKindConstraint() {
  const def = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'entry'")
    .get();
  if (!def || typeof def.sql !== 'string' || def.sql.includes("'knowledge'")) return;

  const columns = ENTRY_COLUMNS.join(', ');

  db.exec('PRAGMA foreign_keys = OFF');
  db.exec('BEGIN');
  try {
    db.exec(`
      CREATE TABLE entry_next (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        kind        TEXT    NOT NULL DEFAULT 'note' CHECK (kind IN ('note', 'todo', 'knowledge')),
        title       TEXT    NOT NULL DEFAULT '',
        body        TEXT    NOT NULL DEFAULT '',
        status      TEXT    NOT NULL DEFAULT 'inbox' CHECK (status IN ('inbox', 'doing', 'done', 'dropped')),
        priority    INTEGER NOT NULL DEFAULT 0 CHECK (priority BETWEEN 0 AND 3),
        due_at      TEXT,
        remind_at   TEXT,
        pinned      INTEGER NOT NULL DEFAULT 0,
        archived_at TEXT,
        deleted_at  TEXT,
        created_at  TEXT    NOT NULL,
        updated_at  TEXT    NOT NULL
      );
      INSERT INTO entry_next (${columns}) SELECT ${columns} FROM entry;
      DROP TABLE entry;
      ALTER TABLE entry_next RENAME TO entry;
      CREATE INDEX IF NOT EXISTS idx_entry_kind_status ON entry (kind, status);
      CREATE INDEX IF NOT EXISTS idx_entry_due         ON entry (due_at);
      CREATE INDEX IF NOT EXISTS idx_entry_updated     ON entry (updated_at DESC);
    `);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  } finally {
    db.exec('PRAGMA foreign_keys = ON');
  }
}

migrateKindConstraint();
db.exec(readFileSync(join(here, 'schema.sql'), 'utf8'));

export default db;
