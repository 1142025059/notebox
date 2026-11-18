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
2. 编辑面板占满左侧栏以外的主区：左半边写 Markdown 源码，右半边实时渲染；窄屏自动改为上下分屏
3. 输入后 800ms 自动保存，不需要点保存
4. 正文支持 Markdown 语法（标题、列表、引用、代码块、表格、链接、分割线），边写边出效果
5. 列表一行一条：行首序号、行尾创建/修改时间，长标题省略
6. 点行尾圆圈打勾 → 进入已完成；在已完成里点实心勾 → 回到全部
7. 详情面板底部显示精确到秒的创建时间与修改时间
8. 删除是物理删除，有二次确认，没有回收站

## 技术栈

| 层 | 选型 | 理由 |
|---|---|---|
| 后端 | Fastify 5 | 轻量，单进程启动快 |
| 存储 | `node:sqlite`（Node 内置） | 零原生编译依赖，避免 Windows 上的构建风险 |
| 前端 | React 19 + TypeScript + Vite | 类型约束 + 秒级热更新 |
| Markdown | markdown-it | 关闭 raw HTML，只渲染语法本身，避免粘贴内容带入脚本 |
| 路由 | 自写 hash 路由 | 只有四个页面，不值得引一个 router 依赖 |
| 样式 | 纯 CSS 变量 | 无 UI 框架依赖，模块主色靠覆盖 `--accent` 实现 |

搜索用 `instr(lower(...), lower(?))` 而不是 FTS5：个人量级下全表子串扫描是毫秒级，而 FTS5 的 `unicode61` 分词会把整句中文当成一个 token。

## 运行

### 方式一：便携版（推荐给普通用户）

从 GitHub Releases 下载 `notebox-portable.zip`，解压后双击 `notebox.vbs`。

- 自带 Windows 版 Node 运行时，目标机器不需要安装 Node，也不需要联网
- 窗口是 Edge / Chrome 的 app 模式（无地址栏、无标签页），启动即最大化
- 关闭窗口时服务自动退出，不驻留后台进程
- 数据保存在包内 `data/notebox.db`，整个文件夹拷走即可迁移

### 方式二：源码运行（开发）

要求 Node >= 22.5（`node:sqlite`）。

```powershell
npm install
npm run dev        # API :8787 + Vite :5173
```

### 方式三：按客户端方式启动

```powershell
npm run build
node scripts\launcher.mjs
```

启动器会拉起服务并打开独立窗口，关闭窗口时自动结束服务进程。Windows 上也可以直接双击 `notebox.vbs`。

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
- Markdown 是「左源码右预览」，不是语雀那种所见即所得；任务列表语法（`- [ ]`）会原样显示，没有开扩展
- 图片语法能渲染，但只支持能通过 URL 访问的图片；本地图片没有上传入口
- 没有标签、到期提醒、多设备访问；服务默认只监听 `127.0.0.1`
