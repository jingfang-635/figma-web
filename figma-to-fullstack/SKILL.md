---
name: figma-to-fullstack
description: >-
  Figma→全栈生成专家。从 Figma URL/fileKey 经 init-project → App Spec（人工闸门）→
  Layout IR / Visual IR / Blueprint → codegen → 三闸门 + 几何腿 + 文本腿（fields + gate AND×3 + data + geom + text）→
  还原轮次。高还原前端，技术栈由用户逐层选择（无默认）。用户给出 Figma 链接、要求从原型生成 web/api/db、
  或说 从Figma生成全栈 / 换了figma重新搭建 / figma-to-fullstack 时主动使用。
  禁止从 Figma 节点直接吐最终代码。
---

# Figma → 全栈生成（Skill）

用户级 Skill（`~/.cursor/skills/figma-to-fullstack/`），跨项目可用。配套智能体：`~/.cursor/agents/figma-to-fullstack.md`。

把「新的 Figma 原型」按固定流水线搭成可运行全栈。**禁止**从 Figma 节点直接吐最终代码；必须经 **init-project → App Spec（人工闸门）→ Layout IR → Visual IR → Screen Blueprint → codegen → 三闸门 + 几何腿 + 文本腿 → 还原轮次**。

## 零硬编码原则（本文档、脚本、生成物一律适用）

| 数据 | 唯一来源 |
|---|---|
| 屏清单 / 路由 / 类型 / 弹窗 trigger / 闸门账号 / 品牌 / 栈 / **关系字段与聚合声明（`relations` / `dashboard`）** | `fixtures/<slug>/app-spec.json` |
| 字段与文案（columns / formFields / filters / stats / actions / title / subtitle / sections / formCard / hint / statusMap） | `imports/figma/screens/*.png` + `fixtures/figma-fields.json`（回填进 app-spec） |
| 几何（尺寸 / 位置 / 间距 / 字号 / 字色 / 容器 fill） | `fixtures/<slug>/layout-ir/*.json` 的 `tree` / `texts` / `icons` |
| 页面/组件里出现的业务文案与颜色 | **不出现**：从生成物取（tokens / `screenConfigs[].sample` / `brand` / `sidebarItems`），页面只消费 |
| 阈值 / 视口 / 凭证 / 端口 | 仓库根 `.env`（经 `loadRootEnv` 读入；未加载即视为闸门失效） |
| 度量证据 | `artifacts/visual-diff/*.json`（score / geometry / text / data-backfill）+ git 历史 |

**禁止**在文档、脚本、生成物里写死任何业务或设计值——屏名、slug、路由、资源名、字段名、文案、尺寸、坐标、百分比、颜色、样例数据、账号凭证，一律从上述来源派生。

> 本文档出现的任何具体值都只用于说明机制，**实现时不得复制**；写屏时逐项回 IR / app-spec 取数。文档本身的去硬编码复查见文末「自检」。

## 何时启用

- 用户给出 Figma URL / fileKey，要求生成前后端与数据库
- 用户说换原型、按手册/技术文档搭建、端到端生成
- 当前工作区是或准备建成 monorepo（`apps/web`、`apps/api`）

## 流水线总览

```
Figma URL
  ↓
0. init-project.mjs        # 拉结构 → summary + app-spec.json 骨架（needsReview=true）
  ↓
1. App Spec 人工闸门        # 确认实体/路由/screens 全屏清单/seedAdmin；缺决策就问，不猜
  ↓
2. 视觉抽取（REST）         # visual:layout / extract / shots(:all) / assets
  ↓
3. 字段回填                 # figma-fields.json → screen-catalog（needsReview→false）
  ↓
4. visual:gen               # tokens.css + 主题文件 + Blueprint + screenConfigs
  ↓
5. codegen：DB + API + 前端（按用户选定框架与组件库；全屏 Blueprint + list 模板）
  ↓
6. 冒烟 + 闸门组             # fields + gate(AND×3) + data(闭环+回填+活数据) + geom(IR↔DOM 控件框) + text(IR↔DOM 文本盒)
  ↓
7. 还原轮次                  # visual:round（含 data / geom / dev:up）+ 每轮必跑 visual:text → 列差异 → 修 → 重截确认 → dev:up 保证服务在跑 → 问是否下一轮
  ↓
8. GENERATED.md 收尾
```

## 开始前：必须问清的决策

若仓库根有 `decision.html` 优先用页勾选；否则对话里简短提问（缺一项就停，不要猜）：

1. **Figma 来源**：URL/fileKey（必填）
2. **后端语言**（必选）：Node / Java（无默认）
3. **栈逐层选择**（不打包成组合再选）：后端语言 → 前端框架 → 后端框架 → 数据库 → ORM，**各层单独一问**；选项随语言联动过滤——选 Java 时 ORM 只列 JPA / MyBatis，不得出现 Prisma（Prisma 仅支持 Node 系）；合法性以 reference.md 矩阵校验
4. **页面范围**：只做已画屏 / 导航全做（缺屏灰显或二期）
5. **鉴权**：JWT / 无（无默认）
6. **产出路径**：`apps/web`+`apps/api` / `output/<runId>/`
7. **数据库类型**（从仓库根 `.env` 预置连接中选择，不使用 Docker）：mysql（`MYSQL_URL` / `MYSQL_JDBC_URL`）/ postgresql（`POSTGRES_URL`）/ sqlite（仅 Node 系，`file:./dev.db`）
8. **页面范围确认**（必做；`screens` 全量即闸门全集，无标杆/非标杆之分）

