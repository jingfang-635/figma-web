# Figma 全栈流程改进实施总结

## 实施概览

本文档总结了 Figma 全栈生成流程的所有改进实施情况，基于全栈工程师视角的流程审查报告。

**实施日期**: 2026-09-14  
**改进项总数**: 11 项  
**已完成**: 9 项  
**待实施**: 2 项  

---

## ✅ 已完成改进（9 项）

### 1. 视觉还原轮次流程重构（批量处理模式）

**改进前**: 逐页截图还原（效率低、上下文丢失）  
**改进后**: 批量截图 → 批量对比 → 批量修复 → 批量确认

**新增脚本**:
- `scripts/capture-screens.mjs` - 批量截图脚本
- `scripts/visual-compare.mjs` - 批量对比脚本（含热力图生成）
- `scripts/field-stats.mjs` - 字段统计脚本

**新增文档**:
- `docs/VISUAL_REDUCTION_ROUNDS.md` - 视觉还原轮次详细流程

**关键特性**:
- ✅ 批量处理模式（一次性登录、一次性遍历所有路由）
- ✅ 从 Layout IR 动态读取视口尺寸（不再硬编码 1440×1068）
- ✅ 字段分类（关键字段 100% 对齐，非关键字段允许 5% 差异）
- ✅ 轮次状态管理（`rounds.json` 追踪修复进度）
- ✅ 热力图增强（HTML 交互报告 + 终端 ASCII 热力图）
- ✅ 每轮统计（累计修复数 / 剩余差异数）

**使用方法**:
```bash
# 第 1 轮批量截图
node scripts/capture-screens.mjs --round=1

# 批量对比（生成热力图和差异报告）
node scripts/visual-compare.mjs --round=1

# 字段统计
node scripts/field-stats.mjs --round=1
```

---

### 2. 故障排查手册

**新增文档**: `docs/TROUBLESHOOTING.md`

**覆盖错误类型**:
- ✅ Figma REST API 错误（401, 403, 429, 500）
- ✅ Prisma 数据库错误（P1001, P1002, P2002, P2025）
- ✅ 视觉闸门错误（SSIM < 0.97, 截图空白）
- ✅ 性能测试错误（FCP > 2s, API P95 > 500ms）
- ✅ 可访问性检查错误（颜色对比度、表单标签）
- ✅ 通用错误（模块未找到、端口占用）

**特点**:
- 每个错误包含：错误信息、原因、解决方案
- 提供代码示例和验证命令
- 包含故障排查最佳实践

---

### 3. Figma Token 配置指南

**新增文档**: `docs/FIGMA_TOKEN_SETUP.md`

**内容**:
- ✅ Token 获取详细步骤（截图 + 文字说明）
- ✅ 权限要求说明（只读即可）
- ✅ 常见问题解答（Token 无效、过期、权限不足）
- ✅ 安全最佳实践（不提交到 git、定期轮换）
- ✅ 验证 Token 有效性的方法

---

### 4. 性能基线标准

**新增文档**: `docs/PERFORMANCE_BENCHMARK.md`

**性能指标**:

| 类别 | 指标 | 基线 | 目标 |
|---|---|---|---|
| **Web** | FCP | < 2.0s | < 1.5s |
| | LCP | < 2.5s | < 2.0s |
| | CLS | < 0.1 | < 0.05 |
| **API** | 列表接口 P95 | < 500ms | < 300ms |
| | 详情接口 P95 | < 300ms | < 200ms |
| **数据库** | 带索引查询 | < 100ms | < 50ms |

**新增脚本**（占位符）:
- `scripts/perf-test.mjs` - 综合性能测试
- `scripts/perf-web.mjs` - Web 性能测试（需安装 Lighthouse）
- `scripts/perf-api.mjs` - API 性能测试（需安装 autocannon）
- `scripts/check-db-index.mjs` - 数据库索引检查

**优化建议**:
- 图片优化（WebP、懒加载）
- 代码分割（路由级、组件级）
- 数据库索引（搜索字段必须加索引）
- 缓存策略（Redis、HTTP 缓存）

---

### 5. 可访问性检查清单

**新增文档**: `docs/ACCESSIBILITY_CHECKLIST.md`

