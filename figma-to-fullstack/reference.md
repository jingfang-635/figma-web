# Figma → 全栈 · 参考

Skill 配套说明：栈矩阵、环境变量、命令速查。

> **零硬编码**：本参考只登记「键名 / 选项集 / 命令」，不复述任何业务或设计字面量。默认值与环境变量的**单一来源**是仓库根 `.env.example`（复制为 `.env`）；本文件出现 `<...>` 即为占位符。

## 前端还原

**所有新项目启用** [visual-fidelity.md](visual-fidelity.md) 的验收标准（高还原 + 闸门组），无需用户勾选；但 UI 技术栈由用户逐层选择，无默认。

- UI 组件库/图表/日期库：**由用户在栈闸门逐层选定，无默认**（React 可选 antd/MUI/Mantine 等；Vue 可选 Element Plus 等）
- 中间层：Layout IR → Visual IR → Screen Blueprint → `screenConfigs.ts` / `blueprints/`
- 禁止：通用 ResourcePage、自制 UI 组件库
- 验收：闸门组（`visual:fields` + `visual:gate` 像素三腿 + `visual:data` 数据腿（闭环 + 非 gate DOM 回填 + **活数据**）+ `visual:geom` 几何腿 + `visual:text` 文本腿）+ 还原轮次

## 合法栈矩阵

先选 **后端语言**（`node` / `java`），再选栈 ID。语言与框架必须一致。**每层单独一问，缺一项就停，不猜**；矩阵外的组合一律拒绝并提示本表。

| ID | 语言 | 前端 | 后端框架 | DB | ORM |
|---|---|---|---|---|---|
| A | node | react-vite | nestjs | postgresql | prisma |
| A2 | node | react-vite | express | postgresql | prisma |
| B | node | vue-vite | nestjs | postgresql | prisma |
| C | java | react-vite | spring-boot | mysql | jpa |
| D（二期） | java | vue-vite | spring-boot | mysql | mybatis |

> ORM 随语言联动过滤：选 Java 时只列 JPA / MyBatis（Prisma 仅支持 Node 系）。
> **不存在预设默认栈**；App Spec 的 `stack` 须含 `id`、`language`、`frontend`、`backend`、`database`、`orm`（**不要**带 `label`/`description`）。

## 环境变量（仓库根 `.env`）

**键名如下；默认值/校准值一律以 `.env.example` 为单一来源**（本文件不复述数值，避免与代码/校准结果漂移）。

```bash
# —— 必填 ——
FIGMA_ACCESS_TOKEN=          # 只写 .env，永不进 .env.example / 提交
FIGMA_API_BASE=

# —— 闸门凭证（或写 app-spec.seedAdmin）——
GATE_ADMIN_EMAIL=
GATE_ADMIN_PASSWORD=

# —— 闸门参数（阈值语义见下；具体值取 .env.example 与 `visual-gate --calibrate`）——
WEB_URL=
VISUAL_SSIM_MIN=             # 像素腿 1：结构崩塌检测
VISUAL_MISMATCH_MAX=         # 像素腿 2：高对比差异
VISUAL_FLATBG_MAX=           # 像素腿 3：低对比度盲区（平坦底色漂移）
VISUAL_FLATBG_MODAL_MAX=     # 弹窗用（固定尺寸对话框容差不同）
VISUAL_WIDE_WIDTH=           # 宽视口自适应锁定：对照宽度
VISUAL_WIDE_TOL=             # 宽视口纵向骨架容差
VISUAL_FILL_TOL=             # 宽视口铺满容差
VISUAL_MODAL_CENTER_TOL=     # 弹窗水平居中容差
VISUAL_GEO_TOL=              # 几何腿：控件框 x/y/w/h 容差
VISUAL_TEXT_TOL=             # 文本腿：文本位置/宽度容差
VISUAL_TEXT_SIZE_TOL=        # 文本腿：字号容差

FIGMA_SLUG=                  # 多项目时显式指定 fixtures/<slug>

# —— 数据库连接（复制到 .env 并按本机实际服务填写；生成时只选数据库类型）——
# mysql：Node/Prisma 用 MYSQL_URL，Java/JPA 用 MYSQL_JDBC_URL
MYSQL_URL=
MYSQL_JDBC_URL=
MYSQL_USER=
MYSQL_PASSWORD=
# postgresql：Node/Prisma 用 POSTGRES_URL
POSTGRES_URL=
PG_USER=
PG_PASSWORD=
PG_DB=
# sqlite：仅 Node 栈，无需连接信息（生成时直接写 file:./dev.db）

JWT_SECRET=
JWT_EXPIRES_IN=
```

API 本地另需 `apps/api/.env`：

