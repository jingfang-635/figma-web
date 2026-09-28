# 前端视觉还原方案

**所有从 Figma 生成的项目启用本方案**（高还原 + 闸门组是验收标准，但 UI 技术栈不是）。目标：视觉不可分辨且可维护——用户选定框架的组件库 + Layout IR 精确几何 + 自动闸门组，而不是手写 CSS 或通用 CRUD 壳。技术栈由用户逐层选择，**无默认**（见 `.cursor/rules/figma-visual-fidelity.mdc`）。

> **零硬编码**：本文档不含业务/设计字面量。屏名、路由、字段、文案、尺寸、坐标、百分比、颜色、样例数据、凭证一律从 `fixtures/<slug>/app-spec.json`、`fixtures/<slug>/layout-ir/*.json`、仓库根 `.env` 派生；文中一切数值仅用于说明机制，**实现时禁止复制**。
>
> 文档自身的复查由 `npm run docs:lint`（`scripts/check-doc-hardcode.mjs`）强制，`visual:doctor` 亦含「流程文档零硬编码」项；**同理，页面/组件源码不得复述业务文案与设计值**（`visual:doctor` 含「页面层零硬编码」，逐行扫描页面/组件源码）。

## 架构：四层 IR + 闸门组

```
Figma REST/MCP
    ↓
init-project.mjs → App Spec（实体、路由、API、screens 全屏清单、seedAdmin）【人工闸门】
    ↓
Layout IR（每屏完整子树几何：padding/gap/size/fill/font/export id）
    ↓
Visual IR（token、chrome、screens、modals）← token 从 Layout IR 命名节点取值
    ↓
Screen Blueprint（构图 + layout.regions + sample）← 由 App Spec + Layout IR 生成
    ↓
Codegen（按用户选定框架的页面 + 生成的 tokens.css / 主题文件 + Figma 原图）
    ↓
闸门组（字段 visual:fields + 视觉像素 visual:gate[三腿 AND]
        + 几何 visual:geom[IR 控件框 ↔ DOM 框]
        + 文本 visual:text[IR TEXT ↔ DOM 文本盒]
        + 数据 visual:data[闭环 + 回填 + 活数据（非 gate）]）
    ↓
还原轮次（字段 100% + 页面 100%；逐页对比 → 列差异 → 修代码 → 询问是否下一轮）
```

| 层 | 职责 | 产出 |
|---|---|---|
| **App Spec** | 数据模型、关系、REST API、路由、screens 全屏清单 | `fixtures/<slug>/app-spec.json` |
| **Layout IR** | 全屏 Frame 几何、资源 nodeId | `fixtures/<slug>/layout-ir/*.json` |
| **Visual IR** | 设计 token、侧栏/顶栏 chrome、屏模板分类、弹窗 | `fixtures/<slug>/visual-ir.json` |
| **Screen Blueprint** | 每屏 KPI/列表/图表/弹窗 + `layout.regions` | `fixtures/<slug>/screen-blueprints/*.json` → `apps/web/src/blueprints/` |
| **生成物** | 可运行前端 | `tokens.css`、主题文件、`screenConfigs.ts`（含 `brand` / `sidebarItems` 等派生出入口）、Blueprint 页、assets |

**项目差异全部由 `fixtures/<slug>/app-spec.json` 驱动**：全屏清单（`screens`：type = chart/list/form/detail/modal/chrome，全部进闸门）、路由、闸门账号（`seedAdmin`）、localStorage key（`auth.storageKey`）、品牌（`brand.title/subtitle`）。脚本与流程不含业务硬编码。

**禁止**从 Figma 节点直接吐 React/Vue 代码；**禁止**用一套 `ResourcePage` + 自制 Button/Table 覆盖全部业务屏；**禁止**用组件库图标或 emoji 冒充已导出的 Figma 图标。

## 字段级 100% 还原（硬性规则）

除视觉外，**原型屏中出现的每一个字段/文案必须与 Figma 完全一致**，不允许凭经验臆造、改名、增删：

- 列表列（columns）、表单字段（formFields）、筛选项（filters）、弹窗字段（modalFields）、KPI 标题（stats）、按钮文案（actions）、页面标题与副标题（title/subtitle），均须以 `imports/figma/screens/*.png` 与 `fixtures/figma-fields.json` 提取到的真实文案为准
- 中文标签逐字核对；字段名 key 与中文 label 都要对齐
- 原型里没有的字段**禁止新增**到 columns / formFields / modals；原型里有的字段**禁止省略**
- 字段顺序必须与 Figma 视觉顺序一致（从上到下、从左到右）
- 弹窗字段以弹窗截图为准，不以列表页字段推断
- **屏内分组/小节标题必须还原**：表单卡片标题（`formCard.title`）、表格分组标题（`cardTitle` / `sections[].title`）必须以原型为准，**禁止**用通用标题替代
- **一屏多表格（sections）必须全量还原**：每张表的列、行操作、分页、statusMap 逐一还原，禁止只做第一张表
- **表单字段说明/提示文案（hint）必须还原**
- **form 模板屏必须渲染为表单页**：`type: "form"` 的屏按「卡片标题 + 保存按钮 + 字段（含 hint）」渲染，**禁止**退化为列表 + 弹窗
- `statusMap` 按原型值逐字配置
- 交付前用 `imports/figma/screens/` 逐屏核对，任何字段差异必须修复后才能标记完成

## 字段级还原校验（闸门之一，交付前必跑）

**数据源：**

- `imports/figma/screens/*.png`：全量对照截图（`visual:shots:all` 可导出全部屏 + 弹窗；默认 `visual:shots` 覆盖全部非 chrome 屏）
- `fixtures/figma-fields.json`：Figma 节点真实文本归档（`extract-figma-texts.mjs` 收集每屏 TEXT 节点），字段逐字比对的权威依据

**校验步骤：**

1. 拉全量截图：`npm run visual:shots:all`（429 限流等待后重跑，勿跳过）
2. 拉节点文本：`node scripts/extract-figma-texts.mjs` → `fixtures/figma-fields.json`
3. 回填字段源：逐屏更新 `fixtures/<slug>/app-spec.json` 的 screens 字段（columns/formFields/filters/actions/stats/subtitle/statusMap/sections/formCard/hint），`needsReview` → `false`；schema 缺失字段同步扩展 DB schema + DTO + seed
4. 重新生成：`npm run visual:extract && npm run visual:gen`
5. 自动核对：`npm run visual:fields` 逐屏断言 config ↔ figma-fields 逐字一致

**通过标准（全部满足）：**

- `screenConfigs.ts` 中 `"needsReview": true` 数量 = 0
- 每屏 columns / formFields / filters / actions / stats / subtitle 与 `fixtures/figma-fields.json` 逐字一致、顺序一致
- 分组/小节标题、hint、statusMap 与原型一致；一屏多表时每个 section 全量存在
- `type: "form"` 屏渲染为表单页（卡片标题 + 保存按钮 + 字段）
- 原型里没有的字段未新增；有的未省略；弹窗字段与弹窗截图一致
- 数据层配套：原型列引用的字段若 schema 缺失，同步扩展 DB schema + DTO + seed
- `tsc --noEmit`（web + api）通过、DB schema 推送 + seed 可跑

