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

把「新的 Figma 原型」按固定流水线搭成可运行全栈。**禁止**从 Figma 节点直接吐最终代码；必须经 **init-project → App Spec（人工闸门）→ Layout IR → Visual IR → Screen Blueprint → codegen → 三闸门 + 几何腿 → 还原轮次**。

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
6. 冒烟 + 三闸门             # fields + gate(AND×3) + data(闭环+DOM回填) + geom(IR↔DOM 控件框) + text(IR↔DOM 文本盒)
  ↓
7. 还原轮次                  # visual:round（含 visual:data / visual:geom）+ 每轮必跑 visual:text → 列差异 → 修 → 问是否下一轮
  ↓
8. GENERATED.md 收尾
```

## 开始前：必须问清的决策

若仓库根有 `decision.html` 优先用页勾选；否则对话里简短提问（缺一项就停，不要猜）：

1. **Figma 来源**：URL/fileKey（必填）
2. **后端语言**（必选）：Node / Java（无默认）
3. **栈逐层选择**（不打包成组合再选）：后端语言 → 前端框架 → 后端框架 → 数据库 → ORM，**各层单独一问**；选项随语言联动过滤——**选 Java 时 ORM 只列 JPA / MyBatis，不得出现 Prisma**（Prisma 仅支持 Node 系）；合法性以 reference.md 矩阵校验
4. **页面范围**：只做已画屏 / 导航全做（缺屏灰显或二期）
5. **鉴权**：JWT / 无（无默认）
6. **产出路径**：`apps/web`+`apps/api` / `output/<runId>/`
7. **数据库类型**（从仓库根 .env 预置连接中选择，不使用 Docker）：mysql（MYSQL_URL / MYSQL_JDBC_URL）/ postgresql（POSTGRES_URL）/ sqlite（仅 Node 系，file:./dev.db）
8. **页面范围确认**（必做；screens 全量即闸门全集，无标杆/非标杆之分）

> 前端还原度按 visual-fidelity 方案（高还原 + 三闸门 + 几何腿）验收；但 **UI 技术栈（框架/组件库/图表/日期库）由用户逐层选定，无默认**。

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
- [ ] 8. 三闸门 + 几何腿 + 文本腿：visual:fields + visual:gate + visual:data + visual:geom + visual:text
- [ ] 9. 还原轮次（visual:round 含 data/geom/text → 修 → 问是否下一轮）
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

展示摘要并确认：实体表 + 页面路由 + API 清单 + screens 全屏清单（每屏都进闸门）+ `seedAdmin`（闸门账号）。用户说「跳过确认 / --yes」才可直接生成。

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
npm run gen:backend -- --stack C         # 显式指定栈（须与 spec.stack 一致或 spec 未填）
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

**禁止**：通用 ResourcePage 覆盖 Blueprint 屏；自制 Button/Table/Modal；ant icons/emoji 冒充已导出的 Figma 图标。

### 7. 冒烟

- `POST /api/auth/login` → 200 + token
- 无 token 访问受保护资源 → 401
- 每个主实体至少 `GET` 列表非空（seed 后）
- **表单/详情屏数据回填断言**：seed 后每个 form/detail 屏必须显示真实数据——用 Playwright 读 DOM 实际 value 与 seed/figma-fields 逐字比对，全空或空字段即 fail（接口契约：`GET /<res>` 返回数组，单条屏取 `list[0]`；保存 `PUT /<res>/{id}`，`toMap` 必须返回 `id`）

### 8. 三闸门 + 几何腿 + 文本腿（第一版全栈验收，必过）

```bash
# 先启动 api + web，然后：
npm run visual:fields     # 字段一致性：config ↔ figma-fields 逐字比对；needsReview=0
npm run visual:gate       # 视觉像素：三腿 AND —— SSIM ≥ VISUAL_SSIM_MIN(0.85) 且 mismatch < 2% 且 平坦底色漂移 ≤ VISUAL_FLATBG_MAX(0.025)
npm run visual:data       # 数据：config↔API 闭环 + 非 gate DOM 回填断言（form/detail 不许空）
npm run visual:geom       # 几何：Layout IR 控件框 ↔ DOM 框逐框断言（|dx| |dy| |dw| |dh| ≤ VISUAL_GEO_TOL 3px）
npm run visual:text       # 文本：Layout IR TEXT 节点 ↔ DOM 文本盒逐节点断言（位置≤3px / 字号≤0.6px / 颜色全等）
```

- 报告：`artifacts/visual-diff/score.json`、`data-backfill.json`、`geometry.json`、`text.json`
- 闸门模式 `?visualGate=1` 冻结 sample 数据、关动画；`visual:data` **禁止**在 gate 模式下跑（必须走真实接口）
- 未过任一闸门不得宣称完成
- mask：图表区等不可像素对齐的区域，配置在 `fixtures/<slug>/gate-masks.json`
- **脚本强制（2026-09-26）**：防复发不能只靠文档——`visual:all` / `visual:round` 末尾已挂 `visual:data` + `visual:geom`；视觉对比已改为 AND（旧 OR 会让 SSIM 0.768 + mismatch 1.7% 假阳性过闸）；**2026-09-26 再加第三条腿 `flatBgDrift`（平坦底色漂移）**——`pixelmatch threshold=0.25` 对 <25% 色差结构性失明（`#FFFFFF` vs `#F5F7FA` ≈3.9%），「关键指标」事故就是被前两腿双双放行（实测 bug 版 mismatch 1.191% 反低于修复版 1.194%、SSIM 0.8692 未达 0.85 阈值）；现三腿 AND：`SSIM ≥ 阈值` + `mismatch < 阈值` + `平坦底色漂移 ≤ VISUAL_FLATBG_MAX`；阈值经 `loadRootEnv` 从根 `.env` 读取（此前 .env 的 0.85 无人加载，静默回落 0.55），doctor 已校验 4 条阈值都在 `.env`；加**宽视口自适应锁定**（1440 vs 1888 量同一批 DOM 框：无横向溢出 + 内容铺满 + 纵向骨架不变，防内容区钉死宽度导致宽屏留白或重排；弹窗只校验尺寸不变 + 居中）
- **几何腿（2026-09-26 机构信息「表单窄 164px」事故）**：像素三腿**全是全屏统计量**，对「尺寸/位置」偏差结构性失明（表单窄 164px + 地址框窄 226px 时：mismatch 1.18% / SSIM 0.868 / flatBg 1.38% → **三腿全过**）。缺的不是更严的阈值，而是判据的**维度**。`npm run visual:geom` 把 Layout IR 控件框与 DOM 输入控件逐框配对断言，判据全部从 IR 派生（无按屏配置、无业务硬编码，新屏自动纳管）；doctor 含「✅ 几何闸门（IR↔DOM 控件框）」（校验 `.env` 有 `VISUAL_GEO_TOL` + 判据未失明）。**上线即抓到第 2 例同类缺陷**（医生屏搜索框 212×32 vs IR 280×40 → 修复后 SSIM 0.874 → 0.906）。详见 visual-fidelity.md「表单几何换算」
- **文本腿（2026-09-26 弹窗文本事故）**：几何腿只认带 `stroke` 的 RECTANGLE（**TEXT 节点不是 rect**）且**显式跳过 modal 屏**，弹窗文本零覆盖；4 个弹窗在 label 全部左偏 8px、控件值 14px、占位符灰 vs 深色的情况下**依然过像素闸门**。`npm run visual:text` 把 IR `TEXT` 节点与 DOM 文本盒逐节点配对断言（位置 ≤3px / 字号 ≤0.6px / 颜色全等，控件内文本走值断言），**含弹窗**；doctor 含「✅ 文本闸门（IR TEXT ↔ DOM 文本盒）」。详见 visual-fidelity.md「文本级还原纪律与文本腿」

