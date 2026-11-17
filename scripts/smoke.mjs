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

const notes = await call('GET', '/api/entries?view=notes');
check('全部笔记里能看到', notes.body.items.length === 1 && notes.body.total === 1);

const withBody = await call('POST', '/api/entries', { body: '正文首行当标题' });
check('标题缺省时取正文首行', withBody.body.title === '正文首行当标题');

const empty = await call('POST', '/api/entries', {});
check('空内容被拒绝', empty.status === 400);

const donePatch = await call('PATCH', `/api/entries/${created.body.id}`, { status: 'done' });
check('笔记可以标记完成', donePatch.body.status === 'done');
check('完成时间不影响其他字段', donePatch.body.title === '第一条笔记');

const notesAfterDone = await call('GET', '/api/entries?view=notes');
check('完成后不在全部笔记展示', notesAfterDone.body.items.length === 1 && notesAfterDone.body.total === 1);
check('剩下的是未完成那条', notesAfterDone.body.items[0].id === withBody.body.id);

const doneList = await call('GET', '/api/entries?view=done');
check('已完成视图出现', doneList.body.items.length === 1 && doneList.body.items[0].id === created.body.id);

const stats = await call('GET', '/api/stats');
check('stats 未完成计数为 1', stats.body.notes === 1, stats.body);
check('stats 已完成计数为 1', stats.body.done === 1, stats.body);

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

const missing = await call('PATCH', '/api/entries/99999', { status: 'done' });
check('不存在的条目返回 404', missing.status === 404);

await app.close();
console.log(`\n${passed} checks passed`);
if (process.exitCode) console.error('冒烟测试存在失败项');
else console.log('冒烟测试全部通过');