> 前端还原度按 visual-fidelity 方案（高还原 + 三闸门 + 几何腿 + 文本腿）验收；但 **UI 技术栈（框架/组件库/图表/日期库）由用户逐层选定，无默认**。

凭证：确认仓库根 `.env` 有 `FIGMA_ACCESS_TOKEN`。**密钥只写 `.env`，永不写入 `.env.example` 或提交内容。**

## 进度清单（复制并勾选）

```
- [ ] 0. 决策 + .env（FIGMA_ACCESS_TOKEN）
- [ ] 1. init-project.mjs → summary + app-spec 骨架
- [ ] 2. App Spec 人工闸门（实体/路由/screens 全屏清单/seedAdmin）
- [ ] 3. visual:layout / extract / shots(:all) / assets
- [ ] 4. 字段回填（figma-fields → catalog/spec，needsReview 清零）
- [ ] 5. visual:gen（tokens.css / 主题文件 / blueprints / screenConfigs）
- [ ] 6. DB + Seed + Backend API + JWT + 前端（按选定框架）
- [ ] 7. migrate/seed + 冒烟（数据库连接来自 .env 预置）
- [ ] 8. 闸门组：visual:fields + visual:gate + visual:data + visual:geom + visual:text
- [ ] 9. 还原轮次（visual:round 含 data/geom + 每轮必跑 visual:text → 修 → 问是否下一轮）
- [ ] 10. GENERATED.md
```

## 流水线步骤

### 0. 环境

```bash
# 仓库根
cp .env.example .env   # 仅当不存在；再填 FIGMA_ACCESS_TOKEN（数据库连接信息已预置，生成时只选数据库类型）
npm install            # 根依赖（playwright/pixelmatch/pngjs）
```

> 不使用 Docker（用户偏好，见 `.cursor/rules/no-docker-checks.mdc`）；数据库连接取 `.env` 预置的 `MYSQL_URL` / `POSTGRES_URL`，SQLite 直接 `file:./dev.db`。

### 1. 项目初始化（一键）

```bash
npm run init:project -- --slug <slug> --file <fileKey或URL> [--name <项目名>]
```

产出 `imports/figma/<key>-summary.json` + `fixtures/<slug>/app-spec.json` 骨架。骨架中的 screens/entities 为启发式推断（`needsReview: true`），**闸门环节人工确认后才算 App Spec 定稿**。

### 2. App Spec 人工闸门

展示摘要并确认：实体表 + 页面路由 + API 清单 + `screens` 全屏清单（每屏都进闸门）+ `seedAdmin`（闸门账号）。用户说「跳过确认 / --yes」才可直接生成。

### 3. 视觉抽取

```bash
npm run visual:layout      # Layout IR（全屏完整子树几何）
npm run visual:extract     # Visual IR（tokens 优先读 Layout IR 命名节点）
npm run visual:shots       # 全屏对照 PNG → imports/figma/screens/
npm run visual:shots:all   # 全量屏 + 弹窗 PNG（字段回填对照用）
npm run visual:assets      # Layout IR nodeId → apps/web/public/assets/
```

| 产出 | 路径 |
|---|---|
| Layout IR | `fixtures/<slug>/layout-ir/*.json`（含 tokens.json） |
| Visual IR | `fixtures/<slug>/visual-ir.json` |
| 对照截图 | `imports/figma/screens/*.png` |
| 图标原图 | `apps/web/public/assets/` |

降级：无 Token → 停并提示；REST 429/5xx → 指数退避重试；仍失败用已有 IR 继续，字段标 `needsReview`。

### 4. 字段回填（字段级 100% 还原的数据源）

```bash
node scripts/extract-figma-texts.mjs   # → fixtures/figma-fields.json
```

逐屏把 `figma-fields.json` 的真实文本回填到 `fixtures/<slug>/app-spec.json` 的 screens（columns/formFields/filters/actions/stats/title/subtitle/statusMap/sections/formCard/hint），`needsReview` → `false`。**原型里没有的字段禁止新增，有的禁止省略，顺序一致；弹窗字段以弹窗截图为准。**

### 5. 生成前端资产

```bash
npm run visual:gen        # tokens.css + 主题文件 + blueprints + screenConfigs
```

### 6. Codegen（DB + API + Web）

后端由 `gen:backend` 脚本按 App Spec 生成（**禁止业务硬编码**，栈矩阵见 `scripts/lib/codegen/stacks.mjs`）：

```bash
npm run gen:backend                      # 按 spec.stack 分发 adapter
npm run gen:backend -- --stack <ID>      # 显式指定栈（须与 spec.stack 一致或 spec 未填）
npm run gen:backend -- --out output/run1 # 产出路径重定向（默认 apps/）
```