## 前端技术栈（按用户选择适配，无硬性默认）

| React 生态常用 | Vue 生态常用 | 用途 |
|---|---|---|
| `antd` / MUI / Mantine | Element Plus / Ant Design Vue | Layout、Menu、Table、Form、Modal、Card、Tag… |
| `@ant-design/icons`（或所选组件库图标） | 组件库自带图标包 | 仅当 Layout IR 未导出对应资源时的回退 |
| `recharts` / `echarts` | `echarts` | 图表页折线/柱状/饼图 |
| `dayjs` | `dayjs` | 日历、日期选择 |

> 组件库与图表/日期库由用户在栈闸门中确定；生成脚本按 `spec.stack.frontend` + `spec.stack.ui` 输出对应主题与页面，不以任何一家作为硬性默认。

入口：按所选组件库配置主题（例如 React 组件库用其 `ConfigProvider` + 生成的 `theme/*.ts`；其余框架以对应机制接入）。

## 视觉流水线（必做）

```bash
npm run init:project       # 拉结构 + app-spec 骨架（--slug <slug> --file <key>）
npm run visual:layout      # Layout IR（全屏 Frame 完整子树）
npm run visual:extract     # Visual IR（token 优先读 Layout IR）
npm run visual:shots       # 全屏对照 PNG → imports/figma/screens/
npm run visual:shots:all   # 全量屏 + 弹窗 PNG
npm run visual:gen         # tokens.css + 主题文件 + Blueprint + screenConfigs
npm run visual:assets      # 按 Layout IR nodeId 导出原图
npm run dev:up             # 服务就绪闸：api+web 已在跑则跳过；未跑则**并发**起 api+web（按端口清旧实例）→ 探活
npm run visual:fields      # 字段一致性校验
npm run visual:capture     # 单趟采集：一个会话 → 截图 + DOM 快照（下列各腿都消费它）
npm run visual:gate        # Playwright 像素四腿（三像素腿 AND + flatBg，阈值取 .env）
npm run visual:data        # 数据腿：config↔API 闭环 + 非 gate DOM 回填 + 活数据（聚合/关联字段）
npm run visual:geom        # 几何腿：Layout IR 控件框 ↔ DOM 框逐框断言
npm run visual:text        # 文本腿：Layout IR TEXT ↔ DOM 文本盒
npm run visual:round       # 还原轮次：单趟采集 + 对比热力图 + gate(宽锁) + data + text + geom + dev:up（带逐阶段打点）
npm run visual:all         # layout/extract/shots/gen/assets/capture/fields/gate/data/text/geom（带逐阶段打点）
npm run pipeline:budget    # 打印打点表 + 预算判定（超 .env 的 PIPELINE_BUDGET_SEC 即 exit 1）
npm run docs:lint          # 流程文档零硬编码复查
```

**性能契约（单趟采集）**：`visual:capture` 起**一个**浏览器会话把全部屏（含弹窗）导航一遍，
落 `artifacts/visual-diff/dom-snapshot.json`（截图 + 文本盒 + 控件框 + 回填值 + 活数据 + 宽视口探针）；
`visual:gate` / `visual:text` / `visual:geom` / `visual:data` **只消费该快照**（纯计算），
不再各自 launch 浏览器。快照带**新鲜度哈希**（`app-spec` + `layout-ir` + `apps/web/src` + `WEB_URL`）——
产物改了却复用旧快照即 exit 1。等待判据**既看 DOM 签名又看在途请求**（只看 DOM 会在
「数据请求在途、图表只画了坐标轴」的中间态误判稳定，采到的快照缺图表值 → 活数据腿误报）。

**耗时预算**：链路定义**只有一处** `scripts/pipeline-timing.mjs`（`visual:all` / `visual:round` 均委托它，
不得在 `package.json` 再写长 `&&` 串）；逐阶段耗时落 `artifacts/pipeline-timing.json`，
超 `.env` 的 `PIPELINE_BUDGET_SEC` 即 exit 1。抽取阶段并发化（Figma `/nodes` 批量 + 资产/截图/文本并发）
走通用池 `scripts/lib/concurrency.mjs`，并发度全部取 `.env`（`PIPELINE_CONCURRENCY` / `FIGMA_NODES_BATCH` /
`FIGMA_NODES_CONCURRENCY` / `FIGMA_TEXT_BATCH`）。`visual:doctor` 必含
「✅ 单趟 DOM 采集（快照消费 + 新鲜度）」与「✅ 流水线预算打点」。

闸门跑次：URL 加 `?visualGate=1` 冻结 Blueprint `sample` 数据、关闭动画与滚动条。

**降级**：无 `FIGMA_ACCESS_TOKEN` → 停并提示；REST 429/5xx → 指数退避重试；仍失败则用已有 Layout IR / fallback token，字段标 `needsReview`。

## 前端目录约定

```
apps/web/src/
├── theme/                      # 由 generate-tokens-css 生成（按所选组件库）
├── styles/tokens.css           # 由 Layout IR / Visual IR 生成
├── styles/app.css              # region 级微调（非替代组件库样式）
├── visual/gate.ts              # isVisualGate()
├── generated/
│   ├── visual-ir.json
│   ├── screenConfigs.ts
│   └── assetManifest.json
├── blueprints/
├── components/chrome/
├── config/navIcons.tsx         # 优先 <img src="/assets/...">
├── pages/                      # Blueprint 页（全屏）
└── templates/ResourceListPage.tsx   # list 屏模板（同样进全屏闸门）
```

## 屏模板与 Blueprint

全屏闸门：`spec.screens` 中每个屏（type = chart/list/form/detail/modal；chrome 不单独跑）都进闸门。Blueprint 由 `generate-blueprints.mjs` 从 App Spec + Layout IR 生成，含：

- `layout.regions[]`：`id, padding, gap, width, height, font, color`（由 Layout IR 生成）
- `sample`：闸门冻结用的样例（来自 Figma 真实文本提取）

list 屏可走 `ResourceListPage` 模板渲染，但同样进全屏闸门与还原轮次（逐页截图对比）。

## 视觉闸门（验收必过）

对照 `imports/figma/screens/`，由 `npm run visual:gate` 自动打分，报告在 `artifacts/visual-diff/score.json`：

- **视口与坐标一律取 IR**：截图视口 = Layout IR 的 `frame.w/h`（不要在任何地方写死视口或帧尺寸）
- 阈值全部取仓库根 `.env`（脚本内 `loadRootEnv` 注入，显式 export 优先），**四腿独立判据**：
  1. **SSIM ≥ `VISUAL_SSIM_MIN`** —— 结构崩塌检测（行错位/单列错排）
  2. **mismatch < `VISUAL_MISMATCH_MAX`** —— 像素保真（高对比差异）
  3. **平坦底色漂移 ≤ `VISUAL_FLATBG_MAX`**（弹窗 `VISUAL_FLATBG_MODAL_MAX`）—— 低对比度盲区（卡片底/容器填充）
  4. **几何腿** `npm run visual:geom` —— 见下
  - 前三条**同一屏同时满足才算 PASS**（旧 OR 口径已废弃：单腿达标即可过闸会对留白页假阳性）
