# 性能基线标准

本文档定义 Figma 全栈生成项目的性能基线和测试方法。

## Web 端性能指标

### 核心指标

| 指标 | 基线 | 目标 | 测量工具 |
|---|---|---|---|
| **FCP** (First Contentful Paint) | < 2.0s | < 1.5s | Lighthouse |
| **LCP** (Largest Contentful Paint) | < 2.5s | < 2.0s | Lighthouse |
| **CLS** (Cumulative Layout Shift) | < 0.1 | < 0.05 | Lighthouse |
| **TTI** (Time to Interactive) | < 3.0s | < 2.5s | Lighthouse |
| **TBT** (Total Blocking Time) | < 300ms | < 200ms | Lighthouse |

### 运行 Web 性能测试

```bash
# 安装依赖
npm install -D @lhci/cli --prefix apps/web

# 运行测试
npm run perf:web

# 或手动运行
npx lhci autorun --config=.lighthouserc.json
```

### Lighthouse 配置示例

```json
// .lighthouserc.json
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost:5173/",
        "http://localhost:5173/departments",
        "http://localhost:5173/schedules"
      ],
      "settings": {
        "onlyCategories": ["performance"],
        "skipAudits": ["uses-http2", "is-on-https"],
        "throttling": {
          "rttMs": 40,
          "throughputKbps": 10240,
          "cpuSlowdownMultiplier": 1
        }
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 2000 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }]
      }
    }
  }
}
```

### 优化建议

#### 图片优化
- ✅ 使用 WebP 格式（比 PNG 小 30-50%）
- ✅ 添加懒加载：`<img loading="lazy" />`
- ✅ 响应式图片：使用 `srcset` 和 `sizes`
- ✅ 压缩图片：使用 `sharp` 或 `imagemin`

#### 代码分割
- ✅ 路由级代码分割：
  ```tsx
  const DepartmentsPage = lazy(() => import('./pages/DepartmentsPage'));
  ```
- ✅ 组件级代码分割：
  ```tsx
  const Chart = lazy(() => import('./components/Chart'));
  ```

#### 资源预加载
```html
<!-- 预加载关键资源 -->
<link rel="preload" href="/fonts/inter.woff2" as="font" crossorigin />
<link rel="preload" href="/assets/logo.png" as="image" />
```

#### 启用压缩
```bash
# Vite 配置
npm install -D vite-plugin-compression
```

```ts
// vite.config.ts
import compression from 'vite-plugin-compression';

export default {
  plugins: [
    compression({ algorithm: 'gzip' }),
    compression({ algorithm: 'brotliCompress' })
  ]
}
```

---

## API 端性能指标

### 核心指标

| 指标 | 基线 | 目标 | 测量工具 |
|---|---|---|---|
| **列表接口 P95** | < 500ms | < 300ms | autocannon |
| **详情接口 P95** | < 300ms | < 200ms | autocannon |
| **写入接口 P95** | < 800ms | < 500ms | autocannon |
| **登录接口 P95** | < 500ms | < 300ms | autocannon |
| **并发连接数** | 10 | 50+ | autocannon |

### 运行 API 性能测试

```bash
# 安装依赖
npm install -D autocannon --prefix apps/api

# 运行测试
npm run perf:api

# 或手动运行
npx autocannon -c 10 -d 10 http://localhost:3001/api/departments
```

### 测试脚本示例

```javascript
// scripts/perf-api.mjs
import autocannon from 'autocannon';

async function testEndpoint(url, token, name) {
  const result = await autocannon({
    url,
    connections: 10,
    duration: 10,
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  console.log(`\n📊 ${name}:`);
  console.log(`   请求数：${result.requests.total}`);
  console.log(`   P95: ${result.p95ms}ms`);
  console.log(`   P99: ${result.p99ms}ms`);
  console.log(`   失败：${result.errors}`);
  
  return result;
}

// 测试所有端点
await testEndpoint('http://localhost:3001/api/departments', token, '科室列表');
await testEndpoint('http://localhost:3001/api/doctors', token, '医生列表');
await testEndpoint('http://localhost:3001/api/schedules', token, '排班列表');
```

### 优化建议

#### 数据库查询优化
- ✅ 使用索引覆盖搜索字段
- ✅ 避免 SELECT *，只查询需要的字段
- ✅ 使用分页：`LIMIT` 和 `OFFSET`
- ✅ 批量查询代替 N+1 查询

```typescript
// ❌ 错误：N+1 查询
const departments = await prisma.department.findMany();
for (const dept of departments) {
  const doctors = await prisma.doctor.findMany({
    where: { departmentId: dept.id }
  });
}

// ✅ 正确：include
const departments = await prisma.department.findMany({
  include: {
    doctors: true,
    _count: { select: { doctors: true } }
  }
});
```

#### 缓存策略
- ✅ Redis 缓存热点数据
- ✅ HTTP 缓存头：`Cache-Control`, `ETag`
- ✅ 内存缓存：`node-cache` 或 `lru-cache`

```typescript
// Redis 缓存示例
import Redis from 'ioredis';
const redis = new Redis();

async function getDepartments() {
  const cached = await redis.get('departments:all');
  if (cached) return JSON.parse(cached);
  
  const departments = await prisma.department.findMany();
  await redis.setex('departments:all', 300, JSON.stringify(departments));
  return departments;
}
```

#### 连接池优化
```prisma
// schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  
  // 连接池配置
  relationMode = "prisma"
}
```