```bash
DATABASE_URL=<从仓库根 .env 预置的 MYSQL_URL / POSTGRES_URL 中按所选数据库复制；SQLite 则 file:./dev.db>
JWT_SECRET=<与根 .env 同源>
API_PORT=<本地 API 端口>
```

> 数据库连接信息预置在仓库根 `.env`（`MYSQL_URL` / `MYSQL_JDBC_URL` / `POSTGRES_URL`），生成时只选择数据库类型，不使用 Docker（用户偏好）。
> 阈值必须经 `loadRootEnv` 真正加载；缺键即视为闸门失效（`visual:doctor` 校验全部阈值键在 `.env`，不得静默回落代码默认值）。

## 命令速查

```bash
# 0. 初始化（拉结构 + app-spec 骨架）
npm run init:project -- --slug <slug> --file <fileKey或URL>

# 1. 视觉抽取
npm run visual:layout / extract / shots / shots:all / assets

# 2. 生成前端资产
npm run visual:gen

# 2.5 后端 codegen（按 spec.stack 分发 adapter）
npm run gen:backend
npm run gen:backend -- --stack <ID>          # 显式指定栈（须与 spec.stack 一致或 spec 未填）
npm run gen:backend -- --out output/run1     # 产出路径重定向（默认 apps/）

# 3. 字段提取与校验
node scripts/extract-figma-texts.mjs
npm run visual:fields

# 4. 闸门组 + 轮次（先 npm run dev:up 确保 api+web 在跑）
npm run dev:up                  # 服务就绪闸（幂等）：并发起 api+web → 探活
npm run visual:capture          # 单趟采集：一个会话 → 截图 + DOM 快照（各腿都消费它）
npm run visual:gate
npm run visual:data             # 闭环 + 非 gate DOM 回填断言 + 活数据（聚合非空/非平坦 + 派生字段交叉验证）
npm run visual:geom             # 几何腿：Layout IR 控件框 ↔ DOM 框逐框断言
npm run visual:text             # 文本腿：Layout IR TEXT ↔ DOM 文本盒
npm run visual:round            # 单趟采集 + 对比 + gate(宽锁) + data + text + geom + dev:up（带逐阶段打点）
npm run visual:all              # 全链路（init 外；带逐阶段打点）
npm run pipeline:budget         # 打点报表 + 预算判定（超 .env 的 PIPELINE_BUDGET_SEC 即 exit 1）
npm run docs:lint               # 流程文档零硬编码复查

# 5. 服务
npm run api
npm run web
npm run dev:up                  # 轮次收尾：确保 api+web 在跑后才提问是否进入下一轮
```

## App Spec 最小字段

`version, name, figma{fileKey,url}, slug, stack{...}, auth{mode,storageKey}, brand{title,subtitle}, entities[], relations[], dashboard{...}, apis[], screens[], seedAdmin{email,username,password}, notes[]`

**`entities[]`**（gen:backend 的数据源，闸门环节回填；`fields[].type` 合法值 `String|Integer|Float|Decimal|Boolean|DateTime`）：

```json
{
  "entities": [
    {
      "name": "<Entity>",
      "table": "<table>",
      "route": "<route>",
      "fields": [
        { "name": "<field>", "type": "String" },
        { "name": "<field>", "type": "Integer" }
      ],
      "seedRows": [{ "<field>": "<原型逐字值>" }]
    }
  ]
}
```

- `table`/`route` 省略时按 `snake/kebab` 自动推导（`<EntityName> → <entity_names> / <entity-names>`）
- `seedRows`：逐字种子数据（字段值来自原型，**不写占位/示例业务数据**）；省略则生成 `<Entity>示例N` 占位
- `seedCount`：无 seedRows 时的占位行数（默认值见生成脚本）

**`screens[]`**（全屏闸门：每屏都进 Layout IR 抽取 + Blueprint + 视觉闸门，无标杆/非标杆之分）：

```json
{
  "screens": [
    { "id": "<id>", "type": "chart", "route": "/", "name": "<Figma Frame 名>" },
    { "id": "<id>", "type": "list", "route": "/<route>", "name": "<Figma Frame 名>" },
    { "id": "<id>", "type": "form", "route": "/<route>/new", "name": "<Figma Frame 名>" },
    { "id": "<id>", "type": "detail", "route": "/<route>/:id", "name": "<Figma Frame 名>" },
    { "id": "<id>", "type": "modal", "route": "/<route>", "name": "<Figma Frame 名>",
      "modal": { "trigger": "<打开弹窗的按钮文案>" } },
    { "id": "<id>", "type": "chrome", "name": "<chrome 组件名>" }
  ]
}
```