| 层 | 生成方式 | 产物 |
|---|---|---|
| DB | `gen:backend`（node 栈） | `apps/api/prisma/schema.prisma` + `prisma/seed.ts`（含 seedAdmin） |
| DB | `gen:backend`（java 栈） | JPA entity（`ddl-auto: update` 建表）+ `config/SeedConfig.java` |
| API | `gen:backend`（node 栈） | Nest 模块：auth(JWT) + 每资源 CRUD + dashboard（有 dashboard 屏时） |
| API | `gen:backend`（java 栈） | Spring Boot：CrudController 基类 + 每实体 controller/repository + Auth/Dashboard |
| Web | 人工 + Blueprint | 按用户选定组件库渲染 + 生成的主题 + 全屏 Blueprint + `templates/ResourceListPage` 模板 |

生成后允许（且应当）人工增强：关联字段展开、dashboard 聚合查询、业务校验；但 CRUD 骨架与 seed 不要手写。

Web 实现顺序：`main.tsx` → chrome/Layout → Blueprint 页 → ResourceListPage 模板 → 对照截图微调 app.css。

**禁止**：通用 ResourcePage 覆盖 Blueprint 屏；自制 Button/Table/Modal；用组件库图标或 emoji 冒充已导出的 Figma 图标。

### 7. 冒烟

- `POST /api/auth/login` → 200 + token
- 无 token 访问受保护资源 → 401
- 每个主实体至少 `GET` 列表非空（seed 后）
- **表单/详情屏数据回填断言**：seed 后每个 form/detail 屏必须显示真实数据——用 Playwright 读 DOM 实际 value 与 seed/figma-fields 逐字比对，全空或空字段即 fail（接口契约：`GET /<res>` 返回数组，单条屏取 `list[0]`；保存 `PUT /<res>/{id}`，`toMap` 必须返回 `id`）

### 8. 闸门组（第一版全栈验收，必过）

```bash
# 先跑 npm run dev:up（确保 api + web 在跑；幂等），然后：
npm run dev:up            # 服务就绪闸：已在跑则跳过；未跑则按端口清旧实例 → 后台启动 → 探活
npm run visual:fields     # 字段一致性：config ↔ figma-fields 逐字比对；needsReview=0
npm run visual:gate       # 视觉像素三腿 AND（阈值全部取 .env，勿在脚本/文档写死）
npm run visual:data       # 数据：config↔API 闭环 + 非 gate DOM 回填（form/detail 不许空）+ 活数据（聚合非空/非平坦 + 派生字段交叉验证）
npm run visual:geom       # 几何：Layout IR 控件框 ↔ DOM 框逐框断言（≤ VISUAL_GEO_TOL）
npm run visual:text       # 文本：Layout IR TEXT 节点 ↔ DOM 文本盒逐节点断言（位置 / 字号 / 颜色 / 数量）
```

- 报告：`artifacts/visual-diff/score.json`、`data-backfill.json`、`geometry.json`、`text.json`
- 闸门模式 `?visualGate=1` 冻结 Blueprint `sample` 数据、关动画；`visual:data` **禁止**在 gate 模式下跑（必须走真实接口）
- 未过任一闸门不得宣称完成
- mask：图表区等不可像素对齐的区域，配置在 `fixtures/<slug>/gate-masks.json`
- **阈值一律经 `loadRootEnv` 从根 `.env` 读入**（缺失即视为闸门失效，由 `visual:doctor` 校验）；任何阈值都不得在脚本里写死回落值
- **宽视口自适应锁定**：同一屏在原型帧宽与 `VISUAL_WIDE_WIDTH` 下量同一批 DOM 框，要求无横向溢出 + 内容铺满 + 纵向骨架不变（只横向自适应、不纵向重排）；弹窗只校验尺寸不变 + 居中
- **像素三腿 AND**（防假阳性，旧 OR 已废弃）：`SSIM ≥ VISUAL_SSIM_MIN` 且 `mismatch < VISUAL_MISMATCH_MAX` 且 `平坦底色漂移 ≤ VISUAL_FLATBG_MAX`（弹窗 `VISUAL_FLATBG_MODAL_MAX`）

**页面层腿**：前三类腿比的都是**运行时渲染**，对「页面把生成物抄了一份」这件事完全失明（抄一份同样渲染、同样过闸；生成物改了页面却不跟着变）。`visual:doctor` 的「✅ 页面层零硬编码」逐行扫描页面/组件源码，命中「十六进制色值 / 按屏名取配置 / 业务文案副本」即报错；判据与文档腿同源，从 `fixtures/<slug>/*.json` 派生。详见 visual-fidelity.md「页面层零硬编码」。

**几何腿**：三条像素腿**全是全屏统计量**，对「尺寸/位置」偏差结构性失明（一个控件窄了几十像素，在整屏像素里只体现为极细的边框位移与白底缩水，占比极小 → 三腿可全过）。缺的不是更严的阈值，而是判据的**维度**。`npm run visual:geom` 把 Layout IR 控件框与 DOM 输入控件逐框配对断言，判据全部从 IR 派生（无按屏配置、无业务硬编码，新屏自动纳管）；`visual:doctor` 必含「✅ 几何闸门（IR↔DOM 控件框）」（校验 `.env` 有 `VISUAL_GEO_TOL` + 判据未失明）。详见 visual-fidelity.md「表单几何换算」。

