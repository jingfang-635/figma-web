#!/usr/bin/env node
/** Dev 启动器：读取仓库根 .env 注入环境变量后运行命令（Spring 不自动读根 .env） */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envText = readFileSync(resolve(root, ".env"), "utf8");
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && m[2] !== "") env[m[1]] = m[2];
}

const [, , cwd, ...cmd] = process.argv;
const child = spawn(cmd[0], cmd.slice(1), {
  cwd: resolve(root, cwd),
  shell: true,
  stdio: "inherit",
  env: { ...process.env, ...env },
});
child.on("exit", (code) => process.exit(code ?? 0));