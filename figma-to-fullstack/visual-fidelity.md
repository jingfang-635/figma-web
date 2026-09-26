# 前端视觉还原方案

**所有从 Figma 生成的项目启用本方案**（高还原 + 闸门组是验收标准，但 UI 技术栈不是）。目标：视觉不可分辨且可维护——用户选定框架的组件库 + Layout IR 精确几何 + 自动闸门组，而不是手写 CSS 或通用 CRUD 壳。技术栈由用户逐层选择，**无默认**（见 `.cursor/rules/figma-visual-fidelity.mdc`）。

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
闸门组（字段 visual:fields + 视觉像素 visual:gate[三腿 AND：
        SSIM ≥ 阈值 + mismatch < 阈值 + 平坦底色漂移 ≤ 阈值]
        + 几何 visual:geom[IR 控件框 ↔ DOM 框] + 数据 visual:data）
    ↓
还原轮次（字段 100% + 页面 100%；逐页对比 → 列差异 → 修代码 → 询问是否下一轮）
```

| 层 | 职责 | 产出 |
|---|---|---|
| **App Spec** | 数据模型、关系、REST API、路由、screens 全屏清单 | `fixtures/<slug>/app-spec.json` |
| **Layout IR** | 全屏 Frame 几何、资源 nodeId | `fixtures/<slug>/layout-ir/*.json` |
| **Visual IR** | 设计 token、侧栏/顶栏 chrome、屏模板分类、弹窗 | `fixtures/<slug>/visual-ir.json` |
| **Screen Blueprint** | 每屏 KPI/列表/图表/弹窗 + `layout.regions` | `fixtures/<slug>/screen-blueprints/*.json` → `apps/web/src/blueprints/` |
| **生成物** | 可运行前端 | `tokens.css`、主题文件（如 `antdTheme.ts` / `theme.ts`）、`screenConfigs.ts`、Blueprint 页、assets |

**项目差异全部由 `fixtures/<slug>/app-spec.json` 驱动**：全屏清单（`screens`：type = chart/list/form/detail/modal/chrome，全部进闸门）、路由、闸门账号（`seedAdmin`）、localStorage key（`auth.storageKey`）、品牌（`brand.title/subtitle`）。脚本与流程不含业务硬编码。

**禁止**从 Figma 节点直接吐 React/Vue 代码；**禁止**用一套 `ResourcePage` + 自制 Button/Table 覆盖全部业务屏；**禁止**用 ant icons / emoji 冒充已导出的 Figma 图标。

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
3. 回填字段源：逐屏更新 `fixtures/<slug>/app-spec.json` 的 screens 字段（columns/formFields/filters/actions/stats/subtitle/statusMap/sections/formCard/hint），`needsReview` → `false`；schema 缺失字段同步扩展 `schema.prisma` + DTO + seed
4. 重新生成：`npm run visual:extract && npm run visual:gen`
5. 自动核对：`npm run visual:fields` 逐屏断言 config ↔ figma-fields 逐字一致

**通过标准（全部满足）：**

- `screenConfigs.ts` 中 `"needsReview": true` 数量 = 0
- 每屏 columns / formFields / filters / actions / stats / subtitle 与 `fixtures/figma-fields.json` 逐字一致、顺序一致
- 分组/小节标题、hint、statusMap 与原型一致；一屏多表时每个 section 全量存在
- `type: "form"` 屏渲染为表单页（卡片标题 + 保存按钮 + 字段）
- 原型里没有的字段未新增；有的未省略；弹窗字段与弹窗截图一致
- 数据层配套：原型列引用的字段若 schema 缺失，同步扩展 `schema.prisma` + DTO + seed
- `tsc --noEmit`（web + api）通过、`prisma db push` + seed 可跑

## 前端技术栈（按用户选择适配，无硬性默认）

| React 生态常用 | Vue 生态常用 | 用途 |
|---|---|---|
| `antd` / MUI / Mantine | Element Plus / Ant Design Vue | Layout、Menu、Table、Form、Modal、Card、Tag… |
| `@ant-design/icons`（或所选组件库图标） | 组件库自带图标包 | 仅当 Layout IR 未导出对应资源时的回退 |
| `recharts` / `echarts` | `echarts` | 图表页折线/柱状/饼图 |
| `dayjs` | `dayjs` | 日历、日期选择 |

> 组件库与图表/日期库由用户在栈闸门中确定；生成脚本按 `spec.stack.frontend` + `spec.stack.ui` 输出对应主题与页面，不以任何一家作为硬性默认。

入口：按所选组件库配置主题（React antd 为 `ConfigProvider` + 生成的 `theme/antdTheme.ts`；其余框架以对应机制接入）。

## 视觉流水线（必做）

```bash
npm run init:project       # 拉结构 + app-spec 骨架（--slug <slug> --file <key>）
npm run visual:layout      # Layout IR（全屏 Frame 完整子树）
npm run visual:extract     # Visual IR（token 优先读 Layout IR）
npm run visual:shots       # 全屏对照 PNG → imports/figma/screens/
npm run visual:shots:all   # 全量屏 + 弹窗 PNG
npm run visual:gen         # tokens.css + 主题文件 + Blueprint + screenConfigs
npm run visual:assets      # 按 Layout IR nodeId 导出原图
npm run visual:fields      # 字段一致性校验
npm run visual:gate        # Playwright 像素三腿 AND（需 api + web 已启动）
npm run visual:geom        # 几何腿：Layout IR 控件框 ↔ DOM 框逐框断言
npm run visual:round       # 还原轮次：Playwright 截图 + 对比热力图 + data + geom
npm run visual:all         # layout/extract/shots/gen/assets/fields/gate/data/geom
```

闸门跑次：URL 加 `?visualGate=1` 冻结 Blueprint `sample` 数据、关闭动画与滚动条。

**降级**：无 `FIGMA_ACCESS_TOKEN` → 停并提示；REST 429/5xx → 指数退避重试；仍失败则用已有 Layout IR / fallback token，字段标 `needsReview`。

## 前端目录约定

```
apps/web/src/
├── theme/                      # 由 generate-tokens-css 生成（React antd 为 antdTheme.ts，其余按框架）
├── styles/tokens.css           # 由 Layout IR / Visual IR 生成
├── styles/app.css              # region 级微调（非替代 antd）
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

全屏闸门：`spec.screens` 中每个屏（type = chart/list/form/detail/modal；chrome 不单独跑）都进 SSIM。Blueprint 由 `generate-blueprints.mjs` 从 App Spec + Layout IR 生成，含：

- `layout.regions[]`：`id, padding, gap, width, height, font, color`（由 Layout IR 生成）
- `sample`：闸门冻结用的样例（来自 Figma 真实文本提取）

list 屏可走 `ResourceListPage` 模板渲染，但同样进全屏闸门与还原轮次（逐页截图对比）。

## 视觉闸门（像素三腿，验收必过）

对照 `imports/figma/screens/`，由 `npm run visual:gate` 自动打分，报告在 `artifacts/visual-diff/score.json`：

- 视口 **1440×1068**（原型固定帧）
- 阈值取仓库根 `.env`（脚本内 `loadRootEnv` 注入，显式 export 优先），**像素三腿 AND**：
  1. **SSIM ≥ `VISUAL_SSIM_MIN`** —— 结构崩塌检测（行错位/单列错排）
  2. **mismatch < `VISUAL_MISMATCH_MAX`** —— 像素保真（高对比差异）
  3. **平坦底色漂移 ≤ `VISUAL_FLATBG_MAX`**（弹窗 `VISUAL_FLATBG_MODAL_MAX`）—— 低对比度盲区（卡片底/容器填充）
- **第四条腿（几何腿，独立脚本 `npm run visual:geom`）**：前三条**全是全屏像素统计量**——它们衡量「整幅画面有多少像素变了」，对「某个控件尺寸/位置错了」这类偏差**结构性失明**（实测：表单窄 164px + 地址框窄 226px 时 mismatch 1.18% / SSIM 0.868 / flatBg 1.38%，**三腿全部 PASS**，只有人眼看得出）。故补一条判据维度完全不同的腿：把 Layout IR 的**控件框**与运行时 DOM 的输入控件逐框配对，断言 `|dx| |dy| |dw| |dh| ≤ VISUAL_GEO_TOL`（默认 3px）。判据全从 IR 派生，**无按屏配置、无业务硬编码**。详见下「表单几何换算」
- **第五条腿（文本腿，独立脚本 `npm run visual:text`）**：几何腿只认「带 `stroke` 的 RECTANGLE」——**TEXT 节点不是 rect**，且它当时显式跳过 modal 屏，于是弹窗里的**文本级偏差零覆盖**。故再补一条：把 IR 的 `TEXT` 节点（含 `font.size`/`font.color`）与运行时 DOM 的文本盒逐节点配对，断言位置 / 字号 / 颜色。详见下「文本级还原纪律」

  第 3 腿的由来见下「区块容器」事故：mismatch 的 `threshold=0.25` 只统计色差 ≥25% 的像素，对 `#FFFFFF` vs `#F5F7FA`（≈3.9%）**结构性失明**，单靠前两腿会假阳性放行。
- **宽视口自适应锁定**：同一屏在 1440 与 `VISUAL_WIDE_WIDTH`（默认 1888）下量同一批 DOM 框，要求 ①无横向溢出 ②内容铺满可用宽度（右侧只留 body padding，`VISUAL_FILL_TOL`）③**纵向骨架不变**（每框 y/h 与 1440 一致，`VISUAL_WIDE_TOL` 默认 1.5px）。即「只横向自适应、不纵向重排」。弹窗为固定尺寸对话框：只校验尺寸不变 + 水平居中（`VISUAL_MODAL_CENTER_TOL`）
- 登录：env `GATE_ADMIN_EMAIL/GATE_ADMIN_PASSWORD` 或 spec.seedAdmin；localStorage key 取 `spec.auth.storageKey`
- mask（图表区等）：`fixtures/<slug>/gate-masks.json` → `{ [screenId]: [{x,y,w,h}] }`
- 诊断产物：`<屏>.diff.png`（高对比差异热力图）、`<屏>.flatbg.png`（低对比底色错，洋红标注）、score.json 的 `lowContrast` 段
- 未跑 gate 或分数不达标，不得宣称生成完成

> **事故沉淀（2026-09-26 · 两次口径）**
>
> 第一版（已被用户否决）：原型是固定 1440 帧、卡尺寸写死（KPI 281×92 / 图表卡 578×259 / 关键指标单元格 263×78），实现用流式 `1fr` 列 + 固定高度，视口 1440 时几何与原型一致（闸门通过），用户 1920 屏上卡被拉成 802 宽、单元格 375×78。当时的修复是 `.app-content { max-width: 1220px }` 把内容钉回原型宽度 + 像素级宽视口锁定。
>
> **现行口径（用户明确要求，2026-09-26）**：**宽度不得写死，页面必须自适应屏幕宽度**。`max-width` 已删除；布局宽度一律用相对单位（`fr` / `%`），需要复刻原型内部比例时用原型比例表达（机构信息双列 `48.94% / 2.12% / 48.94%` = IR 的 554 / 24 / 554 ÷ 1132，其中 **554 = label 88 + 间距 12 + 输入框 454**），这样 **1440 下与 IR 逐像素一致**（改动后 5 屏 SSIM 一字不变），宽屏则按同一比例铺满。⚠️ **454 是输入框宽，不是列宽**——把它当列宽就是「表单窄 164px」事故的根因（见下「表单几何换算」）。
>
> 闸门语义随之从「宽视口几何不得变」改为「**宽视口只许横向铺满、不许纵向重排**」：量 DOM 框 —— 无横向溢出 + 内容铺满 + 每框 y/h 与 1440 一致；弹窗（固定尺寸对话框）只校验尺寸不变 + 水平居中。代价：宽屏卡宽大于原型（1680 → KPI 341×92），这是「不写死宽度」的必然结果。
>
> 另：`.env` 里的 `VISUAL_SSIM_MIN=0.85` 此前无人加载，闸门静默回落代码默认 0.55（旧 `score.json` 记录 `ssimMin: 0.55` 即为证据）——阈值必须经 `loadRootEnv` 生效。

## Layout IR 完整性（硬规则，2026-09-25 事故沉淀）

> **事故**：排班管理屏的 `layout-ir/schedules.json` 在 9/24 抽取时静默缺失（missing 只 `console.warn` 后继续），
> `blueprints/schedules.json` 随之成为残片；codegen 无几何支撑，日历样式全凭手写——图例少 2 项、
> 药丸配色全错、网格/单元格几何偏差，SSIM 跌至 0.5x。补齐 IR 重写后 mismatch 1.3% 通过。

**每个业务屏（spec.screens 中 type ≠ chrome）的 Layout IR 必须逐屏齐全且退化检测通过，才允许进入 codegen / 还原轮次 / 闸门：**

1. `npm run visual:layout` 输出出现 `Missing frames:` 即为失败（脚本已改为直接 exit 1），必须排查后重跑直到无缺失：
   - fileKey 是否正确（`.env` / summary）
   - 屏名与 `app-spec.json` 的 `screens[].names` 是否**逐字一致**（含全半角、空格）
   - Figma REST 429/5xx 重试后仍失败 → 停下修复，不允许「用已有 IR 继续」跳过缺失屏
2. **进还原轮次/闸门前自检**：`npm run visual:doctor -- --quick` 必含「✅ Layout IR 完整性 — N 屏 IR 齐全」；
   报 `IR 缺屏: <id>` 或 `IR 退化（无 tree/texts）: <id>` 时先重跑 `visual:layout`，不得带病进入
3. **codegen 前置断言**：写任何屏的页面代码前，先确认 `fixtures/<slug>/layout-ir/<id>.json` 存在且 `tree` 非空；
   没有 IR 几何就不允许写该屏的样式与布局（否则就是「凭感觉」，闸门必挂）
4. **残缺 Blueprint 视为 IR 缺失信号**：`blueprints/<id>.json` 若只剩片段（如只有一串日期数字），
   说明上游 IR/生成链断了，先修数据链再改代码，不要对着残片硬编码

**IR 是唯一几何来源**：屏内任何尺寸/颜色/间距/文案样式，逐项以 `layout-ir/<id>.json` 的 `tree`/`texts`/
`icons` 为准（如排班屏：图例 5 项 10×10 方块、单元格 155×110、药丸 19px 五色、表头 32px #FAFAFA 均在 IR 中）。
禁止「组件库默认样式差不多就行」。

## 弹窗还原纪律（硬规则，2026-09-25 弹窗事故沉淀）

> **事故**：新增医生/新增排班/批量排班 3 个弹窗写成 `layout="vertical"`（原型是横向表单：标签右对齐在控件
> 左侧 110px 列、控件 380×40），号源提示从输入框右侧两行小字变成下方整行，批量弹窗缺科室+医生并排下拉、
> 星期标签、灰底预览容器。且 `capture-screens.mjs` 只截路由页，**4 个 modal 屏从未进还原轮次/闸门对比**，
> 偏差直到人工看图才暴露。

**根因两层，防再犯也分两层：**

1. **代码层根因——脱离 IR 几何写屏**：弹窗按 antd 默认习惯（vertical 表单）手写，未对照
   `layout-ir/modal-*.json` 逐项核。预防：**弹窗与页面同一硬规则——没有 IR 几何不许写屏**。写弹窗前先读
   `layout-ir/modal-<id>.json`，逐项落 label 右缘 x / 控件起点 x、宽高、节距（如本例：标签右缘 110、
   控件 x=120 宽 380、行节距 56 = 40 控件 + 16 间距、首标签 y=89 → body 顶距 20）。同模板弹窗
   （科室/医生/排班共用 dept-modal 系样式）新写时必须先对照已过闸门的同模板实现。
2. **流程层根因——闸门盲区**：modal 屏进了 app-spec（含 `modal.trigger`），但截图/对比脚本不消费，
   双闸门对弹窗失明。预防（已工具化）：
   - **截图链路必须覆盖 modal 屏**：`capture-screens.mjs` 读 `app-spec.screens` 的 `type:"modal"` 条目，
     按 `modal.trigger` 点击打开弹窗、截 `.ant-modal-content`，命名与标杆图一致，进还原轮次对比；
     `visual-gate.mjs` 同理（trigger 打开 → clip 弹窗内容 → compare）。
   - **对齐基准必须一致**：Figma 导出的弹窗标杆图含 12px 阴影白边（如 544×750 = 内容 520×726 + 24），
     运行时截图是纯内容——不一致会被 fitPng 拉伸成全图条带错位（每行恒定红像素的特征信号）。
     运行时截图后必须补同样的 12px 白边再比对。
   - **doctor 自动检查**：`visual:doctor` 含「✅ 弹窗闸门覆盖」项——modal 屏缺 `modal.trigger` 直接报错，
     不许带盲区进还原轮次/闸门。
   - **标杆白边特征速查**：`imports/figma/screens/弹窗*.png` 尺寸 = IR `frame.w/h + 24`；若实际截图与
     标杆尺寸差恒定值，先查白边/阴影余量，不要先改布局。

**弹窗还原 checklist（写弹窗前过一遍）：**

- [ ] 读过 `layout-ir/modal-<id>.json`（frame 尺寸、每行控件 x/y/w/h、行节距、footer 按钮 y）
- [ ] 表单布局方向与 IR 一致（本仓库原型均为横向：`layout="horizontal" labelCol={{ flex: '97px' }} labelAlign="right"`）
- [ ] 行内提示（输入框右侧 hint）、并排控件、标签式勾选等特殊形态以 IR 为准，不用组件库默认形态
- [ ] 弹窗字段文案以 `figma-fields.json` 弹窗屏条目逐字核对（弹窗文本已在归档中）
- [ ] 跑 `npm run visual:round` 确认该弹窗出现在对比清单里且 PASS（盲区自证）

## 区块容器/卡片底色还原纪律（硬规则，2026-09-26「关键指标」事故沉淀）

> **事故**：首页「关键指标」区块整体与原型不符——运行时是**一张大白卡**，4 个指标只有数字浮在白底上；
> 原型是**画布上的 4 张独立白格子**（263×78 r6、间距 12），格子边界清晰可见。

**根因两层：**

1. **代码层——按「同类栅格单元」类比推容器，没回 IR 求证**。IR 里该区块**根本没有白卡**：
   `layout-ir/home.json` 中 `157:191`/`157:194`/`157:197`/`157:200` 四个 `RECTANGLE`（`fill:#FFFFFF`
   `radius:6`）是页面 frame 的**直接子节点**，与 `关键指标` 标题文本、`275:1299` 图标并列；
   其余三张图表卡则是 `INSTANCE` 且**自身带 `fill:#FFFFFF`**。实现时按「图表区四格应该长得一样」
   给这一格也套了 `.chart-card`（白底）→ 白格子叠白卡，边界消失。
   连带第二个偏差：该区块标题 icon 在 IR 中 x=864 = 区块左缘 838 + **26**，而 `.chart-card` padding
   是 20，未按 IR 补 6px。

   **判据（写屏时逐条过）**：写任何区块前，先在 IR 里找它的容器——
   - 有带 `fill` 的父节点 → 用那个 fill（如三张图表卡）
   - **没有带 `fill` 的父节点 → 必须透明，不得加卡片底**（如关键指标区）

   **「IR 里没有容器节点」是设计信息，不是缺失信息**——这正是最容易丢的一类还原点：
   它不体现为「多了/少了什么」，而体现为「底色该不该有」。

2. **工具层——低对比度差异是旧闸门的结构性盲区**。该偏差**同时骗过两条腿**，实证：

   | 腿 | 修复前（有 bug） | 事故版合成 | 判定 |
   |---|---|---|---|
   | `mismatch`（threshold=0.25） | 1.194% | 1.191% | **完全失明**（bug 版反而更低） |
   | `SSIM` | 0.8692 | — | 被整屏 1.5M 像素稀释，0.85 阈值未触发 |
   | 新腿 `flatBgDrift` | **4.80%** | — | **FAIL**（阈值 2.5%） |

   机制：`pixelmatch` 的 `threshold` 是**色差门槛**，只统计色差 ≥ 阈值 的像素。
   `#FFFFFF` vs `#F5F7FA` 的亮度差仅 ≈3.9%（9.7/255），远低于 0.25 → 这 1.6 万像素
   在 mismatch 统计里**等于不存在**。把 threshold 降到 0.03 以下信号才出现（2.46% → 7.55%）。
   即**「阈值高于色差」= 结构性失明**，加多少张截图都没用。

**更一般的一课（2026-09-26 表单事故再次印证）**：**「全屏统计量」对「局部几何偏差」天然失明**——
不只是低对比度。1px 灰边框位移 + 白底缩水只占 ~0.3% 像素：SSIM 被 1.5M 像素稀释、
mismatch 不到阈值、flatBg 只看「改色」不看「位移」。**排查这类问题的第一步不是调阈值，
而是问「我的判据测量的是哪一维」**；维度缺了就加一条语义明确的腿（几何腿），
而不是把像素腿调得更紧（真 MSSIM 不可达，调紧只会制造噪声与假阴性）。

**防复发（已工具化）：**

- **第三条闸门腿 `flatBgDrift`**（`scripts/lib/pixel-metrics.mjs`，`visual-gate` 与
  `visual-compare` 共用）：只在「标杆为平坦色块」处（7×7 邻域亮度极差 ≤3，文字笔画一律排除）
  要求运行时同色，容差收紧到 4/255（≈1.6%）。**只看底色/容器填充，不看文字渲染**，因此噪声低：
  校准（rad=3 flatTol=3 driftTol=4）全屏基线 0.32%~1.44%、弹窗 1.88%~4.03%，
  而事故信号 ≥4.8% → 阈值 `VISUAL_FLATBG_MAX=0.025`（弹窗 0.06）。
  诊断图 `artifacts/visual-diff/<屏>.flatbg.png`（洋红=标杆平坦底色被改色）。
- **试过但放弃的判据**（避免后人重复踩坑）：全局「边缘一致性 / 长直线」不可用——文字抗锯齿
  令全屏 missRate 基线就 25%~40%、弹窗 90%+，信号（15.9%→34.1%）淹没在基线里，无法全局定阈值。
  结论：必须用「只看平坦底色」这种有明确语义的判据，而不是全局梯度统计。
- **阈值不得静默回落**：`visual:doctor` 新增「✅ 低对比度盲区闸门（flatBg）」——校验
  `VISUAL_SSIM_MIN`/`VISUAL_MISMATCH_MAX`/`VISUAL_FLATBG_MAX`/`VISUAL_FLATBG_MODAL_MAX`
  四条都在 `.env` 里（缺一条就报错），并确认度量可用。否则阈值缺失 → 回落代码默认值 → 闸门再次失明。
- **度量自检**：`npm run visual:gate -- --calibrate` 打印度量自检——对照（同图）应 0%、
  合成事故（半幅画布被白卡吞）应 ≈50%，失败即报「已失明」；并给出基线上限与建议阈值。

**写屏 checklist（每个区块过一遍）：**

- [ ] 该区块在 `layout-ir/<id>.json` 里的**容器节点**是谁？它带 `fill` 吗？
- [ ] 无 `fill` 容器 → 我的实现**没有**加卡片底/背景色（透明）
- [ ] 有 `fill` 容器 → 我的背景色 = IR 的 fill（含 radius）
- [ ] 区块标题/图标的**左内缩**照 IR 算（不要沿用同类卡片的 padding）
- [ ] 跑 `npm run visual:gate` 后该屏 `flatBg` 腿为 PASS；FAIL 就看 `<屏>.flatbg.png`

## 表单几何换算与几何腿（硬规则，2026-09-26 机构信息「表单窄 164px」事故沉淀）

> **事故**：机构信息屏「*看起来*还原了」——字段齐全、4 个 KPI 正确、保存按钮在卡头右上，
> 像素闸门三条腿全部 PASS。但整张表单**比原型窄 164px**、输入框右端够不到卡片内缘：
>
> | 控件 | 原型（IR） | 运行时（事故版） | 偏差 |
> |---|---|---|---|
> | 机构名称输入框 | `454×40 @(364,327)` | `377×40 @(341,335)` | 窄 77px，行首下移 8px |
> | 统一社会信用代码 | `454×40 @(942,327)` | `377×40 @(855,335)` | 窄 77px，左移 87px |
> | 地址 / 简介（全宽行） | `1032×40 @(364,439)` | `806×40 @(341,448)` | **窄 226px** |
>
> 用户看到的正是「右侧一大块空白」。

**根因一（代码层）：把 IR 的「输入框宽」当成了「列宽」**

IR 里一行是**四段**：`label 88 + 段间距 12 + 输入框 454 = 列 554`；两列 + 列距 24 = 卡内宽 1132。
实现写的是 `grid-template-columns: 40.11% 40.11%`（`40.11% = 454 / 1132`）——**454 是输入框宽，
不是列宽**。随后 antd 的 label 又从这 454 里吃掉 77px → 输入框只剩 `454 − 77 = 377`。
第二处错误：`.org-full` 用被压窄的列和算 `width: 91.17%` → 全宽行 `806` 而非 `1032`。
**偏差是「1 控件宽当列宽 → 2 再从列里扣 label → 3 再拿压窄的和算全宽」三次换算叠出来的**，
所以单看每一处都「差不多」，合起来就是 164px。

**根因二（工具层）：三条像素腿**全是全屏统计量**，对「尺寸/位置」偏差结构性失明**

| 腿 | 事故版 | 修复版 | 判定 |
|---|---|---|---|
| `mismatch`（threshold=0.25） | 1.18% | 1.05% | **无区分度**（bug 版甚至略高） |
| `SSIM` | 0.868 | 0.943 | 0.85 阈值未触发 |
| `flatBgDrift` | 1.38% | 0.12% | 未超 2.5%（该腿只测「改色」，测不到「边缘位移」） |

**「差 164px 的表单」在 1440×1068 = 154 万像素里，只体现为 1px 灰边框的位移与白底缩水，
约 0.3% 像素** —— 任何全屏统计量都会被稀释。**结论：缺的不是更严的阈值，是判据的维度。**

**防复发（已工具化）：新增几何腿 `npm run visual:geom`**

`scripts/check-geometry.mjs`：

1. **目标屏自动派生**：IR 里存在「控件框」的非 chrome/modal 屏（新屏自动纳管，无按屏配置）
2. **控件框判据**：带 `stroke` 的 `RECTANGLE` 且 `h ∈ [36,120]`、`w ≥ 80`
   → 31px 高的描边按钮（重置/取消）被 `h ≥ 36` 排除；KPI/卡片无 `stroke` 天然排除；
   **只看 `stroke` 不看 `fill`**（原型里搜索框可能无填充，只认 `#FFFFFF` 会漏掉 —— doctors 屏的搜索框就是这样）
3. **坐标换算**：IR 的 `box` 是画布绝对坐标 → 减 `frame.x/y` 得 frame 相对坐标（与 DOM 视口坐标同一坐标系）
4. **DOM 侧**：`.ant-input` / `.ant-input-affix-wrapper` / `.ant-select-selector` / `.ant-picker` / `.ant-input-number`，
   **取最外层去嵌套**（`.ant-input-affix-wrapper` 内含内层 `input.ant-input`，重复计数会让配对错位）
5. **配对与断言**：两侧按 `(y, x)` 排序后**一一配对**（数量必须相等），逐框断言
   `|dx| |dy| |dw| |dh| ≤ VISUAL_GEO_TOL`（默认 3px）。报告 `artifacts/visual-diff/geometry.json`
6. **接线**：已挂 `visual:all` / `visual:round`；`visual:doctor` 含「✅ 几何闸门（IR↔DOM 控件框）」
   （校验 `.env` 有 `VISUAL_GEO_TOL` + **判据未失明**：存在 form 屏却解析不出任何控件框即报错）

**有效性自证（防「加了闸门其实没用」）**：拿事故版 CSS 复跑 → 机构信息 6 个控件框**全部报错**
（Δw `−77` / `−226`、Δx `−23` / `−87`、Δy `9`）闸门 FAIL；修复版最大偏差 2px PASS。

**该腿上线即抓到第 2 例同类缺陷（医生管理筛选条）**：搜索框 `212×32` vs IR `280×40`
（`DoctorsPage` 用裸 `<Input>`，不在 `.ant-input-affix-wrapper` 里 → 旧 CSS 的
`.ant-input-search { width: 280px }` 与 `.ant-input-affix-wrapper { height: 40px !important }`
**两条都命中不到** → 退回 antd 默认 32px 高、宽度被 flex 压到 212，并把后面的下拉整体左移 68px；
下拉容器仍是 32px，`.ant-select-selector` 被 `!important` 拉到 40 后**从容器顶部溢出 4px**）。
修复后 doctors `SSIM 0.874 → 0.906`、`flatBg 1.43% → 0.61%` —— **像素腿本来就是 PASS，
人眼与像素闸门都看不出这类缺陷**。

**写 form/list 屏的几何换算 checklist：**

- [ ] 把 IR 那一行**拆成段**：`label + 段间距 + 控件宽 = 列宽`；**列宽必须含 label**，禁止把控件宽当列宽
- [ ] 全宽行用 `grid-column: 1 / -1` 让浏览器 stretch，**不手算百分比**（`91.17%` 就是二次换算错的来源）
- [ ] label 右对齐留白表达为 `width: label宽+间距; padding-right: 间距`（本项目 `width:100px; padding-right:12px`
      → 文字右缘 88、输入框起 364，同 IR），不用组件库默认 labelCol
- [ ] **组件库默认尺寸 ≠ IR**：antd `Input`/`Select` 默认高 32px；`Select` 容器高度必须与 `.ant-select-selector`
      **一起**钉（只改 selector 会从容器顶部溢出 4px）；裸 `<Input>` 的样式要单独写（affix 类选择器命中不到）
- [ ] 跑 `npm run visual:geom`，该屏控件框逐框 PASS

**已知边界（别以为绿了就没事）：**

- 只断言**输入控件框**的 x/y/w/h；卡片/容器高度、文本基线、图标位置仍只有像素腿兜底
- **方形框（|w−h| ≤ 4）已排除**：原型里的 80×80「上传图标/医生头像」投放区是无值的图片占位，
  不是输入控件，DOM 侧没有对应控件（会把配对整体错位一格）
- 判据依赖「IR 里存在带 `stroke` 的控件 rect」：原型本就没有输入控件的屏（departments / home）
  几何腿对该屏空转——会打印屏数，**不会假装通过**
- **modal 屏仍不单独跑几何腿**（需 `modal.trigger` + 同坐标系），弹窗控件框由宿主屏壳内断言；
  **弹窗的文本与控件值已由文本腿 `visual:text` 覆盖**（它是唯一进弹窗的腿）

## 文本级还原纪律与文本腿（硬规则，2026-09-26 弹窗文本事故沉淀）

> **事故**：4 个弹窗**全部通过像素闸门**（dept `0.9087`、doctor `0.8975` 是 PASS；schedule `0.8681`、
> batch `0.8330` 是 FAIL），但显微镜下逐项都是错的：

| # | 缺陷（用户肉眼能看到） | IR 事实 | 实现做了什么 | 根因类别 |
|---|---|---|---|---|
| 1 | 4 个弹窗 **label 文本整体左偏 8px** | 文本右缘 95，`*` 在 103..110（间距恰 8） | `label` 是 `inline-flex` 且**自带 8px gap**，我们又加 `::after { margin-left: 8px }` → 实际 16px | **双重间距**：给组件库已经给过的间距再「补」一次 |
| 2 | **非必填 label 左偏 13px** | 非必填文本右缘 **108**（与必填的 95 不同网格） | `colon={false}` **并没有删掉** antd 的 `::after`，只是把内容换成**一个空格**并保留 `margin: 0 8px 0 2px` = 2+2.92+8 = **12.92px** | 组件库的「关闭」≠「移除」 |
| 3 | 控件文本 **14px / 位置偏** | 15px、`#333333`，且文本 ink 顶 = 控件盒顶 +11（**不是垂直居中**） | antd 默认 14px + 主题 `colorText #1F2937` | 组件库默认字号/颜色 ≠ IR |
| 4 | 「全部医生」**灰占位符** | 深色 `#262626`（这是**值**不是占位符） | 用 `placeholder` → antd 灰 `rgba(0,0,0,.25)`（色差 153） | **语义误判**：IR 的深色文本可能是「值」 |
| 5 | 「选择排班日期」label **左溢出 12px** | 文本 78 + 8 + `*` 7 = 93 > 列内容 90 → IR 里 `*` **掉到第二行** `(103,218)` | 没设 `flex-wrap` → 单行放不下就左溢出 | **换行本身也是几何**：放不下时 IR 怎么摆必须照抄 |
| 6 | 预览末行**多一条边框** | 末行只有 TEXT、**没有描边矩形** | 末行仍带 `border-bottom` | 「IR 里没有这个矩形」是**设计信息**（同「关键指标无白卡」） |

**为什么三条像素腿 + 几何腿全都没抓住（结构性原因，不是阈值不够严）**

| 腿 | 为什么失明 |
|---|---|
| `mismatch`（`threshold=0.25`） | 只统计色差 ≥25% 的像素；文本 ink 只占弹窗 544×750 ≈ 40.8 万像素的极小比例。**8px 的整列位移 + 14→15px 字号变化在这条腿里几乎不存在**（dept 弹窗 label 全偏 8px 却 `0.9087` PASS、mismatch 0.54%） |
| `SSIM` | 被弹窗整图稀释（0.87~0.91 在 0.85 之上） |
| `flatBgDrift` | 只测「标杆的平坦底色是否被**改色**」，测不到**文本位移** |
| `visual:geom` | 判据是「带 `stroke` 的 **RECTANGLE**」——**TEXT 节点不是 rect**；且当时显式跳过 modal 屏（`if (s.type === "modal") continue`）→ **弹窗文本双盲区** |

**根因归类（三类，可迁移到任何「组件库 + 原型」的场景）**

1. **组件库的隐式默认**：这 6 条缺陷**全部来自「我们没写的那些属性」**——`colon` 的空格占位、label 的
   `flex gap: 8px`、`font-size: 14px`、占位符 `rgba(0,0,0,.25)`、`Input/Select` 默认高 32px、
   两字中文按钮自动插空格、`::after` 的 `margin`。**且「关掉/补上」都必须实测验证**（`colon={false}` 就是
   「以为关掉了其实没有」的典型）。
2. **IR 的「非文本」信息**：IR 里「没有边框」「没有容器底」「`*` 掉到第二行」「文本是深色（值不是占位）」
   都是**设计信息**，它们不表现为「多了/少了什么」，最容易漏。写屏前要把 IR 节点的
   `(x, y, w, h, font.size, font.color)` 当**验收清单**逐项对，而不是「看起来差不多」。
3. **判据维度缺失**：像素统计看不见文本级偏差（见上表）。→ 补**文本腿**。

**防复发（已工具化）：`npm run visual:text` → `scripts/check-text.mjs`**

1. **IR 侧**：`type === "TEXT"` 且文本非空的节点 → `(x,y,w,h)` + `font.size` + `font.color`；
   坐标换算成 frame 相对值（弹窗 = 相对弹出框左上，与 DOM 取 `.ant-modal-content` 同源）
2. **DOM 侧**：按 **`parentElement` 分组**的文本节点（同一父元素内的文本节点**拼接为一个测量单元**——
   这样 IR 里一个带 `\n` 的 TEXT 节点、DOM 里的多个文本节点、`white-space` 换行都能对齐）；
   `Range` 盒给 `(x,y,w,h)`，computed style 给 `font-size`；**SVG 用 `fill` 上色**（图表文字在 SVG 里，
   读 `color` 会假报「颜色不符」）
3. **匹配**：文本归一化（去**全部**空白）后按**多重集 + 位置最近**配对（日历里多个「张伟」不会配错），
   数量必须相等 —— **DOM 多出来 = 组件库多渲染了东西**（antd 默认冒号就是这么抓住的），
   **IR 有但 DOM 没有 = 该还原的文本没落**（如「医生头像」被误标必填、`系统管理员` 整块缺失）
4. **断言**：`|dx| |dy| |dw| ≤ VISUAL_TEXT_TOL`（默认 3px）+ `|Δfont-size| ≤ VISUAL_TEXT_SIZE_TOL`
   （默认 0.6px）+ 颜色全等
   - 容差 3px 而非 0：IR 文本盒（Figma 字面行框）与 DOM `Range` 盒（CSS line box）的 y 起点有
     1~2px 的**度量约定差**（实测 13px 标签稳定 `dy=−1~−2`、右对齐标签右缘 `dx=+1~+2`）；
     3px 是噪声地板，而本次事故的缺陷是 **8 / 11 / 13px 与 1px 字号** → 仍全部命中
   - **不断言 `h`**：IR 文本盒高 = Figma 字面行框，DOM `Range` 高 = CSS `line-height`，二者语义不同
     （本项目多处 `line-height` 有意大于字号：KPI 值 28px 字 / 40px 行高）→ `y` 比**中心**
   - **颜色比较必须把 alpha 合成到白底**：antd 占位符 `rgba(0,0,0,.25)` 丢 alpha 会得到 `rgb(0,0,0)`，
     而它在白底上的实际观感是 `rgb(191,191,191)` = IR 的 `#BFBFBF`，误判成「颜色错」
5. **控件内文本走「控件值断言」**：IR 里落在控件框内的 TEXT → 取 DOM 控件的值/占位符
   （`<input>` 的值**不是文本节点**、Select 里还有个值恒为空的隐藏 `search-input`，取值顺序错了会读成空串）
   + computed `font-size`/`color`；**位置由几何腿负责**（文本基线是组件库内部布局）
6. **豁免（框架通用规则，非按屏配置）**：
   - `*`（antd 必填星号由 CSS `::after` 渲染，DOM 里没有文本节点）
   - **单字符且非中英文数字**的文本（`‹ › × ✓ ▲` 等 —— 原型里这类就是图标字形，实现侧是 SVG）
   - **中心落在某个 `<canvas>`/`<svg>` 矩形内**的 IR 文本（图表标签由图表库自己画，归像素腿；
     用 DOM 的图形层矩形判定，**不写死图表区坐标**）
7. **接线**：`npm run visual:text`；`visual:doctor` 含「✅ 文本闸门（IR TEXT ↔ DOM 文本盒）」
   （校验 `.env` 有 `VISUAL_TEXT_TOL` + `VISUAL_TEXT_SIZE_TOL` + **判据未失明**：有屏却解析不出任何
   TEXT 节点即报错）；报告 `artifacts/visual-diff/text.json`

**有效性自证（防「加了闸门其实没用」）**：先修好 4 个弹窗、**再**补这条腿时，它立刻回抓出**第 3 例同类缺陷**——
「排班状态」label 左偏 **13px**（正是第 2 类根因：`colon={false}` 没真删 `::after`），以及
dept/doctor 弹窗占位符字号 `14→15`、footer「取消」文本色 `#1F2937→#595959`、
「医生头像」被误标必填（IR 该行**没有** `*`）、上传区用 `＋` 文本冒充图标（IR 是 `PlusOutlined` 矢量）。
修完后 4 个弹窗文本节点全部对齐（最大偏差 2px）。

**已知挂起项（别以为绿了就没事）**

- 文本腿只覆盖 **HTML 文本**；SVG/canvas 里的文字归像素腿
- 5 个内容屏目前仍有挂起差异（**像素腿本来就是 PASS**，结构性失明）：
  `chrome`（用户名 `dx=28`、头像 `dx=24` 且 `18px` vs IR `13px`、`系统管理员` 整块缺失）、
  **侧栏多渲染 16~17 项**（IR 只有 9 项）与灰显色 `#BFBFBF` vs IR `#595959`、
  机构信息 label 右缘 `13px`（与弹窗第 2 条同根因）、
  医生列表单元格 `dx=9` / 表头「操作」`dx=32` / 头像底色、
  排班 `cell-count` `11px` vs IR `10px`
- 这些必须在后续还原轮次里清掉；**清完才把 `visual:text` 并入 `visual:all` / `visual:round` 的阻断链路**

## 还原轮次（第一版全栈之后必做）

每轮：

1. `npm run visual:doctor -- --quick`（含 **Layout IR 完整性**检查）必须全绿后才继续
2. `npm run visual:round`：按 `screenConfigs` 路由逐页 Playwright 截图（1440×1068）→ 与 `imports/figma/screens/` 对比 → 输出热力图 + 差异 JSON → **宽视口锁定**（`visual-gate --viewport-lock-only`，同一屏 1440 vs 1888 截同一区域互比，防还原轮次里改出宽屏拉伸）→ `visual:data` → `visual:geom`（IR 控件框 ↔ DOM 框，抓像素腿看不见的尺寸/位置偏差）
2a. **紧接第 2 步再跑 `npm run visual:text`（每轮必跑，不可省）**：IR TEXT ↔ DOM 文本盒，抓像素腿与几何腿都看不见的文本级偏差——**它尚未并入 `visual:round` / `visual:all` 的自动链路**（否则 5 个内容屏的挂起文本差异会让每轮直接 FAIL），故必须手动跑并把结果并进差异表；挂起项清完后才并入阻断链路（见「文本级还原纪律与文本腿」）
3. **列出差异表并修复代码**（字段文案 + 页面几何/token/组件）：

   | 屏 | 类型（字段/页面） | 差异 | 拟改文件 |
   |---|---|---|---|

   > 差异表必须含 `visual:text` 报告的条目（文本位置/字号/颜色/DOM 多出/IR 缺失），
   > 不能只列像素分数不达标项——**像素 PASS 不等于文本还原到位**（2026-09-26 弹窗文本事故）

4. 重截已改页，确认本轮差异已关
5. **询问是否进入下一轮还原**（原话）：「本轮字段还原和页面还原已完成。是否进入下一轮还原？」
   - 进入 / 下一轮 / 继续 → 从步骤 1 再跑一轮
   - 不进入 / 结束 / 停止 → 写 GENERATED.md，本阶段结束

未跑完至少一轮、且用户未明确「不进入下一轮」前，不得宣称交付完成。覆盖：导航里每一屏 + 原型弹窗。

## 反模式（禁止）

- **无 Layout IR 支撑写屏**：IR 缺失/退化时手写布局样式、对着残缺 Blueprint 硬编码（2026-09-25 事故根因）
- **按「同类栅格单元」类比推容器底色**：不回 IR 求证容器有没有 `fill`，就给区块套上游同类卡片的背景（2026-09-26「关键指标」事故根因）
- **把 IR 的「控件宽」当「列宽」**：列宽必须含 label（`label + 段间距 + 控件宽`）；全宽行用 `grid-column: 1 / -1`，不手算百分比（2026-09-26「表单窄 164px」事故根因）
- **以为全屏像素腿能抓几何偏差**：SSIM / mismatch / flatBg 都是全屏统计量，对「控件尺寸/位置错了」结构性失明（1px 边框位移 ≈0.3% 像素）——必须由几何腿 `visual:geom` 兜底；缺腿时先问「我的判据测量的是哪一维」，不要调紧像素阈值
- **以为像素腿/几何腿能抓文本偏差**：几何腿只认「带 `stroke` 的 RECTANGLE」，TEXT 节点不是 rect；文本 ink 占画面比例极小，`threshold=0.25` 看不见 8px 位移与 1px 字号差——文本位置/字号/颜色/「DOM 多出」必须由文本腿 `visual:text` 兜底（2026-09-26 弹窗文本事故根因）
- **「关掉/补上」组件库默认值不实测**：`colon={false}` 并没有移除 antd 的 `::after`（只把内容换成一个空格 + 保留 `margin: 0 8px 0 2px` = 12.92px）；`label` 自带 `flex gap: 8px` 时再 `margin-left: 8px` 就是 16px。凡「关闭/补偿」组件库默认值，必须用 DOM 探针实测结果（距离/尺寸），不能凭「我写了这条 CSS」假定生效
- **依赖 mismatch 抓低对比底色差异**：`threshold=0.25` 对 <25% 色差（如白 vs 画布 3.9%）结构性失明；底色/容器填充必须由 `flatBgDrift` 腿兜底
- **凭组件库默认形态写弹窗**：不读 `layout-ir/modal-*.json` 就用 vertical 表单/默认控件形态（2026-09-25 弹窗事故根因）
- **闸门盲区交付**：modal 屏未进截图/对比链路就宣称还原完成——还原轮次/闸门前必须看到「✅ 弹窗闸门覆盖」
- 自制 `components/ui/Button|Table|Modal` 替代用户所选组件库
- 把 MCP/Figma 吐出的绝对定位 Tailwind 当最终代码
- 面积启发式取色作为 token 主路径（必须走命名节点 / Layout IR）
- 用 ant icons / emoji 顶替已导出的 Figma 资源
- 「不追求像素级」作为交付借口
- 在脚本里硬编码业务屏名 / slug / 登录凭证（一切走 app-spec）