**文本腿**：几何腿只认带 `stroke` 的 RECTANGLE（**TEXT 节点不是 rect**）且不覆盖弹窗，弹窗文本会零覆盖；文本 ink 占画面比例极小，位移与字号差在像素腿里几乎不存在 → 会出现「弹窗全过像素闸门、但 label 集体偏移 / 字号错 / 深色值被渲染成灰占位符」。`npm run visual:text` 把 IR `TEXT` 节点与 DOM 文本盒逐节点配对断言（位置 ≤ `VISUAL_TEXT_TOL` / 字号 ≤ `VISUAL_TEXT_SIZE_TOL` / 颜色全等，控件内文本走值断言），**含弹窗**；`visual:doctor` 必含「✅ 文本闸门（IR TEXT ↔ DOM 文本盒）」。详见 visual-fidelity.md「文本级还原纪律与文本腿」。

**活数据腿**：前四条腿都在 gate 模式（`?visualGate=1`）下跑、冻结 Blueprint `sample`——它们测的是「实现是否忠实于 IR」，**与真实接口 / 数据库无关** → 「时间窗口类种子没有数据 / 映射层没产出派生字段 / 前端样例兜底」可以永远绿灯（实测：三屏「有标签无数据」时像素腿、几何腿、文本腿全 PASS）。`npm run visual:data` 的第三条腿 `scripts/check-live-data.mjs` 走**非 gate** 真实接口 + 真实 DOM：断言聚合序列非空且**非平坦**、`relations` 的 `count` 与关联表**交叉求和**一致、`lookup` 与目标行一致、页面确实渲染了这些值；`visual:doctor` 必含「✅ 活数据闸门」（校验脚本已挂入 `visual:data` + 判据未失明）。详见 visual-fidelity.md「数据链路与活数据闸门」。

### 9. 还原轮次（第一版之后必做）

每轮：`npm run dev:up`（服务就绪闸，幂等：已在跑则跳过，未跑则按端口清旧实例后后台启动再探活）→ `npm run visual:doctor -- --quick`（**必含「✅ Layout IR 完整性」「✅ 页面层零硬编码」**，缺屏/退化先重跑 `visual:layout`，见 visual-fidelity.md「Layout IR 完整性」）→ `npm run visual:round`（截图 + AND 对比 + **visual:data** + **visual:geom**，**末尾自带 `dev:up`**）→ 再跑 **`npm run visual:text`**（必跑：差异表必须含文本腿条目——像素 PASS ≠ 文本还原到位）→ 列差异表（屏/类型/差异/拟改文件）→ 修代码 → 重截确认 → **收尾再跑一次 `npm run dev:up`** → **询问「本轮字段还原和页面还原已完成。是否进入下一轮还原？」**。进入则再来一轮；用户停止后才写 GENERATED.md 收尾。

> **提问前服务必须在跑（本步不可省）**：轮次结束时 api/web 若已停，用户点开就是打不开的站点、下一轮也无从开跑（本轮实测踩过：轮次跑完服务已不在）。故 `dev:up` 是提问的**前置闸**——未就绪即 exit 1，先看 `artifacts/dev/*.log` 再动手；就绪了才提问。

覆盖：导航每一屏 + 原型弹窗。字段以截图与 `figma-fields.json` 逐字为准；页面以 Layout IR + 截图几何为准。

### 10. 收尾

`apps/GENERATED.md`：Figma 链接、fileKey、slug、栈、还原策略、闸门结果（分数）、还原轮次数、页面清单、启动命令、默认账号。

## 稳定性与编辑纪律（必读）

> 来源：本项目实际事故——Vite 反复报语法错误、API 未就绪导致连接被拒刷屏、重复启动任务互相 kill、PowerShell 语法不兼容。后续每轮生成/还原都必须遵守。

### 数据链完整性（Layout IR 事故沉淀）

1. **Layout IR 必须逐屏齐全**：`npm run visual:layout` 出现 `Missing frames:` 即失败（脚本已 exit 1），必须排查（fileKey / spec 屏名逐字一致 / 429 重试）后重跑，禁止「用已有 IR 继续」跳过缺失屏。
2. **codegen 前置断言**：写任何屏的代码前确认 `layout-ir/<id>.json` 存在且 `tree`/`texts` 非空；没有 IR 几何就不许写该屏样式（凭感觉写必挂闸门）。
3. **还原轮次/闸门前必跑** `npm run visual:doctor -- --quick`，必须看到「✅ Layout IR 完整性 — N 屏 IR 齐全」；报缺屏/退化先修数据链再改代码。
4. **残缺 Blueprint 是上游断链信号**：`blueprints/<id>.json` 只剩片段时，先重跑 visual:layout / visual:gen 补齐，不要对着残片硬编码。

### 弹窗还原（同受「无 IR 不写屏」约束）

1. 写任何弹窗前先读 `layout-ir/modal-<id>.json`，**布局方向 / 列宽 / label 宽与对齐 / 节距 / footer 逐项照 IR 落**；禁止按组件库默认形态（如 vertical 表单）凭感觉写。
2. **弹窗必须进截图/对比链路**：`capture-screens.mjs` / `visual-gate.mjs` 按 `app-spec` 的 `modal.trigger` 打开弹窗截 `.ant-modal-content`；还原轮次统计里必须看到每个 modal 屏各有一条记录，缺了就是闸门盲区。
3. **标杆图与运行时截图的对齐基准必须一致**：Figma 导出的弹窗标杆含阴影/白边余量，运行时截图须补同样余量再比；余量不一致会被 `fitPng` 拉伸成全图条带错位（每行恒定红像素即此症状）。标杆尺寸 = IR `frame.w/h` + 阴影余量（余量由导出链路决定，不要写死）。
4. **doctor 必含「✅ 弹窗闸门覆盖」**：modal 屏缺 `modal.trigger` 时报错，先补 spec 再进还原轮次/闸门。

