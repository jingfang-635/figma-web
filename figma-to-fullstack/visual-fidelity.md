# 前端视觉还原方案

**所有从 Figma 生成的项目启用本方案**（高还原 + 双闸门是验收标准，但 UI 技术栈不是）。目标：视觉不可分辨且可维护——用户选定框架的组件库 + Layout IR 精确几何 + 自动双闸门，而不是手写 CSS 或通用 CRUD 壳。技术栈由用户逐层选择，**无默认**（见 `.cursor/rules/figma-visual-fidelity.mdc`）。

## 架构：四层 IR + 双闸门

```
Figma REST/MCP
    ↓
init-project.mjs → App Spec（实体、路由、API、benchmarkScreens、seedAdmin）【人工闸门】
    ↓
Layout IR（每屏完整子树几何：padding/gap/size/fill/font/export id）
    ↓
Visual IR（token、chrome、screens、modals）← token 从 Layout IR 命名节点取值
    ↓
Screen Blueprint（构图 + layout.regions + sample）← 由 App Spec + Layout IR 生成
    ↓
Codegen（按用户选定框架的页面 + 生成的 tokens.css / 主题文件 + Figma 原图）
    ↓
双闸门（字段一致性 visual:fields + SSIM 视觉闸门 visual:gate）
    ↓
还原轮次（字段 100% + 页面 100%；逐页对比 → 列差异 → 修代码 → 询问是否下一轮）
```

| 层 | 职责 | 产出 |
|---|---|---|
| **App Spec** | 数据模型、关系、REST API、路由、benchmarkScreens | `fixtures/<slug>/app-spec.json` |
| **Layout IR** | 标杆 Frame 几何、资源 nodeId | `fixtures/<slug>/layout-ir/*.json` |
| **Visual IR** | 设计 token、侧栏/顶栏 chrome、屏模板分类、弹窗 | `fixtures/<slug>/visual-ir.json` |
| **Screen Blueprint** | 每屏 KPI/列表/图表/弹窗 + `layout.regions` | `fixtures/<slug>/screen-blueprints/*.json` → `apps/web/src/blueprints/` |
| **生成物** | 可运行前端 | `tokens.css`、主题文件（如 `antdTheme.ts` / `theme.ts`）、`screenConfigs.ts`、标杆页、assets |

**项目差异全部由 `fixtures/<slug>/app-spec.json` 驱动**：标杆屏（`benchmarkScreens`：type = chart/list/form/detail/modal/chrome）、路由、闸门账号（`seedAdmin`）、localStorage key（`auth.storageKey`）、品牌（`brand.title/subtitle`）。脚本与流程不含业务硬编码。

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

## 字段级还原校验（双闸门之一，交付前必跑）

**数据源：**

- `imports/figma/screens/*.png`：全量对照截图（`visual:shots:all` 可导出全部屏 + 弹窗；默认 `visual:shots` 只导出标杆屏）
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
npm run visual:layout      # Layout IR（标杆 Frame 完整子树）
npm run visual:extract     # Visual IR（token 优先读 Layout IR）
npm run visual:shots       # 标杆屏对照 PNG → imports/figma/screens/
npm run visual:shots:all   # 全量屏 + 弹窗 PNG
npm run visual:gen         # tokens.css + 主题文件 + Blueprint + screenConfigs
npm run visual:assets      # 按 Layout IR nodeId 导出原图
npm run visual:fields      # 字段一致性校验
npm run visual:gate        # Playwright SSIM（需 api + web 已启动）
npm run visual:round       # 还原轮次：Playwright 截图 + 对比热力图
npm run visual:all         # layout/extract/shots/gen/assets/fields/gate
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
├── pages/                      # 标杆页
└── templates/ResourceListPage.tsx   # 其余 list 屏（不进 SSIM 标杆闸门）
```

## 屏模板与 Blueprint

标杆屏（进 SSIM）由 `app-spec.benchmarkScreens` 声明（type = chart/list/form/detail/modal；chrome 不单独跑）。Blueprint 由 `generate-blueprints.mjs` 从 App Spec + Layout IR 生成，含：

- `layout.regions[]`：`id, padding, gap, width, height, font, color`（由 Layout IR 生成）
- `sample`：闸门冻结用的样例（来自 Figma 真实文本提取）

其余 list 屏走 `ResourceListPage`，进还原轮次（逐页截图对比），但不进标杆 SSIM。

## 视觉闸门（双闸门之二，验收必过）

对照 `imports/figma/screens/`，由 `npm run visual:gate` 自动打分，报告在 `artifacts/visual-diff/score.json`：

- 视口 **1440×1068**
- **SSIM ≥ 0.97** 或 **像素 mismatch < 2%** 视为通过
- 登录：env `GATE_ADMIN_EMAIL/GATE_ADMIN_PASSWORD` 或 spec.seedAdmin；localStorage key 取 `spec.auth.storageKey`
- mask（图表区等）：`fixtures/<slug>/gate-masks.json` → `{ [screenId]: [{x,y,w,h}] }`
- 未跑 gate 或分数不达标，不得宣称生成完成

## 还原轮次（第一版全栈之后必做）

每轮：

1. 确认 `api` + `web` 已启动；页面 URL 加 `?visualGate=1`
2. `npm run visual:round`：按 `screenConfigs` 路由逐页 Playwright 截图（1440×1068）→ 与 `imports/figma/screens/` 对比 → 输出热力图 + 差异 JSON
3. **列出差异表并修复代码**（字段文案 + 页面几何/token/组件）：

   | 屏 | 类型（字段/页面） | 差异 | 拟改文件 |
   |---|---|---|---|

4. 重截已改页，确认本轮差异已关
5. **询问是否进入下一轮还原**（原话）：「本轮字段还原和页面还原已完成。是否进入下一轮还原？」
   - 进入 / 下一轮 / 继续 → 从步骤 1 再跑一轮
   - 不进入 / 结束 / 停止 → 写 GENERATED.md，本阶段结束

未跑完至少一轮、且用户未明确「不进入下一轮」前，不得宣称交付完成。覆盖：导航里每一屏 + 原型弹窗。

## 反模式（禁止）

- 自制 `components/ui/Button|Table|Modal` 替代用户所选组件库
- 把 MCP/Figma 吐出的绝对定位 Tailwind 当最终代码
- 面积启发式取色作为 token 主路径（必须走命名节点 / Layout IR）
- 用 ant icons / emoji 顶替已导出的 Figma 资源
- 「不追求像素级」作为交付借口
- 在脚本里硬编码业务屏名 / slug / 登录凭证（一切走 app-spec）