- **几何腿（独立脚本）**：前三条**全是全屏像素统计量**——它们衡量「整幅画面有多少像素变了」，对「某个控件尺寸/位置错了」这类偏差**结构性失明**（控件窄几十像素只体现为极细的边框位移与白底缩水，占整屏像素比例极小，三腿可全过，只有人眼看得出）。故补一条判据维度完全不同的腿：把 Layout IR 的**控件框**与运行时 DOM 的输入控件逐框配对，断言 `|dx| |dy| |dw| |dh| ≤ VISUAL_GEO_TOL`。判据全从 IR 派生，**无按屏配置、无业务硬编码**。详见下「表单几何换算与几何腿」
- **文本腿（独立脚本）**：几何腿只认「带 `stroke` 的 RECTANGLE」——**TEXT 节点不是 rect**，且不覆盖弹窗，于是文本级偏差零覆盖。故再补一条：把 IR 的 `TEXT` 节点（含 `font.size`/`font.color`）与运行时 DOM 的文本盒逐节点配对，断言位置 / 字号 / 颜色 / 数量。详见下「文本级还原纪律与文本腿」
- **数据腿（独立脚本，非 gate 模式）**：前四条腿都在 gate 模式下跑、冻结 Blueprint `sample`，它们测的是「**实现是否忠实于 IR**」，**与真实接口 / 数据库无关**——于是「种子里没有窗口数据 / 映射层没产出派生字段 / 前端样例兜底」可以永远绿灯。故补一条**非 gate** 的腿：`npm run visual:data`（闭环 + 回填 + 活数据），断言聚合序列非空且非平坦、派生字段与关联表交叉一致、DOM 真的渲染了这些值。详见下「数据链路与活数据闸门」

  第 3 腿的由来见下「区块容器」事故：`pixelmatch` 的色差阈值只统计超过阈值的像素，低对比度色对（浅色底 vs 画布底）在其统计里**结构性失明**，单靠前两腿会假阳性放行。
- **宽视口自适应锁定**：同一屏在原型帧宽与 `VISUAL_WIDE_WIDTH` 下量同一批 DOM 框，要求 ①无横向溢出 ②内容铺满可用宽度（右侧只留 body padding，`VISUAL_FILL_TOL`）③**纵向骨架不变**（每框 y/h 与原型帧一致，`VISUAL_WIDE_TOL`）。即「只横向自适应、不纵向重排」。弹窗为固定尺寸对话框：只校验尺寸不变 + 水平居中（`VISUAL_MODAL_CENTER_TOL`）
- 登录：env `GATE_ADMIN_EMAIL` / `GATE_ADMIN_PASSWORD` 或 `spec.seedAdmin`；localStorage key 取 `spec.auth.storageKey`
- mask（图表区等）：`fixtures/<slug>/gate-masks.json` → `{ [screenId]: [{x,y,w,h}] }`
- 诊断产物：`<屏>.diff.png`（高对比差异热力图）、`<屏>.flatbg.png`（低对比底色错，洋红标注）、score.json 的 `lowContrast` 段
- 未跑 gate 或分数不达标，不得宣称生成完成

> **事故沉淀（两次口径）**
>
> 第一版（已被用户否决）：把内容区钉成固定宽度以换取「原型帧宽下逐像素对齐」。用户在更宽的屏幕上看到右侧大块空白 → 否决。
>
> **现行口径（用户明确要求）**：**宽度不得写死，页面必须自适应屏幕宽度**。内容区**不加 `max-width`**，随窗口铺满；布局宽度一律用相对单位（`fr` / `%`），需要复刻原型内部比例时用**原型比例**表达——比例 = IR 实测段宽 ÷ 卡内宽，**由生成器/脚本算出，禁止手写百分比**（手写就是把本项目几何硬编码进另一个项目）。⚠️ 注意区分「控件宽」与「列宽」：把控件宽当成列宽是「表单窄化」事故的根因（见下「表单几何换算」）。
>
> 闸门语义随之从「宽视口几何不得变」改为「**宽视口只许横向铺满、不许纵向重排**」：量 DOM 框 —— 无横向溢出 + 内容铺满 + 每框 y/h 与原型帧一致；弹窗（固定尺寸对话框）只校验尺寸不变 + 水平居中。代价：宽屏卡宽会大于原型，这是「不写死宽度」的必然结果。
>
> 另：阈值必须经 `loadRootEnv` 真正加载——曾发生过 `.env` 里的阈值无人加载、闸门静默回落代码默认值（更松）的事故，故阈值缺失一律视为闸门失效。

## Layout IR 完整性（硬规则）

> **事故**：某 list 屏的 `layout-ir/<id>.json` 在抽取时静默缺失（missing 只 `console.warn` 后继续），`blueprints/<id>.json` 随之成为残片；codegen 无几何支撑，样式全凭手写——图例、配色、网格与单元格几何全面偏差，SSIM 大幅下跌。补齐 IR 重写后才过闸。

**每个业务屏（spec.screens 中 type ≠ chrome）的 Layout IR 必须逐屏齐全且退化检测通过，才允许进入 codegen / 还原轮次 / 闸门：**

1. `npm run visual:layout` 输出出现 `Missing frames:` 即为失败（脚本已改为直接 exit 1），必须排查后重跑直到无缺失：
   - fileKey 是否正确（`.env` / summary）
   - 屏名与 `app-spec.json` 的 `screens[].name` 是否**逐字一致**（含全半角、空格）
   - Figma REST 429/5xx 重试后仍失败 → 停下修复，不允许「用已有 IR 继续」跳过缺失屏
2. **进还原轮次/闸门前自检**：`npm run visual:doctor -- --quick` 必含「✅ Layout IR 完整性」；
   报 `IR 缺屏: <id>` 或 `IR 退化（无 tree/texts）: <id>` 时先重跑 `visual:layout`，不得带病进入
3. **codegen 前置断言**：写任何屏的页面代码前，先确认 `fixtures/<slug>/layout-ir/<id>.json` 存在且 `tree` 非空；
   没有 IR 几何就不允许写该屏的样式与布局（否则就是「凭感觉」，闸门必挂）
4. **残缺 Blueprint 视为 IR 缺失信号**：`blueprints/<id>.json` 若只剩片段，说明上游 IR/生成链断了，先修数据链再改代码，不要对着残片硬编码

**IR 是唯一几何来源**：屏内任何尺寸/颜色/间距/文案样式，逐项以 `layout-ir/<id>.json` 的 `tree`/`texts`/`icons` 为准。禁止「组件库默认样式差不多就行」。

## 弹窗还原纪律（硬规则）