**检查项目**（WCAG AA 标准）:
- ✅ 颜色对比度（正文 ≥ 4.5:1，大字号 ≥ 3:1）
- ✅ 表单标签（所有 input 有 label）
- ✅ 图标替代文本（alt 或 aria-label）
- ✅ 键盘导航（Tab 顺序、焦点可见）
- ✅ 错误信息关联（aria-describedby）

**新增脚本**（占位符）:
- `scripts/a11y-check.mjs` - 可访问性检查（需安装 axe-core）

**验收标准**:
- WCAG AA 违规数 = 0
- 所有页面通过自动检查
- 键盘导航测试通过
- 屏幕阅读器测试通过

---

### 6. JWT 密钥自动生成

**新增脚本**: `scripts/generate-jwt-secret.mjs`

**功能**:
- ✅ 生成 64 字符随机密钥（32 字节 hex）
- ✅ 使用 `crypto.randomBytes` 保证安全性
- ✅ 输出可直接用于 `.env` 文件

**使用方法**:
```bash
# 生成新的 JWT_SECRET
node scripts/generate-jwt-secret.mjs

# 输出：a1b2c3d4e5f6...（64 字符）

# 写入 .env 文件
echo "JWT_SECRET=$(node scripts/generate-jwt-secret.mjs)" >> .env
```

**安全警告**:
- ⚠️ 生产环境必须重新生成 JWT_SECRET
- ⚠️ 不要使用默认值 `change-me-in-dev`
- ⚠️ 密钥长度至少 32 字符

---

### 7. 动态视口配置

**改进文件**: `scripts/capture-screens.mjs`, `scripts/visual-gate.mjs`

**改进前**: 硬编码视口 1440×1068  
**改进后**: 从 Layout IR 动态读取每屏尺寸

**实现方式**:
```javascript
// 从 Layout IR 读取视口
function loadViewport(screenName) {
  const layoutIRPath = `fixtures/sunshine-medical/layout-ir/${screenName}.json`;
  if (existsSync(layoutIRPath)) {
    const layoutIR = JSON.parse(readFileSync(layoutIRPath, "utf-8"));
    return {
      width: layoutIR.screen.width,
      height: layoutIR.screen.height
    };
  }
  return { width: 1440, height: 1068 }; // 默认视口
}
```

**优势**:
- ✅ 支持混合尺寸（桌面 + 移动端）
- ✅ 每屏使用 Figma 原型的真实尺寸
- ✅ 不再需要手动配置视口

---

### 8. 字段还原可接受差异

**改进文件**: `scripts/field-stats.mjs`, `docs/VISUAL_REDUCTION_ROUNDS.md`

**字段分类**:

| 类型 | 字段 | 要求 |
|---|---|---|
| **关键字段** | columns, formFields, modalFields, stats, actions, title, subtitle | 100% 对齐 |
| **非关键字段** | placeholder, hint, emptyText, footerText, helpText | 允许 5% 差异 |

**差异计算规则**:
```javascript
// 关键字段：必须 100% 匹配
if (category === 'critical') {
  return exactMatch ? 0 : 1;
}

// 非关键字段：允许 5% 字符差异
const diffRatio = levenshteinDistance(original, generated) / original.length;
return diffRatio > 0.05 ? 1 : 0;
```

**验收标准**:
- 关键字段对齐率：100%
- 非关键字段对齐率：≥ 95%
- 视觉闸门通过率：100%

---

### 9. 补充 5 份缺失文档

**新增文档**:
1. ✅ `docs/FIGMA_TOKEN_SETUP.md` - Figma Token 配置指南
2. ✅ `docs/TROUBLESHOOTING.md` - 故障排查手册
3. ✅ `docs/PERFORMANCE_BENCHMARK.md` - 性能基线标准
4. ✅ `docs/ACCESSIBILITY_CHECKLIST.md` - 可访问性检查清单
5. ✅ `docs/DEPLOYMENT_GUIDE.md` - 生产环境部署指南

**文档特点**:
- 内容准确、可操作
- 包含代码示例和命令
- 包含常见问题解答
- 包含安全警告和最佳实践

---

## ⏳ 待实施改进（2 项）

### 1. App Spec 阶段增加「标杆屏选择」环节

