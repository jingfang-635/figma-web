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
→ 冒烟 + 三闸门（visual:fields + visual:gate(AND×3) + visual:data）+ 几何腿（visual:geom：IR 控件框 ↔ DOM 框）+ 文本腿（visual:text：IR TEXT ↔ DOM 文本盒）
→ 还原轮次（visual:round = 截图 + AND×3 对比 + 宽视口锁定 + visual:data + visual:geom → **每轮再手动跑 visual:text** → 列差异 → 修代码 → 问是否下一轮）
→ GENERATED.md
```

### 快速命令

```bash
npm run visual:all   # layout / extract / shots / gen / assets / fields / gate / data / geom
npm run visual:text  # 文本腿：IR TEXT ↔ DOM 文本盒（位置/字号/颜色/多出/缺失）——还原轮次每轮必跑
npm run gen:backend  # 后端 codegen（node→Nest+Prisma / java→Spring+JPA，按 spec.stack）
npm run api
npm run web
```

> `visual:text` **未并入** `visual:all` / `visual:round` 自动链路（5 个内容屏挂起文本差异未清完，并入即每轮 FAIL）→ 还原轮次每轮手动跑，结果必须并进差异表；清完后并入。

### 稳定性与编辑纪律（必读）

详见 [figma-to-fullstack/SKILL.md](figma-to-fullstack/SKILL.md)「稳定性与编辑纪律」。核心十条：

1. **Layout IR 完整性（写屏前置）**：`visual:layout` 出现 `Missing frames:` 即失败（exit 1），必须重跑补齐；每屏 codegen 前确认 `layout-ir/<id>.json` 存在且 `tree`/`texts` 非空；还原轮次/闸门前必跑 `npm run visual:doctor -- --quick`（必含「✅ Layout IR 完整性」）——没有 IR 几何不许写屏（2026-09-25 排班屏事故根因）
2. **弹窗还原（同受无 IR 不写屏约束）**：写弹窗前必读 `layout-ir/modal-<id>.json`，禁止按组件库默认形态（vertical 表单）凭感觉写；弹窗必须进截图/对比链路（`modal.trigger` 驱动，截 `.ant-modal-content`）；标杆图含 12px 阴影白边，运行时截图补同样白边再比；doctor 必含「✅ 弹窗闸门覆盖」（2026-09-25 弹窗事故根因）
2a. **form/detail 屏还原（2026-09-25 机构信息屏事故）**：form/detail 屏同受「无 IR 不写屏」约束——布局方向/列宽/label 宽/行距/按钮位置逐项照 `layout-ir/<id>.json` 落，禁止按组件库默认 vertical 单列凭感觉写；`screenConfigs.stats` key 与后端闭环 + 表单必须回填真实数据（契约：`GET /<res>` 数组取 `list[0]`，`PUT /{id}`，`toMap` 含 `id`）。**防复发已脚本强制**：视觉闸门 AND（`SSIM≥0.85` 且 `mismatch<2%`，旧 OR 废弃）；`npm run visual:data`（闭环扫描 + 非 gate DOM 回填断言）挂入 `visual:all` / `visual:round`，违规 exit 1
2b. **区块容器/卡片底色（2026-09-26「关键指标」事故）**：**禁止按「同类栅格单元长得一样」类比推容器底色**——先在 `layout-ir/<id>.json` 找该区块的容器节点：有带 `fill` 的父节点用它；**没有带 `fill` 的父节点就必须透明，不得加卡片底**（事故根因：首页「关键指标」的 4 个 263×78 白格子是页面直接子节点、无白卡容器，实现却按其它图表卡类比套了白底 → 白格叠白卡、边界消失）。**「IR 里没有容器节点」是设计信息，不是缺失信息**；连带项（标题左内缩 26px vs `.chart-card` padding 20）也照 IR 算。**低对比度是旧闸门的结构性盲区 → 已补第三腿**：`pixelmatch threshold=0.25` 只统计色差 ≥25% 的像素，`#FFFFFF` vs `#F5F7FA`（≈3.9%）在 mismatch 里等于不存在（实测 bug 版 1.191% 反低于修复版 1.194%、SSIM 0.8692 未达 0.85 阈值，前两腿双双放行）；现 `flatBgDrift`（平坦底色漂移，只看「标杆为平坦色块处是否被改色」）兜底：事故 4.80% vs 修复 0.32% → FAIL。阈值 `VISUAL_FLATBG_MAX=0.025`（弹窗 0.06）；doctor 必含「✅ 低对比度盲区闸门（flatBg）」（校验 `.env` 4 条阈值齐全）；`--calibrate` 含度量自检（对照 0% / 半幅画布被吞 ≈50%）；FAIL 时看 `artifacts/visual-diff/<屏>.flatbg.png`（洋红=标杆平坦底色被改色）
2c. **表单几何换算（2026-09-26 机构信息「表单窄 164px」事故）**：IR 里一行是**四段** `label 88 + 间距 12 + 输入框 454 = 列 554`，而实现把 `454/1132 = 40.11%` 当成**列宽**（`grid-template-columns: 40.11% 40.11%`），antd 的 label 再从列里吃掉 77px → 输入框只剩 377（窄 77px）；`.org-full` 又用被压窄的和算 `width: 91.17%` → 地址/简介 806 而非 1032（窄 226px）。**规则：列宽必须含 label（`label + 段间距 + 控件宽`），禁止把控件宽当列宽；全宽行用 `grid-column: 1 / -1` 让浏览器 stretch，不手算百分比；label 右对齐留白用 `width: label+间距; padding-right: 间距`**。**根因之二：三条像素腿全是全屏统计量，对「尺寸/位置」偏差结构性失明**（bug 版 mismatch 1.18% / SSIM 0.868 / flatBg 1.38% —— **三腿全过**；修复版 1.05% / 0.943 / 0.12%），故新增**几何腿**：`npm run visual:geom`（`check-geometry.mjs`）把 IR 控件框（带 `stroke` 的 RECTANGLE，h 36~120）与 DOM 输入控件（取最外层去嵌套）按 (y,x) 一一配对，断言 `|dx| |dy| |dw| |dh| ≤ VISUAL_GEO_TOL`（3px）；判据全部从 IR 派生，**无按屏配置/无业务硬编码**；已挂 `visual:all` / `visual:round`，doctor 必含「✅ 几何闸门（IR↔DOM 控件框）」。**有效性自证**：事故版 CSS 复跑 → 机构信息 6 框全报错（Δw −77 / −226px）FAIL，修复版最大偏差 2px PASS。**该腿上线即抓到第 2 例同类缺陷**（医生屏搜索框 `212×32` vs IR `280×40`：裸 `<Input>` 不在 `.ant-input-affix-wrapper` 里，旧 CSS 两条都命中不到；下拉容器 32px 未一起钉 → selector 被 `!important` 拉到 40 后溢出 4px）；修复后 doctors SSIM 0.874 → **0.906**。**已知边界**：只断言输入控件框（卡片高度/文本/图标仍靠像素腿）；**modal 屏暂未纳入**（弹窗文本改由文本腿 `visual:text` 兜底，4 个弹窗像素三腿 + flatBg 现已全 PASS）；无输入控件的屏（departments/home）空转并打印屏数，不假装通过
2d. **文本级还原（2026-09-26 弹窗文本事故）**：4 个弹窗像素闸门通过，但文本逐项错——label 整体**左偏 8px**（`inline-flex` 自带 `gap:8px` 又补 `margin-left:8px` → 16px）；非必填 label 左偏 **13px**（`colon={false}` **没真删** antd `::after`，只换成空格 + 保留 `margin: 0 8px 0 2px` = 12.92px）；控件文本 14px/主题色 vs IR 15px `#333333`；「全部医生」把 IR 的**深色值** `#262626` 当成占位符渲染（antd 灰 `rgba(0,0,0,.25)`）；「选择排班日期」label 左溢出 12px（IR 里 `*` 因放不下**掉到第二行**）；预览末行多一条边框（IR 末行只有 TEXT、无描边矩形）。**根因三类**：①组件库隐式默认（缺陷全来自「我们没写的属性」）——**「关掉/补上」必须 DOM 探针实测，不能凭写了 CSS 假定生效**；②IR 的「非文本」信息（没有边框 / `*` 掉行 / 深色是值不是占位符）也是验收项，写屏前把 `(x,y,w,h,font.size,font.color)` 当清单逐项对；③**判据维度缺失**——几何腿只认带 `stroke` 的 RECTANGLE（**TEXT 不是 rect**），像素腿对 8px 位移/1px 字号结构性失明（dept 弹窗 label 全偏 8px 仍 SSIM 0.9087 / mismatch 0.54% PASS）。**防复发（已脚本强制）**：新增**文本腿** `npm run visual:text`（`scripts/check-text.mjs`）——IR `TEXT` 节点 ↔ DOM 文本盒（按 `parentElement` 分组，`Range` 量几何、computed style 量字号、SVG 取 `fill`），文本去空白归一后**多重集 + 位置最近**配对且**数量必须相等**（DOM 多出 = 组件库多渲染；IR 有 DOM 无 = 文本没落），断言 `|dx| |dy| |dw| ≤ VISUAL_TEXT_TOL`（3px）+ `|Δfont-size| ≤ VISUAL_TEXT_SIZE_TOL`（0.6px）+ 颜色全等（**alpha 合成白底**，否则占位符误判）；控件内文本走「控件值/占位符」。**豁免**（框架通用）：`*`（CSS `::after`）、单字符非中英文数字（图标字形）、落在 `<canvas>`/`<svg>` 内的 IR 文本。`visual:doctor` 必含「✅ 文本闸门（IR TEXT ↔ DOM 文本盒）」；**有效性自证**：补腿后立刻回抓第 3 例同类缺陷（「排班状态」label 左偏 13px）+ 占位符字号 + footer 取消色 + 「医生头像」误标必填 + 上传区 `＋` 文本冒充图标（IR 是 `PlusOutlined` 矢量）。**antd 正确改法**：显式 `label:not(.ant-form-item-required)::after { content: none; display: none; }` + `padding-right: 2px`；label 有 `gap:8px` 时**不要再补 margin**。**当前状态**：文本腿**未并入** `visual:all` / `visual:round` 自动链路（5 个内容屏挂起文本差异未清完，并入即每轮 FAIL）→ 还原轮次每轮**手动必跑**且结果必须并进差异表；挂起项清零后再并入阻断链路
3. **改完即验证**：每次改 `.tsx/.ts` 后跑 `npx tsc --noEmit`，防重复声明/语法错误进 HMR
4. **单实例服务**：重启前先 `netstat -ano | findstr :3001` 清理旧进程（按 PID 精确 kill，禁止按进程名全杀）；同一服务只允许一个启动任务
5. **先探活再联调**：API 起来后先 `Invoke-WebRequest http://localhost:3001/actuator/health`，通过后前端才开轮询；PowerShell 禁用 `&` 链接命令
6. **`.env` 注入 Spring 进程**：Spring 不自动读仓库根 `.env`，启动 API 前先注入环境变量再 `./mvnw spring-boot:run`（否则 `Access denied for user 'root'@'localhost'`）
7. **启动失败先读启动日志再动手**：区分 `WeakKeyException`（JWT secret 过短）/`Access denied`（.env 未注入）/外部 kill 的 BUILD FAILURE（exit -1，非构建错误），每类根因修法不同，盲目重试无效

项目差异全部由 `fixtures/<slug>/app-spec.json` 驱动（screens 全屏清单/路由/闸门账号/品牌），脚本不含业务硬编码。

用户级副本（跨项目）：`~/.cursor/skills/figma-to-fullstack/`、`~/.cursor/agents/figma-to-fullstack.md`