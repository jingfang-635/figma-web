# Figma → 全栈 · 参考



用户级 Skill 配套说明。脚本与文档位于：`~/.cursor/skills/figma-to-fullstack/`。



## 默认前端还原



**所有新项目默认启用** [visual-fidelity.md](visual-fidelity.md)，无需用户勾选。



- UI 栈：`antd` + `@ant-design/icons` + `recharts` + `dayjs`

- 中间层：Visual IR → Screen Blueprint → `screenConfigs.ts` / `blueprints/`

- 禁止：通用 ResourcePage、自制 UI 组件库

- 验收：对照 `imports/figma/screens/*.png` 过视觉闸门



## 合法栈矩阵



先选 **后端语言**（`node` / `java`），再选栈 ID。语言与框架必须一致。



| ID | 语言 | 前端 | 后端框架 | DB | ORM |

|---|---|---|---|---|---|

| A（默认） | node | react-vite | nestjs | postgresql | prisma |

| A2 | node | react-vite | express | postgresql | prisma |

| B | node | vue-vite | nestjs | postgresql | prisma |

| C | java | react-vite | spring-boot | mysql | jpa |

| D（二期） | java | vue-vite | spring-boot | mysql | mybatis |



非法组合必须拒绝并提示矩阵，例如：

- Node 语言却选 Spring Boot / JPA / MyBatis

- Java 语言却选 NestJS / Express / Prisma

- Express + JPA、Nest + MyBatis 等跨语言混用



App Spec 的 `stack` 须含：`id`、`language`（`node`|`java`）、`frontend`、`backend`、`database`、`orm`。



## 环境变量（仓库根 `.env`）



```bash

FIGMA_ACCESS_TOKEN=

FIGMA_API_BASE=https://api.figma.com

LLM_PROVIDER=deepseek

LLM_API_KEY=

LLM_BASE_URL=https://api.deepseek.com

LLM_MODEL=deepseek-chat

DEFAULT_STACK_ID=A

JWT_SECRET=change-me-in-dev

JWT_EXPIRES_IN=7d

FIGMA_MCP_ENABLED=true

FIGMA_PLUGIN_EXPORT_DIR=./imports/plugin

```



API 本地另需 `apps/api/.env`：



```bash

DATABASE_URL=postgresql://fsg:fsg@localhost:5432/<db_name>?schema=public

JWT_SECRET=...

API_PORT=3001

```



## Figma REST 要点



- `GET /v1/files/:key?depth=3` — 结构概览

- 全量 `GET /v1/files/:key` — 抽 TEXT / 大 FRAME

- `GET /v1/images/:key?ids=...` — 截图与图标导出

- Header：`X-Figma-Token: <token>`

- 通道优先级：**REST（主）** → Plugin 导出 → MCP 辅助（`get_design_context` 可选增强，非替代 Visual IR）



## Visual IR 与 Blueprint



| 产物 | 路径 |

|---|---|

| Visual IR | `fixtures/<slug>/visual-ir.json` |

| Schema | `docs/schemas/visual-ir.schema.json` |

| Screen Blueprint | `fixtures/<slug>/screen-blueprints/*.json` |

| 生成 TS/CSS | `apps/web/src/generated/screenConfigs.ts`、`styles/tokens.css` |

| 对照截图 | `imports/figma/screens/*.png` |



视觉脚本（仓库根）：



```bash

npm run visual:extract

npm run visual:shots

npm run visual:gen

npm run visual:assets

```



Screen catalog（区域/侧栏/弹窗模板）：`scripts/lib/screen-catalog.mjs`



## App Spec 最小字段



`version, name, stack, auth, entities[], apis[], screens[]`  

若仓库有 Schema：`docs/schemas/app-spec.schema.json`  

`stack` 对象**不要**带 `label`/`description`（仅 id/language/frontend/backend/database/orm）。



## 评估权重（可选报告）



`Score = 0.35×功能 + 0.35×视觉还原 + 0.20×可维护 + 0.10×性能`；及格 ≥70。



- 功能：CRUD / 业务主路径冒烟通过率 ≥80%

- 视觉：标杆屏视觉闸门项通过率 ≥80%（见 visual-fidelity.md）



## 案例：阳光医疗门诊



- fileKey：`WZR7JiF1Q8GOaxOheQV8Ur`

- 还原：Screen Blueprint + antd + recharts

- 产出：`apps/web`、`apps/api`、`fixtures/sunshine-medical/`

- 账号：`admin@sunshine.clinic` / `admin123`

- 说明：`apps/GENERATED.md`



## 常用命令



```bash

node ~/.cursor/skills/figma-to-fullstack/scripts/fetch-overview.mjs <fileKey>

npm run visual:extract && npm run visual:shots && npm run visual:gen && npm run visual:assets

pnpm agent stacks

pnpm agent generate --file <key> --stack A --yes --dry-run

docker compose up -d

pnpm --filter @fsg/api prisma:seed

pnpm api

pnpm web

```



## Windows / PowerShell 注意



- 链式命令用 `;`，不用 `&&`（旧版 PowerShell）

- `Set-Content -Encoding utf8` 即可；避免不存在的 `utf8NoBOM` 枚举

- 写含密钥的 `.env` 优先用小脚本 `node *.mjs`，避免 shell 转义弄丢内容