### 9. 还原轮次（第一版之后必做）

每轮：启动 api+web → `npm run visual:doctor -- --quick`（**必含「✅ Layout IR 完整性」**，缺屏/退化先重跑 `visual:layout`，见 visual-fidelity.md「Layout IR 完整性」）→ `npm run visual:round`（截图 + AND 对比 + **visual:data** + **visual:geom**）→ 再跑 **`npm run visual:text`**（必跑：差异表必须含文本腿条目——像素 PASS ≠ 文本还原到位）→ 列差异表（屏/类型/差异/拟改文件）→ 修代码 → 重截确认 → **询问「本轮字段还原和页面还原已完成。是否进入下一轮还原？」**。进入则再来一轮；用户停止后才写 GENERATED.md 收尾。

覆盖：导航每一屏 + 原型弹窗。字段以截图与 `figma-fields.json` 逐字为准；页面以 Layout IR + 截图几何为准。

### 10. 收尾

`apps/GENERATED.md`：Figma 链接、fileKey、slug、栈、还原策略、闸门结果（分数）、还原轮次数、页面清单、启动命令、默认账号。

## 稳定性与编辑纪律（2026-09-24 复盘，必读）

> 来源：本项目实际事故——Vite 反复报语法错误、API 未就绪导致 ECONNREFUSED 刷屏、重复启动任务互相 kill、PowerShell 语法不兼容。后续每轮生成/还原都必须遵守。

