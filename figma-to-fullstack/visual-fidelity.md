# 前端视觉还原方案（默认）

**所有从 Figma 生成的项目默认启用本方案**，无需用户额外选择。目标：视觉不可分辨且可维护——antd + Layout IR 精确几何 + 自动 SSIM 闸门，而不是手写 CSS 或通用 CRUD 壳。

## 架构：四层 IR + SSIM 闸门

```
Figma REST/MCP
    ↓
Design IR（结构/文案） ──→ App Spec（实体、路由、API）
    ↓
Layout IR（每屏完整子树几何：padding/gap/size/fill/font/export id）
    ↓
Visual IR（token、chrome、screens、modals）← token 从 Layout IR 命名节点取值
    ↓
Screen Blueprint 2.0（构图 + layout.regions + sample）
    ↓
Codegen（antd 页面 + 生成的 tokens.css / antdTheme.ts + Figma 原图）
    ↓
视觉闸门（Playwright 1440×1068 vs imports/figma/screens；SSIM ≥ 0.97 或 mismatch < 2%）
    ↓
还原轮次（字段 100% + 页面 100%；逐页对比 → 列差异 → 修代码 → 询问是否下一轮）
```

| 层 | 职责 | 产出 |
|---|---|---|
| **App Spec** | 数据模型、关系、REST API、路由清单 | `fixtures/<slug>/app-spec.json` |
| **Layout IR** | 标杆 Frame 几何、资源 nodeId | `fixtures/<slug>/layout-ir/*.json` |
| **Visual IR** | 设计 token、侧栏/顶栏 chrome、屏模板分类、弹窗 | `fixtures/<slug>/visual-ir.json` |
| **Screen Blueprint** | 每屏 KPI/列表/图表/弹窗 + `layout.regions` | `fixtures/<slug>/screen-blueprints/*.json` → `apps/web/src/blueprints/` |
| **生成物** | 可运行前端 | `tokens.css`、`antdTheme.ts`、`screenConfigs.ts`、标杆页、assets |

**禁止**从 Figma 节点直接吐 React/Vue 代码；**禁止**用一套 `ResourcePage` + 自制 Button/Table 覆盖全部业务屏；**禁止**用 ant icons / emoji 冒充已导出的 Figma 图标。

## 字段级 100% 还原（硬性规则）

除视觉外，**原型屏中出现的每一个字段/文案必须与 Figma 完全一致**，不允许凭经验臆造、改名、增删：

- 列表列（columns）、表单字段（formFields）、筛选项（filters）、弹窗字段（modalFields）、KPI 标题（stats）、按钮文案（actions）、页面标题与副标题（title/subtitle），均须以 `imports/figma/screens/*.png` 与 `imports/figma/*-summary.json` 提取到的真实文案为准
- 中文标签逐字核对（例：原型「科室图标」不得写成「排序」、原型「机构副标题」不得写成「联系邮箱」）；字段名 key 与中文 label 都要对齐
- 原型里没有的字段**禁止新增**到 columns / formFields / modals；原型里有的字段**禁止省略**
- 字段顺序必须与 Figma 视觉顺序一致（从上到下、从左到右）
- 弹窗字段以弹窗截图为准，不以列表页字段推断
- **屏内分组/小节标题必须还原**：表单卡片标题（`formCard.title`，如「预约规则配置」）、表格分组标题（`cardTitle` / `sections[].title`，如「通知模板」「发送记录」）必须以原型为准，**禁止**用通用标题（「XX列表」「维护XX资料」）替代
- **一屏多表格（sections）必须全量还原**：原型一屏含多张表（如 消息通知 = 通知模板 + 发送记录）时，每张表的列、行操作、分页、statusMap 都要逐一还原，禁止只做第一张表
- **表单字段说明/提示文案（`hint`）必须还原**：如「患者最多可提前N天预约」「超过后自动拉入黑名单」等字段下方说明文字，不得省略
- **form 模板屏必须渲染为表单页**：`template: "form"` 的屏（如 预约规则）应按「卡片标题 + 保存按钮 + 字段（含 hint）」渲染，**禁止**退化为列表 + 弹窗
- `statusMap` 按原型值逐字配置（启用/停用、发送成功/发送失败等），不得套用通用映射
- 交付前用 `imports/figma/screens/` 逐屏核对，任何字段差异必须修复后才能标记完成

## 字段级还原校验方案（交付前必跑）

**数据源（按优先级）：**
- `imports/figma/screens/*.png`：全量对照截图。`npm run visual:shots:all` 可导出全部屏 + 弹窗（默认 `visual:shots` 只导出标杆 6 张）
- `fixtures/figma-fields.json`：Figma 节点真实文本归档（`GET /files/{key}/nodes?ids=...` 收集每屏 TEXT 节点），字段逐字比对的权威依据
- `imports/figma/*-summary.json`：Frame 清单（屏名 ↔ nodeId）