### 屏面还原与闸门假阳性

1. **form/detail 屏同受「无 IR 不写屏」约束**：不是只有 list 屏需要 IR——写 form/detail/混合屏前逐项照 `layout-ir/<id>.json` 的 tree 落几何（布局方向、列宽、label 宽、行距、控件与按钮位置与尺寸）；禁止按组件库默认形态（vertical 表单、按钮沉底）凭感觉写。另见「表单几何换算」——把控件宽当列宽是另一类同类事故。
2. **`screenConfigs` 的 stats/sections key 必须与后端接口闭环**：`visual:gen` 生成的 stats key 必须在后端接口里真实返回；接口缺字段就补后端，禁止前端 `?? 0` 静默兜底掩盖「接口根本没有这个字段」（否则 KPI 全 0 也无人发现）；闸门前先 curl 一次 stats 接口核对 key 逐个非空。
3. **闸门通过 ≠ 还原到位 → 已机械化为三腿 AND**：旧 OR 对留白多的页存在假阳性（结构已崩但某一条腿侥幸达标即过闸）。现 `visual-gate` / `visual-compare` 为**三腿 AND**，阈值取 `.env`；不得调回旧口径（真 MSSIM 下不可达，调紧只会制造噪声与假阴性）。
4. **visualGate 冻结值与真实数据分工**：闸门模式 `?visualGate=1` 冻结 Blueprint `sample` 数值保证可像素对齐；非 gate 模式必须走真实接口（seed 口径），两套数值不许混在同一个 state 默认值里。
5. **表单/详情屏必须回填真实数据**：seed 已含原型 sample 数据（库里有），还原页面时必须把数据显示出来——「字段标签在、数值为空」即该屏未完成。接口契约以 `CrudController` 实际行为为准：`GET /<res>` 返回**数组**，单条数据屏取 `list[0]` 回填；保存用 `PUT /<res>/{id}`（`toMap` 必须返回 `id`），空库才 `POST`；禁止按「GET 返回单对象 + PUT 集合」的想当然契约写。
6. **数据回填断言 → 已机械化**：`npm run visual:data` = `check-config-api-closure.mjs`（stats key 必须在后端源码产出）+ `check-data-backfill.mjs`（非 gate 模式 Playwright 读 DOM，seed 值必须可见、表单不许全空）。已挂入 `visual:all` / `visual:round`，违规 exit 1。

### 区块容器与低对比盲区

1. **禁止按「同类栅格单元长得一样」类比推容器底色**：写区块前先在 `layout-ir/<id>.json` 里找它的**容器节点**——有带 `fill` 的父节点就用那个 fill；**没有带 `fill` 的父节点就必须透明，不得加卡片底**（否则会出现「白格叠白卡、边界消失」这类偏差）。
2. **「IR 里没有容器节点」是设计信息，不是缺失信息**——这类还原点不表现为「多了/少了什么」，而表现为「底色该不该有」，最容易漏。连带项（如标题/图标相对区块左缘的内缩）也要照 IR 算，不得沿用同类卡片的 padding。
3. **低对比度差异是像素腿的结构性盲区 → 已补第三腿**：`pixelmatch` 的色差阈值只统计超过阈值色差的像素，低对比度色对（如白底与浅灰画布）在其统计里**等于不存在**；SSIM 又被整屏稀释。现由 `flatBgDrift`（只看「标杆为平坦色块处是否被改色」，排除文字渲染差异）兜底。
4. **阈值不得静默回落**：`visual:doctor` 必含「✅ 低对比度盲区闸门（flatBg）」（校验 `.env` 里 4 条阈值齐全 + 度量可用）；`visual-gate --calibrate` 必含度量自检（对照应 0% / 半幅画布被吞应约半幅，不符即报「已失明」）。FAIL 时看 `artifacts/visual-diff/<屏>.flatbg.png`（洋红=标杆平坦底色被改色）。
5. **别重复造全局梯度判据**：试过「边缘一致性 / 长直线」指标，不可用——文字抗锯齿令基线噪声就极高，信号淹没在基线里，无法全局定阈值。结论：要用「只看平坦底色」这类有明确语义的判据，而非全局梯度统计。

### 表单几何换算与几何腿

1. **事故形态**：form 屏「看起来还原了」（字段全、KPI 全、按钮位置对），实际整张表单比原型窄、右端够不到卡片内缘。**根因是把 IR 的「控件宽」当成了「列宽」**：IR 里一行是 `label 宽 + 段间距 + 控件宽 = 列宽`，实现却用 `控件宽 / 卡内宽` 当列百分比；组件库的 label 又从该宽度里吃掉一段 → 控件被二次压窄；全宽行再用被压窄的列和手算百分比 → 偏差叠加。
2. **换算纪律**（数值全部从 `layout-ir/<id>.json` 实测，禁止照抄任何文档示例）：
   - 列宽 = `label 宽 + 段间距 + 控件宽`，**列宽必须含 label**；禁止把控件宽直接当列宽
   - 全宽行用 `grid-column: 1 / -1` 让浏览器 stretch，**不手算百分比**
   - label 右对齐留白表达为 `width: label宽+段间距; padding-right: 段间距`，不用组件库默认 `labelCol`
   - **组件库默认尺寸 ≠ IR**：`Input` / `Select` 默认高度通常小于 IR；`Select` 容器高度必须与 `.ant-select-selector` **一起**钉，只改 selector 会从容器顶部溢出
   - 针对裸 `<Input>`（不在包装器里）的样式要单独写——包装器类选择器**命中不到它**，会静默退回组件库默认尺寸