### 数据链完整性（2026-09-25 排班屏事故，必读）
1. **Layout IR 必须逐屏齐全**：`npm run visual:layout` 出现 `Missing frames:` 即失败（脚本已 exit 1），必须排查（fileKey / spec 屏名逐字一致 / 429 重试）后重跑，禁止「用已有 IR 继续」跳过缺失屏。
2. **codegen 前置断言**：写任何屏的代码前确认 `layout-ir/<id>.json` 存在且 `tree`/`texts` 非空；没有 IR 几何就不许写该屏样式（凭感觉写必挂闸门，排班屏事故根因）。
3. **还原轮次/闸门前必跑** `npm run visual:doctor -- --quick`，必须看到「✅ Layout IR 完整性 — N 屏 IR 齐全」；报缺屏/退化先修数据链再改代码。
4. **残缺 Blueprint 是上游断链信号**：`blueprints/<id>.json` 只剩片段时，先重跑 visual:layout / visual:gen 补齐，不要对着残片硬编码。

### 弹窗还原（2026-09-25 弹窗事故，必读）
1. **弹窗同受「无 IR 不写屏」约束**：写任何弹窗前先读 `layout-ir/modal-<id>.json`，布局方向/列宽/节距/footer 逐项照 IR 落（本仓库原型弹窗均为横向表单：`layout="horizontal" labelCol={{ flex: '97px' }} labelAlign="right"`）；禁止按组件库默认形态（vertical 表单）凭感觉写。
2. **弹窗必须进截图/对比链路**：`capture-screens.mjs` / `visual-gate.mjs` 按 `app-spec` 的 `modal.trigger` 打开弹窗截 `.ant-modal-content`；还原轮次统计里必须看到每个 modal 屏各有一条记录，缺了就是闸门盲区。
3. **标杆图含 12px 阴影白边**：弹窗标杆 = IR frame + 24px 白边；运行时截图补同样白边再比，尺寸不一致会被 fitPng 拉伸成全图条带错位（每行红像素恒定即此症状）。
4. **doctor 必含「✅ 弹窗闸门覆盖」**：modal 屏缺 `modal.trigger` 时 doctor 报错，先补 spec 再进还原轮次/闸门。

### 屏面还原与闸门假阳性（2026-09-25 机构信息屏事故，必读）
1. **form/detail 屏同受「无 IR 不写屏」约束**：不是只有 list 屏需要 IR——写 form/detail/混合屏前逐项照 `layout-ir/<id>.json` 的 tree 落几何（布局方向、列宽、label 宽、行距、按钮位置）；禁止按组件库默认形态（vertical 表单、按钮沉底）凭感觉写。（事故根因：原型是横向双列，**列 = 88px label + 12px 间距 + 454px 输入框 = 554px**，地址/简介全宽 1032px，保存按钮在卡头右上 112×31；代码写成了 vertical 单列 maxWidth 640 + 按钮沉底。）另见「表单几何换算与几何腿」——**把输入框宽 454 当列宽**是同一屏的第二起事故（表单窄 164px）
2. **screenConfigs 的 stats/sections key 必须与后端接口闭环**：`visual:gen` 生成的 stats key（如 departments/doctors/pending/ordersToday）必须在后端接口里真实返回；接口缺字段就补后端，禁止前端 `?? 0` 静默兜底掩盖「接口根本没有这个字段」（事故表现：4 个 KPI 全部显示 0 却无人发现）；闸门前先 curl 一次 stats 接口核对 key 逐个非空。
3. **闸门通过 ≠ 还原到位 → 已机械化（三腿 AND + 阈值 0.85）**：旧 OR（`SSIM≥0.97 或 mismatch<2%`）对留白多的页存在假阳性（事故屏修复前 SSIM 0.768 却过闸）。现 `visual-gate` / `visual-compare` 为 **三腿 AND**：`SSIM ≥ VISUAL_SSIM_MIN(0.85)` 且 `mismatch < 2%` 且 `平坦底色漂移 ≤ VISUAL_FLATBG_MAX(0.025)`（第三条腿见「区块容器与低对比盲区」）。勿调回 0.97（真 MSSIM 不可达）。
4. **visualGate 冻结值与真实数据分工**：闸门模式 `?visualGate=1` 冻结原型 sample 数值（如 6/6/0/0）保证可像素对齐；非 gate 模式必须走真实接口（seed 口径），两套数值不许混在同一个 state 默认值里。
5. **表单/详情屏必须回填真实数据（2026-09-25 机构页空表单复盘）**：seed 已含原型 sample 数据（库里有），还原页面时必须把数据显示出来——「字段标签在、数值为空」即该屏未完成。接口契约以 `CrudController` 实际行为为准：`GET /<res>` 返回**数组**，单条数据屏取 `list[0]` 回填；保存用 `PUT /<res>/{id}`（`toMap` 必须返回 `id`），空库才 `POST`；禁止按「GET 返回单对象 + PUT 集合」的想当然契约写（事故根因：`setFieldsValue(数组)` 静默不填 + `PUT /organization` 405）。
6. **数据回填断言 → 已机械化**：`npm run visual:data` = `check-config-api-closure.mjs`（stats key 必须在后端源码产出）+ `check-data-backfill.mjs`（非 gate 模式 Playwright 读 DOM，seed 值必须可见、表单不许全空）。已挂入 `visual:all` / `visual:round`，违规 exit 1。

