# GENERATED — 阳光门诊管理后台（sunshine-medical）

> 本文件由流水线收尾步骤生成；闸门分数与还原轮次见 `artifacts/visual-diff/`，逐阶段计时见 `artifacts/pipeline-timing.json`。

## 概要

| 项 | 值 |
|---|---|
| Figma | https://www.figma.com/design/KLYzRbufrish4gmY4jpUS0 （fileKey `KLYzRbufrish4gmY4jpUS0`，文件「阳光医疗-调优版」） |
| slug | `sunshine-medical` |
| 技术栈 | React 18 + Vite + antd 5 / Spring Boot 3 + JPA / MySQL / JWT（栈 ID `C`） |
| 产出 | `apps/web` + `apps/api`（monorepo，产出路径 = 工作区默认） |
| 页面范围 | 只做已画屏（5 业务屏 + 4 弹窗；`sidebar` 为 chrome 组件，不单独成屏） |
| 本次生成 | 2026-09-28，从「干净流水线骨架」起跑：重新抽取 IR → 重建 App Spec/data 契约 → codegen → 闸门组 → 1 轮还原 |

## 页面清单

| 页面 | 路由 | 类型 | 实体 | 备注 |
|---|---|---|---|---|
| 首页 | `/` | dashboard | dashboard | 4 KPI + 3 图表（趋势/各科室/收入）+ 关键指标区 |
| 机构信息 | `/organization` | form | organization | 表单屏 + 4 KPI，保存 `PUT /api/organization/{id}` |
| 科室管理 | `/departments` | list | departments | 关联列「医生数量」（`relations: count`），新增科室弹窗 |
| 医生管理 | `/doctors` | list | doctors | 关联列「科室」（由 `deptId` 解析），新增医生弹窗 |
| 排班管理 | `/schedules` | schedule | schedules | 关联列「医生姓名」（`relations: lookup`），新增排班 + 批量排班弹窗 |
| 登录 | `/login` | auth | admin | 闸门账号 |

弹窗：新增科室 / 新增医生 / 新增排班 / 批量排班（原型 4 个弹窗全部覆盖，均按 `modal.trigger` 进截图与对比链路）。

## 闸门结果（2026-09-28，端到端实测 · round-1）

> 像素三腿 **AND**：`SSIM ≥ .env/VISUAL_SSIM_MIN` **且** `mismatch < .env/VISUAL_MISMATCH_MAX` **且** 平坦底色漂移 ≤ `.env/VISUAL_FLATBG_MAX`（弹窗用 `VISUAL_FLATBG_MODAL_MAX`）；
> 阈值一律经 `loadRootEnv` 从根 `.env` 读入（无脚本内回落）。SSIM 引擎 `ssim.js`（标准 MSSIM，windowSize=11）。报告 `artifacts/visual-diff/score.json`。

| 屏 | SSIM | mismatch | 平坦底色漂移 | 通过 |
|---|---|---|---|---|
| home | 0.9084 | 0.67% | 0.81% | ✅ |
| organization | 0.9792 | 0.56% | 0.56% | ✅ |
| departments | 0.9795 | 0.53% | 0.93% | ✅ |
| doctors | 0.9779 | 0.67% | 0.59% | ✅ |
| schedules | 0.9651 | 0.48% | 1.92% | ✅ |
| modal-create-dept | 0.9341 | 0.29% | 0.03% | ✅ |
| modal-create-doctor | 0.9330 | 0.36% | 0.05% | ✅ |
| modal-create-schedule | 0.9130 | 0.42% | 0.08% | ✅ |
| modal-batch-schedule | 0.9071 | 1.37% | 0.08% | ✅ |

- 字段一致性闸门（`npm run visual:fields`）：**通过**，`needsReview=0`，`screenConfigs` ↔ `fixtures/figma-fields.json` 逐字一致
- 数据闸门（`npm run visual:data`）：**通过**——`首页` 4 个 `stats` key ↔ API 闭环；非 gate 模式 DOM 回填（机构信息 6 字段 + 4 KPI seed 值全部可读，表单不许全空）；活数据（非 gate 真实接口 + DOM）：图表序列非空且**非平坦**、`Department.doctorCount` 与关联表交叉求和一致、`Schedule.doctorName` 与目标行一致
- 几何腿（`npm run visual:geom`）：**通过**——3 屏 / 10 个控件框逐框断言，最大偏差 **2px**（容差 `.env/VISUAL_GEO_TOL`）
  （`organization` 6 框 / `doctors` 2 框 / `schedules` 2 框；`home`、`departments` 原型无输入控件，空转并打印屏数，不假装通过）
