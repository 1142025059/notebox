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

const created = await call('POST', '/api/entries', { title: '第一条笔记' });
check('创建笔记返回 201', created.status === 201, created);
check('默认就是笔记类型', created.body.kind === 'note');
check('默认未完成', created.body.status === 'inbox');
check('新建时记录创建与修改时间', Boolean(created.body.created_at && created.body.updated_at));
check('新建时两个时间一致', created.body.created_at === created.body.updated_at);

const notes = await call('GET', '/api/entries?view=notes');
check('全部笔记里能看到', notes.body.items.length === 1 && notes.body.total === 1);

const withBody = await call('POST', '/api/entries', { body: '正文首行当标题' });
check('标题缺省时取正文首行', withBody.body.title === '正文首行当标题');

const empty = await call('POST', '/api/entries', {});
check('空内容被拒绝', empty.status === 400);

const donePatch = await call('PATCH', `/api/entries/${created.body.id}`, { status: 'done' });
check('笔记可以标记完成', donePatch.body.status === 'done');
check('完成时间不影响其他字段', donePatch.body.title === '第一条笔记');
check(
  '修改后 updated_at 晚于 created_at',
  new Date(donePatch.body.updated_at) > new Date(donePatch.body.created_at),
  `${donePatch.body.created_at} -> ${donePatch.body.updated_at}`,
);

const notesAfterDone = await call('GET', '/api/entries?view=notes');
check('完成后不在全部笔记展示', notesAfterDone.body.items.length === 1 && notesAfterDone.body.total === 1);
check('剩下的是未完成那条', notesAfterDone.body.items[0].id === withBody.body.id);

const doneList = await call('GET', '/api/entries?view=done');
check('已完成视图出现', doneList.body.items.length === 1 && doneList.body.items[0].id === created.body.id);

const stats = await call('GET', '/api/stats');
check('笔记模块未完成计数为 1', stats.body.note?.notes === 1, stats.body);
check('笔记模块已完成计数为 1', stats.body.note?.done === 1, stats.body);

const reopen = await call('PATCH', `/api/entries/${created.body.id}`, { status: 'inbox' });
check('取消完成成功', reopen.body.status === 'inbox');

const notesBack = await call('GET', '/api/entries?view=notes');
check('取消后回到全部笔记', notesBack.body.total === 2);

const search = await call('GET', '/api/entries?view=notes&q=首行');
check('搜索命中正文', search.body.items.length === 1);
check('搜索命中标题', (await call('GET', '/api/entries?view=notes&q=第一条')).body.items.length === 1);

const zero = await call('GET', '/api/entries?view=notes&q=不存在的词');
check('无结果返回空数组', zero.body.items.length === 0);

const listed = await call('GET', '/api/entries?view=notes');
check('列表按创建顺序倒序', listed.body.items[0].id > listed.body.items[1].id);

const deleted = await call('DELETE', `/api/entries/${created.body.id}`);
check('硬删除返回被删条目', deleted.status === 200 && deleted.body.id === created.body.id);

const gone = await call('PATCH', `/api/entries/${created.body.id}`, { status: 'inbox' });
check('删除后条目已不存在', gone.status === 404);

const afterDelete = await call('GET', '/api/entries?view=notes');
check('删除后只剩一条', afterDelete.body.total === 1);
const doneAfterDelete = await call('GET', '/api/entries?view=done');
check('已完成视图为空', doneAfterDelete.body.total === 0);

const exported = await call('GET', '/api/export');
check('导出只含存活条目', exported.body.entries.length === 1, exported.body.entries.length);
check('导出带版本号', exported.body.version === 1);

const imported = await call('POST', '/api/import', {
  mode: 'merge',
  entries: exported.body.entries,
});
check('合并导入跳过重复', imported.body.imported === 0, imported.body);

// 三个模块共用一套逻辑，但数据必须彼此隔离
const task = await call('POST', '/api/entries', { title: '部署新版本', kind: 'todo' });
check('可以创建任务', task.status === 201 && task.body.kind === 'todo');

const knowledge = await call('POST', '/api/entries', {
  title: '为什么 SQLite 用 WAL',
  body: '读写并发更好',
  kind: 'knowledge',
});
check('可以创建知识', knowledge.status === 201 && knowledge.body.kind === 'knowledge');

const taskNotes = await call('GET', '/api/entries?view=notes&kind=todo');
check('任务视图只返回任务', taskNotes.body.total === 1 && taskNotes.body.items.every((e) => e.kind === 'todo'));

const noteOnly = await call('GET', '/api/entries?view=notes&kind=note');
check('笔记视图不含任务和知识', noteOnly.body.items.every((e) => e.kind === 'note'));

const knowledgeDone = await call('PATCH', `/api/entries/${knowledge.body.id}`, { status: 'done' });
check('知识也可以标记完成', knowledgeDone.body.status === 'done');

const crossStats = await call('GET', '/api/stats');
check('任务计数独立', crossStats.body.todo?.notes === 1 && crossStats.body.todo?.done === 0, crossStats.body);
check(
  '知识计数独立',
  crossStats.body.knowledge?.notes === 0 && crossStats.body.knowledge?.done === 1,
  crossStats.body,
);

const missing = await call('PATCH', '/api/entries/99999', { status: 'done' });
check('不存在的条目返回 404', missing.status === 404);

await app.close();
console.log(`\n${passed} checks passed`);
if (process.exitCode) console.error('冒烟测试存在失败项');
else console.log('冒烟测试全部通过');