### 区块容器与低对比盲区（2026-09-26「关键指标」事故，必读）
1. **禁止按「同类栅格单元长得一样」类比推容器底色**：写区块前先在 `layout-ir/<id>.json` 里找它的**容器节点**——有带 `fill` 的父节点就用那个 fill（如三张图表卡是 `INSTANCE` 自带 `fill:#FFFFFF`）；**没有带 `fill` 的父节点就必须透明，不得加卡片底**。事故根因：首页「关键指标」的 4 个 263×78 白格子是页面 frame 的**直接子节点**（直接落在 `#F5F7FA` 画布上，无白卡容器），实现却按其它图表卡类比套了 `.chart-card` 白底 → 白格子叠白卡、边界消失。
2. **「IR 里没有容器节点」是设计信息，不是缺失信息**——这类还原点不表现为「多了/少了什么」，而表现为「底色该不该有」，最容易漏。连带项（如标题左内缩：该区块 icon x=864 = 区块左缘 838 + 26，而 `.chart-card` padding 是 20）也要照 IR 算，不得沿用同类卡片 padding。
3. **低对比度差异是旧闸门的结构性盲区 → 已补第三腿**：`pixelmatch` 的 `threshold=0.25` 只统计色差 ≥25% 的像素，`#FFFFFF` vs `#F5F7FA` 仅 ≈3.9% → 这 1.6 万像素在 mismatch 里**等于不存在**（实测：有 bug 1.194% / 事故合成版 1.191%，**bug 版反而更低**）；SSIM 又被整屏稀释（0.8692 → 0.882，0.85 阈值未触发）。现由 `flatBgDrift`（`scripts/lib/pixel-metrics.mjs`，只看「标杆为平坦色块处是否被改色」，排除文字渲染差异）兜底：事故 4.80% vs 修复 0.32%，闸门由 PASS 转 FAIL。
4. **阈值不得静默回落**：`visual:doctor` 必含「✅ 低对比度盲区闸门（flatBg）」（校验 `.env` 里 4 条阈值齐全 + 度量可用）；`visual-gate --calibrate` 必含度量自检（对照 0% / 半幅画布被吞 ≈50%，不符即报「已失明」）。FAIL 时看 `artifacts/visual-diff/<屏>.flatbg.png`（洋红=标杆平坦底色被改色）。
5. **别重复造全局梯度判据**：试过「边缘一致性 / 长直线」指标，不可用——文字抗锯齿令全屏基线 missRate 就 25%~40%、弹窗 90%+，信号淹没在基线里，无法全局定阈值。结论：要用「只看平坦底色」这类有明确语义的判据，而非全局梯度统计。

