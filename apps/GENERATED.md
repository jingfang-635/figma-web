# GENERATED — 阳光医疗门诊（sunshine-medical）

> 本文件由流水线收尾步骤生成；闸门分数与还原轮次见 `artifacts/visual-diff/`，全流程计时见 `artifacts/pipeline-timing.log`。

## 概要

| 项 | 值 |
|---|---|
| Figma | https://www.figma.com/design/KLYzRbufrish4gmY4jpUS0 （fileKey `KLYzRbufrish4gmY4jpUS0`） |
| slug | `sunshine-medical` |
| 技术栈 | React 18 + Vite + antd 5 / Spring Boot 3 + JPA / MySQL / JWT |
| 产出 | `apps/web` + `apps/api`（monorepo） |
| 本次生成时间 | 2026-09-27 22:27:52 → 22:51:08（单次会话，含 1 轮还原轮次） |
| **全流程总耗时** | **23 分 15 秒（1395s）** |

## 页面清单

| 页面 | 路由 | 类型 | 实体 | 备注 |
|---|---|---|---|---|
| 首页 | `/` | dashboard/chart | dashboard | KPI + 2 图表 + 预约列表 |
| 科室管理 | `/departments` | list | departments | 新增科室弹窗 |
| 医生管理 | `/doctors` | list | doctors | 新增医生弹窗（含上传） |
| 排班管理 | `/schedules` | schedule | schedules | 新增排班 + 批量排班弹窗 |
| 机构信息 | `/organization` | form | organization | 表单屏 |
| 登录 | `/login` | auth | admin | 闸门账号 |

弹窗：新增科室 / 新增医生 / 新增排班 / 批量排班（原型 4 弹窗全部覆盖）。

## 闸门结果（2026-09-27，端到端实测 · round-1）

> 像素三腿 **AND**：`SSIM ≥ 0.85` **且** `mismatch < 2%` **且** 平坦底色漂移 ≤ `VISUAL_FLATBG_MAX`（内容屏 0.025 / 弹窗 0.06）；
> SSIM 引擎 `ssim.js`（标准 MSSIM，windowSize=11）。报告 `artifacts/visual-diff/score.json`。

| 屏 | SSIM | mismatch | 平坦底色漂移 | 通过 |
|---|---|---|---|---|
| home | 0.909 | 0.7% | 0.81% | ✅ |
| organization | 0.979 | 0.6% | 0.56% | ✅ |
| departments | 0.979 | 0.5% | 0.93% | ✅ |
| doctors | 0.978 | 0.7% | 0.59% | ✅ |
| schedules | 0.965 | 0.5% | 1.92% | ✅ |
| modal-create-dept | 0.934 | 0.3% | 0.03% | ✅ |
| modal-create-doctor | 0.933 | 0.4% | 0.05% | ✅ |
| modal-create-schedule | 0.913 | 0.4% | 0.08% | ✅ |
| modal-batch-schedule | 0.907 | 1.4% | 0.08% | ✅ |

- 字段一致性闸门（`npm run visual:fields`）：**通过**，`needsReview=0`，screenConfigs ↔ figma-fields 逐字一致
- 数据闸门（`npm run visual:data`）：**通过**——4 屏 stats key ↔ API 闭环 + 非 gate DOM 回填断言（机构信息 6 字段 + 4 KPI 全部可读；表单不许全空）
- 几何腿（`npm run visual:geom`）：**通过**——3 屏 / 10 个控件框逐框断言，最大偏差 **2px**（容差 3px）
  （`organization` 6 框 / `doctors` 2 框 / `schedules` 2 框；`departments`、`home` 原型无输入控件，空转并打印屏数）
- 文本腿（`npm run visual:text`）：**全部 9 屏通过 / 0 挂起差异**——IR `TEXT` ↔ DOM 文本盒逐项对齐
  | 屏 | 文本节点 | 控件 | 最大偏差 | 结果 |
  |---|---|---|---|---|
  | 首页 | 91 | 0 | 2px | ✅ |
  | 机构信息 | 42 | 6 | 2px | ✅ |
  | 科室管理 | 73 | 0 | 3px | ✅ |
  | 医生管理 | 82 | 2 | 2px | ✅ |
  | 排班管理 | 102 | 2 | 3px | ✅ |
  | 新增科室弹窗 | 16 | 4 | 1px | ✅ |
  | 新增医生弹窗 | 23 | 8 | 3px | ✅ |
  | 新增排班弹窗 | 16 | 6 | 1px | ✅ |
  | 批量排班弹窗 | 31 | 7 | 2px | ✅ |

  报告 `artifacts/visual-diff/text.json`（容差：位置 ≤3px / 字号 ≤0.6px / 颜色全等 / 文本数量必须相等）
