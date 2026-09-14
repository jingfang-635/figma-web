# 视觉还原轮次快速参考

## 🚀 快速开始

### 第 0 步：准备阶段（一次性）

```bash
# 1. 批量导出所有 Figma 页面截图
npm run visual:shots:all

# 2. 提取字段文案
node scripts/extract-figma-texts.mjs <FILE_KEY>

# 3. 确认导出完成
ls imports/figma/screens/      # 应有 N 张 PNG
ls fixtures/figma-fields.json  # 应有字段 JSON
```

---

### 第 1 轮还原

```bash
# 1. 批量截图所有页面
node scripts/capture-screens.mjs --round=1

# 2. 批量对比（生成热力图和差异报告）
node scripts/visual-compare.mjs --round=1

# 3. 字段统计
node scripts/field-stats.mjs --round=1

# 4. 根据差异报告修复代码
# 查看：artifacts/visual-diff/round-1-report.html

# 5. 重截确认已修复页面
node scripts/capture-screens.mjs --round=1 --screens=home,departments

# 6. 再次对比确认
node scripts/visual-compare.mjs --round=1 --verify-only
```

---

### 第 2 轮还原（如需要）

```bash
# 重复上述步骤，修改 round 参数
node scripts/capture-screens.mjs --round=2
node scripts/visual-compare.mjs --round=2
node scripts/field-stats.mjs --round=2
```

---

## 📊 输出文件

### 第 1 轮输出

```
artifacts/visual-diff/
├── rounds.json                          # 轮次状态管理
├── round-1/
│   ├── actuals/                       # 运行时截图
│   │   ├── home.png
│   │   ├── departments.png
│   │   ├── manifest.json              # 截图清单
│   │   └── ...
│   ├── diff/                          # 热力图
│   │   ├── home.diff.png
│   │   ├── departments.diff.png
│   │   └── ...
│   ├── round-1-differences.json       # 差异清单
│   └── round-1-report.html            # HTML 交互报告
└── round-2/                           # 第 2 轮输出
    └── ...
```

---

## 🔍 命令行参数

### capture-screens.mjs

```bash
# 基本用法
node scripts/capture-screens.mjs --round=1

# 只截图特定页面
node scripts/capture-screens.mjs --round=1 --screens=home,departments

# 自定义 WEB_URL
WEB_URL=http://localhost:3000 node scripts/capture-screens.mjs --round=1
```

**参数说明**:
- `--round=N` - 轮次编号（必填）
- `--screens=A,B,C` - 筛选页面（可选，逗号分隔）

---

### visual-compare.mjs

```bash
# 基本用法
node scripts/visual-compare.mjs --round=1

# 只验证已修复页面（不生成新热力图）
node scripts/visual-compare.mjs --round=1 --verify-only

# 自定义 SSIM 阈值
VISUAL_SSIM_MIN=0.95 node scripts/visual-compare.mjs --round=1
```

**参数说明**:
- `--round=N` - 轮次编号（必填）
- `--verify-only` - 只验证，不生成新热力图（可选）

**环境变量**:
- `VISUAL_SSIM_MIN` - SSIM 最低要求（默认 0.97）
- `VISUAL_MISMATCH_MAX` - 最大像素差异比例（默认 0.02）

---

### field-stats.mjs

```bash
# 基本用法
node scripts/field-stats.mjs --round=1

# 查看历史轮次统计
cat artifacts/visual-diff/rounds.json
```

**参数说明**:
- `--round=N` - 轮次编号（必填）

---

## 📈 统计报告示例

```
📊 字段还原统计报告
============================================================
总字段数：156 个
已修复字段：142 个 (91.0%)
剩余差异：14 个

🔴 关键字段:
   总数：68 个
   已对齐：68 个 (100.0%)
   剩余差异：0 个

🟡 非关键字段:
   总数：88 个
   已对齐：74 个 (84.1%)
   剩余差异：14 个

📈 本轮修复：28 个
📈 累计修复：142 个
============================================================

🔍 剩余差异详情:

   🟡 非关键字段差异 (允许 5% 差异):
   - placeholder: "选择科室" vs "请选择就诊科室"
   - hint: "患者最多可提前 N 天预约" vs "预约提前天数限制"
   ... (还有 12 个非关键字段差异)

============================================================
❓ 是否进入下一轮还原？
   进入 / 下一轮 / 继续 → 从步骤 1 再跑一轮
   不进入 / 结束 / 停止 → 写 GENERATED.md，本阶段结束
============================================================
```

---

## ✅ 验收标准

### 通过标准（必须全部满足）

| 标准 | 要求 | 检查方法 |
|---|---|---|
| 关键字段对齐率 | 100% | `field-stats` 输出 |
| 非关键字段对齐率 | ≥ 95% | `field-stats` 输出 |
| 视觉闸门通过率 | 100% | `visual-compare` 输出 |
| 轮次决策 | 用户明确「不进入下一轮」 | 用户确认 |
| 文档更新 | GENERATED.md 完成 | 人工检查 |

---

## 🐛 常见问题

### Q: 截图失败怎么办？

A:
1. 确认 `api` 和 `web` 已启动
2. 检查登录账号是否正确（默认 `admin@sunshine.clinic` / `admin123`）
3. 增加等待时间：修改脚本中的 `timeout: 30000`

### Q: Figma 原图不存在怎么办？

A:
1. 运行 `npm run visual:shots:all` 重新导出
2. 如果限流（429），等待 60 秒后重试
3. 检查 `FIGMA_ACCESS_TOKEN` 是否有效

### Q: SSIM 分数过低怎么办？

A:
1. 查看热力图找出差异区域
2. 检查是字段差异还是视觉差异
3. 字段差异 → 修改 `screenConfigs.ts` 或 `Blueprint`
4. 视觉差异 → 修改 `tokens.css` 或 `app.css`
5. 重截确认：`node scripts/capture-screens.mjs --round=N --screens=xxx`

### Q: 非关键字段差异太多怎么办？

A:
1. 如果差异在 5% 以内，属于可接受范围
2. 如果超过 5%，批量修复 placeholder/hint 等文案
3. 考虑是否降低标准（如从 95% 降到 90%），需用户同意

---

## 📝 差异表模板

修复代码时使用以下模板追踪：

```markdown
| 页面 | 类型 | 差异 | 期望值 | 实际值 | 拟改文件 | 状态 |
|---|---|---|---|---|---|---|
| departments | field-critical | 列标题 | "科室图标" | "排序" | DepartmentsPage.tsx:23 | ✅ |
| home | visual | KPI 间距 | 16px | 20px | app.css:45 | ✅ |
| schedules | field-non-critical | placeholder | "选择日期" | "请选择" | SchedulePage.tsx:67 | ⚠️ |
```

---

## 🔗 相关文档

- [VISUAL_REDUCTION_ROUNDS.md](./VISUAL_REDUCTION_ROUNDS.md) - 完整流程说明
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - 故障排查手册
- [FIGMA_TOKEN_SETUP.md](./FIGMA_TOKEN_SETUP.md) - Token 配置指南
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - 实施总结

---

**最后更新**: 2026-09-14  
**版本**: v1.0
