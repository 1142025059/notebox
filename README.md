# notebox

一个极简的个人记事本：一个列表，两个视图，一个新建按钮。

## 它做什么

把想法记下来，做完的打勾移走。界面只有两个地方：

| 视图 | 内容 |
|---|---|
| 全部笔记 | 所有**未完成**的笔记 |
| 已完成笔记 | 打过勾的笔记，可再次点击取消完成、回到全部笔记 |

列表是单行制，一行一条，标题过长会省略。没有标签、优先级、日期、待办清单——这些字段在数据库里保留着，但界面不暴露，避免把"记一句话"这件事变复杂。

## 交互

1. 点左上角 **新建笔记**（或 `Alt+N`）
2. 右侧面板自动聚焦标题，输入内容后 **800ms 自动保存**，不需要点保存按钮
3. 关闭面板后，笔记出现在列表中
4. 点行右侧的圆圈打勾 → 从"全部笔记"消失，进入"已完成笔记"
5. 在已完成里点实心勾 → 取消完成

新建时如果标题和正文都为空，不会产生空笔记。

## 技术栈

| 层 | 选型 | 理由 |
|---|---|---|
| 后端 | Fastify 5 | 轻量，单进程启动快 |
| 存储 | `node:sqlite`（Node 内置） | 零原生编译依赖，避免 Windows 上的构建风险 |
| 前端 | React 19 + TypeScript + Vite | 类型约束 + 秒级热更新 |
| 样式 | 纯 CSS 变量 | 无 UI 框架依赖 |

搜索用 `instr(lower(...), lower(?))` 而不是 FTS5：个人量级下全表子串扫描是毫秒级，而 FTS5 的 `unicode61` 分词会把整句中文当成一个 token。

## 运行

要求 Node >= 22.5（`node:sqlite`）。

```powershell
npm install
npm run dev        # API :8787 + Vite :5173
```

日常使用：

```powershell
npm run serve      # 构建前端并启动，访问 http://127.0.0.1:8787
```

或运行 `scripts\start.ps1`（检查依赖与构建后自动打开浏览器）。

## 快捷键

| 快捷键 | 作用 |
|---|---|
| `Alt+N` | 新建笔记 |
| `Ctrl+K` | 聚焦搜索 |

## 数据与备份

- 主库：`data/notebox.db`（WAL 模式，另有 `-wal` / `-shm`）
- 侧栏「导出」：全量 JSON 快照
- 侧栏「导入」：按 `(title, created_at)` 去重合并，同一份备份导两次不会重复
- 冷备份：停掉服务后复制整个 `data/` 目录

## API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/entries?view=&q=&limit=` | `view` 取 `notes`（未完成）或 `done` |
| POST | `/api/entries` | 新建，默认 `kind=note`，`title` 为空时取 `body` 首行 |
| PATCH | `/api/entries/:id` | 局部更新，标记完成传 `{ "status": "done" }` |
| DELETE | `/api/entries/:id` | 软删除，之后不再出现在任何视图 |
| GET | `/api/stats` | `{ notes, done }` 两个计数 |
| GET | `/api/export` | 导出全量 JSON |
| POST | `/api/import` | `mode=merge` 合并导入 |

## 验证

```powershell
node --disable-warning=ExperimentalWarning scripts\smoke.mjs
```

27 项接口断言，跑在临时数据库上，不会碰 `data/notebox.db`。

## 已知边界

- 删除是软删除，界面上没有回收站入口。当前要恢复只能直接改库，后续需要补一个回收站或改成硬删除
- 正文是纯文本（Markdown 源码），没有渲染
- 没有标签、到期提醒、多设备访问；服务默认只监听 `127.0.0.1`
