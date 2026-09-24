# Agents

## figma-to-fullstack

从 Figma 原型生成可运行全栈（技术栈由用户逐层选择，无默认）。

- **智能体定义**：[`figma-to-fullstack/figma-to-fullstack.md`](figma-to-fullstack/figma-to-fullstack.md)
- **Skill**：[`figma-to-fullstack/SKILL.md`](figma-to-fullstack/SKILL.md)
- **前端还原方案**：[`figma-to-fullstack/visual-fidelity.md`](figma-to-fullstack/visual-fidelity.md)（技术栈由用户逐层选择，无默认）

### 流水线（spec 驱动，脚本零业务硬编码）

```
npm run init:project -- --slug <slug> --file <key>   # 拉结构 + app-spec 骨架
→ App Spec 人工闸门（实体/路由/benchmarkScreens/seedAdmin）
→ visual:layout / extract / shots(:all) / assets      # Layout IR / Visual IR / 对照 PNG
→ 字段回填（figma-fields → spec，needsReview 清零）
→ visual:gen                                          # tokens/主题文件/blueprints/screenConfigs（按选定框架）
→ gen:backend                                         # spec.stack 分发 adapter：DB schema/seed + auth + CRUD + dashboard
→ 前端（按用户选定框架与组件库：标杆页 + list 模板）
→ 冒烟 + 双闸门（visual:fields + visual:gate）
→ 还原轮次（visual:round 逐页对比 → 列差异 → 修代码 → 问是否下一轮）
→ GENERATED.md
```

### 快速命令

```bash
npm run visual:all   # layout / extract / shots / gen / assets / fields / gate
npm run gen:backend  # 后端 codegen（node→Nest+Prisma / java→Spring+JPA，按 spec.stack）
npm run api
npm run web
```

项目差异全部由 `fixtures/<slug>/app-spec.json` 驱动（标杆屏/路由/闸门账号/品牌），脚本不含业务硬编码。

用户级副本（跨项目）：`~/.cursor/skills/figma-to-fullstack/`、`~/.cursor/agents/figma-to-fullstack.md`