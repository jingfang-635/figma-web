#!/usr/bin/env node
/**
 * 重置数据库：DROP + CREATE（无 Docker；用 ~/.m2 的 mysql-connector-j jar 直连）
 * 连接信息取仓库根 .env 预置（MYSQL_JDBC_URL / MYSQL_USER / MYSQL_PASSWORD），库名从 URL 解析，无业务硬编码。
 */
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { dbInfo, findMysqlJar } from "./lib/db.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { dbName, user, password, jdbcBase } = dbInfo();

const jar = findMysqlJar();
if (!jar) {
  console.error("mysql-connector-j jar not found under ~/.m2 — 先构建一次 API（mvnw compile）再试");
  process.exit(1);
}

const work = resolve(root, "artifacts");
mkdirSync(work, { recursive: true });
const javaSrc = resolve(work, "ResetDb.java");
writeFileSync(
  javaSrc,
  `import java.sql.*;
public class ResetDb {
  public static void main(String[] a) throws Exception {
    Class.forName("com.mysql.cj.jdbc.Driver");
    try (Connection c = DriverManager.getConnection("${jdbcBase}", "${user}", "${password}");
         Statement s = c.createStatement()) {
      s.execute("DROP DATABASE IF EXISTS ${dbName}");
      s.execute("CREATE DATABASE ${dbName} DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
      System.out.println("DB reset OK");
    }
  }
}
`,
  "utf8",
);
try {
  execSync(`javac "${javaSrc}"`, { stdio: "inherit" });
  execSync(`java -cp "${jar};${work}" ResetDb`, { stdio: "inherit" });
} finally {
  rmSync(javaSrc, { force: true });
  rmSync(resolve(work, "ResetDb.class"), { force: true });
}
console.log(`database '${dbName}' reset`);