# notebox

一个本地优先的多模块记录工具。笔记、任务、知识三个模块共用同一套「列表 + 详情 + 打勾完成」的交互，差异只在文案和数据分类。

## 模块

打开 `#/` 是模块总览，点卡片进入对应模块；模块页左上角的 `←` 返回总览。

| 模块 | 用来记什么 | 两个字段 |
|---|---|---|
| 笔记 `note` | 备忘、碎片想法、临时信息 | 标题 + 正文 |
| 任务 `todo` | 正在推进的事 | 任务名 + 补充说明 |
| 知识 `knowledge` | 问题与答案的沉淀 | 问题 + 答案 |

三个模块在库里是同构的：共用 `entry` 表，用 `kind` 区分。每个模块只有两个视图——全部（未完成）、已完成（知识模块里叫「已掌握」）。

## 路由

用 hash 路由，不需要服务端 rewrite，放到任意静态托管都能直接跑：

| 路径 | 页面 |
|---|---|
| `#/` | 模块总览 |
| `#/notes` | 笔记 |
| `#/tasks` | 任务 |
| `#/knowledge` | 知识 |

## 交互

1. 模块页左上角「新建…」按钮，或 `Alt+N`
2. 右侧面板自动聚焦第一个输入框，输入后 800ms 自动保存，不需要点保存
3. 列表一行一条：行首序号、行尾创建/修改时间，长标题省略
4. 点行尾圆圈打勾 → 进入已完成；在已完成里点实心勾 → 回到全部
5. 详情面板底部显示精确到秒的创建时间与修改时间
6. 删除是物理删除，有二次确认，没有回收站

## 技术栈

| 层 | 选型 | 理由 |
|---|---|---|
| 后端 | Fastify 5 | 轻量，单进程启动快 |
| 存储 | `node:sqlite`（Node 内置） | 零原生编译依赖，避免 Windows 上的构建风险 |
| 前端 | React 19 + TypeScript + Vite | 类型约束 + 秒级热更新 |
| 路由 | 自写 hash 路由 | 只有四个页面，不值得引一个 router 依赖 |
| 样式 | 纯 CSS 变量 | 无 UI 框架依赖，模块主色靠覆盖 `--accent` 实现 |

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
| `Alt+N` | 在当前模块新建 |
| `Ctrl+K` | 聚焦搜索 |

## 数据与备份

- 主库：`data/notebox.db`（WAL 模式，另有 `-wal` / `-shm`）
- 侧栏「导出」：导出全部模块的 JSON 快照
- 侧栏「导入」：按 `(title, created_at)` 去重合并，同一份备份导两次不会重复
- 冷备份：停掉服务后复制整个 `data/` 目录

从单模块版本升级到三模块版本时，启动会自动重建 `entry` 表以放开 `kind` 约束（SQLite 不支持就地改 CHECK），数据原样保留；升级前的手工备份在 `data/backup-before-modules/`。

## API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/entries?kind=&view=&q=&limit=` | `kind` 取 `note`/`todo`/`knowledge`（默认 `note`）；`view` 取 `notes`（未完成）或 `done` |
| POST | `/api/entries` | 新建，`kind` 决定模块，`title` 为空时取 `body` 首行 |
| PATCH | `/api/entries/:id` | 局部更新，标记完成传 `{ "status": "done" }` |
| DELETE | `/api/entries/:id` | 物理删除，无回收站 |
| GET | `/api/stats` | 三个模块各自的 `{ notes, done }` |
| GET | `/api/export` | 导出全部模块的 JSON |
| POST | `/api/import` | `mode=merge` 合并导入 |

## 验证

```powershell
node --disable-warning=ExperimentalWarning scripts\smoke.mjs
node --disable-warning=ExperimentalWarning scripts\migration-check.mjs
```

- `smoke.mjs`：38 项接口断言，跑在临时数据库上，不碰 `data/notebox.db`
- `migration-check.mjs`：用旧版 schema 造库，验证重建表后数据、外键、级联删除都正常

## 已知边界

- 三个模块共用一张表，首页计数是一次分组查询；如果以后要跨模块搜索或统计，需要显式加 `kind` 维度
- 知识模块的「答案」是纯文本（Markdown 源码），没有渲染
- 没有标签、到期提醒、多设备访问；服务默认只监听 `127.0.0.1`
