# 故障排查手册

本手册提供 Figma 全栈生成过程中常见错误的诊断和解决方案。

## 目录

- [Figma REST API 错误](#figma-rest-api-错误)
- [Prisma 数据库错误](#prisma-数据库错误)
- [视觉闸门错误](#视觉闸门错误)
- [性能测试错误](#性能测试错误)
- [可访问性检查错误](#可访问性检查错误)
- [通用错误](#通用错误)

---

## Figma REST API 错误

### 401 Unauthorized

**错误信息**：
```
Error: 401 Unauthorized
Invalid or missing access token
```

**原因**：
- Token 无效或已删除
- Token 未正确配置到 `.env` 文件
- Token 格式错误（有多余空格或引号）

**解决方案**：
1. 检查 `.env` 文件中的 `FIGMA_ACCESS_TOKEN` 是否存在
2. 确认 Token 值正确（没有多余空格）
3. 重新生成 Token（参考 [FIGMA_TOKEN_SETUP.md](./FIGMA_TOKEN_SETUP.md)）
4. 重启终端或重新加载环境变量

**验证命令**：
```bash
# 测试 Token 是否有效
curl -H "X-Figma-Token: YOUR_TOKEN" \
     https://api.figma.com/v1/files/YOUR_FILE_KEY
```

---

### 403 Forbidden

**错误信息**：
```
Error: 403 Forbidden
Insufficient permissions
```

**原因**：
- Token 权限不足（未选择只读权限）
- 文件属于团队但 Token 无团队访问权限
- 文件已设置为私有且你无权访问

**解决方案**：
1. 重新创建 Token，确保选择 "**Read only files**" 权限
2. 确认你对目标文件有访问权限
3. 如果是团队文件，联系团队管理员授予权限

---

### 429 Too Many Requests

**错误信息**：
```
Error: 429 Too Many Requests
Rate limit exceeded. Retry after: 60
```

**原因**：
- Figma API 限流（默认 120 请求/分钟）
- 批量导出时请求过快

**解决方案**：
1. **等待**：查看响应头 `Retry-After` 指定的秒数
2. **指数退避**：每次失败后等待时间翻倍（1s → 2s → 4s → 8s...）
3. **批量导出**：使用 `npm run visual:shots:all` 而非逐个导出
4. **缓存结果**：已导出的截图不要重复导出

**代码示例**（指数退避）：
```javascript
async function fetchWithRetry(url, token, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    const res = await fetch(url, {
      headers: { 'X-Figma-Token': token }
    });
    
    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After') || Math.pow(2, i);
      console.log(`限流，等待 ${retryAfter} 秒...`);
      await sleep(retryAfter * 1000);
      continue;
    }
    
    return res;
  }
  throw new Error('超过最大重试次数');
}
```

---

### 500 Server Error

**错误信息**：
```
Error: 500 Internal Server Error
Figma API server error
```

**原因**：
- Figma 服务端临时故障
- 网络问题

**解决方案**：
1. 等待 5 分钟后重试
2. 检查 Figma 状态页面：[status.figma.com](https://status.figma.com)
3. 如果持续失败，联系 Figma 支持

---

## Prisma 数据库错误

### P1001: Cannot connect to database

**错误信息**：
```
Error: P1001: Can't reach database server at `localhost:5432`
```

**原因**：
- Docker 容器未启动
- 数据库服务未运行
- 端口被占用

**解决方案**：
```bash
# 1. 检查 Docker 容器状态
docker ps | figma-postgres

# 2. 启动数据库容器
docker compose up -d

# 3. 检查容器日志
docker logs figma-postgres

# 4. 确认端口监听
netstat -an | grep 5432
```

---

### P1002: Database does not exist

**错误信息**：
```
Error: P1002: Database `fsg_db` does not exist
```

**原因**：
- 数据库未创建
- 数据库名配置错误

**解决方案**：
```bash
# 运行数据库重置脚本
npm run db:reset

# 或手动创建
npx prisma migrate dev --name init
```

---

### P2002: Unique constraint failed

**错误信息**：
```
Error: P2002: Unique constraint failed on the fields: (`name`)
```

**原因**：
- Seed 数据重复插入
- 使用了 `create` 而非 `upsert`

**解决方案**：
修改 `prisma/seed.ts` 为幂等操作：
```typescript
// ❌ 错误：会重复插入
await prisma.department.create({
  data: { name: '内科' }
});

// ✅ 正确：幂等操作
await prisma.department.upsert({
  where: { name: '内科' },
  update: {},
  create: { name: '内科' }
});
```

---

### P2025: Record not found

**错误信息**：
```
Error: P2025: The record to update does not exist
```

**原因**：
- 外键关联的记录不存在
- 尝试更新或删除不存在的记录

**解决方案**：
1. 检查外键关联数据是否存在
2. 确保 Seed 顺序正确（先创建父记录，再创建子记录）
3. 使用 `connectOrCreate` 替代 `connect`

---

## 视觉闸门错误

### SSIM < 0.97

**错误信息**：
```
🔴 视觉闸门失败：首页 SSIM 0.923 < 0.97
```

**原因**：
- 页面视觉差异过大
- 字段文案不匹配
- 布局间距不一致
- 颜色或字体不同

**解决方案**：
1. **查看热力图**：打开 `artifacts/visual-diff/round-N-report.html`
2. **识别差异类型**：
   - 字段差异 → 修改 `screenConfigs.ts` 或 `Blueprint`
   - 视觉差异 → 修改 `tokens.css` 或 `app.css`
3. **批量修复**：根据差异清单一次性修复
4. **重截确认**：运行 `node scripts/capture-screens.mjs --round=N --screens=home`

**常见差异及修复**：

| 差异类型 | 修复文件 | 示例 |
|---|---|---|
| 列标题错误 | `pages/DepartmentsPage.tsx` | "排序" → "科室图标" |
| 间距不一致 | `styles/app.css` | `gap: 20px` → `gap: 16px` |
| 颜色不同 | `theme/antdTheme.ts` | `#1677FF` → `#1890FF` |
| 字体大小 | `styles/tokens.css` | `14px` → `13px` |

---

### 截图空白

**错误信息**：
```
⚠️ 截图空白：首页
```

**原因**：
- 页面未加载完成
- 登录态失效
- 路由配置错误

**解决方案**：
1. 增加等待时间：`waitUntil: "networkidle"` + `timeout: 30000`
2. 确认登录态正确设置（localStorage）
3. 检查路由是否存在于 `screenConfigs.ts`
4. 手动访问 URL 确认页面可正常加载

---

### 文件不存在

**错误信息**：
```
❌ Figma 截图未导出：首页.png
```

**原因**：
- 未运行 `npm run visual:shots:all`
- Figma 导出失败（429 限流）

**解决方案**：
```bash
# 重新导出所有 Figma 截图
npm run visual:shots:all

# 如果限流，等待后重试
sleep 60 && npm run visual:shots:all
```

---

## 性能测试错误

### FCP > 2s

**错误信息**：
```
❌ FCP: 3.2s (要求 < 2.0s)
```

**原因**：
- 资源加载慢（图片、字体、JS bundle）
- 网络请求过多
- 未启用压缩

**解决方案**：
1. **图片优化**：使用 WebP 格式，添加懒加载
2. **代码分割**：使用动态 `import()` 拆分 bundle
3. **启用压缩**：配置 Vite 的 `gzipSize` 插件
4. **CDN 加速**：静态资源使用 CDN
5. **减少请求**：合并小图标为 sprite

**检查命令**：
```bash
npm run perf:web
```

---

### API P95 > 500ms

**错误信息**：
```
❌ API P95: 850ms (要求 < 500ms)
```

**原因**：
- 数据库查询慢
- N+1 查询问题
- 未使用索引

**解决方案**：
1. **检查数据库索引**：
   ```bash
   npm run perf:db-index
   ```
2. **优化 Prisma 查询**：
   ```typescript
   // ❌ 错误：N+1 查询
   const users = await prisma.user.findMany();
   for (const user of users) {
     const dept = await prisma.department.findUnique({...});
   }
   
   // ✅ 正确：include
   const users = await prisma.user.findMany({
     include: { department: true }
   });
   ```
3. **添加缓存**：对热点数据使用 Redis 缓存
4. **连接池优化**：调整 `pool` 配置

---

## 可访问性检查错误

### 颜色对比度不足

**错误信息**：
```
🔴 color-contrast: Expected contrast ratio >= 4.5:1, got 3.2:1
```

**原因**：
- 文字颜色与背景色对比度不足
- 使用了浅色文字配浅色背景

**解决方案**：
1. 使用工具检查对比度：[WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
2. 调整颜色：
   ```css
   /* ❌ 错误：对比度 3.2:1 */
   .text { color: #999; background: #fff; }
   
   /* ✅ 正确：对比度 5.8:1 */
   .text { color: #666; background: #fff; }
   ```
3. 运行 `npm run a11y:check` 验证

---

### 表单缺少标签

**错误信息**：
```
🔴 label: Form element does not have a label
```

**原因**：
- `<input>` 没有关联的 `<label>`
- 缺少 `aria-label` 或 `aria-labelledby`

**解决方案**：
```html
<!-- ❌ 错误 -->
<input type="text" id="name" />

<!-- ✅ 正确 -->
<label for="name">姓名</label>
<input type="text" id="name" />

<!-- 或使用 aria-label -->
<input type="text" aria-label="姓名" />
```

---

### 键盘导航不完整

**错误信息**：
```
🔴 keyboard: Tab order is not logical
```

**原因**：
- Tab 顺序混乱（从左到右、从上到下）
- 焦点陷阱（无法 Tab 移出模态框）

**解决方案**：
1. 确保 DOM 顺序与视觉顺序一致
2. 避免使用 `tabindex` 大于 0 的值
3. 模态框实现焦点循环（Focus Trap）

---

## 通用错误

### 模块未找到

**错误信息**：
```
Error: Cannot find module 'playwright'
```

**原因**：
- 依赖未安装
- 安装位置错误

**解决方案**：
```bash
# 安装缺失的依赖
npm install -D playwright pixelmatch pngjs

# 或在正确的子包安装
npm install -D playwright --prefix apps/web
```

---

### 端口被占用

**错误信息**：
```
Error: listen EADDRINUSE: address already in use :::3001
```

**原因**：
- 端口已被其他进程占用

**解决方案**：
```bash
# 查找占用端口的进程
netstat -ano | findstr :3001

# 杀死进程
taskkill /PID <PID> /F

# 或修改配置使用其他端口
PORT=3002
```

---

### Git 提交失败

**错误信息**：
```
Error: .env contains sensitive data
```

**原因**：
- `.env` 文件包含敏感数据被尝试提交

**解决方案**：
1. 确保 `.env` 在 `.gitignore` 中
2. 如果已提交，从历史中删除：
   ```bash
   git rm --cached .env
   git commit -m "Remove .env from tracking"
   ```

---

## 获取帮助

如果以上方案无法解决问题：

1. **查看日志**：检查 `artifacts/` 目录下的详细日志
2. **搜索错误**：在 GitHub Issues 或 Stack Overflow 搜索错误信息
3. **联系支持**：提交问题到仓库 Issues

## 相关文档

- [FIGMA_TOKEN_SETUP.md](./FIGMA_TOKEN_SETUP.md) - Figma Token 配置
- [PERFORMANCE_BENCHMARK.md](./PERFORMANCE_BENCHMARK.md) - 性能基线标准
- [ACCESSIBILITY_CHECKLIST.md](./ACCESSIBILITY_CHECKLIST.md) - 可访问性检查清单
- [VISUAL_REDUCTION_ROUNDS.md](./VISUAL_REDUCTION_ROUNDS.md) - 视觉还原轮次流程
