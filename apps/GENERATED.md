# GENERATED — 阳光医疗门诊（sunshine-medical）

> 本文件由流水线收尾步骤生成；闸门分数与还原轮次见 `artifacts/visual-diff/`。

## 概要

| 项 | 值 |
|---|---|
| Figma | https://www.figma.com/design/KLYzRbufrish4gmY4jpUS0 （fileKey `KLYzRbufrish4gmY4jpUS0`） |
| slug | `sunshine-medical` |
| 技术栈 | Stack C：React 18 + Vite + antd 5 / Spring Boot 3 + JPA / MySQL / JWT |
| 产出 | `apps/web` + `apps/api`（monorepo） |
| 生成时间 | 2026-09-21 ~ 2026-09-24（3 天，含 1 轮像素还原） |

## 页面清单

| 页面 | 路由 | 类型 | 实体 | 备注 |
|---|---|---|---|---|
| 首页 | `/` | dashboard/chart | dashboard | KPI + 2 图表 + 预约列表 |
| 科室管理 | `/departments` | list | departments | 新增科室弹窗 |
| 医生管理 | `/doctors` | list | doctors | 新增医生弹窗（含上传） |
| 排班管理 | `/schedules` | schedule | schedules | 新增排班 + 批量排班弹窗 |
| 机构信息 | `/organization` | form | organization | 表单屏 |
| 登录 | `/login` | auth | admin | 闸门账号 |

弹窗：新增科室 / 新增医生 / 新增排班 / 找回密码（原型 4 弹窗全部覆盖）。

## 双闸门结果（2026-09-24，端到端实测）

> SSIM 引擎：`ssim.js`（标准 MSSIM，windowSize=11）；闸门 `Visual gate passed`，报告 `artifacts/visual-diff/score.json`。

| 屏 | SSIM | mismatch | 通过 |
|---|---|---|---|
| home | 0.8076 | 1.98% | ✅ |
| departments | 0.7639 | 1.74% | ✅ |
| organization | 0.7663 | 1.73% | ✅ |
| modal-create-dept | 0.6032 | 1.69% | ✅ |
| modal-create-doctor | 0.5989 | 1.34% | ✅ |

- 字段一致性闸门（`npm run visual:fields`）：**通过**，`needsReview=0`，screenConfigs ↔ figma-fields 逐字一致
- 视觉闸门（`npm run visual:gate`）：**通过**（mismatch 全部 < 2%）
- **SSIM 引擎与阈值（2026-09-24 校准）**：`ssim.js`（标准 MSSIM，windowSize=11），阈值 `VISUAL_SSIM_MIN=0.55`，
  语义是「结构崩塌检测」——通过构建下限 ≈0.60（弹窗小图），行整体偏移 8px 即跌至 ~0.68 以下；像素保真由 `mismatch<2%` 兜底。
  重新校准：`node scripts/visual-gate.mjs --calibrate`（对上次闸门产物打分 + 结构崩塌自检，不依赖服务）
- 工具链自检：`npm run visual:doctor`（依赖/凭证/服务/参考图/浏览器 9 项预检查；`visual:round` 已内置）

## 还原轮次

- **轮次 1**（2026-09-24）：Playwright 逐页截图对比（1440×1068）→ 列差异 → 修 → 复测。
  覆盖 5 屏 + 4 弹窗；主要修复：antd 表格行高（65→62px）、弹窗几何（header 61px / padding 20px）、
  医生页按钮位置（toolbar → Card extra）、机构信息表单样式。字段差异 0。
  报告：`artifacts/visual-diff/round-1/round-1-report.html`
- **用户已停止还原轮次**，本文件为收尾文档。

## 启动命令

```bash
npm install                # 根依赖（playwright/pixelmatch/pngjs/ssim.js）
npm run db:create          # 建库（.env 预置连接，无 Docker）
npm run api                # Spring Boot :3001（run-with-env 注入根 .env）
npm run web                # Vite :5173
```

### 复盘后新增的流水线命令（2026-09-24）

| 命令 | 作用 | 实测 |
|---|---|---|
| `npm run visual:bootstrap` | 一键 init→抽取→gen→db（Figma 抽取与 db 并行） | **120.7s** |
| `npm run visual:doctor` | 工具链 pre-flight 自检 9 项（`visual:round` 内置） | 3.5s |
| `node scripts/visual-gate.mjs --calibrate` | SSIM 阈值校准（离线，不依赖服务） | 4s |
| `npm run visual:round` | 还原轮次一条龙：自检→截图→对比→差异报告（known/manual） | ~60s |

- **闸门全量化**：目标 = 全部业务屏 + 全部弹窗（spec.screens 即闸门全集；本次从 5 → 9 目标，
  doctors/schedules 两个列表屏与两个排班弹窗新进闸门；排班弹窗的几何偏差即被提前发现）
- **差异修复规则库**：`scripts/lib/fix-rules.mjs`，visual:round 差异报告自动标注
  已知模式（行高/弹窗几何/按钮位置/卡头样式，带修法提示）与待人工项

数据库连接：仓库根 `.env` 预置 `MYSQL_JDBC_URL`（本机 MySQL，非 Docker）。
首次运行后 seed 自动执行（`SeedConfig`，含闸门账号）。重置：`npm run db:reset`。

## 默认账号

| 项 | 值 |
|---|---|
| 地址 | `POST /api/auth/login` |
| 邮箱 | `admin@sunshine.com` |
| 用户名 | `admin` |
| 密码 | `Admin@123456` |

## 还原策略摘要

- **spec 驱动**：实体/路由/screens 全屏清单/账号全部来自 `fixtures/sunshine-medical/app-spec.json`，脚本零业务硬编码
- **双闸门**：字段一致性（config ↔ figma-fields 逐字比对）+ SSIM/mismatch 视觉闸门（`?visualGate=1` 冻结数据关动画）
- **像素还原**：tokens.css（Layout IR 命名节点取色）+ Blueprint 全屏几何 + antd 默认样式差异用 app.css 覆盖
- **图标**：Layout IR nodeId → `apps/web/public/assets/`（禁止 emoji 冒充）