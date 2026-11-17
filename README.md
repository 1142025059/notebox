# notebox

低摩擦的个人捕获与待办看板。一个输入框，回车即存；数据存在本地 SQLite 单文件里，不依赖账号，也不依赖网络。

## 这个项目解决什么

只服务一个指标：**想到一件事，3 秒内记下来，不会丢**。所以取舍是明确的：

- **捕获优先**：顶部常驻输入条，`Enter` 直接落库，不经过"新建 → 填标题 → 保存"三步
- **统一模型**：待办和笔记共用一张 `entry` 表，用 `kind` 区分。需求还会变，分裂成两张表意味着以后要搬数据
- **本地优先**：库在 `data/notebox.db`，备份就是复制文件。同步、账号、协作会把复杂度从"本地文件"拉到"服务端一致性"，当前需求撑不起这个成本
- **搜索用 `instr()` 而不是 FTS5**：个人量级（< 10 万行）下全表子串扫描是毫秒级，而 FTS5 的 `unicode61` 分词会把整句中文当成一个 token，中文搜索反而不可用。等数据量真的上来，再考虑 trigram 或外部分词

## 技术栈

| 层 | 选型 | 理由 |
|---|---|---|
| 后端 | Fastify 5 | 轻量、单进程启动快，本地服务够用 |
| 存储 | `node:sqlite`（Node 内置） | 零原生编译依赖，避免 `better-sqlite3` 在 Windows 上的构建风险 |
| 前端 | React 19 + TypeScript + Vite | 类型约束 + 秒级热更新 |
| 样式 | 纯 CSS 变量 | 没有 UI 框架依赖，改配色只需动 `--accent` |

## 运行

要求 Node >= 22.5（`node:sqlite` 的引入版本）。

```powershell
npm install
npm run dev        # API :8787 + Vite :5173，改前端即时热更新
```

日常使用（构建一次，单进程）：

```powershell
npm run serve      # 构建前端并启动，浏览器打开 http://127.0.0.1:8787
```

或直接运行 `scripts\start.ps1`，它会检查依赖与构建产物，然后打开浏览器。

## 快捷键

| 快捷键 | 作用 |
|---|---|
| `Enter` | 保存当前捕获内容（输入法组合状态下不会误触发） |
| `Ctrl+K` | 聚焦搜索框 |
| `Alt+N` | 聚焦捕获输入框 |
| `Esc` | 关闭详情面板 |

## 数据与备份

- 主库：`data/notebox.db`（WAL 模式，同时会有 `-wal` / `-shm` 文件）
- 侧栏「导出 JSON」：全量快照，适合迁移或人工查看
- 侧栏「合并导入」：按 `(title, created_at)` 去重，同一份备份导入两次不会产生重复条目
- 冷备份：直接复制整个 `data/` 目录（WAL 模式下建议先停掉服务再复制）

## API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/entries?view=&q=&tag=&limit=` | 列表。`view` 取 `all/inbox/todo/note/today/done/archived/trash` |
| POST | `/api/entries` | 新建。`title` 为空时取 `body` 首行 |
| PATCH | `/api/entries/:id` | 局部更新，`archived` / `deleted` 用布尔开关 |
| DELETE | `/api/entries/:id` | 软删除到回收站 |
| GET | `/api/stats` | 各视图计数 |
| GET | `/api/tags` | 标签及其使用次数 |
| GET | `/api/export` | 导出全量 JSON |
| POST | `/api/import` | `mode=merge` 合并导入（默认） |

## 验证

```powershell
node --disable-warning=ExperimentalWarning scripts\smoke.mjs
```

34 项接口断言，跑在临时数据库上，不会碰 `data/notebox.db`。

## 已知边界（对应下一版）

- `remind_at` 已入库，但还没有到期桌面通知
- 全局快捷键唤起捕获窗口
- 子任务 checklist、图片附件、完成率统计、暗色主题
- 多设备访问：默认只监听 `127.0.0.1`。要局域网访问需显式设 `HOST=0.0.0.0`，并自行加访问控制（当前没有任何鉴权）