> **事故**：某批弹窗写成了组件库的默认表单形态（vertical），而原型是横向表单（标签右对齐在控件左侧固定列、控件定宽）；行内提示从控件右侧小字变成下方整行，并排控件、勾选标签、灰底预览容器全丢。且截图脚本只截路由页，**modal 屏从未进还原轮次/闸门对比**，偏差直到人工看图才暴露。

**根因两层，防再犯也分两层：**

1. **代码层根因——脱离 IR 几何写屏**：弹窗按组件库默认习惯手写，未对照 `layout-ir/modal-<id>.json` 逐项核。预防：**弹窗与页面同一硬规则——没有 IR 几何不许写屏**。写弹窗前先读 `layout-ir/modal-<id>.json`，逐项落 label 对齐方式与列宽 / 控件起点与宽高 / 行节距 / footer 按钮位置。同模板弹窗新写时必须先对照已过闸门的同模板实现。
2. **流程层根因——闸门盲区**：modal 屏进了 app-spec（含 `modal.trigger`），但截图/对比脚本不消费，闸门对弹窗失明。预防（已工具化）：
   - **截图链路必须覆盖 modal 屏**：`capture-screens.mjs` 读 `app-spec.screens` 的 `type:"modal"` 条目，按 `modal.trigger` 点击打开弹窗、截 `.ant-modal-content`，命名与标杆图一致，进还原轮次对比；`visual-gate.mjs` 同理（trigger 打开 → clip 弹窗内容 → compare）。
   - **对齐基准必须一致**：Figma 导出的弹窗标杆图含阴影余量（外沿白边），运行时截图是内容本体——余量不一致会被 `fitPng` 拉伸成全图条带错位（每行恒定红像素的特征信号）。运行时截图后必须按同一余量补齐再比；余量从 IR 的 shadow 派生（`shadowPad`），**不要写死**。
   - **doctor 自动检查**：`visual:doctor` 含「✅ 弹窗闸门覆盖」项——modal 屏缺 `modal.trigger` 直接报错，不许带盲区进还原轮次/闸门。
   - **标杆余量特征速查**：若实际截图与标杆尺寸差恒定值，先查阴影/白边余量，不要先改布局。

**弹窗还原 checklist（写弹窗前过一遍）：**

- [ ] 读过 `layout-ir/modal-<id>.json`（frame 尺寸、每行控件坐标/尺寸、行节距、footer 按钮位置）
- [ ] 表单布局方向与 IR 一致（horizontal / vertical、label 对齐与列宽全部照 IR，不套组件库默认）
- [ ] 行内提示、并排控件、标签式勾选等特殊形态以 IR 为准，不用组件库默认形态
- [ ] 弹窗字段文案以 `figma-fields.json` 弹窗屏条目逐字核对
- [ ] 跑 `npm run visual:round` 确认该弹窗出现在对比清单里且 PASS（盲区自证）

## 区块容器/卡片底色还原纪律（硬规则）

> **事故**：某 chart 屏的一个区块整体与原型不符——运行时是**一张大卡片**，指标数字浮在卡片底上；原型是**画布上的若干独立色块**（各自带圆角、彼此留缝），块边界清晰可见。

**根因两层：**

1. **代码层——按「同类栅格单元」类比推容器，没回 IR 求证**。IR 里该区块**根本没有卡片容器**：那些色块矩形是页面 frame 的**直接子节点**，与标题文本、图标并列；而相邻的图表卡则是自带 `fill` 的实例。实现时按「图表区几格应该长得一样」给这一格也套了卡片底 → 色块叠卡片、边界消失。
   连带第二个偏差：该区块标题图标相对区块左缘的内缩与相邻卡片的内边距不同，未按 IR 计算。

   **判据（写屏时逐条过）**：写任何区块前，先在 IR 里找它的容器——
   - 有带 `fill` 的父节点 → 用那个 fill（含 radius）
   - **没有带 `fill` 的父节点 → 必须透明，不得加卡片底**

   **「IR 里没有容器节点」是设计信息，不是缺失信息**——这正是最容易丢的一类还原点：
   它不体现为「多了/少了什么」，而体现为「底色该不该有」。

2. **工具层——低对比度差异是旧闸门的结构性盲区**。该偏差**同时骗过两条腿**：`pixelmatch` 的阈值是**色差门槛**，只统计色差 ≥ 阈值 的像素；低对比度色对（浅色块 vs 画布底）的亮度差远低于阈值 → 这些像素在 mismatch 统计里**等于不存在**（甚至 bug 版比修复版还低）；SSIM 又被整屏百万级像素稀释，未触发阈值。把阈值降到很低信号才出现。即**「阈值高于色差」= 结构性失明**，加多少张截图都没用。

**更一般的一课（表单事故再次印证）**：**「全屏统计量」对「局部几何偏差」天然失明**——不只是低对比度。极细的边框位移 + 白底缩水只占极小比例像素：SSIM 被整屏稀释、mismatch 不到阈值、flatBg 只看「改色」不看「位移」。**排查这类问题的第一步不是调阈值，而是问「我的判据测量的是哪一维」**；维度缺了就加一条语义明确的腿（几何腿），而不是把像素腿调得更紧（真 MSSIM 不可达，调紧只会制造噪声与假阴性）。

**防复发（已工具化）：**

- **第三条闸门腿 `flatBgDrift`**（`scripts/lib/pixel-metrics.mjs`，`visual-gate` 与 `visual-compare` 共用）：只在「标杆为平坦色块」处（邻域亮度极差极小，文字笔画一律排除）要求运行时同色，容差收紧。
  **只看底色/容器填充，不看文字渲染**，因此噪声低。诊断图 `artifacts/visual-diff/<屏>.flatbg.png`（洋红=标杆平坦底色被改色）。
- **试过但放弃的判据**（避免后人重复踩坑）：全局「边缘一致性 / 长直线」不可用——文字抗锯齿令全屏 missRate 基线本身就很高，信号淹没在基线里，无法全局定阈值。结论：必须用「只看平坦底色」这种有明确语义的判据，而不是全局梯度统计。
- **阈值不得静默回落**：`visual:doctor` 含「✅ 低对比度盲区闸门（flatBg）」——校验 flatBg 相关阈值都在 `.env` 里（缺一条就报错），并确认度量可用。否则阈值缺失 → 回落代码默认值 → 闸门再次失明。
- **度量自检**：`npm run visual:gate -- --calibrate` 打印度量自检——对照（同图）应 0%、合成事故（半幅画布被吞）应约半幅，失败即报「已失明」；并给出基线上限与建议阈值。

**写屏 checklist（每个区块过一遍）：**

- [ ] 该区块在 `layout-ir/<id>.json` 里的**容器节点**是谁？它带 `fill` 吗？
- [ ] 无 `fill` 容器 → 我的实现**没有**加卡片底/背景色（透明）
- [ ] 有 `fill` 容器 → 我的背景色 = IR 的 fill（含 radius）
- [ ] 区块标题/图标的**左内缩**照 IR 算（不要沿用同类卡片的内边距）
- [ ] 跑 `npm run visual:gate` 后该屏 `flatBg` 腿为 PASS；FAIL 就看 `<屏>.flatbg.png`