### 表单几何换算与几何腿（2026-09-26 机构信息「表单窄 164px」事故，必读）
1. **事故**：机构信息屏「看起来还原了」（字段全、KPI 全、保存按钮在卡头右上），实际整张表单**比原型窄 164px**、右端够不到卡片内缘——机构名称输入框 `377×40@(341,335)` 而 IR 是 `454×40@(364,327)`；地址/简介 `806` 而 IR `1032`（窄 226px）。**根因是把 IR 的「输入框宽 454」当成了「列宽」**：IR 里一行是四段 `label 88 + 间距 12 + 输入框 454 = 列 554`，两列 + 列距 24 = 1132；`40.11% = 454/1132` 被当成列宽后，antd 的 label 又从这 454 里吃掉 77px → 输入框仅剩 377；`.org-full` 再用被压窄的和算 `width: 91.17%` → 全宽行 806。**三次换算错误叠加**。
2. **换算纪律**：
   - 列宽 = `label + 段间距 + 控件宽`，**列宽必须含 label**；禁止把控件宽直接当列宽
   - 全宽行用 `grid-column: 1 / -1` 让浏览器 stretch，**不手算百分比**（91.17% 就是二次换算错的来源）
   - label 右对齐留白表达为 `width: label宽+间距; padding-right: 间距`（本项目 `width:100px; padding-right:12px` → 文字右缘 88、输入框起 364，同 IR），不用组件库默认 labelCol
   - **组件库默认尺寸 ≠ IR**：antd `Input`/`Select` 默认高 32px；`Select` 容器高度必须与 `.ant-select-selector` **一起**钉，只改 selector 会从容器顶部溢出 4px（实测 @343 vs IR @339）
   - 针对裸 `<Input>`（不在 `.ant-input-affix-wrapper` 里）的样式要单独写——`.ant-input-search` / `.ant-input-affix-wrapper` 选择器**命中不到它**，会静默退回 32px
3. **工具层根因：像素三腿全是全屏统计量，对「尺寸/位置」结构性失明**——1px 灰边框位移 + 白底缩水只占 ~0.3% 像素：bug 版 `mismatch 1.18%`（修复版 1.05%，**无区分度**）、`SSIM 0.868`（阈值 0.85 未触发；修复后 0.943）、`flatBg 1.38%`（该腿只测「改色」，测不到「边缘位移」）。**结论：缺的不是更严的阈值，是判据的维度。**
4. **防复发（已工具化）**：`npm run visual:geom` → `scripts/check-geometry.mjs`
   - IR 侧：控件框 = 带 `stroke` 的 RECTANGLE 且 h 36~120、w ≥ 80（故 31px 描边按钮与无 stroke 卡片天然排除）；坐标换算成 frame 相对值
   - DOM 侧：`.ant-input` / `.ant-input-affix-wrapper` / `.ant-select-selector` / `.ant-picker` / `.ant-input-number`，**取最外层去嵌套**（`.ant-input-affix-wrapper` 里含内层 input）
   - 两侧按 (y,x) 排序后**一一配对**，数量必须相等；逐框断言 `|dx| |dy| |dw| |dh| ≤ VISUAL_GEO_TOL`（3px）
   - **无按屏配置、无业务硬编码**（判据全从 IR 派生，新屏自动纳管）；已挂 `visual:all` / `visual:round`
   - **有效性自证**：拿事故版 CSS 复跑 → 机构信息 6 框全报错（Δw −77 / −226px、Δx −23 / −87、Δy 9）FAIL；修复版最大偏差 2px PASS
5. **该腿上线即抓到第 2 例同类缺陷（医生管理筛选条）**：搜索框 `212×32` vs IR `280×40`；根因是 `DoctorsPage` 用裸 `<Input>`，旧 CSS 的 `.ant-input-search { width: 280px }` 与 `.ant-input-affix-wrapper { height: 40px !important }` **两条都命中不到** → 退回 antd 默认 32px、宽度被 flex 压到 212，并把后面的下拉整体左移 68px；下拉容器仍 32px，selector 被 `!important` 拉到 40 后溢出 4px。修复后 doctors SSIM 0.874 → **0.906**、flatBg 1.43% → 0.61%（**像素腿本来就是 PASS**——这类缺陷人眼与像素闸门都看不出）
6. **已知边界（别以为绿了就没事）**：①只断言**输入控件框**的 x/y/w/h，卡片/容器高度、文本基线、图标位置仍只有像素腿兜底；②**modal 屏暂未纳入几何腿**（需 trigger 打开 + 处理 80×80 灰底投放区等非 antd 控件），**弹窗控件/文本由文本腿 `visual:text` 覆盖**（它是唯一进弹窗的腿）；③判据依赖「IR 里存在带 stroke 的控件 rect」——原型本就没有输入控件的屏（departments/home）几何腿对该屏空转，会打印屏数而**不会假装通过**

