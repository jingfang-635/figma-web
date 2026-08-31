---

name: figma-to-fullstack

description: >-

  From a Figma design URL/fileKey, run the end-to-end pipeline to generate a

  runnable fullstack app (frontend + Nest/Express/Spring API + DB schema/seed)

  via Design IR → App Spec → Visual IR → Screen Blueprint → codegen. Default

  frontend: antd + Blueprint-driven pages with screenshot visual gates. Use when

  the user provides a Figma link, asks to generate web/frontend/backend/database

  from a prototype, or says 从Figma生成全栈 / 换了figma重新搭建 / figma-to-fullstack.

---



# Figma → 全栈生成



用户级 Skill（`~/.cursor/skills/figma-to-fullstack/`），跨项目可用。配套子智能体：`~/.cursor/agents/figma-to-fullstack.md`。



把「新的 Figma 原型」按固定流水线搭成可运行全栈。**禁止**从 Figma 节点直接吐最终代码；必须经 Design IR → App Spec → **Layout IR → Visual IR → Screen Blueprint**。



## 默认前端还原方案（无需用户勾选）



**自项目生成起即启用** [visual-fidelity.md](visual-fidelity.md) 中的「高还原且可维护」方案：



- UI：**antd + @ant-design/icons + recharts + dayjs**，`ConfigProvider` 主题对齐 Visual IR token

- 结构：**App Spec**（实体/API）+ **Layout IR**（几何）+ **Visual IR**（token/chrome）+ **Screen Blueprint**（逐屏构图）

- **禁止**通用 `ResourcePage` / 自制 UI 库冒充还原

- 必跑 `visual:layout|extract|shots|gen|assets|gate`，标杆屏 SSIM ≥ 0.97（或 mismatch < 2%）
- **第一版全栈生成完成后，进入字段还原和页面还原阶段（保证字段和页面100%还原）。以 Playwright 截图，将每一页截图进行对比，列出差异修复代码。第一轮完成后询问是否进入下一轮还原，直至选择不进入下一轮。** 详见 visual-fidelity.md「还原轮次」。

- **字段级 100% 还原**：所有 columns / formFields / filters / modalFields / stats / actions / title / subtitle 必须以 `imports/figma/screens/*.png` 与 summary 中的真实文案为准，**禁止臆造、改名、增删**；逐字核对中文 label；顺序与原型一致；弹窗字段以弹窗截图为准。分组/小节标题（formCard.title / cardTitle / sections[].title，如「预约规则配置」「通知模板」「发送记录」）与字段说明 hint 也要还原；一屏多表格（sections）全量还原；`template: "form"` 屏渲染为表单页而非列表+弹窗。交付前必须逐屏比对，任何字段差异必须修复。详见 visual-fidelity.md「字段级 100% 还原」。

- **字段级还原校验（交付前必跑）**：`npm run visual:shots:all` 拉全量截图 → Figma REST 提取每屏节点文本归档 `fixtures/figma-fields.json` → 逐屏回填 `scripts/lib/screen-catalog.mjs`（needsReview 置 false，必要时同步 schema.prisma + DTO + seed）→ `npm run visual:extract && npm run visual:gen` → 字段一致性脚本核对。**通过标准**：`screenConfigs.ts` 中 `"needsReview": true` 数量 = 0，且各屏字段与 `figma-fields.json` 逐字一致。详见 visual-fidelity.md「字段级还原校验方案」。



详情、目录约定、反模式见 [visual-fidelity.md](visual-fidelity.md)。



## 何时启用



- 用户给出 Figma URL / fileKey，要求生成前后端与数据库

- 用户说换原型、按手册/技术文档搭建、端到端生成

- 当前工作区是或准备建成 `figma-fullstack-gen` 式 monorepo（`apps/web`、`apps/api`、`packages/*`）



## 开始前：必须问清的决策



若当前仓库根目录有 `decision.html`，优先让用户打开该页勾选并复制摘要；否则在对话里用简短列表提问（缺一项就停，不要猜）：



1. **Figma 来源**：URL/fileKey（必填）

2. **后端语言**（必选）：**Node**（默认）/ **Java**

3. **栈组合**（按语言筛选，默认推荐 A）：

   - **Node**：

     - A：React + NestJS + PostgreSQL + Prisma

     - A2：React + Express + PostgreSQL + Prisma

     - B：Vue3 + NestJS + PostgreSQL + Prisma

   - **Java**：

     - C：React + Spring Boot + MySQL + JPA

     - D（二期）：Vue3 + Spring Boot + MySQL + MyBatis

4. **页面范围**：只做 Figma 已画出的屏 / 导航全做（缺屏用骨架）

5. **鉴权**：JWT（默认）/ 无鉴权

6. **产出路径**：`apps/web`+`apps/api`（长期开发）或 `output/<runId>/`