```typescript
// prisma/client.ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: ['query', 'info', 'warn', 'error']
});
```

---

## 数据库性能指标

### 核心指标

| 指标 | 基线 | 目标 | 测量工具 |
|---|---|---|---|
| **带索引查询** | < 100ms | < 50ms | Prisma query log |
| **无索引查询** | < 500ms | < 200ms | Prisma query log |
| **迁移时间** | < 30s | < 15s | prisma migrate |
| **Seed 时间** | < 10s | < 5s | prisma db seed |

### 检查数据库索引

```bash
# 运行索引检查
npm run perf:db-index
```

```javascript
// scripts/check-db-index.mjs
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 检查搜索字段是否有索引
const searchFields = [
  { model: 'Department', fields: ['name', 'code'] },
  { model: 'Doctor', fields: ['name', 'title', 'departmentId'] },
  { model: 'Schedule', fields: ['date', 'doctorId'] },
  { model: 'User', fields: ['email', 'phone'] }
];

console.log('🔍 检查数据库索引...\n');

let hasMissingIndex = false;

for (const { model, fields } of searchFields) {
  console.log(`📄 ${model}:`);
  
  for (const field of fields) {
    // 检查字段是否有索引（需要手动检查 schema.prisma）
    const hasIndex = checkIndexExists(model, field);
    
    if (hasIndex) {
      console.log(`   ✅ ${field}`);
    } else {
      console.log(`   ❌ ${field} (缺少索引)`);
      hasMissingIndex = true;
    }
  }
  console.log('');
}

if (hasMissingIndex) {
  console.error('❌ 发现缺少索引的字段，请添加索引');
  process.exit(1);
} else {
  console.log('✅ 所有搜索字段都有索引\n');
}

function checkIndexExists(model, field) {
  // 读取 schema.prisma 并解析索引定义
  // 简化实现：检查字段名是否包含 @@index
  const schema = readFileSync('apps/api/prisma/schema.prisma', 'utf-8');
  const modelBlock = schema.match(`model ${model} \\{[\\s\\S]*?\\}`);
  if (!modelBlock) return false;
  
  return modelBlock[0].includes(`@@index([${field}])`) ||
         modelBlock[0].includes(`@id`) && modelBlock[0].includes(field);
}
```

### 优化建议

#### 添加索引
```prisma
// schema.prisma
model Department {
  id        Int      @id @default(autoincrement())
  name      String   @db.VarChar(100)
  code      String   @unique @db.VarChar(20)
  createdAt DateTime @default(now())
  
  @@index([name])
  @@index([code])
}

model Doctor {
  id           Int      @id @default(autoincrement())
  name         String   @db.VarChar(100)
  title        String   @db.VarChar(50)
  departmentId Int
  department   Department @relation(fields: [departmentId], references: [id])
  
  @@index([name])
  @@index([title])
  @@index([departmentId])
}
```

#### 查询日志
```typescript
// .env
DATABASE_URL="postgresql://..."

// 启用查询日志
// apps/api/.env
LOG_LEVEL=debug
PRISMA_LOG=query
```

```typescript
// prisma/client.ts
export const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'stdout' },
    { level: 'error', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' }
  ]
});
```

---

## 性能测试报告

### 报告格式

每次性能测试后生成报告：

```json
// artifacts/performance/report.json
{
  "timestamp": "2026-09-14T23:00:00Z",
  "web": {
    "fcp": 1.8,
    "lcp": 2.3,
    "cls": 0.05,
    "tti": 2.8,
    "score": 0.92,
    "passed": true
  },
  "api": {
    "endpoints": [
      {
        "name": "科室列表",
        "url": "/api/departments",
        "p95ms": 320,
        "p99ms": 450,
        "passed": true
      }
    ]
  },
  "database": {
    "indexedQueries": 12,
    "missingIndexes": 0,
    "passed": true
  }
}
```

### 验收标准

| 类别 | 通过标准 |
|---|---|
| **Web 性能** | Lighthouse 分数 ≥ 90，所有核心指标达标 |
| **API 性能** | 所有端点 P95 < 500ms |
| **数据库** | 所有搜索字段有索引，无慢查询 |

---

## 持续性能监控

### CI/CD 集成

在 GitHub Actions 中自动运行性能测试：

```yaml
# .github/workflows/performance.yml
name: Performance Tests

on:
  pull_request:
    branches: [main]

jobs:
  performance:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Start services
        run: docker compose up -d
      
      - name: Run performance tests
        run: npm run perf:test
      
      - name: Upload report
        uses: actions/upload-artifact@v3
        with:
          name: performance-report
          path: artifacts/performance/
```

### 性能预算

设置性能预算并在 CI 中检查：

```json
// .lighthouserc.json
{
  "ci": {
    "assert": {
      "assertions": {
        "performance-budget": "error"
      }
    }
  }
}
```

```json
// performance-budget.json
[
  {
    "path": "/*",
    "resourceSizes": [
      { "resourceType": "total", "budget": 2000 },
      { "resourceType": "script", "budget": 500 },
      { "resourceType": "stylesheet", "budget": 100 },
      { "resourceType": "image", "budget": 800 }
    ]
  }
]
```

---

## 相关文档

- [FIGMA_TOKEN_SETUP.md](./FIGMA_TOKEN_SETUP.md) - Figma Token 配置
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - 故障排查手册
- [ACCESSIBILITY_CHECKLIST.md](./ACCESSIBILITY_CHECKLIST.md) - 可访问性检查清单
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - 生产环境部署指南
