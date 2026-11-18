import db, { DB_PATH } from './db.js';

const STATUSES = ['inbox', 'doing', 'done', 'dropped'];
const KINDS = ['note', 'todo', 'knowledge'];
const MAX_TITLE = 200;
const MAX_BODY = 200000;

const iso = () => new Date().toISOString();

const asKind = (value, fallback = 'note') => (KINDS.includes(value) ? value : fallback);

/** 本地日期（YYYY-MM-DD）。due_at 只存日期，避免时区把“今天”算错。 */
function localDate(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const asText = (v, max = MAX_BODY) => (typeof v === 'string' ? v.slice(0, max) : '');

/** due_at 只接受 YYYY-MM-DD；其余一律视为清空，避免脏值污染 today 视图。 */
function asDueDate(v) {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function asPriority(v) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n <= 3 ? n : 0;
}

/**
 * 三个模块共用同一套状态语义：notes = 未完成，done = 已完成。
 * 具体模块由查询参数 kind 决定，视图条件本身不再绑定 kind。
 * all 保留给导出/调试。
 */
const VIEWS = {
  notes: `e.status <> 'done' AND e.archived_at IS NULL AND e.deleted_at IS NULL`,
  done: `e.status = 'done' AND e.deleted_at IS NULL`,
  all: `e.archived_at IS NULL AND e.deleted_at IS NULL`,
};

/** 新笔记在最上面；按创建顺序倒序，避免编辑一条就把它的序号顶走。 */
const ORDER_NOTES = `ORDER BY e.pinned DESC, e.id DESC`;

/** 批量补齐 tags，避免 N+1。 */
function hydrate(rows) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const placeholders = ids.map(() => '?').join(',');
  const tagRows = db
    .prepare(
      `SELECT et.entry_id, t.name
         FROM entry_tag et JOIN tag t ON t.id = et.tag_id
        WHERE et.entry_id IN (${placeholders})
        ORDER BY t.name`,
    )
    .all(...ids);

  const byEntry = new Map();
  for (const row of tagRows) {
    const list = byEntry.get(row.entry_id);
    if (list) list.push(row.name);
    else byEntry.set(row.entry_id, [row.name]);
  }

  return rows.map((r) => ({
    ...r,
    pinned: Boolean(r.pinned),
    tags: byEntry.get(r.id) ?? [],
  }));
}

function getEntry(id) {
  const row = db.prepare('SELECT * FROM entry WHERE id = ?').get(id);
  if (!row) return null;
  return hydrate([row])[0];
}

function setTags(entryId, names) {
  db.prepare('DELETE FROM entry_tag WHERE entry_id = ?').run(entryId);
  const uniq = [...new Set(names.map((n) => String(n).trim().slice(0, 40)).filter(Boolean))];
  for (const name of uniq) {
    let tag = db.prepare('SELECT id FROM tag WHERE name = ?').get(name);
    if (!tag) {
      const info = db.prepare('INSERT INTO tag (name) VALUES (?)').run(name);
      tag = { id: Number(info.lastInsertRowid) };
    }
    db.prepare('INSERT OR IGNORE INTO entry_tag (entry_id, tag_id) VALUES (?, ?)').run(entryId, tag.id);
  }
}

