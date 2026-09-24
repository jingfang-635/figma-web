#!/usr/bin/env node
/**
 * 数据库工具：从仓库根 .env 读取预置连接（spec 驱动，无业务硬编码）。
 *
 * - dbInfo(): 解析 MYSQL_URL / MYSQL_JDBC_URL / MYSQL_USER / MYSQL_PASSWORD
 *   → { jdbcBase, dbName, user, password, env }
 * - findMysqlJar(): 在 ~/.m2 中定位 mysql-connector-j jar
 *
 * Windows 下无 mysql CLI / 无 Docker，一次性 SQL 借助已下载的驱动 jar 直连。
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsLibDir = dirname(fileURLToPath(import.meta.url)); // scripts/lib
const root = resolve(scriptsLibDir, "..", "..");

export function readRootEnv() {
  const text = readFileSync(resolve(root, ".env"), "utf8");
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && m[2] !== "") env[m[1]] = m[2];
  }
  return env;
}

export function dbInfo() {
  const env = readRootEnv();
  const jdbcUrl = env.MYSQL_JDBC_URL || "";
  let dbName = "";
  // jdbc:mysql://127.0.0.1:3306/sunshine_medical?params → sunshine_medical
  let m = jdbcUrl.match(/jdbc:mysql:\/\/[^/]+\/([^?/]+)/);
  if (m) dbName = m[1];
  // 兜底：mysql://user:pass@host:3306/db
  if (!dbName && env.MYSQL_URL) {
    m = env.MYSQL_URL.match(/mysql:\/\/[^/]+\/([^?/]+)/);
    if (m) dbName = m[1];
  }
  if (!dbName) {
    console.error("Cannot resolve DB name from MYSQL_JDBC_URL / MYSQL_URL in .env");
    process.exit(1);
  }
  const user = env.MYSQL_USER || "root";
  const password = env.MYSQL_PASSWORD || "";
  const jdbcBase = jdbcUrl.replace(/\/[^/]*$/, "/");
  return { jdbcBase, dbName, user, password, env };
}

/** 定位 ~/.m2 下最新的 mysql-connector-j jar（Java 栈项目构建后必有） */
export function findMysqlJar() {
  const m2 = join(process.env.USERPROFILE || "", ".m2", "repository", "com", "mysql", "mysql-connector-j");
  if (!existsSync(m2)) return "";
  const versions = readdirSync(m2)
    .filter((v) => /^\d/.test(v))
    .sort()
    .reverse();
  for (const ver of versions) {
    const f = join(m2, ver, `mysql-connector-j-${ver}.jar`);
    if (existsSync(f)) return f;
  }
  return "";
}