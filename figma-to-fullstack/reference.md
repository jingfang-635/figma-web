# Figma → 全栈 · 参考

Skill 配套说明：栈矩阵、环境变量、命令速查。

## 前端还原

**所有新项目启用** [visual-fidelity.md](visual-fidelity.md) 的验收标准（高还原 + 双闸门），无需用户勾选；但 UI 技术栈由用户逐层选择，无默认。

- UI 组件库/图表/日期库：**由用户在栈闸门逐层选定，无默认**（React 可选 antd/MUI/Mantine 等；Vue 可选 Element Plus 等）
- 中间层：Layout IR → Visual IR → Screen Blueprint → `screenConfigs.ts` / `blueprints/`
- 禁止：通用 ResourcePage、自制 UI 组件库
- 验收：双闸门（`visual:fields` + `visual:gate`）+ 还原轮次

## 合法栈矩阵

先选 **后端语言**（`node` / `java`），再选栈 ID。语言与框架必须一致。

| ID | 语言 | 前端 | 后端框架 | DB | ORM |
|---|---|---|---|---|---|
| A | node | react-vite | nestjs | postgresql | prisma |
| A2 | node | react-vite | express | postgresql | prisma |
| B | node | vue-vite | nestjs | postgresql | prisma |
| C | java | react-vite | spring-boot | mysql | jpa |
| D（二期） | java | vue-vite | spring-boot | mysql | mybatis |

非法组合必须拒绝并提示矩阵。App Spec 的 `stack` 须含：`id`、`language`、`frontend`、`backend`、`database`、`orm`（**不要**带 `label`/`description`）。

## 环境变量（仓库根 `.env`）

```bash
FIGMA_ACCESS_TOKEN=
FIGMA_API_BASE=https://api.figma.com

# 闸门凭证（或写 app-spec.seedAdmin）
GATE_ADMIN_EMAIL=
GATE_ADMIN_PASSWORD=

# 闸门参数（可选覆盖）
WEB_URL=http://localhost:5173
VISUAL_SSIM_MIN=0.97
VISUAL_MISMATCH_MAX=0.02
FIGMA_SLUG=

DEFAULT_STACK_ID=A
JWT_SECRET=change-me-in-dev
JWT_EXPIRES_IN=7d
```

API 本地另需 `apps/api/.env`：

```bash
DATABASE_URL=<从仓库根 .env 预置的 MYSQL_URL / POSTGRES_URL 中按所选数据库复制；SQLite 则 file:./dev.db>
JWT_SECRET=...
API_PORT=3001
```

> 数据库连接信息预置在仓库根 `.env`（`MYSQL_URL` / `MYSQL_JDBC_URL` / `POSTGRES_URL`），生成时只选择数据库类型，不使用 Docker（用户偏好）。

## 命令速查

```bash
# 0. 初始化（拉结构 + app-spec 骨架）
npm run init:project -- --slug <slug> --file <fileKey或URL>

# 1. 视觉抽取
npm run visual:layout / extract / shots / shots:all / assets

# 2. 生成前端资产
npm run visual:gen

# 2.5 后端 codegen（按 spec.stack 分发：node→Nest+Prisma / java→Spring+JPA）
npm run gen:backend
npm run gen:backend -- --stack C         # 显式指定栈（须与 spec.stack 一致或 spec 未填）
npm run gen:backend -- --out output/run1 # 产出路径重定向（默认 apps/）

# 3. 字段提取与校验
node scripts/extract-figma-texts.mjs
npm run visual:fields

# 4. 双闸门 + 轮次（gate 需 api+web 已启动）
npm run visual:gate
npm run visual:round            # capture-screens + visual-compare
npm run visual:all              # 全链路（init 外）

# 5. 服务
npm run api
npm run web
```

## App Spec 最小字段

`version, name, figma{fileKey,url}, slug, stack{...}, auth{mode,storageKey}, brand{title,subtitle}, entities[], apis[], screens[], seedAdmin{email,username,password}, notes[]`

