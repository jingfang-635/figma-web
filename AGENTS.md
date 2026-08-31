# Agents

## figma-to-fullstack

从 Figma 原型生成可运行全栈（React + NestJS + Prisma 默认）。

- **智能体定义**：[`figma-to-fullstack/figma-to-fullstack.md`](figma-to-fullstack/figma-to-fullstack.md)
- **Skill**：[`figma-to-fullstack/SKILL.md`](figma-to-fullstack/SKILL.md)
- **默认前端还原方案**：[`figma-to-fullstack/visual-fidelity.md`](figma-to-fullstack/visual-fidelity.md)

### 默认行为

1. Design IR → App Spec（人工闸门）
2. Visual IR + 截图 + Screen Blueprint（**必做**）
3. DB / API / **antd 前端**（标杆页 + list 模板）
4. 功能冒烟 + **视觉闸门**（对照 `imports/figma/screens/`）
5. **字段还原 + 页面还原轮次**：Playwright 逐页截图对比 → 列差异修代码 → 询问是否下一轮，直至用户选择不进入

前端还原度默认为「高还原且可维护」，见 `.cursor/rules/figma-visual-fidelity.mdc`。

### 快速命令

```bash
npm run visual:all   # Layout IR + Visual IR + shots + gen + assets + SSIM gate
npm run api
npm run web
```

用户级副本（跨项目）：`~/.cursor/skills/figma-to-fullstack/`、`~/.cursor/agents/figma-to-fullstack.md`