3. **工具层根因：像素三腿全是全屏统计量，对「尺寸/位置」结构性失明**——控件窄了几十像素只占极小比例像素，三条腿可全过。**结论：缺的不是更严的阈值，是判据的维度。**
4. **防复发（已工具化）**：`npm run visual:geom` → `scripts/check-geometry.mjs`
   - IR 侧：控件框从 IR 派生（描边矩形 + 尺寸区间过滤，故小尺寸描边按钮与无 stroke 卡片天然排除）；坐标换算成 frame 相对值
   - DOM 侧：输入控件选择器集合**取最外层去嵌套**（包装器内含内层 input，重复计数会让配对错位）
   - 两侧按 (y,x) 排序后**一一配对**，数量必须相等；逐框断言 `|dx| |dy| |dw| |dh| ≤ VISUAL_GEO_TOL`
   - **无按屏配置、无业务硬编码**（判据全从 IR 派生，新屏自动纳管）；已挂 `visual:all` / `visual:round`
   - **有效性自证**：用事故版 CSS 复跑必须 FAIL（关键控件框全部报错），修复版必须 PASS——否则说明判据失明
5. **已知边界（别以为绿了就没事）**：①只断言**输入控件框**的 x/y/w/h，卡片/容器高度、文本基线、图标位置仍只有像素腿兜底；②**modal 屏暂未纳入几何腿**，弹窗控件与文本由文本腿 `visual:text` 覆盖（它是唯一进弹窗的腿）；③判据依赖「IR 里存在带 stroke 的控件 rect」——原型本就没有输入控件的屏，几何腿对该屏空转，会打印屏数而**不会假装通过**

### 弹窗文本还原与文本腿

1. **事故形态**：弹窗**通过像素闸门**，但逐项都错。典型缺陷与根因类别：
   - label 文本整体偏移——组件库 label 自带间距，我们又「补」一次（双重间距）；或 `colon={false}` 这类「关闭」并未真正移除组件库的 `::after` 占位与 margin
   - 非必填 label 与必填 label 不在同一网格上（组件库对两者用不同间距）
   - 控件文本字号 / 字色 = 组件库默认，而非 IR 的 `font.size` / `font.color`
   - IR 的**深色文本其实是「值」**，却被实现成灰占位符
   - label 放不下时 IR 会换行（如必填星号掉到第二行），实现却左溢出
   - IR 末行**没有描边矩形**，实现却保留了 border
2. **为什么像素腿 + 几何腿都没抓住**：文本 ink 只占极小比例像素，位移与字号差在像素腿里几乎不存在；SSIM 被整图稀释；flatBg 只测「改色」不测「位移」；几何腿判据是「带 `stroke` 的 RECTANGLE」——**TEXT 节点不是 rect**，且当时不覆盖 modal 屏 → 弹窗文本双盲区。**结论同几何腿：缺的不是更严的阈值，是判据的维度。**
3. **三类根因（可迁移到任何「组件库 + 原型」场景）**：① **组件库隐式默认**（缺陷全部来自「我们没写的属性」，且「关掉/补上」都必须**实测验证**）；② **IR 的「非文本」信息**（「没有边框」「星号掉行」「深色文本是值不是占位」都是设计信息，不表现为多了/少了什么）；③ **判据维度缺失**。
4. **防复发（已工具化）**：`npm run visual:text` → `scripts/check-text.mjs`（`visual:doctor` 含「✅ 文本闸门（IR TEXT ↔ DOM 文本盒）」）
   - IR `TEXT` 节点 `(x,y,w,h)` + `font.size` + `font.color` ↔ DOM **按 `parentElement` 分组**的文本盒（同父文本拼接为一个测量单元，多行/多文本节点都能与 IR 的「一个 TEXT 节点」对齐）+ `Range` 盒、computed `font-size`（SVG 读 `fill`）
   - 匹配：归一化（去全部空白）后按**多重集 + 位置最近**配对，**数量必须相等**——DOM 多出＝组件库多渲染（默认冒号就是这么抓住的），IR 有而 DOM 无＝该还原的文本没落
   - 断言：`|dx| |dy| |dw| ≤ VISUAL_TEXT_TOL` + `|Δ字号| ≤ VISUAL_TEXT_SIZE_TOL` + 颜色全等（**alpha 必须先合成到白底**，否则占位符会被误判）；**不断言 h**、`y` 比中心（Figma 字面框 vs CSS line box 语义不同）
   - 控件内文本走**控件值断言**（`<input>` 的值不是文本节点；Select 里还有值恒为空的隐藏搜索框，取值顺序错了会读成空串），位置归几何腿
   - 豁免（框架通用规则）：`*`、**单字符非中英文数字**（图标字形）、**中心落在 `<canvas>`/`<svg>` 内**（图表标签归像素腿，用 DOM 图形层矩形判定，不写死坐标）
