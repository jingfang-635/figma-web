---
name: figma-to-fullstack
description: >-
  Figma→全栈生成专家。从 Figma URL/fileKey 经 init-project → App Spec（人工闸门）→
  Layout IR / Visual IR / Blueprint → codegen → 双闸门（字段一致性 + SSIM 视觉闸门）→
  还原轮次。高还原前端，技术栈由用户逐层选择（无默认）。用户给出 Figma 链接、要求从原型生成 web/api/db、
  或说 从Figma生成全栈 / 换了figma重新搭建 / figma-to-fullstack 时主动使用。
  禁止从 Figma 节点直接吐最终代码。
---

# Figma → 全栈生成（Skill）

用户级 Skill（`~/.cursor/skills/figma-to-fullstack/`），跨项目可用。配套智能体：`~/.cursor/agents/figma-to-fullstack.md`。

把「新的 Figma 原型」按固定流水线搭成可运行全栈。**禁止**从 Figma 节点直接吐最终代码；必须经 **init-project → App Spec（人工闸门）→ Layout IR → Visual IR → Screen Blueprint → codegen → 双闸门 → 还原轮次**。

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
6. 冒烟 + 双闸门             # 字段一致性 + SSIM 视觉闸门（全屏）
  ↓
7. 还原轮次                  # Playwright 逐页对比 → 列差异 → 修代码 → 问是否下一轮
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

> 前端还原度按 visual-fidelity 方案（高还原 + 双闸门）验收；但 **UI 技术栈（框架/组件库/图表/日期库）由用户逐层选定，无默认**。

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
- [ ] 8. 双闸门：visual:fields + visual:gate
- [ ] 9. 还原轮次（Playwright 逐页对比 → 修 → 问是否下一轮）
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

### 8. 双闸门（第一版全栈验收，必过）

```bash
# 先启动 api + web，然后：
npm run visual:fields     # 字段一致性：config ↔ figma-fields 逐字比对；needsReview=0
npm run visual:gate       # SSIM ≥ 0.97 或 mismatch < 2%（1440×1068）
```

- 报告：`artifacts/visual-diff/score.json`
- 闸门模式 `?visualGate=1` 冻结 sample 数据、关动画
- 未过任一闸门不得宣称完成
- mask：图表区等不可像素对齐的区域，配置在 `fixtures/<slug>/gate-masks.json`

### 9. 还原轮次（第一版之后必做）

每轮：启动 api+web → `npm run visual:round`（Playwright 逐页截图 + 对比 + 热力图）→ 列差异表（屏/类型/差异/拟改文件）→ 修代码 → 重截确认 → **询问「本轮字段还原和页面还原已完成。是否进入下一轮还原？」**。进入则再来一轮；用户停止后才写 GENERATED.md 收尾。

覆盖：导航每一屏 + 原型弹窗。字段以截图与 `figma-fields.json` 逐字为准；页面以 Layout IR + 截图几何为准。

### 10. 收尾

`apps/GENERATED.md`：Figma 链接、fileKey、slug、栈、还原策略、闸门结果（分数）、还原轮次数、页面清单、启动命令、默认账号。

## 稳定性与编辑纪律（2026-09-24 复盘，必读）

> 来源：本项目实际事故——Vite 反复报语法错误、API 未就绪导致 ECONNREFUSED 刷屏、重复启动任务互相 kill、PowerShell 语法不兼容。后续每轮生成/还原都必须遵守。

### 编辑纪律（防 Vite/TSC 语法错误）
1. 每次修改 `.tsx/.ts` 后，先跑 `npx tsc --noEmit`（或让 Vite HMR 无报错）确认无重复声明/语法错误，**验证通过才算改完**。
2. 多处插入/替换代码后必须重读目标区域，检查是否产生重复行（本项目曾出现 `const s`、`const batchSlot` 各被声明两次）；`return (` 之后禁止再出现语句。
3. 大改动拆成多个小编辑，每个编辑后立即验证，不要攒一批改完再查。

### 服务生命周期（Windows / PowerShell）
1. 验证类命令一律用 PowerShell 兼容语法：**禁止 `cmd1 & cmd2` 链接**（PowerShell 报 AmpersandNotAllowed），用 `;` 分隔或拆成多次调用。
2. 重启 API 前先确认旧进程已停、端口已释放：`netstat -ano | findstr :3001`，按 PID 精确 kill；禁止 `Stop-Process -Name java` 全杀（误伤其它 Java 进程）。
3. 同一服务只允许一个启动任务：上一个任务确认「Started ApiApplication」+ 端口监听后才算成功；未确认前不要并发启动第二个实例（会端口冲突、互相 kill）。
4. `mvnw spring-boot:run` 被外部 kill 时会报 `BUILD FAILURE: Process terminated with exit code: -1`——这是关停表现而非构建错误；判断服务真实状态看启动日志 + 端口监听 + health 探活，不要见 BUILD FAILURE 就重启动。

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