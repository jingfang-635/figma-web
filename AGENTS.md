# Agents

## figma-to-fullstack

从 Figma 原型生成可运行全栈（技术栈由用户逐层选择，无默认）。

- **智能体定义**：[`figma-to-fullstack/figma-to-fullstack.md`](figma-to-fullstack/figma-to-fullstack.md)
- **Skill**：[`figma-to-fullstack/SKILL.md`](figma-to-fullstack/SKILL.md)
- **前端还原方案**：[`figma-to-fullstack/visual-fidelity.md`](figma-to-fullstack/visual-fidelity.md)（技术栈由用户逐层选择，无默认）

### 流水线（spec 驱动，脚本零业务硬编码）

```
npm run init:project -- --slug <slug> --file <key>   # 拉结构 + app-spec 骨架
→ App Spec 人工闸门（实体/路由/screens 全屏清单/seedAdmin）
→ visual:layout / extract / shots(:all) / assets      # Layout IR / Visual IR / 对照 PNG
→ 字段回填（figma-fields → spec，needsReview 清零）
→ visual:gen                                          # tokens/主题文件/blueprints/screenConfigs（按选定框架）
→ gen:backend                                         # spec.stack 分发 adapter：DB schema/seed + auth + CRUD + dashboard
→ 前端（按用户选定框架与组件库：全屏 Blueprint + list 模板）
→ 冒烟 + 闸门组（visual:fields + visual:gate(三腿 AND) + visual:data(闭环+回填+活数据) + visual:geom + visual:text）
→ 还原轮次（visual:round = 截图 + 三腿 AND 对比 + 宽视口锁定 + visual:data + visual:geom + dev:up
            → 每轮再手动跑 visual:text → 列差异 → 修代码 → 收尾 dev:up 保证服务在跑 → 问是否下一轮）
→ GENERATED.md
```

### 快速命令

```bash
npm run visual:all   # layout / extract / shots / gen / assets / fields / gate / data / geom
npm run visual:text  # 文本腿：IR TEXT ↔ DOM 文本盒（位置/字号/颜色/多出/缺失）——还原轮次每轮必跑
npm run visual:data  # 数据腿：config↔API 闭环 + 非 gate DOM 回填 + 活数据（聚合非空/非平坦 + 派生字段交叉验证）
npm run dev:up       # 服务就绪闸：api+web 已在跑则跳过；未跑则按端口清旧实例 → 后台启动 → 探活（轮次收尾必跑）
npm run docs:lint    # 流程文档零硬编码复查
npm run gen:backend  # 后端 codegen（按 spec.stack 分发 adapter）
npm run api
npm run web
```

> `visual:text` **未并入** `visual:all` / `visual:round` 自动链路（内容屏仍有挂起文本差异，并入即每轮 FAIL）→ 还原轮次每轮手动跑，结果必须并进差异表；清完后并入。

### 零硬编码（本文档、脚本、生成物一律适用）

屏名 / 路由 / 字段 / 文案 / 尺寸 / 坐标 / 百分比 / 颜色 / 样例数据 / 凭证一律从 `fixtures/<slug>/app-spec.json`、`fixtures/<slug>/layout-ir/*.json`、仓库根 `.env` 派生。**文档与脚本不得复述具体值**；由 `npm run docs:lint`（`scripts/check-doc-hardcode.mjs`）机械强制，`visual:doctor` 含「流程文档零硬编码」项。

**页面/组件只消费生成物**：色值走生成 tokens、冻结样本走 `screenConfigs[].sample`、屏名/品牌/侧栏条目走 `screenConfigs` 生成导出、屏配置按路由取；页面不得自带副本。`visual:doctor` 含「页面层零硬编码」，逐行扫描页面/组件源码，命中即报错。

### 稳定性与编辑纪律（必读）

详见 [figma-to-fullstack/SKILL.md](figma-to-fullstack/SKILL.md)「稳定性与编辑纪律」。核心十条：