## 表单几何换算与几何腿（硬规则）

> **事故**：某 form 屏「*看起来*还原了」——字段齐全、KPI 正确、保存按钮位置对，像素闸门三条腿全部 PASS。但整张表单**明显窄于原型**、输入框右端够不到卡片内缘，用户看到「右侧一大块空白」。

**根因一（代码层）：把 IR 的「控件宽」当成了「列宽」**

IR 里一行是**四段**：`label 宽 + 段间距 + 控件宽 = 列宽`；两列 + 列距 = 卡内宽。
实现写的却是「控件宽 ÷ 卡内宽」当列百分比——**把控件宽当成了列宽**。随后组件库的 label 又从这列里吃掉一段 → 控件被二次压窄。
第二处错误：全宽行用被压窄的列和手算 `width` 百分比 → 全宽输入框也窄。
**偏差是「控件宽当列宽 → 再从列里扣 label → 再拿压窄的和算全宽」三次换算叠出来的**，所以单看每一处都「差不多」，合起来就很显著。

**根因二（工具层）：三条像素腿全是全屏统计量，对「尺寸/位置」偏差结构性失明**

控件窄了几十像素，在整屏百万级像素里只体现为极细的边框位移与白底缩水，占比极小：mismatch 无区分度（bug 版甚至略高）、SSIM 未触发阈值、flatBg 只测「改色」测不到「边缘位移」。**结论：缺的不是更严的阈值，是判据的维度。**

**防复发（已工具化）：新增几何腿 `npm run visual:geom`**

`scripts/check-geometry.mjs`：

1. **目标屏自动派生**：IR 里存在「控件框」的非 chrome/modal 屏（新屏自动纳管，无按屏配置）
2. **控件框判据**：从 IR 派生（描边矩形 + 尺寸区间过滤）→ 小尺寸描边按钮被排除；KPI/卡片无 `stroke` 天然排除；
   **只看 `stroke` 不看 `fill`**（原型里搜索框可能无填充，只认填充色会漏掉）；**方形框排除**（原型里的方形「上传/头像」投放区是无值图片占位，DOM 侧无对应控件，会把配对错位一格）
3. **坐标换算**：IR 的 `box` 是画布绝对坐标 → 减 `frame.x/y` 得 frame 相对坐标（与 DOM 视口坐标同一坐标系）
4. **DOM 侧**：输入控件选择器集合，**取最外层去嵌套**（包装器内含内层 input，重复计数会让配对错位）
5. **配对与断言**：两侧按 `(y, x)` 排序后**一一配对**（数量必须相等），逐框断言
   `|dx| |dy| |dw| |dh| ≤ VISUAL_GEO_TOL`。报告 `artifacts/visual-diff/geometry.json`
6. **接线**：已挂 `visual:all` / `visual:round`；`visual:doctor` 含「✅ 几何闸门（IR↔DOM 控件框）」
   （校验 `.env` 有 `VISUAL_GEO_TOL` + **判据未失明**：存在 form 屏却解析不出任何控件框即报错）

**有效性自证（防「加了闸门其实没用」）**：拿事故版 CSS 复跑 → 该屏控件框应**全部报错**、闸门 FAIL；修复版应 PASS。
这条腿上线后旋即抓到同类缺陷（另一个 list 屏的筛选条：裸 `<Input>` 未命中包装器类选择器，退回组件库默认高度与宽度，并把后续下拉整体左移；`Select` 容器高度未一起钉，selector 被 `!important` 拉高后从容器顶部溢出）——**像素腿本来就是 PASS，人眼与像素闸门都看不出这类缺陷**。

**写 form/list 屏的几何换算 checklist：**

- [ ] 把 IR 那一行**拆成段**：`label 宽 + 段间距 + 控件宽 = 列宽`；**列宽必须含 label**，禁止把控件宽当列宽
- [ ] 全宽行用 `grid-column: 1 / -1` 让浏览器 stretch，**不手算百分比**
- [ ] label 右对齐留白表达为「label 容器宽 = label 宽 + 段间距 + `padding-right: 段间距`」，不用组件库默认 labelCol
- [ ] **组件库默认尺寸 ≠ IR**：`Input`/`Select` 默认高度通常小于 IR；`Select` 容器高度必须与 `.ant-select-selector`
      **一起**钉（只改 selector 会从容器顶部溢出）；裸 `<Input>` 的样式要单独写（包装器类选择器命中不到）
- [ ] 跑 `npm run visual:geom`，该屏控件框逐框 PASS

**已知边界（别以为绿了就没事）：**

- 只断言**输入控件框**的 x/y/w/h；卡片/容器高度、文本基线、图标位置仍只有像素腿兜底
- **modal 屏仍不单独跑几何腿**（需 `modal.trigger` + 同坐标系），弹窗控件框由宿主屏壳内断言；
  **弹窗的文本与控件值已由文本腿 `visual:text` 覆盖**（它是唯一进弹窗的腿）
- 判据依赖「IR 里存在带 `stroke` 的控件 rect」：原型本就没有输入控件的屏，几何腿对该屏空转——会打印屏数，**不会假装通过**

## 文本级还原纪律与文本腿（硬规则）

> **事故**：某批弹窗**全部通过像素闸门**，但显微镜下逐项都是错的：

| 缺陷（用户肉眼能看到） | IR 事实 | 实现做了什么 | 根因类别 |
|---|---|---|---|
| label 文本整体偏移 | 文本右缘 + 星号间距 = IR 固定值 | 组件库 label 自带间距，我们又「补」了一次 | **双重间距**：给组件库已经给过的间距再「补」一次 |
| 非必填 label 偏移 | 非必填与必填右缘不在同一网格 | 「关闭冒号」并未真正移除组件库的 `::after`，只把内容换成空格并保留 margin | 组件库的「关闭」≠「移除」 |
| 控件文本字号/位置偏 | IR 指定 `font.size` / `font.color`，且文本不是垂直居中 | 取了组件库默认字号 + 主题色 | 组件库默认字号/颜色 ≠ IR |
| 某深色文本被渲染成灰占位符 | 深色 = **值**，不是占位符 | 用 `placeholder` → 组件库灰（alpha） | **语义误判**：IR 的深色文本可能是「值」 |
| label 左溢出 | 文本放不下时 IR 让星号**换行** | 没设换行 → 单行放不下就左溢出 | **换行本身也是几何**：放不下时 IR 怎么摆必须照抄 |
| 末行多一条边框 | 末行只有 TEXT、**没有描边矩形** | 末行仍带 `border-bottom` | 「IR 里没有这个矩形」是**设计信息**（同「区块无容器」） |

**为什么三条像素腿 + 几何腿全都没抓住（结构性原因，不是阈值不够严）**

