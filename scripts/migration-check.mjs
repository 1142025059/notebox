import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = mkdtempSync(join(tmpdir(), 'notebox-migrate-'));
const dbPath = join(dir, 'legacy.db');
process.env.NOTEBOX_DB = dbPath;

// 1. 造一个上一版 schema 的库：kind 只允许 todo/note
const legacy = new DatabaseSync(dbPath);
legacy.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE entry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL DEFAULT 'todo' CHECK (kind IN ('todo','note')),
    title TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'inbox' CHECK (status IN ('inbox','doing','done','dropped')),
    priority INTEGER NOT NULL DEFAULT 0,
    due_at TEXT, remind_at TEXT,
    pinned INTEGER NOT NULL DEFAULT 0,
    archived_at TEXT, deleted_at TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE INDEX idx_entry_kind_status ON entry (kind, status);
  CREATE TABLE tag (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, color TEXT);
  CREATE TABLE entry_tag (
    entry_id INTEGER NOT NULL REFERENCES entry (id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tag (id) ON DELETE CASCADE,
    PRIMARY KEY (entry_id, tag_id)
  );
`);
legacy
  .prepare('INSERT INTO entry (kind, title, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
  .run('note', '旧版笔记', '旧版内容', '2026-11-01T00:00:00.000Z', '2026-11-01T00:00:00.000Z');
legacy
  .prepare('INSERT INTO entry (kind, title, created_at, updated_at) VALUES (?, ?, ?, ?)')
  .run('todo', '旧版任务', '2026-11-02T00:00:00.000Z', '2026-11-02T00:00:00.000Z');
legacy.close();

// 2. 用新版 db.js 打开，应自动重建表
const mod = await import(pathToFileURL(join(import.meta.dirname, '..', 'server', 'db.js')).href);
const db = mod.default;

assert.equal(db.prepare('SELECT COUNT(*) AS c FROM entry').get().c, 2, '迁移后条数应保持不变');
assert.deepEqual(
  db.prepare('SELECT kind FROM entry ORDER BY id').all().map((row) => row.kind),
  ['note', 'todo'],
  '原有 kind 不应改变',
);
console.log('ok   旧库迁移后数据条数与 kind 不变');

// 3. 迁移后必须能写入 knowledge
db.prepare(
  "INSERT INTO entry (kind, title, body, created_at, updated_at) VALUES ('knowledge', '问题', '答案', '2026-11-18T00:00:00.000Z', '2026-11-18T00:00:00.000Z')",
).run();
assert.equal(db.prepare('SELECT COUNT(*) AS c FROM entry').get().c, 3);
console.log('ok   迁移后可写入 knowledge');

// 4. entry_tag 的外键关系仍然可用
const tagId = db.prepare("INSERT INTO tag (name) VALUES ('迁移')").run().lastInsertRowid;
db.prepare('INSERT INTO entry_tag (entry_id, tag_id) VALUES (?, ?)').run(1, tagId);
assert.equal(db.prepare('SELECT COUNT(*) AS c FROM entry_tag').get().c, 1);
db.prepare('DELETE FROM entry WHERE id = 1').run();
assert.equal(db.prepare('SELECT COUNT(*) AS c FROM entry_tag').get().c, 0, '级联删除仍然生效');
console.log('ok   标签与级联删除仍然正常');

console.log(`\n迁移检查通过（临时库 ${dbPath}）`);