- 文本腿（`npm run visual:text`）：**全部 9 屏通过 / 0 挂起差异**——IR `TEXT` ↔ DOM 文本盒逐项对齐

  | 屏 | 文本节点 | 最大偏差 | 结果 |
  |---|---|---|---|
  | 首页 | 91 | 2px | ✅ |
  | 机构信息 | 42 | 2px | ✅ |
  | 科室管理 | 73 | 3px | ✅ |
  | 医生管理 | 82 | 2px | ✅ |
  | 排班管理 | 102 | 3px | ✅ |
  | 新增科室弹窗 | 16 | 1px | ✅ |
  | 新增医生弹窗 | 23 | 3px | ✅ |
  | 新增排班弹窗 | 16 | 1px | ✅ |
  | 批量排班弹窗 | 31 | 2px | ✅ |

  报告 `artifacts/visual-diff/text.json`（容差：位置 ≤ `VISUAL_TEXT_TOL` / 字号 ≤ `VISUAL_TEXT_SIZE_TOL` / 颜色全等 / 文本数量必须相等；含 4 个弹窗）
- 宽视口自适应锁定（`visual:gate --viewport-lock-only`）：**通过**——1440 vs 1888 无横向溢出、内容铺满（右侧余量 0px）、纵向骨架不变（0px ≤ 1.5px）；4 个弹窗尺寸不变且水平居中（偏差 0px）
- 工具链自检：`npm run visual:doctor -- --quick` **17 项全部通过**（含 Layout IR 完整性 / 弹窗闸门覆盖 / 低对比盲区 flatBg / 几何闸门 / 文本闸门 / 活数据闸门 / 单趟 DOM 采集 / 流水线预算打点 / 闸门凭证 / 页面层零硬编码）
- 文档零硬编码：`npm run docs:lint` **通过**（10 个流程文档）
- 预算：`visual:all` 全链 **1m5.4s**、`visual:round` **40.3s**，均在 `PIPELINE_BUDGET_SEC` 内

## 数据链路（spec 驱动，前端不自编）

- `relations[]`：`Department.doctorCount`（count，`Doctor.deptId → Doctor.id`）、`Schedule.doctorName`（lookup，`valueField=name`）——由 `gen:backend` 注入映射层，响应即含派生字段
- `dashboard`：`metrics`（本月预约量 / 就诊率 / 爽约率 / 本月收入）、`charts`（`trend` 近 7 天按日、`income` 按日 × 医生挂号费、`deptBars` 按科室分组）
- 时间窗口类种子（`Schedule.workDate`）一律用 `{ "$dayOffset": N }` 相对偏移，**窗口内与窗口外都落行**，故「本月 / 近 7 天 / 今日」恒有数据，删掉窗口过滤也会被活数据腿判 FAIL
- 前端非 gate 模式绑定真实接口，**无样例 fallback、无 `?? 0`** 兜底

## 还原轮次

- **轮次 1**（2026-09-28）：`npm run visual:doctor -- --quick` → `npm run visual:round`（单趟采集 + 三腿 AND 对比 + 宽视口锁定 + `visual:text` + `visual:data` + `visual:geom`）→ 收尾 `npm run dev:up`。
  覆盖 5 屏 + 4 弹窗，**0 残留差异**（`所有页面对比通过`）。报告：`artifacts/visual-diff/round-1/round-1-report.html`。
  本轮为「清骨架后重建」：`Layout IR / Visual IR / 对照 PNG / 图标资产 / figma-fields` 全部按当前 Figma 重新抽取，`tokens / 主题 / blueprints / screenConfigs` 重新生成，后端 27 个文件由 `gen:backend` 重新落盘，DB 重置后重新种子。

## 流水线耗时（`artifacts/pipeline-timing.json`）

