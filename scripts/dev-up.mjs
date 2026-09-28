#!/usr/bin/env node
/**
 * 服务就绪闸（还原轮次收尾必跑，幂等）
 *
 * 为什么需要：还原轮次结束后，必须**先有可访问的服务**才允许问「是否进入下一轮」——
 * 否则用户点开看不到页面，下一轮也无从开跑（本轮实测：轮次跑完服务已不在，用户看到的
 * 是打不开的站点）。此步把「先启动服务、再提问」机械化，而不是只写在流程文档里：
 *
 *   ① 探活：已在跑 → 跳过启动（遵守单实例，不打扰用户正在用的进程）
 *   ② 未跑 → 按端口精确清理旧实例（按 PID，禁止按进程名全杀）→ 后台启动 → 探活直到通过
 *
 * 零硬编码：地址取根 `.env` 的 `WEB_URL`，API 端口取生成物
 * `apps/api/src/main/resources/application.yml` 的 `server.port`（Node 栈回落 `API_PORT`）；
 * 探活走 web 的 `/api` 代理（端到端：代理能转到 API 才算就绪，不额外假设端口布局）。
 * 凭证取 `.env` 的 `GATE_ADMIN_*` / `app-spec.seedAdmin`；无凭证时退化为「代理可达」探测。
 *
 * Usage：node scripts/dev-up.mjs
 * 退出码：0 = api + web 均就绪；1 = 超时/启动失败（日志路径会打印，先看日志再动手）
 */
import { execSync, spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gateCredentials, loadRootEnv } from "./lib/project.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
loadRootEnv(root);

const WEB_URL = (process.env.WEB_URL || "http://localhost:5173").replace(/\/+$/, "");
const LOG_DIR = resolve(root, "artifacts", "dev");
const TIMEOUT_MS = Number(process.env.DEV_UP_TIMEOUT_MS || 300000);
const POLL_MS = 2000;

const stamp = () => new Date().toLocaleTimeString("zh-CN", { hour12: false });

/** 由生成物取 API 端口（Java 栈：application.yml 的 server.port；Node 栈：API_PORT）。 */
function apiPort() {
  const yml = resolve(root, "apps", "api", "src", "main", "resources", "application.yml");
  if (existsSync(yml)) {
    let inServer = false;
    for (const line of readFileSync(yml, "utf8").split(/\r?\n/)) {
      if (/^server:\s*$/.test(line)) {
        inServer = true;
        continue;
      }
      if (!inServer) continue;
      const m = line.match(/^\s+port:\s*(\d+)\s*$/);
      if (m) return Number(m[1]);
      if (/^\S/.test(line)) inServer = false; // 离开 server 块
    }
  }
  return process.env.API_PORT ? Number(process.env.API_PORT) : null;
}

function portOf(url) {
  try {
    const u = new URL(url);
    if (u.port) return Number(u.port);
    return u.protocol === "https:" ? 443 : 80;
  } catch {
    return null;
  }
}

/** 精确清理占用端口的旧实例（只 kill LISTENING 的 PID，不按进程名全杀）。返回被 kill 的 PID。 */
function killPort(port) {
  if (!port) return [];
  const pids = new Set();
  try {
    if (process.platform === "win32") {
      const out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
      for (const line of out.split(/\r?\n/)) {
        if (!/LISTENING/i.test(line)) continue;
        const pid = line.trim().split(/\s+/).pop();
        if (/^\d+$/.test(pid) && pid !== "0") pids.add(pid);
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
        } catch {
          /* 已被回收 */
        }
      }
    } else {
      const out = execSync(`lsof -ti tcp:${port}`, { encoding: "utf8" });
      for (const pid of out.split(/\s+/).filter(Boolean)) {
        try {
          process.kill(Number(pid), "SIGKILL");
          pids.add(pid);
        } catch {
          /* 已被回收 */
        }
      }
    }
  } catch {
    /* 无占用 */
  }
  return [...pids];
}