5. **有效性自证**：补腿后应立刻回抓出闸门前已存在的同类缺陷（否则说明判据失明）；清完弹窗文本后，最大偏差应落在容差内。
6. **已知挂起项**：文本腿只覆盖 **HTML 文本**（SVG/canvas 归像素腿）；内容屏可能仍有挂起文本差异（chrome/侧栏 chrome、form 屏 label 右缘、单元格文本位移、字号差等）——**像素腿本来就是 PASS**，必须在还原轮次里逐条清掉，清完后才把 `visual:text` 并入 `visual:all` / `visual:round` 阻断链路。
7. **编辑纪律**：凡「关闭/补偿」组件库默认值（`colon` / `labelCol` / 按钮 `autoInsertSpace` / `Input` 高度 / label 间距），**必须用 DOM 探针实测**（元素 rect、`::after` 的 `content`/`margin`、文本 `Range` 盒），不能凭「我写了这条 CSS」假定生效。

### 活数据与统计聚合（数据链路）

> 来源：三屏「有标签、无数据」事故——统计屏 KPI / 折线全为 0、柱图退化成等值占位；列表屏关联列整列为空；日历屏格子里没有关联名称。而像素三腿 + 几何腿 + 文本腿**全部 PASS**（闸门跑在 gate 模式、冻结 Blueprint `sample`，与真实数据链路无关）。完整方案见 visual-fidelity.md「数据链路与活数据闸门」。

1. **根因四层**：① 时间窗口类种子用**绝对历史日期**写死，窗口聚合（本月 / 近 N 天 / 今日）按当前日期过滤 → 命中 0 行；② CRUD 映射层（`toMap()` 等）只映射实体自身列，**没有按 spec 的 `relations` 做计数 / 关联取值** → 字段在响应里根本不存在；③ 统计接口是占位（常数 / 近似均分），没有窗口过滤与分组；④ 前端用样例常量 + 合并兜底，空响应被样例「接住」→ 缺陷表现为**假数据**而非空白。另加工具层：`visual:data` 原只查「`stats` key 在后端源码里存在」+「form/detail 屏非空」，对图表序列与关系列**零断言**。
2. **数据契约进 spec，不进页面**：关系字段与聚合在 `app-spec.json` 声明——`relations[]`（`kind: count | lookup`）与 `dashboard`（`metrics` / `rates` / `amounts` / `charts`；`window` = `month | last7 | today | all`；`groupBy` = `day` 或按关联字段分组），由 codegen 生成真实实现；页面不许自己编样例。
3. **时间窗口类种子必须用相对日期**：spec 写相对偏移（如 `{ "$dayOffset": N }`），由 codegen 求值成「当前日期 + N」后落库；**禁止**用绝对历史日期充当窗口数据。偏移要**同时覆盖窗口内与窗口外**，否则窗口过滤本身没被验证（删掉过滤逻辑也照样全绿）。
4. **响应必须含声明的派生字段**：映射层由 codegen 按 `relations` 注入（`count` 走目标 repository 计数、`lookup` 取 `valueField`）；**不得**让前端自己算关系值——前端算的无法与后端交叉验证，也躲过本闸门。
5. **前端禁止静默兜底**：非 gate 模式一律绑定真实接口；**禁止**样例 fallback、**禁止** `?? 0` 这类把缺字段抹平。
6. **防复发（已工具化）**：`npm run visual:data` 三条腿 = `check-config-api-closure`（key 闭环）+ `check-data-backfill`（非 gate DOM 回填）+ `check-live-data`（**活数据**：图表序列非空且非平坦 + `count` 交叉求和一致 + `lookup` 与目标行一致 + DOM 实际渲染）。已挂 `visual:all` / `visual:round`；`visual:doctor` 含「✅ 活数据闸门」（校验脚本**已挂入** `visual:data` + 判据未失明）。**有效性自证**：改 spec 的 `relations[].field` / `dashboard.charts[].key` 后复跑必须 FAIL。

### 页面层只消费生成物（零硬编码的下游）

> 来源：页面/组件把生成物里已有的东西又抄了一份——色值直接写十六进制、冻结样本在页面里再声明常量、屏名/品牌/侧栏条目标签写成 JSX 字面量。生成物改了页面不跟着变（两份真相必然漂移），闸门比的又是生成物那份，页面那份永远测不到；新项目照抄页面时连业务值一起带过去。

1. **映射关系**：色值 → 生成 tokens（IR 派生）；冻结样本 → `screenConfigs[].sample`（spec 声明 → codegen 下发）；屏名 / 品牌 / 侧栏条目 → `screenConfigs` 的派生出入口（`brand` / `sidebarItems` 等）；屏配置 → 按**路由**取，不按屏名 `find`。
2. **页面不许声明自己的副本**：写了一条 CSS、一个常量、一段 fallback 文案都不是证据——值必须能追到 `fixtures/<slug>/*.json` 或 `.env`。
3. **防复发（已工具化）**：`visual:doctor` 含「✅ 页面层零硬编码」，逐行扫描 `apps/web/src/pages`、`apps/web/src/components` 下的 `.tsx/.ts`，判据 = ① 十六进制色值字面量 ② 按屏名 `find` ③ 业务文案副本（spec 屏名/品牌/sample 叶子 + 侧栏条目标签；通用词与 chrome 结构名豁免）。**有效性自证**：把任一生成物的值抄回页面后复跑必须 FAIL。
4. **判据同源**：页面腿与文档腿的文案判据都从 `fixtures/<slug>/*.json` 派生，脚本自身不含业务值（见文末「自检」）。