| 阶段 | visual:all | visual:round |
|---|---|---|
| dev:up | 1.0s | 0.9s + 0.8s |
| visual:doctor | — | 1.6s |
| visual:layout / extract / shots | 3.8s / 0.8s / 8.5s | — |
| visual:gen / assets | 1.1s / 6.7s | — |
| visual:capture | 27.9s | 28.6s |
| visual:compare | — | 5.1s |
| visual:fields / gate | 0.9s / 12.0s | — / 0.7s |
| visual:text / data / geom | 0.7s / 1.4s / 0.6s | 0.7s / 1.4s / 0.6s |
| **合计** | **1m5.4s** | **40.3s** |

> 单趟采集是最大项（~28s）：一个浏览器会话导航全部屏（含弹窗），落 `artifacts/visual-diff/dom-snapshot.json`（带新鲜度哈希），text / geom / data / gate 各腿**只消费该快照**，不再各自 launch 浏览器。

## 启动命令

```bash
npm install                # 根依赖（playwright/pixelmatch/pngjs/ssim.js）
npm run db:create          # 建库（连接取根 .env 预置，不使用 Docker）
npm run api                # Spring Boot :3001（run-with-env 注入根 .env）
npm run web                # Vite :5173
npm run dev:up             # 幂等服务就绪闸：已在跑则跳过，未跑则按端口清旧实例 → 并发启动 → 探活
```

### 流水线 / 闸门命令

| 命令 | 作用 |
|---|---|
| `npm run visual:all` | layout / extract / shots / gen / assets / capture / fields / gate / data / text / geom 一条龙（带逐阶段打点） |
| `npm run visual:round` | 还原轮次一条龙：自检 → 单趟采集 → 对比 → gate(宽锁) + text + data + geom + `dev:up` |
| `npm run visual:capture` | 单趟 DOM 采集（截图 + 文本盒 + 控件框 + 回填值 + 活数据 + 宽视口探针，带新鲜度哈希） |
| `npm run visual:text` | 文本腿：IR `TEXT` ↔ DOM 文本盒 / 控件值（位置 / 字号 / 颜色 / 数量，含弹窗） |
| `npm run visual:geom` | 几何腿：IR 控件框 ↔ DOM 输入控件逐框断言 |
| `npm run visual:data` | 数据腿：config↔API 闭环 + 非 gate DOM 回填 + 活数据（聚合非空/非平坦 + 派生字段交叉验证） |
| `npm run visual:doctor` | 工具链 pre-flight 自检 |
| `npm run docs:lint` | 流程文档零硬编码复查 |
| `npm run pipeline:budget` | 打点报表 + 预算判定（超 `PIPELINE_BUDGET_SEC` 即 exit 1） |

数据库连接取仓库根 `.env` 预置的 `MYSQL_JDBC_URL`（本机 MySQL，非 Docker）；seed 由 `SeedConfig` 在空库时自动执行（含闸门账号），重置：`npm run db:reset`。

## 默认账号

| 项 | 值 |
|---|---|
| 接口 | `POST /api/auth/login` |
| 邮箱 | `admin@sunshine.com` |
| 用户名 | `admin` |
| 密码 | `Admin@123456` |

## 还原策略摘要

- **spec 驱动**：实体 / 路由 / screens 全屏清单 / 字段 / 关系与聚合声明 / 账号全部来自 `fixtures/sunshine-medical/app-spec.json`，脚本零业务硬编码
- **闸门组**：字段一致性（config ↔ figma-fields 逐字）+ **像素三腿 AND**（SSIM / mismatch / flatBg）+ 数据（闭环 + 回填 + 活数据）+ **几何腿**（IR 控件框 ↔ DOM 输入控件）+ **文本腿**（IR TEXT ↔ DOM 文本盒，含弹窗）
- **无 IR 不写屏**：屏（含弹窗、form）的布局方向 / 列宽 / label 宽 / 行距 / 控件与按钮位置逐项照 `fixtures/sunshine-medical/layout-ir/<id>.json` 落
- **盲区已补腿**：低对比底色 → flatBg；尺寸 / 位置 → 几何腿；文本位置 / 字号 / 字色 / 多出缺失 → 文本腿；真实数据链路 → 活数据腿；页面私藏副本 → 页面层零硬编码
- **页面只消费生成物**：色值走生成 tokens（IR 派生）、冻结样本走 `screenConfigs[].sample`、屏名 / 品牌 / 侧栏条目走 `screenConfigs` 生成导出、屏配置按路由取
- **图标**：Layout IR nodeId → `apps/web/public/assets/`（禁止用组件库图标或 emoji 冒充）