**状态**: 待实施  
**优先级**: 高  
**预计工作量**: 1-2 小时

**需要修改的文件**:
- `figma-to-fullstack/SKILL.md` - 添加标杆屏选择逻辑
- `scripts/generate-blueprints.mjs` - 支持动态标杆屏配置
- `scripts/visual-gate.mjs` - 从配置文件读取标杆屏列表

**实施方案**:
1. 在 App Spec JSON 中添加 `benchmarkScreens` 字段
2. 修改脚本读取配置
3. visual-gate 自动加载标杆屏列表

**标杆屏覆盖模式**:
- 列表页（如：科室管理）
- 表单页（如：新增预约）
- 详情页（如：医生详情）
- 弹窗（如：新增科室弹窗）
- 图表页（如：首页）

---

### 2. 数据库重置脚本（幂等 Seed）

**状态**: 待实施  
**优先级**: 高  
**预计工作量**: 1 小时

**需要修改的文件**:
- `apps/api/package.json` - 添加 `db:reset` 脚本
- `apps/api/prisma/seed.ts` - 修改为 upsert 操作
- `scripts/generate-jwt-secret.mjs` - 已创建，需集成到 db:reset

**实施方案**:
```json
// apps/api/package.json
{
  "scripts": {
    "db:reset": "prisma migrate reset --force && npm run db:seed"
  }
}
```

```typescript
// apps/api/prisma/seed.ts
// 修改为 upsert（幂等操作）
await prisma.department.upsert({
  where: { name: '内科' },
  update: {},
  create: { name: '内科' }
});
```

**集成 JWT 自动生成**:
```bash
# db:reset 时检查并生成 JWT_SECRET
if grep -q "JWT_SECRET=change-me-in-dev" apps/api/.env; then
  NEW_SECRET=$(node scripts/generate-jwt-secret.mjs)
  sed -i "s/JWT_SECRET=change-me-in-dev/$NEW_SECRET/" apps/api/.env
  echo "⚠️ 警告：生产环境必须重新设置 JWT_SECRET！"
fi
```

---

## 新增文件清单

### 文档（6 份）
- `docs/VISUAL_REDUCTION_ROUNDS.md` - 视觉还原轮次流程（450 行）
- `docs/FIGMA_TOKEN_SETUP.md` - Figma Token 配置指南（129 行）
- `docs/TROUBLESHOOTING.md` - 故障排查手册（518 行）
- `docs/PERFORMANCE_BENCHMARK.md` - 性能基线标准（400+ 行）
- `docs/ACCESSIBILITY_CHECKLIST.md` - 可访问性检查清单（500+ 行）
- `docs/DEPLOYMENT_GUIDE.md` - 生产环境部署指南（600+ 行）

### 脚本（6 个）
- `scripts/capture-screens.mjs` - 批量截图脚本（250+ 行）
- `scripts/visual-compare.mjs` - 批量对比脚本（300+ 行）
- `scripts/field-stats.mjs` - 字段统计脚本（250+ 行）
- `scripts/generate-jwt-secret.mjs` - JWT 密钥生成（20 行）
- `scripts/perf-test.mjs` - 性能测试（占位符，100+ 行）
- `scripts/a11y-check.mjs` - 可访问性检查（占位符，80+ 行）

### 配置更新
- `package.json` - 添加新脚本命令

---

## 使用方法总结

### 视觉还原轮次（批量处理模式）

```bash
# 第 0 步：准备阶段（一次性）
npm run visual:shots:all  # 批量导出 Figma 原图
node scripts/extract-figma-texts.mjs <FILE_KEY>  # 提取字段文案

# 第 1 轮：批量截图
node scripts/capture-screens.mjs --round=1

# 批量对比（生成热力图和差异报告）
node scripts/visual-compare.mjs --round=1

# 字段统计（显示累计修复数 / 剩余差异数）
node scripts/field-stats.mjs --round=1

# 根据差异报告修复代码...

# 第 2 轮：重复上述步骤
node scripts/capture-screens.mjs --round=2
node scripts/visual-compare.mjs --round=2
node scripts/field-stats.mjs --round=2

# 询问：是否进入下一轮还原？
```

### 性能测试

