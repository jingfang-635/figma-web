# 原型差异检查清单（2026-09-20）

> 本轮为**检查报告**，未修改任何代码。基于 Layout IR（今日 14:29 重提取）与 9/14 闸门结果分析。

## 一、当前状态

| 项 | 状态 | 说明 |
|---|---|---|
| 9/14 视觉闸门 | ✅ 5 标杆页全 PASS | mismatch 1.38%~1.94%（< 2%），SSIM 0.65~0.82 |
| Figma 侧边栏 | ✅ 已矢量图标化 | 插件已替换，`sidebar.json` 无 emoji，Layout IR 已重提取 |
| 导航图标资产 | ✅ 19 个 PNG 已导出 | `apps/web/public/assets/nav/`，`NavIcon` 优先渲染真实图标 |
| 前端 emoji 兜底 | ✅ 链路完整 | `stripIconPrefix` / `ActionIcon` / `chartTitleNode` / `DEPT_VISUAL` |
| 工作区 | ⚠️ 17 个文件未提交 | 第二批图标还原改动 + `figma-plugin/` 整目录，待闸门通过后提交 |

## 二、原型侧残留（需在 Figma 手动跑插件）

插件映射表已备好（`figma-plugin/code.js` 的 `EMOJI_MAP` 已含全部下述 emoji），在 Figma 桌面版选中对应 frame 运行 **Plugins → Development → Emoji → Ant Icons** 即可：

| 优先级 | 屏 | 残留 emoji | 处数 | 替换为 |
|---|---|---|---|---|
| 🔴 高 | 科室管理 | 🫁 🧸 🌸 🦷 🩺（科室图标）+ ✏️ 编辑 / 🗑️ 删除 | 41 | MedicineBox / Smile / Crown / Stop / Skin / Edit / Delete |
| 🟡 中 | 首页 | 📈 🥧 💰 📊（图表标题前缀） | 15 | LineChart / PieChart / Dollar / Fund |
| 🟡 中 | 排班管理 | 📅 日历视图 / 📋 列表视图 / 📅 批量排班 | 10 | Calendar / UnorderedList |
| 🟢 低 | 新增科室弹窗 | ✕（关闭按钮） | 3 | Close |

`organization`、`sidebar` 已干净，无需处理。

## 三、流水线产物过期（代码侧，重跑命令即可）

| # | 问题 | 影响 | 修复命令 |
|---|---|---|---|
| 1 | `imports/figma/screens/*.png` 仍是 9/14 emoji 版 | 对比基准与原型不同源，SSIM 结果失真 | `npm run visual:shots:all` |
| 2 | `tokens.css` 仍是 `--space-nav-icon: 16px`，Layout IR 已变 24px | 侧栏图标尺寸偏差 | `npm run visual:gen` |
| 3 | `depts`（5 科室图标）/ `brand`（logo）资产为空 | 科室列表与品牌位使用兜底样式 | 完成第二节的科室管理替换后 `npm run visual:assets` |
| 4 | `DEPT_VISUAL` 皮肤科用 `FireOutlined`，插件映射为 `SkinOutlined` | 兜底图标不一致 | 待 #3 资产导出后核对（有真实资产则兜底不再触发） |

## 四、建议执行顺序

```
1. Figma 手动：4 个屏跑插件（第二节表格）
2. npm run visual:all（layout / extract / shots / gen / assets / gate）
3. 启动 api + web → node scripts/capture-screens.mjs --round=2
4. node scripts/visual-compare.mjs --round=2 → node scripts/field-stats.mjs --round=2
5. 按差异报告修代码 → 重截 → 提交工作区改动
```

## 五、验收标准（不变）

- 关键字段对齐 100%，非关键 ≥ 95%
- 5 标杆页 mismatch < 2%（SSIM ≥ 0.97）
- `visual:gate` 通过后方可宣称完成

---
**生成时间**: 2026-09-20 23:26 · 基于工作区未提交状态检查