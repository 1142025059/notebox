import { exec, spawn } from 'node:child_process';
import { existsSync, mkdirSync, openSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = path.resolve(import.meta.dirname, '..');
const PORT = Number(process.env.NOTEBOX_PORT || 8787);
const BASE = `http://127.0.0.1:${PORT}`;
const LOG_PATH = path.join(tmpdir(), 'notebox-app.log');
const PROFILE_DIR = path.join(tmpdir(), 'notebox-app-profile');

let serverProc = null;
let serverOwned = false;
let shuttingDown = false;

async function probe(timeoutMs = 1200) {
  try {
    const res = await fetch(`${BASE}/api/stats`, { signal: AbortSignal.timeout(timeoutMs) });
    return res.ok;
  } catch {
    return false;
  }
}

function findBrowser() {
  const candidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];
  return candidates.find((p) => existsSync(p)) ?? null;
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
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
    await sleep(400);
  }
  return false;
}

async function main() {
  // 服务已经在跑（比如上次没关干净），就只开窗口，不重复起进程
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

  const browserPath = findBrowser();
  if (!browserPath) {
    console.error('没找到 Microsoft Edge 或 Google Chrome');
    shutdown(1);
    return;
  }

  mkdirSync(PROFILE_DIR, { recursive: true });

  const browserProc = spawn(
    browserPath,
    [
      `--app=${BASE}/`,
      `--user-data-dir=${PROFILE_DIR}`,
      '--start-maximized',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-mode',
      '--disable-sync',
    ],
    { stdio: 'ignore' },
  );

  browserProc.on('exit', () => shutdown(0));
  browserProc.on('error', () => shutdown(1));

  // 窗口可能继承父进程的隐藏状态而落到屏幕外，主动拉回前台
  setTimeout(() => {
    exec(
      `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${path.join(ROOT, 'scripts', 'activate-window.ps1')}"`,
      () => {},
    );
  }, 2600).unref();

  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));
}

main();
