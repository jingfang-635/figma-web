# 阳光医疗 · 生成说明

## Figma 来源

- 链接：https://www.figma.com/design/KLYzRbufrish4gmY4jpUS0/%E9%98%B3%E5%85%89%E5%8C%BB%E7%96%97-%E8%B0%83%E4%BC%98%E7%89%88?node-id=0-1
- fileKey：`KLYzRbufrish4gmY4jpUS0`
- App Spec：`fixtures/sunshine-medical/app-spec.json`
- Visual IR：`fixtures/sunshine-medical/visual-ir.json`
- Screen Blueprints：`fixtures/sunshine-medical/screen-blueprints/`（同步到 `apps/web/src/blueprints/`）
- 对照截图：`imports/figma/screens/`

## 决策

| 项 | 值 |
|---|---|
| 后端语言 | Node |
| 栈 | A（React + NestJS + Prisma） |
| 前端 UI | **Ant Design** + recharts（**默认还原方案**，见 `figma-to-fullstack/visual-fidelity.md`） |
| 还原策略 | Screen Blueprint 逐屏构图（非自制 CRUD 壳） |
| 鉴权 | JWT |
| 数据库 | SQLite（临时） |

## 前端结构

- `theme/antdTheme.ts` — ConfigProvider 主题（对齐 Visual IR）
- `components/chrome/Layout.tsx` — antd Layout + 彩色图标 Menu + Header
- `pages/DashboardPage.tsx` — 首页图表标杆
- `pages/DepartmentsPage.tsx` — 科室列表标杆（iconTitleDesc + 图标操作 + 横向弹窗）
- `pages/OrganizationPage.tsx` / `SchedulePage.tsx` — 表单 / 日历标杆
- `templates/ResourceListPage.tsx` — 其余 list 屏（antd Table/Modal）

## 启动

```bash
npm run api    # http://localhost:3001
npm run web    # http://localhost:5173
```

视觉产物：

```bash
npm run visual:all   # layout + extract + shots + gen + assets + gate
# 或分步：
npm run visual:layout
npm run visual:extract
npm run visual:shots
npm run visual:gen
npm run visual:assets
npm run visual:gate
```

## 默认账号

- 邮箱：`admin@sunshine.clinic`
- 密码：`admin123`

## 视觉闸门

- 命令：`npm run visual:gate`（需 `npm run api` + `npm run web`）
- 标准：1440×1068 下 SSIM ≥ 0.97 或像素 mismatch < 2%
- 报告：`artifacts/visual-diff/score.json`
- 闸门模式：`?visualGate=1` 冻结 Blueprint sample
- 标杆：首页、科室、机构、排班、新增科室弹窗（侧栏含在首页全页对照中）
- 最近一次：全部 PASS（home 1.38%、organization 1.88%、departments 1.94%、schedules 1.59%、modal-create-dept 1.88%）
- 其余 list 屏未进 SSIM

侧栏文案以 Figma 节点为准：画板虽改名为「广告位管理 / 导航栏管理 / 通知管理」，侧栏与页标题仍显示「广告图管理 / 导航栏 / 消息通知」。

## 本轮打通与第 1 轮还原（2026-09-14）

补齐环境后重跑全链路，对照图与闸门均已落盘：

- `.env`（含 `FIGMA_ACCESS_TOKEN`，已 gitignore）与 `.env.example`（不含密钥）
- `apps/api/.env`：SQLite `file:./dev.db`、`PORT=3001`
- 对照图：`imports/figma/screens/` 共 **29 张**（21 屏 + 7 弹窗 + 侧栏）
- 运行时截图：`artifacts/visual-diff/round-1/` 共 **21 屏**（新增 `npm run visual:capture`）
- 视觉闸门：**5/5 PASS**
- 区域差异报告：`artifacts/visual-diff/REPORT.md`（`node scripts/visual-compare.mjs --json`）

### 已修的还原差异

| 项 | 差异 | 修复 |
|---|---|---|
| tokens 主色 | `primary` 硬编码为 antd 默认 `#1677FF`；命名节点里的 `#1890FF` 被 `isLinkBlue()` 挡掉 | 改为从 Layout IR 命名区域推导，`tokens.json` / `tokens.css` 现为 `#1890FF`（`primaryHover #4BA8FF`） |

### 说明

- `assetManifest.json` 的 `exported: 0` **不是缺陷**：原型侧栏图标本身是 emoji 文本节点（🏠🏥🏷️…），Figma 内无可导出矢量；`apps/web/src/config/navIcons.tsx` 的 `NAV_EMOJI` 即其忠实还原，`@ant-design/icons` 分支实际未被使用。
- 其余网格差异区域 Δcolor 仅 0.00–0.01（白→白），属字体抗锯齿噪声，非结构差异。
- 还原轮次状态：**第 1 轮已完成**，等待确认是否进入下一轮。

