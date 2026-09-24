# Agents

## figma-to-fullstack

从 Figma 原型生成可运行全栈（技术栈由用户逐层选择，无默认）。

- **智能体定义**：[`figma-to-fullstack/figma-to-fullstack.md`](figma-to-fullstack/figma-to-fullstack.md)
- **Skill**：[`figma-to-fullstack/SKILL.md`](figma-to-fullstack/SKILL.md)
- **前端还原方案**：[`figma-to-fullstack/visual-fidelity.md`](figma-to-fullstack/visual-fidelity.md)（技术栈由用户逐层选择，无默认）

### 流水线（spec 驱动，脚本零业务硬编码）

```
npm run init:project -- --slug <slug> --file <key>   # 拉结构 + app-spec 骨架
→ App Spec 人工闸门（实体/路由/screens 全屏清单/seedAdmin）
→ visual:layout / extract / shots(:all) / assets      # Layout IR / Visual IR / 对照 PNG
→ 字段回填（figma-fields → spec，needsReview 清零）
→ visual:gen                                          # tokens/主题文件/blueprints/screenConfigs（按选定框架）
→ gen:backend                                         # spec.stack 分发 adapter：DB schema/seed + auth + CRUD + dashboard
→ 前端（按用户选定框架与组件库：全屏 Blueprint + list 模板）
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

### 稳定性与编辑纪律（必读）

详见 [figma-to-fullstack/SKILL.md](figma-to-fullstack/SKILL.md)「稳定性与编辑纪律」。核心三条：

1. **改完即验证**：每次改 `.tsx/.ts` 后跑 `npx tsc --noEmit`，防重复声明/语法错误进 HMR
2. **单实例服务**：重启前先 `netstat -ano | findstr :3001` 清理旧进程（按 PID 精确 kill，禁止按进程名全杀）；同一服务只允许一个启动任务
3. **先探活再联调**：API 起来后先 `Invoke-WebRequest http://localhost:3001/actuator/health`，通过后前端才开轮询；PowerShell 禁用 `&` 链接命令

项目差异全部由 `fixtures/<slug>/app-spec.json` 驱动（screens 全屏清单/路由/闸门账号/品牌），脚本不含业务硬编码。

用户级副本（跨项目）：`~/.cursor/skills/figma-to-fullstack/`、`~/.cursor/agents/figma-to-fullstack.md`