### 弹窗文本还原与文本腿（2026-09-26 弹窗文本事故，必读）

1. **事故**：4 个弹窗**全部过像素闸门**（dept `0.9087` / doctor `0.8975` PASS），但逐项都错：① 4 个弹窗 label 文本**整体左偏 8px**（antd `label` 自带 8px flex gap，我们又加 `::after{margin-left:8}` → 16px）；② **非必填** label 左偏 13px（`colon={false}` 没真删 antd `::after`，只把内容换成**一个空格**并留 `margin: 0 8px 0 2px` = 12.92px）；③ 控件文本 14px（IR 15px / `#333333`）；④「全部医生」用灰占位符（IR 是深色 `#262626` 的**值**）；⑤「选择排班日期」label 左溢出 12px（IR 里 `*` **掉到第二行**）；⑥ 预览末行多一条边框（IR 该行**没有描边矩形**）。
2. **为什么像素腿 + 几何腿都没抓住**：文本 ink 只占弹窗 40 万像素的极小比例，`pixelmatch threshold=0.25` 只统计色差 ≥25% 的像素 → 8px 位移与 1px 字号差**几乎不存在**；SSIM 被整图稀释；flatBg 只测「改色」不测「位移」；几何腿判据是「带 `stroke` 的 RECTANGLE」——**TEXT 节点不是 rect**，且**显式跳过 modal 屏** → 弹窗文本双盲区。**结论同几何腿：缺的不是更严的阈值，是判据的维度。**
3. **三类根因（可迁移）**：① **组件库隐式默认**（缺陷全部来自「我们没写的属性」，且「关掉/补上」都必须**实测验证**）；② **IR 的「非文本」信息**（「没有边框」「`*` 掉行」「深色文本是值不是占位」都是设计信息，不表现为多了/少了什么）；③ **判据维度缺失**。
4. **防复发（已工具化）**：`npm run visual:text` → `scripts/check-text.mjs`（`visual:doctor` 含「✅ 文本闸门（IR TEXT ↔ DOM 文本盒）」）
   - IR `TEXT` 节点 `(x,y,w,h)` + `font.size` + `font.color` ↔ DOM **按 `parentElement` 分组**的文本盒（同父文本拼接为一个测量单元，`\n` 多行/多文本节点都能与 IR 的「一个 TEXT 节点」对齐）+ `Range` 盒、computed `font-size`（SVG 读 `fill`）
   - 匹配：归一化（去全部空白）后按**多重集 + 位置最近**配对，**数量必须相等**——DOM 多出＝组件库多渲染（antd 默认冒号就是这么抓住的），IR 有而 DOM 无＝该还原的文本没落
   - 断言：`|dx| |dy| |dw| ≤ VISUAL_TEXT_TOL`(3px) + `|Δ字号| ≤ VISUAL_TEXT_SIZE_TOL`(0.6) + 颜色全等（**alpha 必须合成到白底**：antd 占位符 `rgba(0,0,0,.25)` 合成后正好是 IR 的 `#BFBFBF`）；**不断言 h**、`y` 比**中心**（Figma 字面框 vs CSS line box 语义不同）
   - 控件内文本走**控件值断言**（`<input>` 的值不是文本节点；Select 里还有个值恒为空的隐藏 `search-input`，取值顺序错了会读成空串），位置归几何腿
   - 豁免（框架通用规则）：`*`、**单字符非中英文数字**（图标字形）、**中心落在 `<canvas>`/`<svg>` 内**（图表标签归像素腿，用 DOM 图形层矩形判定，不写死坐标）