| 腿 | 为什么失明 |
|---|---|
| `mismatch` | 只统计超过色差阈值的像素；文本 ink 只占弹窗极小比例像素。**整列位移 + 字号变化在这条腿里几乎不存在** |
| `SSIM` | 被弹窗整图稀释，仍在阈值之上 |
| `flatBgDrift` | 只测「标杆的平坦底色是否被**改色**」，测不到**文本位移** |
| `visual:geom` | 判据是「带 `stroke` 的 **RECTANGLE**」——**TEXT 节点不是 rect**；且不覆盖 modal 屏 → **弹窗文本双盲区** |

**根因归类（三类，可迁移到任何「组件库 + 原型」的场景）**

1. **组件库的隐式默认**：这些缺陷**全部来自「我们没写的那些属性」**——冒号占位、label 的 flex gap、默认字号、占位符 alpha、默认控件高度、中文按钮自动插空格、`::after` 的 margin。**且「关掉/补上」都必须实测验证**（「以为关掉了其实没有」是典型反例）。
2. **IR 的「非文本」信息**：IR 里「没有边框」「没有容器底」「星号换行」「文本是深色（值不是占位）」都是**设计信息**，它们不表现为「多了/少了什么」，最容易漏。写屏前要把 IR 节点的 `(x, y, w, h, font.size, font.color)` 当**验收清单**逐项对，而不是「看起来差不多」。
3. **判据维度缺失**：像素统计看不见文本级偏差（见上表）。→ 补**文本腿**。

**防复发（已工具化）：`npm run visual:text` → `scripts/check-text.mjs`**

1. **IR 侧**：`type === "TEXT"` 且文本非空的节点 → `(x,y,w,h)` + `font.size` + `font.color`；
   坐标换算成 frame 相对值（弹窗 = 相对弹出框左上，与 DOM 取 `.ant-modal-content` 同源）
2. **DOM 侧**：按 **`parentElement` 分组**的文本节点（同一父元素内的文本节点**拼接为一个测量单元**——
   这样 IR 里一个带 `\n` 的 TEXT 节点、DOM 里的多个文本节点、`white-space` 换行都能对齐）；
   `Range` 盒给 `(x,y,w,h)`，computed style 给 `font-size`；**SVG 用 `fill` 上色**（图表文字在 SVG 里，读 `color` 会假报「颜色不符」）
3. **匹配**：文本归一化（去**全部**空白）后按**多重集 + 位置最近**配对（同名文本不会配错），
   数量必须相等 —— **DOM 多出来 = 组件库多渲染了东西**（默认冒号就是这么抓住的），
   **IR 有但 DOM 没有 = 该还原的文本没落**
4. **断言**：`|dx| |dy| |dw| ≤ VISUAL_TEXT_TOL` + `|Δfont-size| ≤ VISUAL_TEXT_SIZE_TOL` + 颜色全等
   - 容差不为 0：IR 文本盒（Figma 字面行框）与 DOM `Range` 盒（CSS line box）的 y 起点有度量约定差；
     容差是噪声地板，而事故缺陷是明显的整列位移与字号差 → 仍全部命中
   - **不断言 `h`**：IR 文本盒高 = Figma 字面行框，DOM `Range` 高 = CSS `line-height`，二者语义不同
     （多处 `line-height` 有意大于字号）→ `y` 比**中心**
   - **颜色比较必须把 alpha 合成到白底**：组件库占位符常带 alpha，丢 alpha 会得到纯黑/纯色，
     而它在白底上的实际观感是浅灰 = IR 的占位色，否则误判成「颜色错」
5. **控件内文本走「控件值断言」**：IR 里落在控件框内的 TEXT → 取 DOM 控件的值/占位符
   （`<input>` 的值**不是文本节点**、Select 里还有值恒为空的隐藏搜索框，取值顺序错了会读成空串）
   + computed `font-size`/`color`；**位置由几何腿负责**
6. **豁免（框架通用规则，非按屏配置）**：
   - `*`（必填星号由 CSS `::after` 渲染，DOM 里没有文本节点）
   - **单字符且非中英文数字**的文本（原型里这类就是图标字形，实现侧是 SVG）
   - **中心落在某个 `<canvas>`/`<svg>` 矩形内**的 IR 文本（图表标签由图表库自己画，归像素腿；
     用 DOM 的图形层矩形判定，**不写死图表区坐标**）
7. **接线**：`npm run visual:text`；`visual:doctor` 含「✅ 文本闸门（IR TEXT ↔ DOM 文本盒）」
   （校验 `.env` 有两条文本容差 + **判据未失明**：有屏却解析不出任何 TEXT 节点即报错）；报告 `artifacts/visual-diff/text.json`

**有效性自证（防「加了闸门其实没用」）**：补这条腿后应立刻回抓出闸门前已存在的同类缺陷（否则说明判据失明）；修完后弹窗文本节点应全部落在容差内。

**已知边界（别以为绿了就没事）**

- 文本腿只覆盖 **HTML 文本**；SVG/canvas 里的文字归像素腿（图表标签）
- 已清完全屏挂起差异，故 `visual:text` **已并入** `visual:all` / `visual:round` 的阻断链路——此后任何文本级偏差都会让每轮 FAIL（这正是目的：**像素 PASS 从不等于文本还原到位**）

## 页面层零硬编码（硬规则）

> **事故**：页面/组件把「生成物里已有的东西」又抄了一份——色值直接写十六进制、冻结样本在页面里再声明一遍常量、屏名/品牌/侧栏条目标签写在 JSX 里当字面量。后果有三：① 生成物改了页面不跟着变（两份真相，必然漂移）；② 闸门比的是生成物那份，页面那份永远测不到；③ 新项目照抄页面代码时，把上一个项目的业务值一起带过去。

**规则：页面/组件只允许「消费生成物」，不得复述业务文案与设计值。**

- 色值 → 生成 tokens（IR 派生），不写十六进制
- 冻结样本 → `screenConfigs[].sample`（spec 声明 → codegen 下发），页面不声明自己的副本
- 屏名 / 品牌 / 侧栏条目 → `screenConfigs` 的派生出入口（`brand` / `sidebarItems` 等），不写标签字面量
- 屏配置 → 按**路由**取（`getScreenByRoute`），不按屏名 `find`

**防复发（已脚本强制）**：`visual:doctor` 的「页面层零硬编码」逐行扫描 `apps/web/src/pages`、`apps/web/src/components` 下的 `.tsx/.ts`，命中即报错；判据 = ① 十六进制色值字面量 ② 按屏名 `find` ③ 业务文案副本（spec 的屏名/品牌/sample 叶子 + 侧栏条目标签，通用词与 chrome 结构名已豁免）。**与文档腿同源**：文案判据都从 `fixtures/<slug>/*.json` 派生，脚本自身不含业务值。

**有效性自证（防「加了闸门其实没用」）**：把任一生成物的值抄回页面（如把侧栏标签写回组件、把样本常量写回页面）后复跑应立刻报错；恢复为消费生成物后应全绿。

