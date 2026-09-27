#!/usr/bin/env node
/**
 * 后台启动包装（给 dev:up 用）：把被启动服务的 stdout/stderr 落盘到 `artifacts/dev/<name>.log`。
 *
 * 为什么需要单独一个包装进程：Windows 下 `detached: true` 会让 Node **丢掉继承的 stdio 句柄**
 * （实测：`spawn(cmd, {detached:true, stdio:["ignore",fd,fd]})` 启动的服务能跑，但日志文件 0 字节），
 * 而 `detached` 又是「父进程退出后服务不被连带关掉」的必要条件。故这里由包装进程**自己 open 日志文件**、
 * 再把该 fd 作为 stdio 传给子进程（非 detached，句柄继承正常）→ 既常驻又留日志。
 *
 * Usage：node scripts/dev-run.mjs <name> "<command>"
 */
import { spawn } from "node:child_process";
import { appendFileSync, mkdirSync, openSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [name, command] = process.argv.slice(2);
if (!name || !command) {
  console.error("Usage: node scripts/dev-run.mjs <name> \"<command>\"");
  process.exit(2);
}

const logDir = resolve(root, "artifacts", "dev");
mkdirSync(logDir, { recursive: true });
const logPath = resolve(logDir, `${name}.log`);
appendFileSync(logPath, `\n===== ${new Date().toISOString()} 启动：${command} =====\n`);

const fd = openSync(logPath, "a");
const child = spawn(command, {
  cwd: root,
  shell: true,
  stdio: ["ignore", fd, fd],
  env: process.env,
});
child.on("exit", (code) => process.exit(code ?? 0));
