# 生产环境部署指南

本文档提供从开发到生产环境的完整部署流程和最佳实践。

## 目录

- [部署前检查清单](#部署前检查清单)
- [环境变量配置](#环境变量配置)
- [安全配置](#安全配置)
- [数据库迁移](#数据库迁移)
- [构建和部署](#构建和部署)
- [性能优化](#性能优化)
- [监控与日志](#监控与日志)
- [故障排查](#故障排查)

---

## 部署前检查清单

### ✅ 代码审查

- [ ] 所有功能已测试通过
- [ ] 视觉闸门 SSIM ≥ 0.97
- [ ] 性能测试达标（FCP < 2s, API P95 < 500ms）
- [ ] 可访问性检查通过（WCAG AA 违规数 = 0）
- [ ] 无 TypeScript 类型错误
- [ ] 无 ESLint 警告

### ✅ 安全检查

- [ ] 敏感数据未硬编码（API Key、密码等）
- [ ] `.env` 文件未提交到 git
- [ ] `.env.example` 已更新（不含真实值）
- [ ] JWT_SECRET 已重新生成
- [ ] 依赖包无已知漏洞（`npm audit`）

### ✅ 文档更新

- [ ] `GENERATED.md` 已更新
- [ ] README.md 包含最新启动说明
- [ ] API 文档已更新（如有变更）
- [ ] 变更日志已更新

---

## 环境变量配置

### 生产环境 .env 配置

```bash
# ===== 生产环境配置 =====
NODE_ENV=production

# ===== Figma =====
FIGMA_ACCESS_TOKEN=xxx  # 开发环境用，生产环境不需要
FIGMA_API_BASE=https://api.figma.com

# ===== 数据库 =====
DATABASE_URL=postgresql://user:password@prod-db-host:5432/fsg_db?schema=public

# ===== JWT 认证 =====
JWT_SECRET=your-production-secret-key-here  # ⚠️ 必须重新生成！
JWT_EXPIRES_IN=7d

# ===== API 配置 =====
API_PORT=3001
API_HOST=0.0.0.0
CORS_ORIGIN=https://your-domain.com

# ===== 前端配置 =====
WEB_URL=https://your-domain.com
VITE_API_BASE_URL=https://api.your-domain.com

# ===== 日志 =====
LOG_LEVEL=warn  # 生产环境只记录 warning 和 error
PRISMA_LOG=error

# ===== 可选：Sentry 错误追踪 =====
SENTRY_DSN=https://xxx@oxxx.ingest.sentry.io/xxx
SENTRY_ENVIRONMENT=production
```

### ⚠️ 安全警告

```bash
# ❌ 绝对不要使用默认或示例值
JWT_SECRET=change-me-in-dev  # 错误！

# ✅ 正确：生成随机密钥
openssl rand -hex 32
# 输出：a1b2c3d4e5f6...（64 字符）

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 环境变量验证脚本

```bash
#!/bin/bash
# scripts/validate-env.sh

echo "🔍 验证生产环境变量..."

# 检查必需变量
REQUIRED_VARS=(
  "NODE_ENV"
  "DATABASE_URL"
  "JWT_SECRET"
  "API_PORT"
  "WEB_URL"
)

missing_vars=()

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    missing_vars+=("$var")
  fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
  echo "❌ 缺少必需的环境变量："
  for var in "${missing_vars[@]}"; do
    echo "   - $var"
  done
  exit 1
fi

# 检查 JWT_SECRET 是否安全
if [ ${#JWT_SECRET} -lt 32 ]; then
  echo "❌ JWT_SECRET 长度不足 32 字符，请重新生成"
  exit 1
fi

# 检查 NODE_ENV
if [ "$NODE_ENV" != "production" ]; then
  echo "❌ NODE_ENV 必须设置为 production"
  exit 1
fi

echo "✅ 环境变量验证通过"
```

---

## 安全配置

### 1. HTTPS 强制重定向

```typescript
// apps/api/src/main.ts
import * as https from 'https';
import * as fs from 'fs';

const httpsOptions = {
  key: fs.readFileSync('/path/to/key.pem'),
  cert: fs.readFileSync('/path/to/cert.pem')
};

app.enableShutdownHooks();
await app.listen(3001, '0.0.0.0', () => {
  console.log('API running on HTTPS port 3001');
});
```

```nginx
# Nginx 配置
server {
  listen 80;
  server_name api.your-domain.com;
  
  # 强制重定向到 HTTPS
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name api.your-domain.com;
  
  ssl_certificate /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;
  
  location / {
    proxy_pass http://localhost:3001;
    # ... 其他配置
  }
}
```

---

### 2. CORS 白名单配置

```typescript
// apps/api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 生产环境 CORS 配置
  app.enableCors({
    origin: [
      'https://your-domain.com',
      'https://www.your-domain.com'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Total-Count']
  });
  
  await app.listen(3001);
}
bootstrap();
```

---

### 3. Rate Limiting（API 限流）

```typescript
// apps/api/src/main.ts
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 每个 IP 最多 100 请求
  message: '请求过多，请稍后重试',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// 登录接口更严格的限流
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 15 分钟内最多 5 次登录尝试
  message: '登录尝试过多，请稍后重试'
});

app.post('/api/auth/login', loginLimiter, authController.login);
```

---

### 4. Helmet.js 安全头

```typescript
// apps/api/src/main.ts
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

---

### 5. 输入验证和清理

```typescript
// apps/api/src/auth/dto/login.dto.ts
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  @IsNotEmpty()
  email: string;
  
  @IsString()
  @MinLength(6, { message: '密码长度至少 6 位' })
  @IsNotEmpty()
  password: string;
}
```

---

## 数据库迁移

### 生产数据库迁移流程

```bash
# 1. 备份生产数据库（重要！）
pg_dump -h prod-db-host -U user fsg_db > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. 验证迁移脚本
npx prisma migrate status

# 3. 应用迁移
npx prisma migrate deploy

# 4. 验证迁移结果
npx prisma migrate status

# 5. 执行 Seed（如需要）
npx prisma db seed

# 6. 检查数据库连接
npx prisma db execute --file scripts/health-check.sql
```

### 迁移回滚方案

```bash
# 如果迁移失败，回滚到上一个版本
npx prisma migrate resolve --rolled-back "migration_name"

# 或手动回滚 SQL
psql -h prod-db-host -U user -d fsg_db -f rollback.sql
```

### 迁移验证脚本

```sql
-- scripts/health-check.sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 检查索引
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

---

## 构建和部署

### 前端构建

```bash
# apps/web/package.json
{
  "scripts": {
    "build": "tsc && vite build",
    "build:analyze": "vite build --mode analyze",
    "preview": "vite preview"
  }
}

# 构建
npm run build --prefix apps/web

# 分析 bundle 大小
npm run build:analyze --prefix apps/web

# 本地预览构建结果
npm run preview --prefix apps/web
```

### Vite 生产配置

```typescript
// apps/web/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import compression from 'vite-plugin-compression';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    compression({ algorithm: 'gzip' }),
    compression({ algorithm: 'brotliCompress' }),
    visualizer({ open: true, gzipSize: true })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'antd-vendor': ['antd', '@ant-design/icons'],
          'chart-vendor': ['recharts']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false // 生产环境不生成 sourcemap
  }
});
```

### 后端构建

```bash
# apps/api/package.json
{
  "scripts": {
    "build": "nest build",
    "start:prod": "node dist/main",
    "start:prod:pm2": "pm2 start dist/main --name fsg-api"
  }
}

# 构建
npm run build --prefix apps/api

# 使用 PM2 管理
npm run start:prod:pm2 --prefix apps/api

# 或直接运行
node apps/api/dist/main.js
```

### Docker 部署

```dockerfile
# Dockerfile.api
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
RUN npm ci

COPY . .
RUN npm run build --prefix apps/api

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./

EXPOSE 3001
CMD ["node", "dist/main.js"]
```

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile.api
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - db
    restart: always

  web:
    build:
      context: .
      dockerfile: Dockerfile.web
    ports:
      - "80:80"
    environment:
      - VITE_API_BASE_URL=${VITE_API_BASE_URL}
    depends_on:
      - api
    restart: always

  db:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=${DB_NAME}
    restart: always

volumes:
  postgres_data:
```

---

## 性能优化

### 前端优化

1. **启用 CDN**
   ```html
   <!-- 静态资源使用 CDN -->
   <script src="https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js"></script>
   ```

2. **图片懒加载**
   ```tsx
   <img src={logo} alt="Logo" loading="lazy" />
   ```

3. **路由懒加载**
   ```tsx
   const DepartmentsPage = lazy(() => import('./pages/DepartmentsPage'));
   ```

4. **启用 HTTP/2**
   ```nginx
   server {
     listen 443 ssl http2;
     # ...
   }
   ```

### 后端优化

1. **响应缓存**
   ```typescript
   import { CacheInterceptor } from '@nestjs/common';
   
   @UseInterceptors(CacheInterceptor)
   @Get('departments')
   findAll() {
     return this.departmentService.findAll();
   }
   ```

2. **数据库连接池**
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
     directUrl = env("DATABASE_DIRECT_URL")
   }
   ```

3. **启用 Gzip/Brotli**
   ```nginx
   gzip on;
   gzip_types text/plain text/css application/json application/javascript;
   gzip_min_length 1000;
   
   brotli on;
   brotli_types text/plain text/css application/json application/javascript;
   ```

---

## 监控与日志

### 错误追踪（Sentry）

```typescript
// apps/api/src/main.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: 'production',
  tracesSampleRate: 0.1, // 10% 采样率
  attachStacktrace: true
});

// 全局错误处理
process.on('uncaughtException', (error) => {
  Sentry.captureException(error);
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  Sentry.captureException(reason);
  console.error('Unhandled rejection:', reason);
});
```

### 日志配置

```typescript
// apps/api/src/main.ts
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

const logger = WinstonModule.createLogger({
  transports: [
    new winston.transports.File({
      filename: `logs/error.log`,
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: `logs/combined.log`,
      level: 'info',
      maxsize: 10485760,
      maxFiles: 5
    })
  ],
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  )
});
```

### 性能监控

```typescript
// 中间件：记录请求时间
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.log({
      level: 'info',
      message: 'HTTP Request',
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`
    });
  });
  
  next();
});
```

---

## 故障排查

### 常见问题

#### 1. 数据库连接失败

```bash
# 检查数据库是否可访问
psql -h prod-db-host -U user -d fsg_db

# 检查连接字符串
echo $DATABASE_URL

# 检查防火墙规则
# AWS: 检查 Security Group
# 阿里云：检查安全组
```

#### 2. 内存泄漏

```bash
# 监控内存使用
pm2 monit

# 查看堆快照
node --inspect dist/main.js

# 使用 Chrome DevTools 分析
```

#### 3. 高 CPU 使用率

```bash
# 查看进程
top -p $(pgrep -f "node.*main")

# 分析 CPU profile
node --prof dist/main.js
node --prof-process isolate-*.log > profile.txt
```

---

## 部署验证清单

部署完成后验证：

- [ ] API 健康检查：`GET /api/health`
- [ ] 登录功能正常
- [ ] 所有 CRUD 操作正常
- [ ] 数据库连接稳定
- [ ] 错误追踪正常（Sentry）
- [ ] 日志记录正常
- [ ] HTTPS 重定向正常
- [ ] CORS 配置正确
- [ ] 性能指标达标

---

## 回滚方案

如果部署失败：

```bash
# 1. 停止服务
pm2 stop fsg-api
docker compose down

# 2. 回滚代码
git checkout <previous-version>

# 3. 回滚数据库
npx prisma migrate resolve --rolled-back "migration_name"

# 4. 重新启动
pm2 start fsg-api
docker compose up -d

# 5. 验证服务
curl https://api.your-domain.com/health
```

---

## 相关文档

- [FIGMA_TOKEN_SETUP.md](./FIGMA_TOKEN_SETUP.md) - Figma Token 配置
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - 故障排查手册
- [PERFORMANCE_BENCHMARK.md](./PERFORMANCE_BENCHMARK.md) - 性能基线标准
- [ACCESSIBILITY_CHECKLIST.md](./ACCESSIBILITY_CHECKLIST.md) - 可访问性检查清单
- [VISUAL_REDUCTION_ROUNDS.md](./VISUAL_REDUCTION_ROUNDS.md) - 视觉还原轮次流程