## 数据链路与活数据闸门（硬规则）

> **事故**：三处「有标签、无数据」同时出现——统计屏的 KPI 与折线全为 0、柱图退化成等值占位；列表屏的关联列整列为空；日历屏格子里只有日期、没有关联名称。而**三条像素腿 + 几何腿 + 文本腿全部 PASS**：闸门跑在 gate 模式（`?visualGate=1`）下、冻结的是 Blueprint `sample`，与真实接口 / 真实数据库**完全无关**——真数据链路断了，闸门可以永远绿灯。

**根因（前三层在数据链，第四层在工具链）**

| 层 | 根因 | 表现 |
|---|---|---|
| 种子数据 | 时间窗口类数据用**绝对历史日期**写死；聚合按「本月 / 近 N 天 / 今日」以**当前日期**过滤 → 窗口里 0 行 | 折线贴底、KPI 为 0；生成当天「看着对」，换一天 / 换机器必然空 |
| 后端响应 | CRUD 映射层（`toMap()` 等）只映射实体自身列，**没有按 spec 的 `relations` 做计数 / 关联取值** → 字段在 JSON 里根本不存在 | 关联列整列为空；日历屏无关联名称 |
| 聚合实现 | 统计接口是占位（常数 / 近似均分），没有按窗口过滤与分组；或 `stats` key 与聚合 key 各写一套 | 柱图全等值（**均分占位信号**）；KPI 与图表口径不一致 |
| 前端兜底 | 页面用样例常量 + 合并兜底，空响应被样例「接住」 | 缺陷不表现为空白、而表现为**假数据**——比空白更难发现 |
| 工具链 | `visual:data` 原只断言「`stats` key 在后端源码里存在」+「form/detail 屏 DOM 非空」；**chart 屏序列是否非空 / 非平坦、list 屏关联列是否等于关联表实际行数**无人断言 → **接口返回 0 也过闸** | 同几何腿 / 文本腿的教训：缺的不是更严的阈值，是判据的**维度** |

**为什么必须另开一条腿**：像素腿 / 几何腿 / 文本腿都在 gate 模式下跑、冻结 Blueprint `sample`——它们测的是「**实现是否忠实于 IR**」，不是「**真实数据链路是否通**」。数据链路的判据只能来自「spec 声明 + 真实接口 + 真实 DOM」，所以必须是**非 gate** 的独立一条腿。

**防复发（声明式数据契约 + 活数据闸门）**

1. **数据契约进 spec，不进页面**。关系字段与聚合在 `app-spec.json` 里声明，由 codegen 生成真实实现；页面不许自己编样例。

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

   - `count`：源实体每行该字段 = 目标实体中 `targetField === 源行 sourceField` 的行数
   - `lookup`：源实体该字段 = 目标实体中 `targetField === 源行 sourceField` 那行的 `valueField`
   - `window`：以统计实体的 `dateField` 与**当前日期**比较（`month` / `last7` / `today` / `all`）

2. **时间窗口类种子必须用相对日期**：spec 里写**相对偏移**（如 `{ "$dayOffset": N }`），由 codegen 求值成「当前日期 + N」后落库；**禁止**用绝对历史日期充当窗口数据。偏移要**同时覆盖窗口内与窗口外**，否则「窗口过滤」本身没被验证（把窗口逻辑删掉也照样全绿）。
3. **响应必须含 spec 声明的派生字段**：映射层由 codegen 按 `relations` 注入（`count` 走目标 repository 计数、`lookup` 走目标 repository 取 `valueField`）。**不得**以「前端自己算 / 前端维护映射表」替代——前端算出来的关系值无法与后端数据交叉验证，也躲过了本闸门。
4. **前端禁止静默兜底**：非 gate 模式一律绑定真实接口；**禁止**样例 fallback、**禁止** `?? 0` 这类把缺字段抹平——缺字段必须在闸门里暴露，而不是被兜底掩盖成「看起来有值」。
5. **`stats` / `charts` key 必须与后端闭环**：key 由 spec 声明、后端按同一 spec 产出；接口缺字段就补后端。
6. **活数据闸门**（`npm run visual:data` 的第三条腿 → `scripts/check-live-data.mjs`，**非 gate**、真实接口 + 真实 DOM）：
   - **A 聚合非空且非平坦**：`dashboard.charts` 每条序列 `labels` / `values` 等长、求和大于 0、且**不同值多于一个**（全等 = 均分 / 占位信号）
   - **B 派生字段交叉验证**：`count` 逐行与「目标实体按 `targetField` 分组的实际行数」**交叉求和**一致（只断言「字段存在」不够）；`lookup` 在外键非空时派生值必须非空、且与目标行一致
   - **C DOM 实测**：统计屏的每个 KPI / 图表值、列表屏每行的派生字段值、日历类屏至少一个关联值，必须出现在页面文本里（接口有值、页面没绑也算失败）
   - **有效性自证**：改动 spec 的 `relations[].field` / `dashboard.charts[].key` 后复跑**必须 FAIL**（否则判据失明）
7. **doctor 必含「✅ 活数据闸门」**：校验脚本存在、**已挂入 `npm run visual:data`**（脚本存在但不跑 = 闸门失效）、且判据未失明（spec 声明了 `relations` / `dashboard` 却无可打开的路由屏即报错）。

**写数据链路的 checklist：**

- [ ] 该屏的关联列 / 聚合在 `app-spec.json` 里有声明（`relations` / `dashboard`），**不是页面里手写的**
- [ ] 时间窗口类种子用相对偏移且**窗口内外都有行**；无绝对历史日期充当窗口数据
- [ ] 映射层确实产出声明的派生字段——**用接口响应核对**，不靠「我写了这段代码」假定
- [ ] 前端非 gate 模式无样例兜底、无 `?? 0`
- [ ] `npm run visual:data` 第三条腿 PASS；FAIL 看 `artifacts/visual-diff/live-data.json`
- [ ] 改了 spec 的 `relations` / `dashboard` 后复跑闸门（确认判据没被一起改坏）

## 还原轮次（第一版全栈之后必做）

每轮：

1. `npm run visual:doctor -- --quick`（含 **Layout IR 完整性**、**几何/文本闸门**、**活数据闸门**、**单趟 DOM 采集**、**流水线预算打点**、**流程文档零硬编码**、**页面层零硬编码**）必须全绿后才继续
2. `npm run visual:round`：**单趟采集**（一个会话把全部屏含弹窗导航一遍 → 截图 + DOM 快照）→ 与 `imports/figma/screens/` 对比输出热力图 + 差异 JSON → **宽视口锁定**（同一屏原型帧宽 vs `VISUAL_WIDE_WIDTH` 截同一区域互比，防还原轮次里改出宽屏拉伸）→ `visual:gate`（宽锁）→ `visual:data` → **`visual:text`** → `visual:geom` → **`dev:up`（服务就绪闸，幂等：收尾必然留下可访问的 api + web）**。各腿都改由快照消费，**不再各自 launch 浏览器**（重复导航曾是轮次最大开销）
2a. **文本腿已并入第 2 步**（`visual:round` / `visual:all` 都含 `visual:text`）：IR TEXT ↔ DOM 文本盒，抓像素腿与几何腿都看不见的文本级偏差。**它是阻断项**——出现偏差即每轮 FAIL，须当场修
3. **列出差异表并修复代码**（字段文案 + 页面几何/token/组件）：

   | 屏 | 类型（字段/页面） | 差异 | 拟改文件 |
   |---|---|---|---|

   > 差异表必须含 `visual:text` 报告的条目（文本位置/字号/颜色/DOM 多出/IR 缺失），
   > 不能只列像素分数不达标项——**像素 PASS 不等于文本还原到位**

