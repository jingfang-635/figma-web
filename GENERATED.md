# GENERATED — 阳光医疗

由 `figma-to-fullstack` 流水线生成。

## 来源

- Figma URL: https://www.figma.com/design/KLYzRbufrish4gmY4jpUS0/%E9%98%B3%E5%85%89%E5%8C%BB%E7%96%97-%E8%B0%83%E4%BC%98%E7%89%88?node-id=0-1
- fileKey: `KLYzRbufrish4gmY4jpUS0`
- 栈： A (React + NestJS + Prisma + SQLite)
- 鉴权： JWT

## 调优版增量（fileKey `KLYzRbufrish4gmY4jpUS0`）

在原有全栈上对齐「阳光医疗-调优版」，未重建模块：

| 原型屏名 | 路由（不变） |
|---|---|
| 通知管理（原消息通知） | `/notifications` |
| 广告位管理（原广告图管理） | `/banners` |
| 导航栏管理（原导航栏） | `/nav-items` |

排班弹窗改为「时段」选择 + 备注；删除确认分为无预约 / 有冲突两种。弹窗宽度 520。

画板虽改名为「广告位管理 / 导航栏管理 / 通知管理」，Figma 侧栏与页内标题仍是「广告图管理 / 导航栏 / 消息通知」，前端按节点文案显示。

视觉闸门 `npm run visual:gate` 已通过（mismatch < 2%）：home 1.38%、organization 1.80%、departments 1.93%、schedules 1.88%、modal-create-dept 1.88%。

## 字段级 100% 还原校验（本次新增）

按 [figma-to-fullstack/visual-fidelity.md](../figma-to-fullstack/visual-fidelity.md) 中「字段级 100% 还原」硬性规则，本仓库已做以下校验与修复：

### 已修复的字段级偏差

| 屏 | 修复前（错误） | 修复后（对齐原型） |
|---|---|---|
| 首页 KPI 区 | 8 项通用统计（患者总数/在职医生/今日预约/待处理预约/订单总数/评价总数/未读消息/待回复反馈） | 4 项原型 KPI：**本月预约量 / 就诊率 / 爽约率 / 本月收入** |
| 机构信息表单 | 「联系邮箱」字段 | **机构副标题**（key 由 `email` 改为 `subtitle`） |
| 科室管理列表列 | 编码 + 排序 + 状态 | **医生数量** + 排序 + 状态（移除「编码」） |
| 科室管理新增/编辑弹窗 | 含「科室编码」缺「科室图标」 | **科室图标**（必填）替换「科室编码」；「描述」改为「科室描述」 |
| 排班管理筛选 | 搜索医生姓名 + 状态下拉 | **全部科室 / 全部医生 / 日期月切换** |
| 排班管理操作按钮顺序 | 新增排班 + 批量排班 | **批量排班 + 新增排班**（与原型一致） |

### 4 屏标杆（已与原型截图对齐 ✅）

首页 / 机构信息 / 科室管理（含新增科室弹窗） / 排班管理。

### 17 屏非标杆（已对齐 ✅）

医生管理 / 预约记录 / 患者管理 / 订单管理 / 评价管理 / 消息通知 / 地址管理 / 广告图管理 / 公告管理 / 新闻列表 / 新闻分类 / 导航栏 / 意见反馈 / 用户管理 / 角色管理 / 预约规则 / 操作日志。

**对齐方式**：Figma API 限流解除后，拉取了全部 21 屏 + 7 弹窗的节点真实文本（归档于 `fixtures/figma-fields.json`），并导出全部截图到 `imports/figma/screens/`。随后：

- 按原型逐屏回填 [scripts/lib/screen-catalog.mjs](file:///d:/AITEST/figma-to-fullstack/scripts/lib/screen-catalog.mjs)（columns / formFields / filters / actions / stats / subtitle / statusMap），全部 `needsReview: false`
- 同步扩展 [schema.prisma](file:///d:/AITEST/figma-to-fullstack/apps/api/prisma/schema.prisma)：医生(挂号费/从业年限/好评率/头像)、预约(编号/金额)、患者(标签/状态)、订单(医生/科室/支付方式/支付时间)、公告(发布人)、新闻(小图/大图/类型)、新闻分类(大图)、导航(图标/参数)、反馈(图片)、用户(用户名/手机号/状态)、角色(状态)、预约规则(截止/取消规则/爽约次数)、通知(触发场景)
- 升级通用页 [ResourceListPage.tsx](file:///d:/AITEST/figma-to-fullstack/apps/web/src/templates/ResourceListPage.tsx)：支持按屏 KPI、select 筛选、多操作按钮、自定义行操作与逐屏状态文案（statusMap）
- 已通过字段一致性脚本校验：17 屏全部 OK，`needsReview: true` 数量为 0

## 快速启动

```bash
npm install
npm run api   # NestJS + Prisma，端口见 .env
npm run web   # Vite + React
```

## 视觉/字段闸门

```bash
npm run visual:all
```

闸门对照 `imports/figma/screens/*.png`，报告写入 `artifacts/visual-diff/score.json`。

## 默认账号

见 `apps/api/prisma/seed.ts`（admin / 系统管理员）。

## 相关文件

- 智能体：`figma-to-fullstack/figma-to-fullstack.md`
- Skill：`figma-to-fullstack/SKILL.md`
- 视觉规范：`figma-to-fullstack/visual-fidelity.md`（含字段级还原硬性规则）
- 屏配置：`apps/web/src/generated/screenConfigs.ts`
- 字段目录（数据源，需随截图更新）：`scripts/lib/screen-catalog.mjs`
- 全量截图导出（限流解除后运行）：`scripts/export-all-screens.mjs`（`npm run visual:shots:all`）
- 标杆页实现：`apps/web/src/pages/{Dashboard,Organization,Departments,Schedule}Page.tsx`
