# Figma Token 配置指南

## 获取步骤

1. **登录 Figma**
   - 访问 [figma.com](https://figma.com)
   - 使用你的账号登录

2. **进入设置页面**
   - 点击右上角头像
   - 选择 **Settings**

3. **找到 Access tokens 部分**
   - 滚动到页面底部
   - 找到 "**Access tokens**" 部分

4. **创建新 Token**
   - 点击 "**Create new token**"
   - 输入名称（如 `fsg-dev` 或 `figma-fullstack`）
   - 选择权限：**只读**（Read only files）⚠️ **必须选择只读**
   - 点击 "**Create**"

5. **复制 Token**
   - 复制生成的 Token 字符串
   - ⚠️ **Token 只会显示一次，请立即保存**

6. **配置到 .env 文件**
   ```bash
   # 在仓库根目录的 .env 文件中添加
   FIGMA_ACCESS_TOKEN=你的 token 值
   ```

## 权限要求

| 权限 | 是否需要 | 说明 |
|---|---|---|
| ✅ Read only files | **必需** | 读取 Figma 文件结构和节点 |
| ❌ Write files | 不需要 | 不需要修改 Figma 文件 |
| ❌ View files | 不需要 | 只读权限已包含 |

## 常见问题

### Q: Token 无效或过期怎么办？

A: 
1. 检查 Token 是否正确复制（没有多余空格）
2. 重新生成 Token 并更新 `.env`
3. 确认 `.env` 文件已保存

### Q: Token 权限不足怎么办？

A: 
1. 删除旧 Token
2. 重新创建 Token 时确保选择 "**Read only files**"
3. 不要选择任何写入权限

### Q: Token 可以分享给他人吗？

A: **不可以！** Token 是敏感凭证：
- ❌ 不要提交到 git
- ❌ 不要分享到聊天工具
- ❌ 不要写入 `.env.example`
- ✅ 只保存在本地 `.env` 文件

### Q: 团队 Figma 和个人 Figma 的 Token 有区别吗？

A: 有区别：
- **个人 Figma**：直接在个人设置中创建 Token
- **团队 Figma**：需要团队管理员创建 Token，或确保你的账号有该团队的读取权限

### Q: Token 有有效期吗？

A: Figma Token **永不过期**，除非：
- 你手动删除了 Token
- 你的 Figma 账号被禁用
- Token 泄露后被撤销

建议：每 3-6 个月轮换一次 Token（重新生成并更新）

## 验证 Token 是否有效

运行以下命令验证 Token：

```bash
# 替换 YOUR_FILE_KEY 为任意 Figma 文件 ID
curl -H "X-Figma-Token: YOUR_TOKEN" \
     https://api.figma.com/v1/files/YOUR_FILE_KEY
```

如果返回 JSON 数据，说明 Token 有效。如果返回 401 或 403，说明 Token 无效或权限不足。

## 安全最佳实践

1. **使用环境变量**
   ```bash
   # ✅ 正确：从 .env 读取
   FIGMA_ACCESS_TOKEN=xxx
   
   # ❌ 错误：硬编码在脚本中
   const TOKEN = "xxx";
   ```

2. **不要提交 .env 到 git**
   - 确保 `.env` 在 `.gitignore` 中
   - 只提交 `.env.example`（不含真实 Token）

3. **定期轮换**
   - 每 3-6 个月重新生成 Token
   - 员工离职时立即轮换

4. **最小权限原则**
   - 只申请需要的权限（只读）
   - 不要申请写入权限

## 故障排查

| 错误 | 原因 | 解决方案 |
|---|---|---|
| 401 Unauthorized | Token 无效 | 检查 Token 是否正确复制 |
| 403 Forbidden | 权限不足 | 确认选择了只读权限 |
| 404 Not Found | 文件不存在或无权访问 | 确认文件 ID 正确且有访问权限 |
| 429 Too Many Requests | 请求限流 | 等待 Retry-After 指定的秒数 |

## 相关文档

- [Figma REST API 文档](https://www.figma.com/plugin-docs/api/api/)
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - 故障排查手册
- [PERFORMANCE_BENCHMARK.md](./PERFORMANCE_BENCHMARK.md) - 性能基线标准