1. **Layout IR 完整性（写屏前置）**：`visual:layout` 出现 `Missing frames:` 即失败（exit 1），必须重跑补齐；每屏 codegen 前确认 `layout-ir/<id>.json` 存在且 `tree`/`texts` 非空；还原轮次/闸门前必跑 `npm run visual:doctor -- --quick`（必含「✅ Layout IR 完整性」）——没有 IR 几何不许写屏
2. **弹窗还原（同受无 IR 不写屏约束）**：写弹窗前必读 `layout-ir/modal-<id>.json`，禁止按组件库默认形态（如 vertical 表单）凭感觉写；弹窗必须进截图/对比链路（`modal.trigger` 驱动，截 `.ant-modal-content`）；标杆图含阴影余量，运行时截图按同一余量补齐再比（余量从 IR 的 shadow 派生，不写死）；doctor 必含「✅ 弹窗闸门覆盖」
2a. **form/detail 屏还原**：form/detail 屏同受「无 IR 不写屏」约束——布局方向/列宽/label 宽/行距/控件与按钮位置逐项照 `layout-ir/<id>.json` 落，禁止按组件库默认 vertical 单列凭感觉写；`screenConfigs.stats` key 与后端闭环 + 表单必须回填真实数据（契约：`GET /<res>` 数组取 `list[0]`，`PUT /{id}`，`toMap` 含 `id`）。**防复发已脚本强制**：视觉闸门三腿 AND（阈值取 `.env`，旧 OR 废弃）；`npm run visual:data`（闭环扫描 + 非 gate DOM 回填断言）挂入 `visual:all` / `visual:round`，违规 exit 1
2b. **区块容器/卡片底色**：**禁止按「同类栅格单元长得一样」类比推容器底色**——先在 `layout-ir/<id>.json` 找该区块的容器节点：有带 `fill` 的父节点用它；**没有带 `fill` 的父节点就必须透明，不得加卡片底**（否则色块叠卡片、边界消失）。**「IR 里没有容器节点」是设计信息，不是缺失信息**；连带项（标题/图标的左内缩、图标相对区块左缘的偏移）也照 IR 算。**低对比度是旧闸门的结构性盲区 → 已补第三腿**：`pixelmatch` 只统计超过色差阈值的像素，低对比色对在 mismatch 里等于不存在（bug 版甚至更低），SSIM 又被整屏稀释；现 `flatBgDrift`（只看「标杆为平坦色块处是否被改色」）兜底。阈值全部取 `.env`（缺一即报错）；doctor 必含「✅ 低对比度盲区闸门（flatBg）」；`--calibrate` 含度量自检（对照 0% / 半幅画布被吞约半幅）；FAIL 时看 `artifacts/visual-diff/<屏>.flatbg.png`（洋红=标杆平坦底色被改色）
2c. **表单几何换算**：IR 里一行是 `label 宽 + 段间距 + 控件宽 = 列宽`，实现若把 `控件宽 / 卡内宽` 当列百分比，组件库的 label 再从列里吃掉一段 → 控件二次压窄；全宽行再用压窄的列和手算百分比 → 偏差叠加。**规则：列宽必须含 label，禁止把控件宽当列宽；全宽行用 `grid-column: 1 / -1` 让浏览器 stretch，不手算百分比；label 右对齐留白用「label 容器宽 = label 宽 + 段间距 + padding-right」表达**。**根因之二：三条像素腿全是全屏统计量，对「尺寸/位置」偏差结构性失明**，故有**几何腿**：`npm run visual:geom`（`check-geometry.mjs`）把 IR 控件框与 DOM 输入控件（取最外层去嵌套）按 (y,x) 一一配对，断言 `|dx| |dy| |dw| |dh| ≤ VISUAL_GEO_TOL`；判据全部从 IR 派生，**无按屏配置/无业务硬编码**；已挂 `visual:all` / `visual:round`，doctor 必含「✅ 几何闸门（IR↔DOM 控件框）」。**有效性自证**：事故版 CSS 复跑必须 FAIL、修复版必须 PASS。**已知边界**：只断言输入控件框（卡片高度/文本/图标仍靠像素腿）；**modal 屏暂未纳入**（弹窗文本改由文本腿 `visual:text` 兜底）；无输入控件的屏空转并打印屏数，不假装通过
2d. **文本级还原**：弹窗可能像素闸门通过、文本却逐项错——label 整体偏移（组件库 label 自带间距又「补」一次 / 「关闭冒号」没真删 `::after`）；控件文本取组件库默认字号/字色而非 IR；IR 的**深色值是「值」却被渲染成灰占位符**；label 放不下时 IR 会**换行**而实现左溢出；末行**没有描边矩形**却保留了 border。**根因三类**：①组件库隐式默认（缺陷全来自「我们没写的属性」）——**「关掉/补上」必须 DOM 探针实测**；②IR 的「非文本」信息（没有边框 / 星号掉行 / 深色是值不是占位符）也是验收项；③**判据维度缺失**——几何腿只认带 `stroke` 的 RECTANGLE（**TEXT 不是 rect**）且不覆盖弹窗，像素腿对整列位移/字号差结构性失明。**防复发（已脚本强制）**：**文本腿** `npm run visual:text`（`scripts/check-text.mjs`）——IR `TEXT` 节点 ↔ DOM 文本盒（按 `parentElement` 分组，`Range` 量几何、computed style 量字号、SVG 取 `fill`），文本去空白归一后**多重集 + 位置最近**配对且**数量必须相等**，断言 `|dx| |dy| |dw| ≤ VISUAL_TEXT_TOL` + `|Δ字号| ≤ VISUAL_TEXT_SIZE_TOL` + 颜色全等（**alpha 合成白底**）；控件内文本走「控件值/占位符」。**豁免**（框架通用）：`*`（CSS `::after`）、单字符非中英文数字（图标字形）、落在 `<canvas>`/`<svg>` 内的 IR 文本。doctor 必含「✅ 文本闸门（IR TEXT ↔ DOM 文本盒）」。**当前状态**：文本腿**未并入**自动链路（挂起差异未清完）→ 还原轮次每轮**手动必跑**且结果并进差异表；清零后再并入阻断链路
2e. **数据链路（活数据）**：三处「有标签、无数据」同时出现——统计屏 KPI/折线全 0、柱图退化成等值占位；列表屏关联列整列为空；日历屏格子里没有关联名称。**像素三腿 + 几何腿 + 文本腿全部 PASS**，因为它们都在 gate 模式跑、冻结 Blueprint `sample`，测的是「实现 vs IR」，**与真实接口/数据库无关**。根因四层：① 时间窗口类种子用**绝对历史日期**写死 → 窗口聚合（本月/近 N 天/今日）命中 0 行；② CRUD 映射层（`toMap`）只映射实体自身列，**没按 spec 的 `relations` 做计数/关联取值** → 字段在响应里不存在；③ 统计接口是占位（常数/近似均分）；④ 前端用样例常量兜底 → 缺陷表现为**假数据**而非空白。**规则：数据契约进 spec 不进页面**——`relations[]`（`count`/`lookup`）+ `dashboard`（`metrics`/`rates`/`amounts`/`charts`，`window` = `month|last7|today|all`）由 codegen 生成真实实现；**时间窗口类种子必须用相对偏移**（如 `{ "$dayOffset": N }`，codegen 求值成「当前日期 + N」落库）且**窗口内外都要有行**；响应必须含声明的派生字段（后端注入，不许前端自己算）；前端非 gate 模式**禁止样例兜底/`?? 0`**（缺字段必须在闸门暴露）。**防复发（已脚本强制）**：`npm run visual:data` 第三条腿 `scripts/check-live-data.mjs`（**非 gate** 真实接口 + DOM）断言图表序列非空且**非平坦**、`count` 与关联表**交叉求和**一致、`lookup` 与目标行一致、页面确实渲染了这些值；挂入 `visual:all` / `visual:round`，doctor 必含「✅ 活数据闸门」（校验脚本**已挂入** `visual:data` + 判据未失明）。**有效性自证**：改 spec 的 `relations[].field` / `dashboard.charts[].key` 后复跑必须 FAIL
2f. **页面层只消费生成物**：页面/组件把生成物里已有的东西又抄了一份——色值直接写十六进制、冻结样本在页面里再声明常量、屏名/品牌/侧栏条目标签写成 JSX 字面量。**前三类腿比的都是运行时渲染，对「抄了一份」完全失明**（抄一份同样渲染、同样过闸；生成物改了页面却不跟着变，两份真相必然漂移）。**规则**：色值走生成 tokens（IR 派生）、冻结样本走 `screenConfigs[].sample`（spec 声明 → codegen 下发）、屏名/品牌/侧栏条目走 `screenConfigs` 生成导出、屏配置按**路由**取（不按屏名 `find`）。**防复发（已脚本强制）**：`visual:doctor` 含「✅ 页面层零硬编码」，逐行扫描 `apps/web/src/{pages,components}` 下 `.tsx/.ts`，判据 = ① 十六进制色值字面量 ② 按屏名 `find` ③ 业务文案副本（spec 屏名/品牌/sample 叶子 + 侧栏条目标签；通用词与 chrome 结构名豁免）。**有效性自证**：把任一生成物的值抄回页面后复跑必须 FAIL
3. **改完即验证**：每次改 `.tsx/.ts` 后跑 `npx tsc --noEmit`，防重复声明/语法错误进 HMR
4. **单实例服务**：重启前先 `netstat -ano | findstr :<API_PORT>`（端口取 `.env`，不写死）清理旧进程（按 PID 精确 kill，禁止按进程名全杀）；同一服务只允许一个启动任务。**「清旧实例 + 单实例启动 + 探活」已脚本化为 `npm run dev:up`（幂等）**——还原轮次收尾必跑（`visual:round` 末尾已串联），未就绪即 exit 1
5. **先探活再联调**：API 起来后先 `Invoke-WebRequest http://localhost:<API_PORT>/actuator/health`，通过后前端才开轮询；PowerShell 禁用 `&` 链接命令
6. **`.env` 注入 Spring 进程**：Spring 不自动读仓库根 `.env`，启动 API 前先注入环境变量再 `./mvnw spring-boot:run`（否则数据库连接取默认值导致 `Access denied`）
7. **启动失败先读启动日志再动手**：区分 `WeakKeyException`（JWT secret 过短）/`Access denied`（.env 未注入）/外部关停的 Maven 报错（`Process terminated with exit code: <非 0>`，日志无应用级错误即非构建错误；`dev:up` 替换旧实例即属此列，退出码 1 是预期），每类根因修法不同，盲目重试无效

项目差异全部由 `fixtures/<slug>/app-spec.json` 驱动（screens 全屏清单/路由/闸门账号/品牌），脚本与文档均不含业务硬编码。

用户级副本（跨项目）：`~/.cursor/skills/figma-to-fullstack/`、`~/.cursor/agents/figma-to-fullstack.md`