### 编辑纪律（防 Vite/TSC 语法错误）

1. 每次修改 `.tsx/.ts` 后，先跑 `npx tsc --noEmit`（或让 Vite HMR 无报错）确认无重复声明/语法错误，**验证通过才算改完**。
2. 多处插入/替换代码后必须重读目标区域，检查是否产生重复行；`return (` 之后禁止再出现语句。
3. 大改动拆成多个小编辑，每个编辑后立即验证，不要攒一批改完再查。

### 服务生命周期（Windows / PowerShell）

1. 验证类命令一律用 PowerShell 兼容语法：**禁止 `cmd1 & cmd2` 链接**（PowerShell 报 AmpersandNotAllowed），用 `;` 分隔或拆成多次调用。
2. 重启 API 前先确认旧进程已停、端口已释放：`netstat -ano | findstr :<API_PORT>`（端口取 `.env` 的 `API_PORT`，不要写死），按 PID 精确 kill；禁止 `Stop-Process -Name java` 全杀（误伤其它 Java 进程）。
3. 同一服务只允许一个启动任务：上一个任务确认「Started」+ 端口监听后才算成功；未确认前不要并发启动第二个实例（会端口冲突、互相 kill）。
3a. **上述「清旧实例 + 单实例启动 + 探活」已脚本化为 `npm run dev:up`（幂等）**：按端口只 kill 监听中的 PID（禁止按进程名全杀），已在跑则跳过、未跑才后台启动并轮询探活；地址取 `.env` 的 `WEB_URL`，API 端口取生成物 `application.yml` 的 `server.port`（Node 栈回落 `API_PORT`），探活走 web 的 `/api` 代理端到端验证。**还原轮次收尾必须先跑它、再提问**（`visual:round` 末尾已串联）。
4. `mvnw spring-boot:run` 被外部关停（含被 `npm run dev:up` 替换旧实例）时会报 `Process terminated with exit code: <非 0>`——**实测既有 `-1`（Maven 进程本身被杀）也有 `1`（被 fork 的应用进程被杀）**，两者都是关停表现而非构建错误。**判据是日志内容**：没有应用级错误（无端口占用 / 无 `APPLICATION FAILED TO START` / 无异常栈）即属关停；判断服务真实状态看启动日志 + 端口监听 + health 探活，不要见 Maven 报错就重启动。
5. **Spring 进程不会自动读仓库根 `.env`**：启动 API 前先把 `.env` 变量注入进程环境（PowerShell 逐行 `SetEnvironmentVariable`）再 `./mvnw spring-boot:run`，否则数据库连接取到默认值导致 `Access denied`。
6. **启动失败先读启动日志定位根因再改**，不要盲目重试：`WeakKeyException`（JWT secret 过短，需派生或改配置）、`Access denied`（`.env` 未注入）等每类根因对应不同修法，重试无效。

### 冒烟与探活

1. API 启动后、前端联调前先探活：`Invoke-WebRequest http://localhost:<API_PORT>/actuator/health`（或任一 GET 接口返回 200）；探活不通过不要让前端开始轮询（否则代理连接被拒刷屏，掩盖真问题）。
2. 探活/冒烟用对 HTTP 方法：`/api/auth/login` 是 POST，GET 会 405；健康轮询不得打 POST-only 接口。
3. 前端请求层对连续失败应退避并提示「后端未启动」，而不是无限重试。

## 换 Figma 时的增量策略

| 场景 | 做法 |
|---|---|
| 全新业务 | 新 slug：init-project → 新 Spec + IR + Blueprint；可覆盖 web/api |
| 同项目加页面 | 扩 schema + API + spec.screens + 新路由页/Blueprint |
| 仅改文案/字段 | 改 spec + Seed + Blueprint，重跑 visual:gen |
| 换栈 | 同 App Spec，换 adapter/模板，勿混用 ORM |

## 安全与禁区

- 不把 Token/Key 写入聊天长文、`.env.example`、提交记录
- shell 生成物限制在仓库内；不读无关密钥文件
- 一期不做完整 RBAC / 支付 / 强合规

## 自检（新增/修改流程文档时必做）

流程文档本身也受「零硬编码」约束。改完跑一次静态扫描，确认文档里没有业务/设计硬编码：

```bash
node scripts/check-doc-hardcode.mjs   # 扫描流程文档，命中业务屏名/slug/几何/颜色/凭证即 exit 1
```

判据（与脚本一致）：文档中不得出现 `fixtures/<slug>/app-spec.json` 之外的具体屏 id/名称、不得出现本项目的坐标/尺寸/百分比/颜色字面量、不得出现账号或密钥。文档只能：① 描述「从 app-spec / Layout IR / .env 派生」；② 用 `<placeholder>` 语法举例；③ 引用脚本名 / env key 名 / 命令名。

## 参考

- [visual-fidelity.md](visual-fidelity.md) — 前端还原方案（必读）
- [reference.md](reference.md) — 栈矩阵、环境变量、命令速查
- [figma-to-fullstack.md](figma-to-fullstack.md) — 智能体定义