7. **数据库运行时**：

   - Node 栈：Docker PostgreSQL（默认）/ 本机已有 PG / 临时 SQLite

   - Java 栈：Docker MySQL（默认）/ 本机已有 MySQL



> 前端还原度**不再作为可选项**；默认即 visual-fidelity 方案。用户仅当明确要求「低还原 CRUD 壳」时才可降级，且须写入 GENERATED.md 说明。



凭证：确认**当前仓库根目录** `.env` 有 `FIGMA_ACCESS_TOKEN`；LLM 可选。**密钥只写 `.env`，永不写入 `.env.example` 或提交内容。**



详情见 [reference.md](reference.md)。



## 进度清单（复制并勾选）



```

- [ ] 0. 决策与 .env

- [ ] 1. 拉取 Figma 结构 / 文案

- [ ] 2. 写出 Design IR + App Spec（人工闸门）

- [ ] 3. 抽取 Layout IR + Visual IR + 截图 + token/screenConfigs + 资源导出

- [ ] 4. 编写/生成 Screen Blueprint（含 layout.regions）

- [ ] 5. 生成/更新 DB Schema + Seed

- [ ] 6. 生成/更新 Backend API + JWT

- [ ] 7. 生成/更新 Frontend（antd + chrome + 标杆页 + list 模板）

- [ ] 8. docker/migrate/seed + 冒烟 + **SSIM 视觉闸门**（第一版全栈）

- [ ] 9. 字段还原 + 页面还原轮次（Playwright 逐页对比 → 列差异 → 修代码 → 询问是否下一轮）

- [ ] 10. 更新 GENERATED.md / fixtures

```



## 流水线步骤



### 0. 环境



```bash

# 当前仓库根目录

cp .env.example .env   # 仅当 .env 不存在；再填 Token

pnpm install           # 或 npm install

docker compose up -d   # 栈 A/B 需要；Docker 不可用则改问用户

```



前端依赖（栈 A 默认，codegen 时写入 `apps/web/package.json`）：



```bash

npm install antd @ant-design/icons recharts dayjs --prefix apps/web

```



解析 fileKey：`figma.com/design/<FILE_KEY>/...` 或纯 key。



### 1. 解析 Figma（REST 主通道）



优先用本 Skill 通用脚本（在仓库根目录执行）：



```bash

node ~/.cursor/skills/figma-to-fullstack/scripts/fetch-overview.mjs <FILE_KEY或URL>

```



Windows 也可用：



```bash

node "$env:USERPROFILE\.cursor\skills\figma-to-fullstack\scripts\fetch-overview.mjs" <FILE_KEY>

```



若仓库已有同类脚本，也可：



```bash

node scripts/fetch-figma-overview.mjs

node scripts/parse-figma-screens.mjs

node scripts/extract-figma-texts.mjs

```



产出落到当前仓库 `imports/figma/`：页面/大 Frame 名、导航文案、表格列、表单字段、样例数据文案。



### 2. Design IR → App Spec（闸门）



1. 根据屏幕与文案推断实体、字段、关系、路由、API。

2. 写入 `fixtures/<slug>/app-spec.json`（若有 `docs/schemas/app-spec.schema.json` 则对齐校验）。

3. **向用户展示摘要**（实体表 + 页面路由 + API 列表），确认后再 codegen。

4. 用户说「跳过确认 / --yes」才可直接生成。



原则：



- 导航有但 Figma 未画的屏：标为二期或灰显，除非用户选「导航全做」

- Seed 数据优先用原型里出现的真实文案（科室名、医生名等）



### 3. Layout IR + Visual IR + Screen Blueprint（前端必做）



在仓库根目录（仓库脚本与 Skill 脚本等价，优先用仓库内 `scripts/`）：



```bash

npm run visual:all        # layout + extract + shots + gen + assets + gate

# 或逐步：

npm run visual:layout

npm run visual:extract

npm run visual:shots

npm run visual:gen

npm run visual:assets

npm run visual:gate       # 需 api + web 已启动

```



或逐步：



```bash

node scripts/extract-visual-ir.mjs <FILE_KEY>

node scripts/export-screenshots.mjs <FILE_KEY>

node scripts/generate-tokens-css.mjs

node scripts/generate-screen-configs.mjs

node scripts/export-assets.mjs

```



产出：



| 路径 | 说明 |

|---|---|

| `fixtures/<slug>/layout-ir/` | 标杆 Frame 几何 + tokens.json |

| `fixtures/<slug>/visual-ir.json` | token / chrome / screens / modals |

| `fixtures/<slug>/screen-blueprints/*.json` | 标杆屏构图（含 layout.regions） |

| `apps/web/src/blueprints/` | 运行时 Blueprint 副本 |

| `imports/figma/screens/*.png` | 对照截图（不进 bundle） |

| `apps/web/src/styles/tokens.css` | CSS 变量 |

| `apps/web/src/theme/antdTheme.ts` | 由 token 生成 |

| `apps/web/src/generated/screenConfigs.ts` | 侧栏 + list 屏配置 |