4. 重截已改页，确认本轮差异已关
4a. **收尾：`npm run dev:up`**（幂等，服务就绪闸）——提问前必须确认 api + web 都在跑：轮次结束时服务若已停，用户点开就是打不开的站点，下一轮也无从开跑。已在跑则跳过；未跑则**并发**起 api + web（按端口清旧实例）→ 探活，未就绪即 exit 1（先看 `artifacts/dev/*.log`）。`visual:round` 末尾已串联此步，此处显式再跑一次做兜底。
4b. **看耗时：`npm run pipeline:budget`**（逐阶段秒数 + 合计 + 预算判定；超 `.env` 的 `PIPELINE_BUDGET_SEC` 即 exit 1）。某阶段异常慢时先查是不是有腿退回了「各自 launch 浏览器」——`visual:doctor` 的「✅ 单趟 DOM 采集」会拦这类回退。
5. **询问是否进入下一轮还原**（原话）：「本轮字段还原和页面还原已完成。是否进入下一轮还原？」
   - 进入 / 下一轮 / 继续 → 从步骤 1 再跑一轮
   - 不进入 / 结束 / 停止 → 写 GENERATED.md，本阶段结束

未跑完至少一轮、且用户未明确「不进入下一轮」前，不得宣称交付完成。覆盖：导航里每一屏 + 原型弹窗。

## 反模式（禁止）

- **无 Layout IR 支撑写屏**：IR 缺失/退化时手写布局样式、对着残缺 Blueprint 硬编码
- **按「同类栅格单元」类比推容器底色**：不回 IR 求证容器有没有 `fill`，就给区块套上游同类卡片的背景
- **把 IR 的「控件宽」当「列宽」**：列宽必须含 label（`label 宽 + 段间距 + 控件宽`）；全宽行用 `grid-column: 1 / -1`，不手算百分比
- **把业务/设计字面量写进流程文档**：屏名、slug、尺寸、百分比、颜色、凭证一律从 `app-spec` / Layout IR / `.env` 派生；由 `npm run docs:lint` 强制
- **以为全屏像素腿能抓几何偏差**：SSIM / mismatch / flatBg 都是全屏统计量，对「控件尺寸/位置错了」结构性失明——必须由几何腿 `visual:geom` 兜底；缺腿时先问「我的判据测量的是哪一维」，不要调紧像素阈值
- **以为像素腿/几何腿能抓文本偏差**：几何腿只认「带 `stroke` 的 RECTANGLE」，TEXT 节点不是 rect；文本 ink 占画面比例极小，色差阈值看不见整列位移与字号差——文本位置/字号/颜色/「DOM 多出」必须由文本腿 `visual:text` 兜底
- **在 `package.json` 里再写一份长 `&&` 链路**：链路定义**只有一处**（`scripts/pipeline-timing.mjs`），`visual:all` / `visual:round` 都委托它；多一个入口就多一份真相，且耗时打不上点（预算无从判定）
- **让每条腿各自 launch 浏览器**：同一次页面渲染被导航 N 遍，是还原轮次最大的可避免开销；`visual:capture` 采一趟、各腿消费 `dom-snapshot.json`（纯计算），并带新鲜度哈希防陈旧快照
- **只轮询 DOM 签名判断「渲染完成」**：图表库分阶段渲染，在**数据请求在途**时「只画了坐标轴」的中间态可以静止数百 ms > 阈值 → 快照缺图表值、活数据腿误报。判据必须**同时**要求签名不变**且在途请求归零**
- **把并发度 / 预算写死在脚本里**：并发度（`PIPELINE_CONCURRENCY` / `FIGMA_NODES_BATCH` / `FIGMA_NODES_CONCURRENCY` / `FIGMA_TEXT_BATCH`）与预算（`PIPELINE_BUDGET_SEC`）一律从 `.env` 读，实现走通用池（无业务值）
- **以为闸门全绿就说明数据链路通**：像素/几何/文本腿都在 gate 模式下跑、冻结 Blueprint `sample`，测的是「实现 vs IR」，与真实接口/数据库无关；数据链路必须由**非 gate** 的活数据闸门（`visual:data` 第三条腿）兜底
- **用绝对历史日期充当时间窗口数据**：窗口聚合按当前日期过滤 → 命中 0 行，KPI 与图表全空；时间窗口类种子必须用**相对日期偏移**（spec 声明、codegen 求值），且窗口内外都要有行
- **前端样例兜底 / `?? 0` 掩盖缺字段**：缺陷从「空白」变成「假数据」，比空白更难发现；缺字段必须在闸门暴露，不许被兜底抹平
- **只断言「字段存在」不断言「值正确」**：`count` 必须与目标行数**交叉求和**、`lookup` 必须与目标行一致，否则「字段在但恒为 0」照样过闸
- **「关掉/补上」组件库默认值不实测**：关闭冒号没真删 `::after`、label 自带 gap 时再补 margin 就是双倍间距。凡「关闭/补偿」组件库默认值，必须用 DOM 探针实测结果，不能凭「我写了这条 CSS」假定生效
- **依赖 mismatch 抓低对比底色差异**：色差阈值对低对比色对结构性失明；底色/容器填充必须由 `flatBgDrift` 腿兜底
- **凭组件库默认形态写弹窗**：不读 `layout-ir/modal-*.json` 就用默认表单/控件形态
- **闸门盲区交付**：modal 屏未进截图/对比链路就宣称还原完成——还原轮次/闸门前必须看到「✅ 弹窗闸门覆盖」
- 自制 `components/ui/Button|Table|Modal` 替代用户所选组件库
- 把 MCP/Figma 吐出的绝对定位 Tailwind 当最终代码
- 面积启发式取色作为 token 主路径（必须走命名节点 / Layout IR）
- 用组件库图标 / emoji 顶替已导出的 Figma 资源
- 「不追求像素级」作为交付借口
- 在脚本/文档里硬编码业务屏名 / slug / 登录凭证 / 设计几何（一切走 app-spec / IR / `.env`；由 `docs:lint` 强制）
- **轮次收尾不确认服务在跑就提问**：轮次结束时 api/web 可能已停，用户点开是打不开的站点、下一轮也无从开跑。提问前必须 `npm run dev:up`（幂等，已就绪则跳过；未跑则清旧实例 → 后台启动 → 探活）
