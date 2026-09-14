# 数据库重置脚本实施说明

## 已完成

✅ **添加 `npm run db:reset` 脚本**

文件：`apps/api/package.json`

```json
{
  "scripts": {
    "db:reset": "prisma migrate reset --force && npm run prisma:seed"
  }
}
```

**使用方法**：
```bash
# 重置数据库（drop → migrate → seed）
npm run db:reset
```

**功能**：
- 强制重置数据库（删除所有表）
- 运行所有迁移
- 执行 Seed 脚本

---

## 待实施：Seed 脚本幂等化

### 当前问题

当前 `seed.ts` 使用 `create` 和 `createMany`，**不是幂等操作**：

```typescript
// ❌ 当前实现：会重复插入
await prisma.department.createMany({
  data: [
    { name: '内科', code: 'DEPT001' },
    { name: '外科', code: 'DEPT002' }
  ]
});

// ❌ 重复执行会报错：Unique constraint failed
```

### 需要修改为 upsert

```typescript
// ✅ 正确实现：幂等操作
await prisma.department.upsert({
  where: { code: 'DEPT001' },
  update: {}, // 如果存在，不更新
  create: { name: '内科', code: 'DEPT001' }
});

// 或者使用 createMany 的 skipDuplicates 选项（Prisma 4.2+）
await prisma.department.createMany({
  data: [...],
  skipDuplicates: true // 跳过重复记录
});
```

### 需要修改的位置

根据 grep 结果，需要修改以下 create 操作：

1. **Role** (2 处) - 第 52、55 行
   ```typescript
   await prisma.role.upsert({
     where: { name: '超级管理员' },
     update: {},
     create: { name: '超级管理员', description: '拥有所有权限', status: 'active' }
   });
   ```

2. **User** (1 处) - 第 62 行
   ```typescript
   await prisma.user.createMany({
     data: [...],
     skipDuplicates: true
   });
   ```

3. **Organization** (1 处) - 第 94 行
   ```typescript
   await prisma.organization.upsert({
     where: { name: '阳光医疗门诊' },
     update: {},
     create: {...}
   });
   ```

4. **Department** (1 处) - 第 115 行
   ```typescript
   // 使用 Promise.all + upsert
   await Promise.all(
     departments.map(dept =>
       prisma.department.upsert({
         where: { code: dept.code },
         update: {},
         create: dept
       })
     )
   );
   ```

5. **Doctor** (1 处) - 第 133 行
   ```typescript
   await Promise.all(
     doctors.map(doctor =>
       prisma.doctor.upsert({
         where: { name: doctor.name }, // 或其他唯一字段
         update: {},
         create: doctor
       })
     )
   );
   ```

6. **Patient** (1 处) - 第 152 行
   ```typescript
   await Promise.all(
     patients.map(patient =>
       prisma.patient.upsert({
         where: { name: patient.name },
         update: {},
         create: patient
       })
     )
   );
   ```

7. **Schedule** (1 处) - 第 194 行
   ```typescript
   await prisma.schedule.createMany({
     data: scheduleData,
     skipDuplicates: true
   });
   ```

8. **Appointment** (1 处) - 第 243 行
   ```typescript
   await prisma.appointment.createMany({
     data: appointmentData,
     skipDuplicates: true
   });
   ```

9. **Order** (1 处) - 第 295 行
   ```typescript
   await prisma.order.createMany({
     data: orderData,
     skipDuplicates: true
   });
   ```

10. **其他 createMany** (Review, Notification, NotificationLog, Address, Banner, Announcement, News, NavItem, Feedback, AppointmentRule, OperationLog)
    ```typescript
    await prisma.<Model>.createMany({
      data: [...],
      skipDuplicates: true
    });
    ```

---

## JWT 密钥自动生成集成

### 创建脚本

✅ 已创建：`scripts/generate-jwt-secret.mjs`

```javascript
#!/usr/bin/env node
import { randomBytes } from 'crypto';
const secret = randomBytes(32).toString('hex');
console.log(secret);
```

### 集成到 db:reset

创建 `scripts/reset-db-with-jwt.sh`（Windows 用 `.bat`）：

```bash
#!/bin/bash
# 检查 JWT_SECRET 是否已修改
if grep -q "JWT_SECRET=change-me-in-dev" apps/api/.env; then
  echo "⚠️  检测到 JWT_SECRET 使用默认值，正在生成新的密钥..."
  
  # 生成新的 JWT_SECRET
  NEW_SECRET=$(node scripts/generate-jwt-secret.mjs)
  
  # 更新 .env 文件
  sed -i "s/JWT_SECRET=change-me-in-dev/$NEW_SECRET/" apps/api/.env
  
  echo "✅ JWT_SECRET 已更新"
  echo "⚠️  警告：生产环境必须重新设置 JWT_SECRET！"
fi

# 执行数据库重置
npm run db:reset
```

**Windows PowerShell 版本** (`scripts/reset-db-with-jwt.ps1`)：

```powershell
# 检查 JWT_SECRET
$envContent = Get-Content apps/api/.env -Raw
if ($envContent -match "JWT_SECRET=change-me-in-dev") {
  Write-Host "⚠️  检测到 JWT_SECRET 使用默认值，正在生成新的密钥..." -ForegroundColor Yellow
  
  # 生成新的 JWT_SECRET
  $NEW_SECRET = node scripts/generate-jwt-secret.mjs
  
  # 更新 .env 文件
  $updatedContent = $envContent -replace "JWT_SECRET=change-me-in-dev", $NEW_SECRET
  Set-Content -Path apps/api/.env -Value $updatedContent -NoNewline
  
  Write-Host "✅ JWT_SECRET 已更新" -ForegroundColor Green
  Write-Host "⚠️  警告：生产环境必须重新设置 JWT_SECRET！" -ForegroundColor Yellow
}

# 执行数据库重置
npm run db:reset
```

---

## 验收标准

- [ ] `npm run db:reset` 可重复执行（幂等）
- [ ] Seed 数据不会重复插入
- [ ] JWT_SECRET 自动生成（如果未修改）
- [ ] 生成后显示警告：「生产环境必须重新设置 JWT_SECRET」

---

## 实施优先级

### 高优先级（阻塞性）
1. ✅ 添加 `db:reset` 脚本 - **已完成**
2. ⏳ 修改 seed.ts 为幂等操作 - **待实施**

### 中优先级（强烈推荐）
3. ⏳ 集成 JWT 自动生成 - **待实施**

---

## 预计工作量

- 修改 seed.ts：2-3 小时（需要逐处修改 create 为 upsert）
- 集成 JWT 生成：30 分钟
- 测试验证：30 分钟
- **总计**：3-4 小时

---

## 下一步

1. 修改 `apps/api/prisma/seed.ts` 中所有 `create` 为 `upsert` 或 `createMany` + `skipDuplicates`
2. 创建 `scripts/reset-db-with-jwt.sh` 或 `.ps1`
3. 测试 `npm run db:reset` 多次执行（验证幂等性）
4. 更新文档

---

**状态**: 部分完成（db:reset 脚本已添加，seed.ts 待修改）  
**日期**: 2026-09-14
