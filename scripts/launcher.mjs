import { spawn } from 'node:child_process';
import { mkdirSync, openSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = path.resolve(import.meta.dirname, '..');
const PORT = Number(process.env.NOTEBOX_PORT || 8787);
const BASE = `http://127.0.0.1:${PORT}`;
const LOG_PATH = path.join(tmpdir(), 'notebox-app.log');
const READY_FLAG = path.join(tmpdir(), 'notebox-ready.flag');
const WATCHER = path.join(ROOT, 'scripts', 'watch-window.ps1');

/**
 * 浏览器 profile 放在包内，第二次启动直接复用已经初始化好的 profile。
 * 包目录不可写时回退到临时目录。
 */
function resolveProfileDir() {
  const local = path.join(ROOT, 'profile');
  try {
    mkdirSync(local, { recursive: true });
    return local;
  } catch {
    const fallback = path.join(tmpdir(), 'notebox-app-profile');
    mkdirSync(fallback, { recursive: true });
    return fallback;
  }
}

let serverProc = null;
let serverOwned = false;
let shuttingDown = false;

async function probe(timeoutMs = 800) {
  try {
    const res = await fetch(`${BASE}/api/stats`, { signal: AbortSignal.timeout(timeoutMs) });
    return res.ok;
  } catch {
    return false;
  }
}

function cleanupFlag() {
  try {
    unlinkSync(READY_FLAG);
  } catch {
    // 不存在就忽略
  }
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  cleanupFlag();
  if (serverProc && serverOwned) {
    try {
      serverProc.kill();
    } catch {
      // 已经退出就忽略
    }
    serverProc = null;
  }
  // 给 server 一点时间把 WAL 刷盘再退出
  setTimeout(() => process.exit(code), 400);
}

async function waitForServer() {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (await probe()) return true;
    if (serverProc && serverProc.exitCode !== null) return false;
    await sleep(150);
  }
  return false;
}

async function main() {
  // 服务已经在跑（比如上次没关干净），就直接复用
  if (!(await probe())) {
    const logFd = openSync(LOG_PATH, 'a');
    serverProc = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', 'server/index.js'], {
      cwd: ROOT,
      stdio: ['ignore', logFd, logFd],
      windowsHide: true,
      env: { ...process.env, PORT: String(PORT), HOST: '127.0.0.1' },
    });
    serverOwned = true;
    serverProc.on('exit', () => {
      serverProc = null;
    });
    if (!(await waitForServer())) {
      shutdown(1);
      return;
    }
  }

  // 服务就绪：写标记，由入口脚本（notebox.cmd / notebox.vbs）自己用正常窗口状态打开浏览器。
  // 浏览器不能从这里启动：本进程是隐藏启动的，经它拉起来的 GUI 会拖到 7-8 秒才出窗口。
  try {
    writeFileSync(READY_FLAG, 'ready');
  } catch {
    // 标记写不了也不致命，入口脚本有自己的超时
  }

  // watcher 负责：窗口出现后最大化并前置；窗口关闭后退出来通知本进程收工。
  const watcher = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', WATCHER], {
    stdio: 'ignore',
    windowsHide: true,
  });
  watcher.on('exit', (code) => shutdown(code === 2 ? 1 : 0));
  watcher.on('error', () => shutdown(1));

  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));
}

resolveProfileDir();
main();
