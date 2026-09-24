#!/usr/bin/env node
/** 一次性：通过 mysql2（复用 api 依赖树不可行）→ 改用原生 socket 实现 CREATE DATABASE */
// 简化：MySQL 客户端握手+查询的手写实现较复杂，这里用 child_process 调用 wsl/mysql 均不可用时的兜底——
// 实际采用：JDBC 一次性执行（借助已下载的 mysql-connector jar）
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envText = readFileSync(resolve(root, ".env"), "utf8");
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && m[2] !== "") env[m[1]] = m[2];
}

const jar = execSync(
  `powershell -NoProfile -Command "(Get-ChildItem \\"$env:USERPROFILE\\.m2\\repository\\com\\mysql\\mysql-connector-j\\" -Recurse -Filter 'mysql-connector-j-*.jar' | Where-Object { $_.Name -notmatch 'sources' } | Select-Object -First 1).FullName"`,
  { encoding: "utf8" },
).trim();
if (!jar) {
  console.error("mysql-connector jar not found in ~/.m2");
  process.exit(1);
}

const javaSrc = resolve(root, "artifacts", "CreateDb.java");
writeFileSync(
  javaSrc,
  `import java.sql.*;
public class CreateDb {
  public static void main(String[] a) throws Exception {
    String url = System.getenv("JDBC_URL");
    try (Connection c = DriverManager.getConnection(url, System.getenv("DB_USER"), System.getenv("DB_PASS"));
         Statement s = c.createStatement()) {
      s.execute("CREATE DATABASE IF NOT EXISTS sunshine_medical DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
      ResultSet rs = s.executeQuery("SHOW DATABASES LIKE 'sunshine_medical'");
      while (rs.next()) System.out.println("OK: " + rs.getString(1));
    }
  }
}
`,
  "utf8",
);
const cls = resolve(root, "artifacts");
execSync(`javac -cp "${jar}" "${javaSrc}" -d "${resolve(root, 'artifacts')}"`, { stdio: "inherit" });
const jdbcBase = (env.MYSQL_JDBC_URL || "jdbc:mysql://127.0.0.1:3306").replace(/\/[^/]*$/, "/");
execSync(
  `java -cp "${jar};${resolve(root, "artifacts")}" CreateDb`,
  { stdio: "inherit", env: { ...process.env, JDBC_URL: jdbcBase, DB_USER: env.MYSQL_USER, DB_PASS: env.MYSQL_PASSWORD } },
);