# GENERATED — 阳光医疗门诊（sunshine-medical）

> 本文件由流水线收尾步骤生成；闸门分数与还原轮次见 `artifacts/visual-diff/`。

## 概要

| 项 | 值 |
|---|---|
| Figma | https://www.figma.com/design/KLYzRbufrish4gmY4jpUS0 （fileKey `KLYzRbufrish4gmY4jpUS0`） |
| slug | `sunshine-medical` |
| 技术栈 | Stack C：React 18 + Vite + antd 5 / Spring Boot 3 + JPA / MySQL / JWT |
| 产出 | `apps/web` + `apps/api`（monorepo） |
| 生成时间 | 2026-09-21 ~ 2026-09-26（含 2 轮编号还原轮次 + 5 次闸门盲区事故复盘修复） |

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

## 闸门结果（2026-09-26，端到端实测）

> 像素三腿 **AND**：`SSIM ≥ 0.85` **且** `mismatch < 2%` **且** 平坦底色漂移 ≤ `VISUAL_FLATBG_MAX`（内容屏 0.025 / 弹窗 0.06）；
> SSIM 引擎 `ssim.js`（标准 MSSIM，windowSize=11）。报告 `artifacts/visual-diff/score.json`。

| 屏 | SSIM | mismatch | 平坦底色漂移 | 通过 |
|---|---|---|---|---|
| home | 0.8894 | 1.106% | 0.312% | ✅ |
| organization | 0.9458 | 1.028% | 0.123% | ✅ |
| departments | 0.9318 | 0.884% | 1.188% | ✅ |
| doctors | 0.9495 | 1.119% | 0.130% | ✅ |
| schedules | 0.9455 | 0.874% | 1.436% | ✅ |
| modal-create-dept | 0.9150 | 0.479% | 0.132% | ✅ |
| modal-create-doctor | 0.9104 | 0.608% | 0.301% | ✅ |
| modal-create-schedule | 0.9030 | 0.553% | 0.168% | ✅ |
| modal-batch-schedule | 0.9028 | 1.423% | 0.115% | ✅ |

- 字段一致性闸门（`npm run visual:fields`）：**通过**，`needsReview=0`，screenConfigs ↔ figma-fields 逐字一致
- 数据闸门（`npm run visual:data`）：**通过**（stats key ↔ API 闭环 + 非 gate DOM 回填断言，表单不许全空）
- 几何腿（`npm run visual:geom`）：**通过**——3 屏 / 10 个控件框逐框断言，最大偏差 **2px**（容差 3px）
  （`organization` 6 框 / `doctors` 2 框 / `schedules` 2 框；`departments`、`home` 原型无输入控件，空转并打印屏数）
- 文本腿（`npm run visual:text`）：**4 个弹窗 86 个文本节点全部对齐（最大偏差 2px）**；
  5 个内容屏尚有挂起差异（见「已知挂起项」——**像素三腿本来就是 PASS**，只有这条腿能看见）
- 宽视口自适应锁定（`visual:gate --viewport-lock-only`）：**通过**——1440 vs 1888 无横向溢出、内容铺满、纵向骨架不变（±1.5px）；弹窗尺寸不变且居中
- 工具链自检：`npm run visual:doctor -- --quick`（IR 完整性 / 弹窗覆盖 / flatBg 阈值 / 几何闸门 / 文本闸门 / gate-masks / 产物可写）**全部通过**

## 还原轮次

- **轮次 1**（2026-09-24）：Playwright 逐页截图对比（1440×1068）→ 列差异 → 修 → 复测。
  覆盖 5 屏 + 4 弹窗；主要修复：antd 表格行高（65→62px）、弹窗几何（header 61px / padding 20px）、
  医生页按钮位置（toolbar → Card extra）、机构信息表单样式。字段差异 0。
  报告：`artifacts/visual-diff/round-1/round-1-report.html`
- **轮次 2**（2026-09-25）：机构信息屏专项（form 屏布局方向/列宽/按钮位置照 `layout-ir/organization.json` 重写）。
  报告：`artifacts/visual-diff/round-2/round-2-report.html`
- **后续复盘轮次**（2026-09-25 ~ 2026-09-26，均由闸门盲区事故驱动，同日修复 + 补腿）：
  1. 排班屏事故 → Layout IR 完整性前置（`visual:layout` 缺帧即 exit 1）
  2. 弹窗事故 → 弹窗进截图/对比链路（`modal.trigger`）+ 12px 阴影白边对齐
  3. 「关键指标」白卡底事故 → 容器底色必须回 IR 求证（IR 无 `fill` 父节点 = 透明）+ 新增 **flatBg 腿**
  4. 「表单窄 164px」事故 → 列宽含 label（`label + 间距 + 控件宽`）、全宽行用 `grid-column: 1/-1` + 新增 **几何腿**
  5. 弹窗文本事故 → 新增 **文本腿**（IR TEXT ↔ DOM 文本盒，含弹窗）；4 个弹窗 label 8px / 13px 偏移、
     控件 14px、占位符灰 vs 深色值、`*` 掉行、预览末行多余边框 全部修复
