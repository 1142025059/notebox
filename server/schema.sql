-- notebox 数据模型：entry 统一承载“待办”与“笔记”，kind 区分。
-- 第一版刻意不引入 FTS5：个人记事本量级（<1e5 行）下 instr() 全表扫描是毫秒级，
-- 且 FTS5 的 unicode61 分词对中文不友好（整句会被当成单个 token）。

CREATE TABLE IF NOT EXISTS entry (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  kind        TEXT    NOT NULL DEFAULT 'todo' CHECK (kind IN ('todo', 'note')),
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

CREATE INDEX IF NOT EXISTS idx_entry_kind_status ON entry (kind, status);
CREATE INDEX IF NOT EXISTS idx_entry_due         ON entry (due_at);
CREATE INDEX IF NOT EXISTS idx_entry_updated     ON entry (updated_at DESC);

CREATE TABLE IF NOT EXISTS tag (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL UNIQUE,
  color TEXT
);

CREATE TABLE IF NOT EXISTS entry_tag (
  entry_id INTEGER NOT NULL REFERENCES entry (id) ON DELETE CASCADE,
  tag_id   INTEGER NOT NULL REFERENCES tag (id)   ON DELETE CASCADE,
  PRIMARY KEY (entry_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_entry_tag_tag ON entry_tag (tag_id);