**校验步骤：**
1. 拉全量截图：`npm run visual:shots:all`（Figma 返回 429 限流时等待解除后重跑，勿跳过）
2. 拉节点文本：Figma REST 批量取每屏 TEXT 节点 → 归档 `fixtures/figma-fields.json`
3. 回填字段源：逐屏更新 `scripts/lib/screen-catalog.mjs` 的 columns / formFields / filters / actions / stats / subtitle / statusMap，并把该屏 `needsReview` 置 `false`；含分组/多表的屏同步回填 `cardTitle` / `formCard` / `sections[]`（每个 section 的 title / resource / columns / rowActions / pagination / statusMap），含说明文案的字段同步回填 `hint`
4. 重新生成：`npm run visual:extract && npm run visual:gen`；若改的是硬编码源，须同时改 `scripts/generate-blueprints.mjs` / `scripts/generate-screen-configs.mjs`
5. 自动核对：运行字段一致性脚本，逐屏断言原型关键 label 均已出现在 `screenConfigs.ts`

**通过标准（全部满足才算对齐）：**
- `screenConfigs.ts` 中 `"needsReview": true` 数量 = 0
- 每屏 columns / formFields / filters / actions / stats / subtitle 与 `fixtures/figma-fields.json` 逐字一致；顺序一致
- 分组/小节标题（`cardTitle` / `formCard.title` / `sections[].title`）与原型一致，无通用标题替代；一屏多表时每个 section 的列/行操作/分页/statusMap 全量存在
- 字段 `hint` 说明文案与原型一致，未省略
- `template: "form"` 屏渲染为表单页（卡片标题 + 保存按钮 + 字段），非列表 + 弹窗
- 原型里没有的字段未新增；原型里有的字段未省略
- 弹窗字段与弹窗截图一致
- 数据层配套：原型列引用的字段若 schema 缺失，须同步扩展 `schema.prisma` + DTO + seed（禁止只改 label 不建字段，否则页面显示空列）
- `tsc --noEmit`（web + api）通过、`prisma db push` + seed 可跑

## 默认前端技术栈

| 包 | 用途 |
|---|---|
| `antd` | Layout、Menu、Table、Form、Modal、Card、Tag… |
| `@ant-design/icons` | 仅当 Layout IR 未导出对应资源时的回退 |
| `recharts` | 首页折线/柱状/收入图表 |
| `dayjs` | 排班日历、日期选择 |

入口：`main.tsx` 包 `ConfigProvider`（`zh_CN`）+ **生成的** `theme/antdTheme.ts`。

## 视觉流水线（必做）

```bash
npm run visual:layout     # Layout IR（标杆 Frame 完整子树）
npm run visual:extract    # Visual IR（token 优先读 Layout IR）
npm run visual:shots      # 对照 PNG → imports/figma/screens/
npm run visual:gen        # tokens.css + antdTheme.ts + Blueprint 2.0 + screenConfigs
npm run visual:assets     # 按 Layout IR nodeId 导出原图
npm run visual:gate       # Playwright SSIM（需 api + web 已启动）
npm run visual:all        # 以上全部（含 gate）
```

闸门跑次：URL 加 `?visualGate=1` 冻结 Blueprint `sample` 数据、关闭动画与滚动条。

**降级**：无 `FIGMA_ACCESS_TOKEN` → 停并提示；REST 429/5xx → 指数退避重试；仍失败则用已有 Layout IR / fallback token，字段标 `needsReview`。

## 前端目录约定

```
apps/web/src/
├── theme/antdTheme.ts          # 由 generate-tokens-css 生成
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
└── templates/ResourceListPage.tsx   # 其余 list 屏（一期不进 SSIM）
```

## 屏模板与 Blueprint

标杆屏（进 SSIM）：首页、科室管理、机构信息、排班管理、新增科室弹窗、侧栏。

Blueprint 2.0 额外字段：

- `layout.regions[]`：`id, padding, gap, width, height, font, color`（由 Layout IR 生成）
- `sample`：闸门冻结用的 KPI/表格/表单样例

其余 list 屏走 `ResourceListPage`，**未进 SSIM 闸门**。

## 标杆屏还原：首页

对照 `imports/figma/screens/首页.png` 与 `fixtures/<slug>/layout-ir/home.json`，用 antd Card + recharts 还原 chrome 与几何；**不在本文件记录接口/聚合公式**。样例数只来自 Blueprint `sample`（`?visualGate=1` 冻结）。

几何（Frame 1440×1068，侧栏 220，顶栏 52，内容 padding 20×24，页背景 `#F5F7FA`）：

