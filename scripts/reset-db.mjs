#!/usr/bin/env node
/** 重置数据库：DROP + CREATE sunshine_medical（用 .env 凭证，mysql-connector jar 直连） */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envText = readFileSync(resolve(root, ".env"), "utf8");
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && m[2] !== "") env[m[1]] = m[2];
}

// Node fs 定位 mysql-connector jar（避免 PowerShell 引号问题）
const m2 = join(process.env.USERPROFILE || "", ".m2", "repository", "com", "mysql", "mysql-connector-j");
let jar = "";
if (existsSync(m2)) {
  for (const ver of readdirSync(m2)) {
    const f = join(m2, ver, "mysql-connector-j-" + ver + ".jar");
    if (existsSync(f)) { jar = f; break; }
  }
}
if (!jar) {
  console.error("mysql-connector-j jar not found under", m2);
  process.exit(1);
}

const javaSrc = resolve(root, "artifacts", "ResetDb.java");
writeFileSync(
  javaSrc,
  `import java.sql.*;
public class ResetDb {
  public static void main(String[] a) throws Exception {
    Class.forName("com.mysql.cj.jdbc.Driver");
    try (Connection c = DriverManager.getConnection(System.getenv("JDBC_URL"), System.getenv("DB_USER"), System.getenv("DB_PASS"));
         Statement s = c.createStatement()) {
      s.execute("DROP DATABASE IF EXISTS sunshine_medical");
      s.execute("CREATE DATABASE sunshine_medical DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
      System.out.println("DB reset OK");
    }
  }
}
`,
  "utf8",
);
execSync(`javac "${javaSrc}"`, { stdio: "inherit" });
execSync(`java -cp "${jar};${resolve(root, "artifacts")}" ResetDb`, {
  stdio: "inherit",
  env: { ...process.env, JDBC_URL: "jdbc:mysql://127.0.0.1:3306", DB_USER: env.MYSQL_USER, DB_PASS: env.MYSQL_PASSWORD },
});