**`entities[]`**（gen:backend 的数据源，闸门环节回填；`fields[].type` 合法值 `String|Integer|Float|Decimal|Boolean|DateTime`）：

```json
{
  "entities": [
    {
      "name": "Department",
      "table": "departments",
      "route": "departments",
      "fields": [
        { "name": "name", "type": "String" },
        { "name": "sort", "type": "Integer" },
        { "name": "status", "type": "String" }
      ],
      "seedRows": [{ "name": "内科", "sort": 1, "status": "active" }],
      "seedCount": 6
    }
  ]
}
```

- `table`/`route` 省略时按 `snake/kebab` 自动推导（`NewsCategory → news_categories / news-categories`）
- `seedRows`：逐字种子数据（字段值来自原型）；省略则生成 `<Entity>示例N` 占位
- `seedCount`：无 seedRows 时的占位行数（默认 6）

**`screens[]`**（全屏闸门：每屏都进 Layout IR 抽取 + Blueprint + 视觉闸门，无标杆/非标杆之分）：

```json
{
  "screens": [
    { "id": "home", "type": "chart", "route": "/", "name": "首页" },
    { "id": "departments", "type": "list", "route": "/departments", "name": "科室管理" },
    { "id": "appointment-form", "type": "form", "route": "/appointments/new", "name": "新增预约" },
    { "id": "doctor-detail", "type": "detail", "route": "/doctors/1", "name": "医生详情" },
    { "id": "modal-create-dept", "type": "modal", "route": "/departments", "name": "新增科室弹窗",
      "modal": { "trigger": "新增" } },
    { "id": "sidebar", "type": "chrome", "name": "sidebar" }
  ]
}
```

- `type`: `chart | list | form | detail | modal | chrome`
- `name` 与 Figma Frame 名一致（截图文件名 = `<name>.png`）
- `modal.trigger`：打开弹窗的按钮文案（正则或字符串）
- `chrome`：侧栏等 chrome 组件（不单独跑闸门，参与 token 提取）

**`screens[]` 每屏字段细节**（字段级还原的载体，闸门后回填、`needsReview: false`；清单字段见上）：

```json
{
  "id": "departments",
  "name": "科室管理",
  "route": "/departments",
  "type": "list",
  "resource": "departments",
  "subtitle": "管理门诊基础资料、排班与预约信息",
  "stats": [{ "key": "departments", "label": "启用科室" }],
  "filters": [{ "key": "search", "type": "search", "placeholder": "搜索科室" }],
  "actions": [{ "label": "＋ 新增科室", "variant": "primary" }],
  "table": { "columns": [{ "key": "name", "label": "科室" }], "rowActions": ["edit", "delete"] },
  "formFields": [{ "key": "name", "label": "科室名称", "type": "text", "required": true }],
  "statusMap": { "active": { "label": "启用", "color": "success" } },
  "needsReview": false
}
```

## Windows / PowerShell 注意

- 链式命令用 `;`（旧版 PowerShell 不支持 `&&`）
- 写含密钥的 `.env` 优先用小脚本 `node *.mjs`
- `git show HEAD:<path> > file` 导出的文件可能是 UTF-16LE，读取时先转码

## Figma REST 要点

- `GET /v1/files/:key?depth=3` — 结构概览
- 全量 `GET /v1/files/:key` — 抽 TEXT / 大 FRAME
- `GET /v1/images/:key?ids=...` — 截图与图标导出
- Header：`X-Figma-Token: <token>`
- 通道优先级：**REST（主）** → Plugin 导出 → MCP 辅助（可选增强，非替代 Visual IR）

## 评估权重（可选报告）

`Score = 0.35×功能 + 0.35×视觉还原 + 0.20×可维护 + 0.10×性能`；及格 ≥70。

- 功能：CRUD / 业务主路径冒烟通过率 ≥80%
- 视觉：视觉闸门项通过率 ≥80%（全屏闸门，见 visual-fidelity.md）