| `apps/web/public/assets/` | 导航/业务图标原图 |

| `artifacts/visual-diff/` | SSIM / pixelmatch 报告 |



失败降级：无 Token → 停并提示；REST 429/5xx → fallback token + 已有 summary 继续，标 `needsReview`；再问用户 Plugin 导出 JSON。



Screen catalog 扩展：改 `scripts/lib/screen-catalog.mjs` 后重跑 visual 脚本。



### 4–6. 按栈生成代码



**默认栈 A**：



| 层 | 目录 | 要求 |

|---|---|---|

| DB | `apps/api/prisma/schema.prisma` | 实体 + 迁移；`prisma/seed.ts` |

| API | `apps/api/src/*` | Nest 模块：auth(JWT)、各资源 CRUD、dashboard stats |

| Web | `apps/web/src/*` | **antd + ConfigProvider + Screen Blueprint + 共享壳** |



换栈时用合法矩阵（见 reference）；非法组合拒绝。若仓库有 `packages/stack-adapters` 则复用。



Web 实现顺序（默认）：



1. `main.tsx` + `theme/antdTheme.ts` + `tokens.css`

2. `components/chrome/Layout.tsx`（侧栏分组/彩色图标/Badge）

3. 标杆页：`DashboardPage`、`DepartmentsPage`、`OrganizationPage`、`SchedulePage`

4. `templates/ResourceListPage.tsx` + `ListPages.tsx` 覆盖其余 list 屏

5. 对照截图修 `app.css` 微调



实现要点：



- **禁止**只用一套通用 ResourcePage / 自制 Button/Table 覆盖全部业务屏

- 密码 bcrypt；列表支持搜索/筛选（若原型有）

- `docker-compose.yml` 提供 db；`apps/api/.env` 用 `DATABASE_URL`（gitignore）



### 7. 联调验收



```bash

pnpm --filter @fsg/api prisma:generate

pnpm --filter @fsg/api exec prisma migrate dev --name init

pnpm --filter @fsg/api prisma:seed

pnpm --filter @fsg/api build

pnpm --filter @fsg/web build

# 启动后冒烟：login → 列表 GET → 关键写接口

```



最低冒烟：



- `POST /api/auth/login` → 200 + token

- 无 token 访问受保护资源 → 401

- 每个主实体至少 `GET` 列表非空（seed 后）



**视觉闸门**（`npm run visual:gate`，对照 `imports/figma/screens/`）：



- 视口 1440×1068；**SSIM ≥ 0.97 或 mismatch < 2%**

- 报告：`artifacts/visual-diff/score.json`

- 闸门模式 `?visualGate=1` 冻结 sample 数据

- 未过闸门不得结束任务；对照 heatmap 修标杆屏后重跑



### 8. 字段还原 + 页面还原（第一版全栈之后必做）



第一版全栈生成完成后，进入字段还原和页面还原阶段（保证字段和页面100%还原）。以 Playwright 截图，将每一页截图进行对比，列出差异修复代码。第一轮完成后询问是否进入下一轮还原，直至选择不进入下一轮。



细则见 [visual-fidelity.md](visual-fidelity.md)「还原轮次」。每一轮：启动 api+web → Playwright 逐页截图（`?visualGate=1`，1440×1068）→ 与 `imports/figma/screens/` 对比 → 列出差异并修代码 → 重截确认 → **询问「是否进入下一轮还原」**。用户未明确停止前不得收尾。



### 9. 收尾文档



更新 `apps/GENERATED.md`：Figma 链接、fileKey、**还原策略（Screen Blueprint + antd）**、视觉脚本命令、已实现页面、启动命令、默认账号。  

可选：把本次 App Spec / Visual IR / Blueprint 存入 `fixtures/<slug>/`。



## 换 Figma 时的增量策略



| 场景 | 做法 |

|---|---|

| 全新业务 | 新 slug 的 Spec + Visual IR + Blueprint；可覆盖 web/api 模块 |

| 同项目加页面 | 扩 Prisma + API + screen-catalog + 新路由页/Blueprint |

| 仅改文案/字段 | 改 Seed + Blueprint 列/表单，重跑 visual:gen |

| 换栈 | 同 App Spec，换 adapter/模板，勿混用 ORM |



## 安全与禁区



- 不把 Token/Key 写入聊天长文、`.env.example`、提交记录

- `shell` 生成物限制在仓库内；不读无关密钥文件

- 一期不做完整 RBAC / 支付 / 强合规



## 参考



- [visual-fidelity.md](visual-fidelity.md) — **默认前端还原方案（必读）**

- [reference.md](reference.md) — 栈矩阵、环境变量、验收标准、阳光医疗案例摘要

- 仓库内若存在：`docs/schemas/visual-ir.schema.json`、`docs/schemas/app-spec.schema.json`

- CLI：`pnpm agent generate --file <key> --stack A --yes`（骨架可用时）