- `type`: `chart | list | form | detail | modal | chrome`
- `name` 与 Figma Frame 名一致（截图文件名 = `<name>.png`）
- `modal.trigger`：打开弹窗的按钮文案（正则或字符串）
- `chrome`：侧栏等 chrome 组件（不单独跑闸门，参与 token 提取）

**`screens[]` 每屏字段细节**（字段级还原的载体，闸门后回填、`needsReview: false`）：

```json
{
  "id": "<id>",
  "name": "<Figma Frame 名>",
  "route": "/<route>",
  "type": "list",
  "resource": "<resource>",
  "subtitle": "<原型逐字>",
  "stats": [{ "key": "<key>", "label": "<原型逐字>" }],
  "filters": [{ "key": "<key>", "type": "search", "placeholder": "<原型逐字>" }],
  "actions": [{ "label": "<原型逐字>", "variant": "primary" }],
  "table": { "columns": [{ "key": "<key>", "label": "<原型逐字>" }], "rowActions": ["edit", "delete"] },
  "formFields": [{ "key": "<key>", "label": "<原型逐字>", "type": "text", "required": true }],
  "statusMap": { "<值>": { "label": "<原型逐字>", "color": "<组件库语义色>" } },
  "needsReview": false
}
```

**`relations[]` 与 `dashboard`**（数据链路契约：派生字段与统计聚合的单一来源；codegen 按此生成真实实现，前端不得自编样例）：

```json
{
  "relations": [
    { "entity": "<源实体>", "field": "<派生字段>", "kind": "count",
      "target": "<目标实体>", "sourceField": "<外键>", "targetField": "<目标主键>" },
    { "entity": "<源实体>", "field": "<派生字段>", "kind": "lookup",
      "target": "<目标实体>", "sourceField": "<外键>", "targetField": "<目标主键>",
      "valueField": "<取值字段>" }
  ],
  "dashboard": {
    "entity": "<统计实体>", "dateField": "<日期字段>",
    "metrics": [{ "key": "<key>", "op": "<sum|count|countDistinct|diff>", "field": "<字段>",
                  "minusField": "<diff 的被减字段>", "window": "<month|last7|today|all>",
                  "where": { "<字段>": "<值>" } }],
    "rates":   [{ "key": "<key>", "numerator": "<metrics key>", "denominator": "<metrics key>" }],
    "amounts": [{ "key": "<key>", "op": "<sum>", "field": "<字段>", "window": "<...>",
                  "times": { "entity": "<目标实体>", "via": "<外键>", "field": "<乘数字段>" },
                  "prefix": "<前缀>", "grouped": true }],
    "charts":  [{ "key": "<key>", "window": "<...>", "op": "<sum>", "field": "<字段>",
                  "groupBy": "<day | { entity, via, field, labelEntity, labelField, labelMatch }>",
                  "times": { "entity": "<...>", "via": "<...>", "field": "<...>" } }]
  }
}
```

- `relations[].kind`：`count`（源行该字段 = 目标实体按 `targetField` 匹配的行数）| `lookup`（= 匹配行的 `valueField`）
- `window`：以统计实体的 `dateField` 与**当前日期**比较；`all` 不过滤
- **时间窗口类 `seedRows` 的日期字段必须用相对偏移**（如 `{ "$dayOffset": N }`），由 codegen 求值成「当前日期 + N」后落库；偏移**同时覆盖窗口内与窗口外**，否则窗口过滤本身未被验证
- 活数据闸门（`scripts/check-live-data.mjs`，挂入 `visual:data`）按本块断言：图表序列非空 / 非平坦、`count` 与关联表交叉求和一致、`lookup` 与目标行一致、DOM 实际渲染

## Windows / PowerShell 注意

- 链式命令用 `;`（旧版 PowerShell 不支持 `&&`）
- 写含密钥的 `.env` 优先用小脚本 `node *.mjs`
- `git show HEAD:<path> > file` 导出的文件可能是 UTF-16LE，读取时先转码

## Figma REST 要点

- `GET /v1/files/:key?depth=<n>` — 结构概览
- 全量 `GET /v1/files/:key` — 抽 TEXT / 大 FRAME
- `GET /v1/images/:key?ids=...` — 截图与图标导出
- Header：`X-Figma-Token: <token>`
- 通道优先级：**REST（主）** → Plugin 导出 → MCP 辅助（可选增强，非替代 Visual IR）

## 评估权重（可选报告）

`Score = 功能权重×功能 + 视觉权重×视觉还原 + 可维护权重×可维护 + 性能权重×性能`；及格线取报告配置。

- 功能：CRUD / 业务主路径冒烟通过率（阈值取报告配置）
- 视觉：视觉闸门项通过率（全屏闸门，见 visual-fidelity.md）
