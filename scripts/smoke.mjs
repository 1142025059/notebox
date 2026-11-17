import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// 必须在导入 db 之前设置，db.js 在模块加载时就读 NOTEBOX_DB。
const dir = mkdtempSync(join(tmpdir(), 'notebox-smoke-'));
process.env.NOTEBOX_DB = join(dir, 'smoke.db');

const { default: buildApp } = await import('../server/app.js');
const app = await buildApp({ logger: false });

const call = async (method, url, payload) => {
  const res = await app.inject({ method, url, payload });
  const body = res.headers['content-type']?.includes('json') ? res.json() : res.body;
  return { status: res.statusCode, body };
};

let passed = 0;
const check = (label, cond, extra) => {
  if (!cond) {
    console.error(`FAIL ${label}`, extra ?? '');
    process.exitCode = 1;
    return;
  }
  passed += 1;
  console.log(`ok   ${label}`);
};

const health = await call('GET', '/api/health');
check('health 返回 ok', health.body.ok === true);

const created = await call('POST', '/api/entries', { kind: 'todo', title: '写第一版', tags: ['开发'] });
check('创建待办返回 201', created.status === 201, created);
check('标题落库', created.body.title === '写第一版');
check('默认进收件箱', created.body.status === 'inbox');
check('标签已写入', JSON.stringify(created.body.tags) === '["开发"]');

const inbox = await call('GET', '/api/entries?view=inbox');
check('收件箱能查到', inbox.body.items.length === 1 && inbox.body.total === 1);

const note = await call('POST', '/api/entries', { kind: 'note', title: '读书笔记' });
check('创建笔记返回 201', note.status === 201);
check('笔记状态固定 inbox', note.body.status === 'inbox');

const notes = await call('GET', '/api/entries?view=note');
check('笔记视图只含笔记', notes.body.items.length === 1 && notes.body.items[0].kind === 'note');

const noTitle = await call('POST', '/api/entries', { body: '只有正文' });
check('标题缺省时取正文首行', noTitle.body.title === '只有正文');

const empty = await call('POST', '/api/entries', {});
check('空内容被拒绝', empty.status === 400);

const patched = await call('PATCH', `/api/entries/${created.body.id}`, {
  status: 'done',
  priority: 2,
  due_at: '2026-01-01',
  tags: ['开发', '收尾'],
});
check('状态改为 done', patched.body.status === 'done');
check('优先级更新', patched.body.priority === 2);
check('标签替换而非累加', JSON.stringify(patched.body.tags) === '["开发","收尾"]');

const done = await call('GET', '/api/entries?view=done');
check('已完成视图可见', done.body.items.length === 1);

const stats = await call('GET', '/api/stats');
check('stats 已完成计数为 1', stats.body.done === 1, stats.body);
// 收件箱还剩“只有正文”那一条：它在 done 之外仍是 inbox。
check('stats 收件箱剩 1 条', stats.body.inbox === 1, stats.body);
check('stats 总数与待办数一致', stats.body.todo === 1 && stats.body.note === 1, stats.body);

const tagList = await call('GET', '/api/tags');
check('标签列表有两条', tagList.body.length === 2, tagList.body);
check('标签计数正确', tagList.body.every((t) => t.count === 1));

const byTag = await call('GET', '/api/entries?view=all&tag=收尾');
check('按标签筛选命中', byTag.body.items.length === 1);

const search = await call('GET', '/api/entries?view=all&q=读书');
check('搜索命中标题', search.body.items.length === 1 && search.body.items[0].kind === 'note');

const searchBody = await call('GET', '/api/entries?view=all&q=正文');
check('搜索命中正文', searchBody.body.items.length === 1);

const zero = await call('GET', '/api/entries?view=all&q=不存在的词');
check('无结果返回空数组', zero.body.items.length === 0);

const deleted = await call('DELETE', `/api/entries/${created.body.id}`);
check('软删除返回条目', deleted.status === 200 && deleted.body.deleted_at !== null);

const trash = await call('GET', '/api/entries?view=trash');
check('回收站可见被删条目', trash.body.items.length === 1);

const restored = await call('PATCH', `/api/entries/${created.body.id}`, { deleted: false });
check('从回收站恢复', restored.body.deleted_at === null);

const noteToTodo = await call('PATCH', `/api/entries/${note.body.id}`, { kind: 'todo', status: 'done' });
check('笔记转待办可置为 done', noteToTodo.body.status === 'done');

const archived = await call('PATCH', `/api/entries/${note.body.id}`, { archived: true });
check('归档写入时间', typeof archived.body.archived_at === 'string');
const archivedList = await call('GET', '/api/entries?view=archived');
check('归档视图可见', archivedList.body.items.length === 1);

const exported = await call('GET', '/api/export');
check('导出包含全部条目', exported.body.entries.length === 3, exported.body.entries.length);
check('导出带版本号', exported.body.version === 1);

const imported = await call('POST', '/api/import', {
  mode: 'merge',
  entries: exported.body.entries,
});
check('合并导入跳过重复', imported.body.imported === 0, imported.body);

const missing = await call('PATCH', '/api/entries/99999', { status: 'done' });
check('不存在的条目返回 404', missing.status === 404);

await app.close();
console.log(`\n${passed} checks passed`);
if (process.exitCode) console.error('冒烟测试存在失败项');
else console.log('冒烟测试全部通过');
