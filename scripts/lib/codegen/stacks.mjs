/**
 * 合法栈矩阵 —— 单一事实源（与 figma-to-fullstack/reference.md 保持一致）。
 * 变更矩阵时同步更新 reference.md。
 */
export const STACKS = {
  A: { language: "node", frontend: "react-vite", backend: "nestjs", database: "postgresql", orm: "prisma" },
  A2: { language: "node", frontend: "react-vite", backend: "express", database: "postgresql", orm: "prisma" },
  B: { language: "node", frontend: "vue-vite", backend: "nestjs", database: "postgresql", orm: "prisma" },
  C: { language: "java", frontend: "react-vite", backend: "spring-boot", database: "mysql", orm: "jpa" },
  D: { language: "java", frontend: "vue-vite", backend: "spring-boot", database: "mysql", orm: "mybatis" },
};

/**
 * 校验并解析栈。优先 CLI --stack 覆盖，其次 spec.stack.id。
 * 非法组合直接报错并提示矩阵，绝不静默降级。
 */
export function validateStack(specStack, stackIdOverride) {
  const id = stackIdOverride || specStack?.id;
  if (!id) {
    throw new Error("app-spec.json 缺少 stack.id。请在闸门环节确认栈（A/A2/B/C/D），或用 --stack <id> 指定。");
  }
  const s = STACKS[id];
  if (!s) {
    throw new Error(`未知栈 ID: ${id}。合法矩阵：${Object.keys(STACKS).join(" / ")}`);
  }
  // spec.stack 若已填写，必须与矩阵一致（避免 spec 声明与实际生成漂移）
  const declared = specStack || {};
  for (const k of ["language", "backend", "database", "orm"]) {
    if (declared[k] && declared[k] !== s[k]) {
      throw new Error(
        `栈不匹配：spec.stack.${k}="${declared[k]}" 与矩阵 ${id}(${s[k]}) 冲突。` +
          `请修正 app-spec.json 的 stack，或改用 --stack <id>。`,
      );
    }
  }
  return { id, ...s };
}