function withTx(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export default async function routes(app) {
  app.get('/api/health', async () => ({ ok: true, db: DB_PATH }));

  app.get('/api/entries', async (request) => {
    const { view = 'all', kind = 'note', q = '', tag = '', limit = '200' } = request.query ?? {};
    const where = VIEWS[view] ?? VIEWS.all;
    const params = [asKind(kind)];
    const clauses = ['e.kind = ?', where];

    const query = String(q).trim();
    if (query) {
      // 用 instr 而非 LIKE：免去 % _ 转义问题，且中英文子串语义一致。
      clauses.push('(instr(lower(e.title), lower(?)) > 0 OR instr(lower(e.body), lower(?)) > 0)');
      params.push(query, query);
    }

    const tagName = String(tag).trim();
    if (tagName) {
      clauses.push(
        `EXISTS (SELECT 1 FROM entry_tag et2 JOIN tag t2 ON t2.id = et2.tag_id
                  WHERE et2.entry_id = e.id AND t2.name = ?)`,
      );
      params.push(tagName);
    }

    const finalWhere = clauses.join(' AND ');
    const n = Math.min(Math.max(Number(limit) || 200, 1), 1000);

    const items = db
      .prepare(`SELECT e.* FROM entry e WHERE ${finalWhere} ${ORDER_NOTES} LIMIT ?`)
      .all(...params, n);

    const total = db
      .prepare(`SELECT COUNT(*) AS c FROM entry e WHERE ${finalWhere}`)
      .get(...params).c;

    return { items: hydrate(items), total };
  });

  app.get('/api/stats', async () => {
    // 每个模块都只有两个计数：未完成、已完成。一次查询返回三个模块，首页直接用。
    const rows = db
      .prepare(
        `SELECT kind,
                SUM(CASE WHEN status <> 'done' AND archived_at IS NULL AND deleted_at IS NULL THEN 1 ELSE 0 END) AS notes,
                SUM(CASE WHEN status = 'done' AND deleted_at IS NULL THEN 1 ELSE 0 END) AS done
           FROM entry
          WHERE kind IN ('note', 'todo', 'knowledge')
          GROUP BY kind`,
      )
      .all();

    const out = {};
    for (const kind of KINDS) out[kind] = { notes: 0, done: 0 };
    for (const row of rows) {
      out[row.kind] = { notes: Number(row.notes ?? 0), done: Number(row.done ?? 0) };
    }
    return out;
  });

  app.get('/api/tags', async () => {
    return db
      .prepare(
        `SELECT t.id, t.name, COUNT(et.entry_id) AS count
           FROM tag t JOIN entry_tag et ON et.tag_id = t.id
          WHERE EXISTS (SELECT 1 FROM entry e WHERE e.id = et.entry_id AND e.deleted_at IS NULL)
          GROUP BY t.id, t.name
          ORDER BY count DESC, t.name ASC`,
      )
      .all();
  });

  app.post('/api/entries', async (request, reply) => {
    const body = request.body ?? {};
    const kind = asKind(body.kind);
    const content = asText(body.body);
    let title = asText(body.title, MAX_TITLE).trim();

    if (!title) {
      title = content.split('\n').find((line) => line.trim())?.trim().slice(0, MAX_TITLE) ?? '';
    }
    if (!title && !content.trim()) {
      return reply.code(400).send({ error: 'title 和 body 不能同时为空' });
    }

    const status = STATUSES.includes(body.status) ? body.status : 'inbox';
    const ts = iso();

    const info = db
      .prepare(
        `INSERT INTO entry (kind, title, body, status, priority, due_at, remind_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(kind, title, content, status, asPriority(body.priority), asDueDate(body.due_at), asDueDate(body.remind_at), ts, ts);

    const id = Number(info.lastInsertRowid);
    setTags(id, Array.isArray(body.tags) ? body.tags : []);

    return reply.code(201).send(getEntry(id));
  });

  app.patch('/api/entries/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const current = db.prepare('SELECT * FROM entry WHERE id = ?').get(id);
    if (!current) return reply.code(404).send({ error: '条目不存在' });

    const body = request.body ?? {};
    const sets = [];
    const params = [];
    const set = (col, val) => {
      sets.push(`${col} = ?`);
      params.push(val);
    };

    if ('title' in body) set('title', asText(body.title, MAX_TITLE).trim());
    if ('body' in body) set('body', asText(body.body));
    if ('kind' in body && KINDS.includes(body.kind)) set('kind', body.kind);
    if ('status' in body && STATUSES.includes(body.status)) set('status', body.status);
    if ('priority' in body) set('priority', asPriority(body.priority));
    if ('due_at' in body) set('due_at', asDueDate(body.due_at));
    if ('remind_at' in body) set('remind_at', asDueDate(body.remind_at));
    if ('pinned' in body) set('pinned', body.pinned ? 1 : 0);
    if ('archived' in body) set('archived_at', body.archived ? (current.archived_at ?? iso()) : null);

    // 笔记同样可以标记完成，这里不再对 kind/status 做强制回退。

    set('updated_at', iso());
    db.prepare(`UPDATE entry SET ${sets.join(', ')} WHERE id = ?`).run(...params, id);

    if (Array.isArray(body.tags)) setTags(id, body.tags);

    return getEntry(id);
  });

  app.delete('/api/entries/:id', async (request, reply) => {
    const id = Number(request.params.id);
    const entry = getEntry(id);
    if (!entry) return reply.code(404).send({ error: '条目不存在' });

    // 没有回收站，删除即物理删除；entry_tag 靠外键级联清理。
    db.prepare('DELETE FROM entry WHERE id = ?').run(id);
    // 顺手清掉不再被引用的标签，避免孤儿数据堆积。
    db.prepare('DELETE FROM tag WHERE id NOT IN (SELECT tag_id FROM entry_tag)').run();

    return entry;
  });

  app.get('/api/export', async (request, reply) => {
    const entries = db.prepare('SELECT * FROM entry ORDER BY id').all();
    const payload = {
      version: 1,
      app: 'notebox',
      exported_at: iso(),
      entries: hydrate(entries),
    };
    reply.header('content-disposition', `attachment; filename="notebox-${localDate()}.json"`);
    reply.header('content-type', 'application/json; charset=utf-8');
    return payload;
  });

  app.post('/api/import', async (request, reply) => {
    const body = request.body ?? {};
    const entries = Array.isArray(body.entries) ? body.entries : null;
    if (!entries) return reply.code(400).send({ error: '缺少 entries 数组' });

    const mode = body.mode === 'replace' ? 'replace' : 'merge';
    const seen = new Set();

    const imported = withTx(() => {
      if (mode === 'replace') {
        db.exec('DELETE FROM entry_tag; DELETE FROM tag; DELETE FROM entry;');
      }

      let count = 0;
      for (const item of entries) {
        // 旧备份里可能残留回收站条目，既然没有回收站，直接跳过。
        if (typeof item.deleted_at === 'string' && item.deleted_at) continue;

        const kind = asKind(item.kind);
        const title = asText(item.title, MAX_TITLE).trim() || '未命名';
        const content = asText(item.body);
        const status = STATUSES.includes(item.status) ? item.status : 'inbox';
        const createdAt = typeof item.created_at === 'string' ? item.created_at : iso();
        const updatedAt = typeof item.updated_at === 'string' ? item.updated_at : createdAt;

        if (mode === 'merge') {
          // merge 按 (title, created_at) 去重，防止同一份备份导入两次产生重复。
          const key = `${title}\u0000${createdAt}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const dup = db
            .prepare('SELECT id FROM entry WHERE title = ? AND created_at = ? LIMIT 1')
            .get(title, createdAt);
          if (dup) continue;
        }

        const info = db
          .prepare(
            `INSERT INTO entry (kind, title, body, status, priority, due_at, remind_at, pinned,
                                archived_at, deleted_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            kind,
            title,
            content,
            status,
            asPriority(item.priority),
            asDueDate(item.due_at),
            asDueDate(item.remind_at),
            item.pinned ? 1 : 0,
            typeof item.archived_at === 'string' ? item.archived_at : null,
            typeof item.deleted_at === 'string' ? item.deleted_at : null,
            createdAt,
            updatedAt,
          );

        const id = Number(info.lastInsertRowid);
        setTags(id, Array.isArray(item.tags) ? item.tags : []);
        count += 1;
      }
      return count;
    });

    return { ok: true, mode, imported };
  });
}