- **用户于 2026-09-26 明确选择停止还原轮次**，本文件为收尾文档。
  停止时文本腿照出的 5 屏挂起差异**已留档**（见下），未宣称已清。

## 已知挂起项（如实留档，未清）

文本腿（`npm run visual:text`，报告 `artifacts/visual-diff/text.json`）在 5 个内容屏报出的差异。
**这些屏的像素三腿 + flatBg 全部 PASS**——即旧闸门结构性失明、人眼也需逐项比对才能发现：

| 屏 | 挂起差异 |
|---|---|
| chrome（各屏共用） | 用户名 `dx=28`；头像 `18px` vs IR `13px` 且 `dx=24`；IR 的 `系统管理员` 整块缺失（DOM 多出「管理员」） |
| chrome / 侧栏 | 侧栏多渲染 16~17 项（IR 只有 9 项）；灰显色 `#BFBFBF` vs IR `#595959` |
| organization | label 右缘偏 13px（同弹窗「非必填 label」根因：`colon={false}` 未真删 `::after`） |
| doctors | 列表单元格 `dx=9`；表头「操作」`dx=32`；头像底色 `rgb(24,144,255)` vs IR `rgb(217,70,160)` |
| schedules | `cell-count` 字号 `11px` vs IR `10px`；`批量排班` 字色 `#1F2937` vs IR `#595959` |
| home | 「关键指标」标题 `dx=-4 dy=-5`；IR 的「系统运营」缺失 |

> 文本腿**当前未并入** `visual:all` / `visual:round` 的自动阻断链路（并入即每轮 FAIL）→
> 还原轮次每轮**必须手动跑**；清完上表后再并入。详见 `figma-to-fullstack/visual-fidelity.md`
> 「文本级还原纪律与文本腿」与 `.cursor/rules/figma-visual-fidelity.mdc`。

## 启动命令

```bash
npm install                # 根依赖（playwright/pixelmatch/pngjs/ssim.js）
npm run db:create          # 建库（.env 预置连接，无 Docker）
npm run api                # Spring Boot :3001（run-with-env 注入根 .env）
npm run web                # Vite :5173
```

### 复盘后新增的流水线命令（2026-09-24 ~ 2026-09-26）

| 命令 | 作用 | 实测 |
|---|---|---|
| `npm run visual:bootstrap` | 一键 init→抽取→gen→db（Figma 抽取与 db 并行） | **120.7s** |
| `npm run visual:doctor` | 工具链 pre-flight 自检（含 IR 完整性 / 弹窗覆盖 / flatBg / 几何腿 / 文本腿） | 1.5s |
| `node scripts/visual-gate.mjs --calibrate` | 像素腿阈值 + flatBg 度量自检（离线，不依赖服务） | 4s |
| `npm run visual:data` | stats key ↔ API 闭环 + 非 gate DOM 回填断言 | 挂 `visual:all` / `visual:round` |
| `npm run visual:geom` | **几何腿**：IR 控件框 ↔ DOM 输入控件逐框断言（≤3px） | 3 屏 10 框，最大偏差 2px |
| `npm run visual:text` | **文本腿**：IR `TEXT` ↔ DOM 文本盒/控件值（≤3px / 字号 ≤0.6px / 颜色全等 / 数量相等，**含弹窗**） | 4 弹窗全对齐；5 屏挂起 |
| `npm run visual:round` | 还原轮次一条龙：自检→截图→对比→gate+data+geom（`visual:text` 手动补跑） | ~60s |

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
- **闸门组**：字段一致性（config ↔ figma-fields 逐字）+ **像素三腿 AND**（SSIM / mismatch / flatBg）+ 数据（闭环 + DOM 回填）+ **几何腿**（IR 控件框 ↔ DOM）+ **文本腿**（IR TEXT ↔ DOM，含弹窗）
- **像素还原**：tokens.css（Layout IR 命名节点取色）+ Blueprint 全屏几何 + antd 默认样式差异用 app.css 覆盖
- **盲区已补腿**：低对比底色 → flatBg；尺寸/位置 → 几何腿；文本位置/字号/字色/多出缺失 → 文本腿
- **图标**：Layout IR nodeId → `apps/web/public/assets/`（禁止 emoji 冒充）