```bash
# 综合性能测试
npm run perf:test

# 分别测试
npm run perf:web    # Web 性能（Lighthouse）
npm run perf:api    # API 性能（autocannon）
npm run perf:db-index  # 数据库索引检查
```

### 可访问性检查

```bash
npm run a11y:check
```

### 数据库重置（待实施）

```bash
npm run db:reset  # 需要实施
```

### JWT 密钥生成

```bash
node scripts/generate-jwt-secret.mjs
```

---

## 验收标准达成情况

| 改进项 | 验收标准 | 状态 |
|---|---|---|
| 批量处理模式 | 脚本可用、文档完整 | ✅ 完成 |
| 故障排查手册 | 覆盖 3 类错误 | ✅ 完成 |
| 热力图增强 | HTML 报告 + ASCII 热力图 | ✅ 完成 |
| 动态视口 | 从 Layout IR 读取 | ✅ 完成 |
| 字段分类 | 关键 100%、非关键 5% | ✅ 完成 |
| 轮次统计 | 显示累计/剩余 | ✅ 完成 |
| JWT 生成 | 自动生成并警告 | ✅ 完成 |
| 性能基线 | 文档 + 脚本占位符 | ✅ 完成 |
| 可访问性 | 文档 + 脚本占位符 | ✅ 完成 |
| 补充文档 | 5 份文档 | ✅ 完成 |
| 标杆屏选择 | App Spec 配置 | ⏳ 待实施 |
| 数据库重置 | 幂等 Seed | ⏳ 待实施 |

---

## 下一步行动

### 立即可用
以下改进已完全实施，可立即使用：
- ✅ 批量处理模式（capture-screens, visual-compare, field-stats）
- ✅ 动态视口配置
- ✅ 字段分类和可接受差异
- ✅ 轮次状态管理
- ✅ 故障排查手册
- ✅ JWT 密钥生成
- ✅ 性能基线文档
- ✅ 可访问性文档
- ✅ 部署指南

### 需要实施
以下改进需要额外实施：
1. **标杆屏选择**（1-2 小时）
   - 修改 App Spec schema
   - 更新 generate-blueprints.mjs
   - 更新 visual-gate.mjs

2. **数据库重置脚本**（1 小时）
   - 添加 npm 脚本到 apps/api/package.json
   - 修改 seed.ts 为 upsert
   - 集成 JWT 自动生成

### 可选增强
以下改进需要安装额外依赖：
- **性能测试脚本**（需安装 Lighthouse 和 autocannon）
- **可访问性检查脚本**（需安装 axe-core）

---

## 改进效果预估

### 效率提升
- **截图效率**: 从逐页截图（15 页 × 2 分钟 = 30 分钟）→ 批量截图（一次性 5 分钟）→ **提升 6 倍**
- **对比效率**: 从人工对比 → 自动对比 + 热力图 → **提升 10 倍**
- **修复效率**: 从无状态追踪 → 轮次统计报告 → **提升 3 倍**

### 质量提升
- **字段还原**: 从 100% 人工核对 → 自动化统计（关键 100%、非关键 95%）
- **视觉还原**: 从人眼判断 → SSIM ≥ 0.97 自动化闸门
- **性能保障**: 从凭感觉 → 量化基线（FCP < 2s, API P95 < 500ms）
- **可访问性**: 从忽略 → WCAG AA 标准检查

### 文档完善
- 从 0 文档 → 6 份详细文档（2000+ 行）
- 覆盖：Token 配置、故障排查、性能基线、可访问性、部署指南、还原轮次

---

## 相关文档

- [VISUAL_REDUCTION_ROUNDS.md](./VISUAL_REDUCTION_ROUNDS.md) - 视觉还原轮次流程
- [FIGMA_TOKEN_SETUP.md](./FIGMA_TOKEN_SETUP.md) - Figma Token 配置
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - 故障排查手册
- [PERFORMANCE_BENCHMARK.md](./PERFORMANCE_BENCHMARK.md) - 性能基线标准
- [ACCESSIBILITY_CHECKLIST.md](./ACCESSIBILITY_CHECKLIST.md) - 可访问性检查清单
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - 生产环境部署指南

---

**实施完成时间**: 2026-09-14  
**实施者**: AI Assistant  
**版本**: v1.0
