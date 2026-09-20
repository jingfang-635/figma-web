# Sunshine Medical Tools（阳光医疗 Figma 插件）

两个命令（运行插件时从菜单选择）：

1. **Emoji → Ant Icons**：把 Figma 原型里的 emoji 文本图层批量替换为 antd 矢量图标。
   SVG 数据来自 `@ant-design/icons-svg`（与前端 `@ant-design/icons` 完全同源）。
2. **Charts → Components**：把首页 3 个图表（扁平 SVG）**数据重建 + 组件化**：
   删除扁平矢量，按蓝图数据用原生节点重画，建成 `Chart` 组件集（变体 `Type=Trend/DeptBars/Income`），
   存放在新页面「🧩 Charts」，画布原位置替换为实例。

## 文件

| 文件 | 作用 |
|---|---|
| `manifest.json` | Figma 插件清单（本地插件，menu 双命令） |
| `code.js` | 插件主逻辑（`build.mjs` 拼接产物，勿手改） |
| `src/logic.part.js` | Emoji 命令运行时逻辑 |
| `src/charts.part.js` | 图表组件化命令（数据重建） |
| `src/dispatch.part.js` | 命令分发（`figma.command`） |
| `svgs.js` | 图标 SVG 数据（自动从 node_modules 提取） |
| `smoke-test.mjs` | Emoji 命令冒烟测试 |
| `charts-smoke-test.mjs` | Charts 命令冒烟测试（含幂等性验证） |

## 安装（Figma 桌面版）

1. 打开 Figma 桌面 App，任意打开一个文件
2. 菜单：**Plugins → Development → Import plugin from manifest…**
3. 选择本目录的 `manifest.json`
4. 之后从 **Plugins → Development → Sunshine Medical Tools** 运行，在菜单里选命令

> 网页版 Figma 无法加载本地插件，需要桌面版。

## 命令 1：Emoji → Ant Icons

### 使用

- **选区替换**：选中一个 frame（如「首页」「sidebar」），运行后只替换选区内 emoji
- **整页替换**：不选中任何东西直接运行，替换当前页全部 emoji

### 行为说明

- 图标尺寸自动对齐原 emoji 字号（12–24px 钳制）
- 图标颜色**沿用原 emoji 图层的填充色**（如侧边栏灰 `#595959`、选中蓝 `#1890FF`）
- 纯图标图层（如侧边栏「🏠」）：整层替换为矢量 frame
- 混合图层（如「📈 近7天预约量趋势」）：emoji 从文字中剥离，矢量图标插入文字左侧，原文字保留
- 替换完成后弹出统计：`✅ 替换了 N 个 emoji：🏠×1 🏥×1 …`

### 映射表（51 组映射，54 个可用图标）

🏠→Home 🏥→MedicineBox 🏷️→Skin 👨‍⚕️→User 📅→Calendar 📋→FileDone 👥→Team
💰→Gold ⭐→Star 📍→Environment 🖼️→Picture 📢→Notification 📰→Read 🧭→Appstore
💬→Comment 📏→Highlight 🔔→Bell ⚙️→Setting 📊→BarChart 👤→User 🔐→SafetyCertificate
📝→Audit 📈→LineChart 🥧→PieChart ▶→Right ＋→Plus ✏️→Edit 🗑️→Delete ✕→Close

第二轮（操作按钮 / 弹窗类，2026-09-20）：

📥→Download 🔑→Key ☁️→CloudUpload 📶→Wifi ♥→Heart ⚠️→Warning ✄→Scissor 🔗→Link
☑→CheckSquare ☰→Menu 🎥→VideoCamera ↶→Undo ↷→Redo ⛶→Expand 🔍→Search
✎→Edit 👁→Eye 🙈→EyeInvisible ❝→Read ☺→Smile

第三轮（患者管理残留）：🔖→Tag 🔓→Unlock 💾→Save

## 命令 2：Charts → Components（图表组件化）

### 使用

1. 打开「阳光医疗-调优版」文件，切到「首页」所在页面（或选中「首页」frame）
2. 运行插件 → **Charts → Components**
3. 完成后：
   - 新增页面「🧩 Charts」，内含 `Chart` 组件集（`Type=Trend / DeptBars / Income` 三个变体）
   - 画布中原 3 个图表卡片原位替换为对应实例（坐标不变）

### 行为说明

- **识别**：按 `svg-icon`（538×180）+ 同层 578×259 白底卡片矩形定位图表；标题文字匹配
  「预约量趋势 / 科室预约量 / 挂号收入」选择变体，匹配失败按画布位置回退
- **重建**：折线/网格用 SVG 精确重画；**柱状图用原生 Rectangle**（可直接改高度/颜色）；
  全部刻度、X 标签、数值标签为原生文本（可编辑）
- **数据**：内联自 `apps/web/src/blueprints/home.json` sample（趋势 12/8/15/10/18/22/5，
  科室 38/25/20/15/8，收入 ¥360…¥660/¥150），改数据只需在 `src/charts.part.js` 的 `CHART_SERIES` 改一行
- **保真细节**：折线图不显示 0 刻度（与原稿一致）；收入图数值全绿；末点「今日」高亮加粗
- **幂等**：已转换过（找不到 svg-icon）时提示并不重复建组件；组件集缺变体时自动整体重建
- 改完图表后重跑 `npm run visual:all` 让 Layout IR / 蓝图 / SSIM 闸门重新对齐

## 修改映射 / 数据

- 新图标：从 `apps/web/node_modules/@ant-design/icons-svg/es/asn/<Name>.js` 把 JSON 拷进 `svgs.js`，
  并在 `src/logic.part.js` 顶部 `EMOJI_MAP` 加映射
- 图表数据：编辑 `src/charts.part.js` 顶部 `CHART_SERIES`（`['标签', 数值]` 数组）
- 改完执行 `node build.mjs` 重新生成 `code.js`（构建输出含字节数与图标引用数）