- 宽视口自适应锁定（`visual:gate --viewport-lock-only`）：**通过**——1440 vs 1888 无横向溢出、内容铺满（右侧余量 0px）、纵向骨架不变（±1.5px）；4 个弹窗尺寸不变且水平居中
- 工具链自检：`npm run visual:doctor -- --quick`（IR 完整性 / 弹窗覆盖 / flatBg 阈值 / 几何闸门 / 文本闸门 / gate-masks / 产物可写）**全部通过**
- 文档零硬编码：`npm run docs:lint` **通过**

## 还原轮次

- **轮次 1**（2026-09-27，本轮）：`npm run visual:round`（截图 + 三腿 AND 对比 + 宽视口锁定 + data + geom）→ 手动补跑 `npm run visual:text` → 修代码 → 复测。
  覆盖 5 屏 + 4 弹窗。主要修复：
  - `Layout.tsx` 导航归一为 IR 的 9 个单项（去多余分组头/错色）；header 用户名与头像字号（13px）按 IR
  - `DepartmentsPage` 医生数包 `.cell-num`（72px 居中）对齐单位/双位数中列
  - `DoctorsPage` 按 IR 逐行 `AVATAR_TONES` 轮换（#E6F7FF/#1890FF、#FFF0F5/#D946A0、#E8FFF3/#22C55E、#FFF5E6/#F59E0B）；表头「操作」列
  - `SchedulePage` 月份导航改用 antd `<LeftOutlined/>`/`<RightOutlined/>`；cell 日期/医生 pill/计数对齐 IR
  - `OrganizationPage` 去掉人工必填星号覆盖，交由干净 CSS 伪元素；`app.css` 修 `colon={false}` 的 `::before/::after` 位移、textarea 字号 15px/#333、分页与 total 间距
  - `check-text.mjs` 增加框架测量节点豁免（Recharts 离屏 `aria-hidden` 节点）
  结果：文本腿 **9/9 屏 0 挂起**（此前 5 个内容屏挂起已清），像素三腿 + flatBg 全部 PASS。
  报告：`artifacts/visual-diff/round-1/round-1-report.html`

## 全流程计时（`artifacts/pipeline-timing.log`）

| 阶段 | 结束时刻 | 本阶段耗时 |
|---|---|---|
| START（基线） | 22:27:52.588 | — |
| Layout IR 抽取 | 22:28:47 | ~29s |
| Visual IR 抽取 | 22:28:57 | ~10s |
| 字段回填（figma-fields，needsReview 清零） | 22:29:44 | ~47s |
| visual:gen（tokens/主题/blueprints/screenConfigs） | 22:29:57 | ~13s |
| 前端脚手架（App/页面/胶水） | 22:30:43 | ~46s |
| db:create | 22:31:27 | ~45s |
| API 构建完成（gen:backend + Spring 启动） | 22:32:21 | ~54s |
| 闸门组开始 | 22:34:39 | ~138s |
| 闸门组完成（fields/gate/data/geom） | 22:36:26 | ~107s |
| 还原轮次 1 完成（修文本腿挂起 + 复测） | 22:49:19 | ~773s |
| DONE（收尾 / GENERATED.md） | 22:51:08 | ~109s |
| **合计** | | **23m15s（1395.4s）** |

> 占比最大的是还原轮次（~13 分钟），主要是修文本腿在内容屏（chrome/侧栏/label 右缘/单元格/字号）的挂起差异与逐屏复测；
> 脚本化的建库 / 抽取 / codegen / 闸门组合计约 7 分钟。

## 启动命令

```bash
npm install                # 根依赖（playwright/pixelmatch/pngjs/ssim.js）
npm run db:create          # 建库（.env 预置连接，无 Docker）
npm run api                # Spring Boot :3001（run-with-env 注入根 .env）
npm run web                # Vite :5173
```

### 流水线 / 闸门命令

| 命令 | 作用 |
|---|---|
| `npm run visual:all` | layout / extract / shots / gen / assets / fields / gate / data / geom 一条龙 |
| `npm run visual:round` | 还原轮次一条龙：自检→截图→对比→gate+data+geom + `dev:up`（服务就绪闸） |
| `npm run dev:up` | **服务就绪闸**（幂等）：api/web 已在跑则跳过；未跑则按端口清旧实例 → 后台启动 → 探活；轮次收尾必跑（提问前保证服务可访问），日志在 `artifacts/dev/` |
| `npm run visual:text` | **文本腿**：IR `TEXT` ↔ DOM 文本盒/控件值（≤3px / 字号 ≤0.6px / 颜色全等 / 数量相等，含弹窗） |
| `npm run visual:geom` | **几何腿**：IR 控件框 ↔ DOM 输入控件逐框断言（≤3px） |
| `npm run visual:data` | stats key ↔ API 闭环 + 非 gate DOM 回填断言 |
| `npm run visual:doctor` | 工具链 pre-flight 自检（IR 完整性 / 弹窗覆盖 / flatBg / 几何腿 / 文本腿） |
| `npm run docs:lint` | 流程文档零硬编码复查 |

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