function launch(name, cmd) {
  const logPath = resolve(LOG_DIR, `${name}.log`);
  // 通过 dev-run.mjs 包装：包装进程自己开日志文件再继承给子进程
  // （Windows 下 detached 的进程会丢继承的 stdio fd，直接重定向会得到 0 字节日志）
  const child = spawn(process.execPath, [resolve(root, "scripts", "dev-run.mjs"), name, cmd], {
    cwd: root,
    detached: true,
    windowsHide: true,
    stdio: "ignore",
    env: process.env,
  });
  child.unref();
  return { pid: child.pid, logPath };
}

async function status(url, init) {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
    return res.status;
  } catch {
    return null;
  }
}

let creds = null;
try {
  creds = gateCredentials(root);
} catch {
  creds = null; // 无凭证 → 退化为「代理可达」探测
}

/** web 就绪：站点可访问（<500 即视为已服务，404 也算活着）。 */
const webReady = async () => {
  const s = await status(WEB_URL);
  return s !== null && s < 500;
};

/** api 就绪：经 web 的 /api 代理端到端探活（代理能转到 API 才算就绪）。 */
const apiReady = async () => {
  if (creds) {
    const s = await status(`${WEB_URL}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: creds.username, password: creds.password }),
    });
    return s === 200;
  }
  const s = await status(`${WEB_URL}/api/actuator/health`);
  return s !== null && s < 500;
};

async function waitFor(label, fn, { pollMs = POLL_MS } = {}) {
  const t0 = Date.now();
  let lastLog = 0;
  for (;;) {
    if (await fn()) return Math.round((Date.now() - t0) / 1000);
    const elapsed = Date.now() - t0;
    if (elapsed > TIMEOUT_MS) return null;
    if (elapsed - lastLog > 10000) {
      lastLog = elapsed;
      console.log(`   … ${label} 启动中（${Math.round(elapsed / 1000)}s / ${Math.round(TIMEOUT_MS / 1000)}s）`);
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
}

/**
 * 启动一个服务到就绪（已在跑则跳过）。
 * 并发调用两个服务：此前是「先 web 等就绪 → 再 api」，总耗时 = web + api；
 * 两者互不依赖（api 探活走 web 的 /api 代理，但轮询自然会等到 web 起来），
 * 故并发启动后总耗时 ≈ max(web, api) = api 的启动时间，省下 web 那一段。
 */
async function bringUp({ name, argv, ready, port, pollMs }) {
  if (await ready()) {
    console.log(`   ✅ ${name} 已在运行（跳过启动）`);
    return { name, ok: true, started: false };
  }
  const killed = killPort(port);
  if (killed.length) console.log(`   ♻️  ${name} 端口旧实例已清理：PID ${killed.join(", ")}`);
  const p = launch(name, argv);
  console.log(`   ▶️  ${name} 已后台启动（PID ${p.pid}）→ ${p.logPath}`);
  const sec = await waitFor(name, ready, { pollMs });
  if (sec === null) {
    console.error(`\n❌ ${name} 未在超时内就绪。日志：${p.logPath}`);
    return { name, ok: false, started: true };
  }
  console.log(`   ✅ ${name} 就绪（${sec}s）`);
  return { name, ok: true, started: true, pid: p.pid };
}

console.log(`🛫 服务就绪闸（web ${WEB_URL} / api 端口 ${apiPort() ?? "?"}）`);

// web 是 Vite dev server（秒级），api 是 Spring Boot（十秒级）→ 并发发出，互不阻塞等待
const [web, api] = await Promise.all([
  bringUp({ name: "web", argv: "npm run web", ready: webReady, port: portOf(WEB_URL), pollMs: 500 }),
  bringUp({ name: "api", argv: "npm run api", ready: apiReady, port: apiPort(), pollMs: 1000 }),
]);

const failed = [web, api].filter((s) => !s.ok);
if (failed.length) {
  console.error(`\n❌ 未就绪：${failed.map((s) => s.name).join("、")}（日志 ${LOG_DIR}）`);
  process.exit(1);
}

console.log("\n✅ 服务已就绪（api + web 均可访问）→ 可以询问是否进入下一轮还原");
const startedNow = [web, api].filter((s) => s.started);
if (startedNow.length) {
  console.log(`   本次新启动：${startedNow.map((s) => `${s.name}(PID ${s.pid})`).join("、")}`);
  console.log(`   日志：${LOG_DIR}`);
}
