/**
 * codegen 公共工具：类型映射 / DB 连接解析 / 文件写出。
 * 不含任何业务硬编码；实体与字段一律来自 app-spec.json。
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

/** spec 字段类型 → Prisma 类型 */
export function toPrismaType(t) {
  switch (t) {
    case "Integer":
    case "Float":
      return "Int";
    case "Decimal":
      return "Float";
    case "Boolean":
      return "Boolean";
    case "DateTime":
      return "DateTime";
    default:
      return "String"; // String 及未知类型兜底
  }
}

/** spec 字段类型 → Java 类型（JPA） */
export function toJavaType(t) {
  switch (t) {
    case "Integer":
      return "Integer";
    case "Float":
    case "Decimal":
      return "Double";
    case "Boolean":
      return "Boolean";
    case "DateTime":
      return "LocalDateTime";
    default:
      return "String";
  }
}

/** 首字母大写（User → User, user → User） */
export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** 驼峰资源名 → kebab-case 路由（newsCategory → news-categories） */
export function kebab(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

/** 驼峰资源名 → snake_case 表名（newsCategory → news_categories） */
export function snake(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
}

/**
 * 按 stack.database 从根 .env 预置变量解析 DB 连接。
 * 返回 { url, user, password, jdbc }；sqlite 无需连接信息。
 * 绝不回显密码。
 */
export function resolveDbConnection(database, env = process.env) {
  if (database === "sqlite") {
    return { url: "file:./dev.db", user: null, password: null };
  }
  if (database === "mysql") {
    return {
      url: env.MYSQL_URL || "",
      jdbc: env.MYSQL_JDBC_URL || "",
      user: env.MYSQL_USER || "",
      password: env.MYSQL_PASSWORD || "",
    };
  }
  if (database === "postgresql") {
    return {
      url: env.POSTGRES_URL || "",
      user: env.PG_USER || "",
      password: env.PG_PASSWORD || "",
      jdbc: "",
    };
  }
  throw new Error(`不支持的数据库类型: ${database}（合法值 mysql/postgresql/sqlite）`);
}

/** 确保目录存在后写文件 */
export function writeFileSafe(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

/** 从 spec.entities 归一化出实体定义列表（含默认值补齐） */
export function normalizeEntities(entities = []) {
  return entities.map((e) => {
    if (typeof e === "string") e = { name: e };
    const name = cap(e.name);
    const fields = (e.fields || []).map((f) =>
      typeof f === "string" ? { name: f, type: "String" } : { type: "String", ...f },
    );
    return {
      name,
      table: e.table || snake(name),
      route: e.route || kebab(name),
      fields,
      seedCount: e.seedCount ?? 6,
      seedRows: e.seedRows || e.seed || null,
    };
  });
}

/**
 * 从 spec.screens 推断实体清单（闸门未填 entities 时的兜底）：
 * 只取 type 为 list/form/detail 且 entity 非空的屏，按 entity 去重。
 */
export function entitiesFromScreens(screens = []) {
  const seen = new Map();
  for (const s of screens) {
    if (!["list", "form", "detail"].includes(s.type)) continue;
    if (!s.entity || s.needsReview) continue;
    const key = s.entity;
    if (!seen.has(key)) {
      // 从 screen.formFields/columns 推断字段（type 映射到 codegen 类型）
      const fields = new Map();
      for (const f of s.formFields || []) {
        if (!f.key) continue;
        fields.set(f.key, formTypeToSpecType(f.type));
      }
      for (const c of s.table?.columns || []) {
        if (c.key && !fields.has(c.key)) fields.set(c.key, "String");
      }
      // filters（search/select/date）为查询条件，不生成持久化字段
      seen.set(key, {
        name: key,
        fields: [...fields.entries()].map(([k, v]) => ({ name: k, type: v })),
      });
    }
  }
  return [...seen.values()];
}

/** antd form type → spec 字段类型 */
function formTypeToSpecType(t) {
  switch (t) {
    case "number":
      return "Integer";
    case "switch":
      return "Boolean";
    case "date":
      return "DateTime";
    default:
      return "String";
  }
}