| 区域 | Layout IR | 实现要点 |
|---|---|---|
| 顶栏 | 高 52；头像 30 圆 `#E6F7FF` / 字 `#1890FF`；姓名 `#333` 14px；角色与「退出」`#8C8C8C` 13px | 退出不是主色链接 |
| KPI ×4 | 1440 下 281×92（内容 1172、间距 16）；圆角 8，阴影 `0 1px 2`，无描边 | `repeat(4, minmax(0,1fr))` 铺满内容区，禁止写死 281；标签 12/`#8C8C8C`，数值 28/500/`#1890FF`；金额千分位 `¥5,280` |
| 图表卡 2×2 | 1440 下 578×259，间距 16；标题 14/500/`#262626`（含原型 emoji）；绘图区随卡宽 | `minmax(0,1fr)` 两列铺满，禁止写死 578；Y 轴 `interval={0}` 强制全部刻度；预约量横线 `0/5/10/15/20/25`，收入纵轴步长 150、上限为峰值向上取整到 150（闸门样例 750）；柱宽 49、柱间距 33；折线 `#1890FF`、收入 `#52C41A`；柱色 `#1890FF #69C0FF #91D5FF #BAE7FF #E6F7FF` |
| 关键指标 | 1440 下瓷砖 263×78，间距 12，底 `#FAFAFA`，圆角 6 | 卡内 `1fr 1fr` 铺满（左右 padding 20）；1440 下自然为 263；浅灰铺在白卡上；数值 22/700：就诊率 `#1890FF`、爽约率 `#FF4D4F`、收入 `#52C41A`、预约量 `#FA8C16` |

闸门：Recharts 矢量与 Figma 路径无法像素对齐，`visual-gate.mjs` 对三块绘图区做 mask，**标题、KPI、瓷砖、壳仍须对齐**。首页主色以 Layout IR 命名节点 `#1890FF` 为准，不用 antd 默认 `#1677FF` 顶替。

## 视觉闸门（验收必过）

对照 `imports/figma/screens/`，由 `npm run visual:gate` 自动打分，报告在 `artifacts/visual-diff/score.json`：

- 视口 **1440×1068**
- **SSIM ≥ 0.97** 或 **像素 mismatch < 2%** 视为通过
- 未跑 gate 或分数不达标，不得宣称生成完成

人眼仍检查：侧栏彩色原图图标、科室插画、横向弹窗、图表分色。

## 还原轮次（第一版全栈之后必做）

第一版全栈生成完成后，进入字段还原和页面还原阶段（保证字段和页面100%还原）。以 Playwright 截图，将每一页截图进行对比，列出差异修复代码。第一轮完成后询问是否进入下一轮还原，直至选择不进入下一轮。

未跑完至少一轮、且用户未明确「不进入下一轮」前，不得宣称交付完成。本文件只记还原流程，不写接口/聚合公式。

### 每一轮

1. 确认 `api` + `web` 已启动；页面 URL 加 `?visualGate=1`。
2. 对照图：`imports/figma/screens/*.png`（缺全量则 `npm run visual:shots:all`）。
3. **以 Playwright 截图**：视口 **1440×1068**，按 `screenConfigs` 路由逐页截运行时。标杆屏可 `npm run visual:gate`；其余屏同样逐页截到 `artifacts/visual-diff/`。
4. **将每一页截图进行对比**（Figma PNG vs Playwright actual + diff）。
5. **列出差异并修复代码**（字段文案 + 页面几何/token/组件）。差异表：

| 屏 | 类型（字段/页面） | 差异 | 拟改文件 |
|---|---|---|---|

6. 重截已改页，确认本轮差异已关。
7. **询问是否进入下一轮还原**（原话）：「本轮字段还原和页面还原已完成。是否进入下一轮还原？」
   - 进入 / 下一轮 / 继续 → 从步骤 1 再跑一轮
   - 不进入 / 结束 / 停止 → 写 GENERATED.md，本阶段结束

覆盖：导航里每一屏 + 原型弹窗。字段以截图与 `fixtures/figma-fields.json` 逐字为准；页面以 Layout IR + 截图几何为准。

## Schema

- Layout IR：`docs/schemas/layout-ir.schema.json`
- Visual IR：`docs/schemas/visual-ir.schema.json`

## 反模式（禁止）

- 自制 `components/ui/Button|Table|Modal` 替代 antd
- 把 MCP/Figma 吐出的绝对定位 Tailwind 当最终代码
- 面积启发式取色作为 token 主路径（必须走命名节点 / Layout IR）
- 用 ant icons / emoji 顶替已导出的 Figma 资源
- 「不追求像素级」作为交付借口