5. **有效性自证**：先修好弹窗再补此腿，立刻回抓出**第 3 例同类缺陷**（「排班状态」label 左偏 13px —— 同第②条根因），以及占位符字号 14→15、footer「取消」色 `#1F2937→#595959`、「医生头像」被误标必填、`＋` 文本冒充 `PlusOutlined` 图标；修完 4 个弹窗文本全对齐（最大偏差 2px）。
6. **已知挂起项**：文本腿只覆盖 **HTML 文本**（SVG/canvas 归像素腿）；5 个内容屏仍有挂起差异（chrome 用户名/头像、侧栏多渲染 16~17 项、机构信息 label 右缘 13px 同根因、医生列表 `dx=9`/表头「操作」`dx=32`、排班 `cell-count` 11px vs 10px）——**像素腿本来就是 PASS**，清完后才把 `visual:text` 并入 `visual:all` / `visual:round` 阻断链路
7. **编辑纪律**：凡「关闭/补偿」组件库默认值（`colon` / `labelCol` / 按钮 `autoInsertSpace` / `Input` 高度 / label 间距），**必须用 DOM 探针实测**（元素 rect、`::after` 的 `content`/`margin`、文本 `Range` 盒），不能凭「我写了这条 CSS」假定生效。

### 编辑纪律（防 Vite/TSC 语法错误）
1. 每次修改 `.tsx/.ts` 后，先跑 `npx tsc --noEmit`（或让 Vite HMR 无报错）确认无重复声明/语法错误，**验证通过才算改完**。
2. 多处插入/替换代码后必须重读目标区域，检查是否产生重复行（本项目曾出现 `const s`、`const batchSlot` 各被声明两次）；`return (` 之后禁止再出现语句。
3. 大改动拆成多个小编辑，每个编辑后立即验证，不要攒一批改完再查。

### 服务生命周期（Windows / PowerShell）
1. 验证类命令一律用 PowerShell 兼容语法：**禁止 `cmd1 & cmd2` 链接**（PowerShell 报 AmpersandNotAllowed），用 `;` 分隔或拆成多次调用。
2. 重启 API 前先确认旧进程已停、端口已释放：`netstat -ano | findstr :3001`，按 PID 精确 kill；禁止 `Stop-Process -Name java` 全杀（误伤其它 Java 进程）。
3. 同一服务只允许一个启动任务：上一个任务确认「Started ApiApplication」+ 端口监听后才算成功；未确认前不要并发启动第二个实例（会端口冲突、互相 kill）。
4. `mvnw spring-boot:run` 被外部 kill 时会报 `BUILD FAILURE: Process terminated with exit code: -1`——这是关停表现而非构建错误；判断服务真实状态看启动日志 + 端口监听 + health 探活，不要见 BUILD FAILURE 就重启动。
5. **Spring 进程不会自动读仓库根 `.env`**：启动 API 前先把 `.env` 变量注入进程环境（PowerShell：`Get-Content ..\..\.env | ForEach-Object { ... SetEnvironmentVariable }` 再 `./mvnw spring-boot:run`），否则 `MYSQL_PASSWORD` 等取默认值导致 `Access denied for user 'root'@'localhost'`。
6. **启动失败先读启动日志定位根因再改**，不要盲目重试：本项目实际出现过 `WeakKeyException`（JWT secret < 32 字节，需 SHA-256 派生或改配置）、`Access denied`（.env 未注入）——每类根因对应不同修法，重试无效。

### 冒烟与探活
1. API 启动后、前端联调前先探活：`Invoke-WebRequest http://localhost:3001/actuator/health`（或任一 GET 接口返回 200）；探活不通过不要让前端开始轮询（否则代理 ECONNREFUSED 刷屏，掩盖真问题）。
2. 探活/冒烟用对 HTTP 方法：`/api/auth/login` 是 POST，GET 会 405；健康轮询不得打 POST-only 接口。
3. 前端请求层对连续失败应退避并提示「后端未启动」，而不是每 5s 无限重试。

## 换 Figma 时的增量策略

| 场景 | 做法 |
|---|---|
| 全新业务 | 新 slug：init-project → 新 Spec + IR + Blueprint；可覆盖 web/api |
| 同项目加页面 | 扩 Prisma + API + spec.screens + 新路由页/Blueprint |
| 仅改文案/字段 | 改 spec + Seed + Blueprint，重跑 visual:gen |
| 换栈 | 同 App Spec，换 adapter/模板，勿混用 ORM |

## 安全与禁区

- 不把 Token/Key 写入聊天长文、`.env.example`、提交记录
- shell 生成物限制在仓库内；不读无关密钥文件
- 一期不做完整 RBAC / 支付 / 强合规

## 参考

- [visual-fidelity.md](visual-fidelity.md) — 前端还原方案（必读）
- [reference.md](reference.md) — 栈矩阵、环境变量、命令速查
- [figma-to-fullstack.md](figma-to-fullstack.md) — 智能体定义