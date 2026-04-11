---
id: deployment-introduction
title: 部署简介
sidebar_label: 部署简介
sidebar_position: 1
---

# 部署简介

本指南全面概述了如何将 Ever Works 模板部署到生产环境。该模板基于 Next.js 16 构建，使用 standalone 输出模式，使其与各种托管平台和容器化部署兼容。

## 架构概述

Ever Works 模板生成一个 **Next.js standalone 构建**，将所有依赖项打包到单个可部署单元中。这在 `next.config.ts` 中配置：

```typescript
const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm'],
  experimental: {
    optimizePackageImports: ["@heroui/react", "lucide-react"],
  },
  trailingSlash: false,
  generateEtags: false,
  poweredByHeader: false,
  staticPageGenerationTimeout: 180,
};
```

`output: "standalone"` 设置创建了一个自包含的部署产物，只包含必要的 `node_modules` 文件，显著减小了部署大小。

## 支持的平台

### 推荐：Vercel

Vercel 是模板的推荐部署平台。它提供：

- Next.js 应用程序的零配置部署
- 自动 SSL 证书配置
- 通过 `vercel.json` 内置 cron 任务调度
- API 路由的无服务器函数支持
- Pull request 的预览部署

模板包含带预定义 cron 计划的 `vercel.json` 配置：

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/subscription-reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/subscription-expiration",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### 自托管：Docker

standalone 输出支持 Docker 容器化。典型部署使用 Node.js 运行时来提供构建好的应用程序。关键要求是确保将 `standalone` 输出目录以及 `public` 和 `.next/static` 文件夹复制到容器镜像中。

### 其他云平台

模板可以部署到任何支持 Node.js 应用程序的平台：

- **Railway** -- 带内置 PostgreSQL 的简单全栈部署
- **DigitalOcean App Platform** -- 托管容器部署
- **AWS（EC2、ECS 或 App Runner）** -- 可扩展的云基础设施
- **Google Cloud Run** -- 无服务器容器平台
- **Azure App Service** -- 托管 Node.js 托管

## 前提条件

### 系统要求

- **Node.js**：版本 20.19.0 或更高（在 `package.json` 的 `engines` 字段中定义）
- **包管理器**：pnpm（项目使用 `pnpm-lock.yaml`）
- **数据库**：PostgreSQL（生产功能如身份验证、订阅、分析所必需）
- **内存**：构建过程建议至少 8 GB RAM

构建脚本显式分配额外内存：

```bash
cross-env NODE_OPTIONS='--max-old-space-size=8192' next build
```

### 必需的环境变量

部署前，确保这些关键变量已配置。`scripts/check-env.js` 脚本会自动验证它们：

```bash
# Core (critical -- application will not function without these)
DATA_REPOSITORY=https://github.com/your-org/your-data-repo
AUTH_SECRET=<generated-secret>         # openssl rand -base64 32
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Cookie Configuration
COOKIE_SECRET=<generated-secret>       # openssl rand -base64 32
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true
```

环境检查脚本按集成类别对变量进行分类：

```
Core:            NODE_ENV, PORT, APP_*, BASE_URL
Database:        DATABASE_URL, DB_*, POSTGRES_*
Auth:            AUTH_*, GOOGLE_*, GITHUB_*, FB_*, TWITTER_*
Supabase:        SUPABASE_*, NEXT_PUBLIC_SUPABASE_*
Content:         DATA_REPOSITORY, GH_TOKEN
Email:           RESEND_API_KEY, EMAIL_*
Payment:         STRIPE_*, PAYPAL_*
Analytics:       POSTHOG_*, SENTRY_*
Background Jobs: TRIGGER_DEV_*
```

### 可选集成

这些环境变量启用可选功能：

```bash
# OAuth Providers (each requires both CLIENT_ID and CLIENT_SECRET)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Error Tracking
NEXT_PUBLIC_SENTRY_DSN=...
SENTRY_ORG=...
SENTRY_PROJECT=...

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=...
NEXT_PUBLIC_POSTHOG_HOST=...

# Payments
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# Email
RESEND_API_KEY=...
```

## 快速部署指南

### 第一步：准备构建

在本地运行完整构建流程以验证所有内容均可编译：

```bash
# Install dependencies
pnpm install

# Run linting and type checks
pnpm lint
pnpm tsc --noEmit

# Run the production build
pnpm build
```

`build` 脚本按顺序执行几个步骤：

1. **环境检查**（`scripts/check-env.js`）-- 验证必需变量
2. **OpenAPI 生成**（`scripts/generate-openapi.ts`）-- 生成 API 文档
3. **数据库迁移**（`scripts/build-migrate.ts`）-- 应用待处理的 Schema 变更
4. **Next.js 构建**（`next build`）-- 编译应用程序

### 第二步：构建期间的数据库迁移

`scripts/build-migrate.ts` 脚本在构建期间自动运行。它处理不同环境：

```typescript
// Skip migrations in CI environments without a real database
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const isVercel = Boolean(process.env.VERCEL);

if (isCI && !isVercel) {
  console.log('[Build Migration] CI environment detected, skipping migrations');
  process.exit(0);
}
```

关键行为：

- **生产构建**：迁移错误导致构建失败（防止损坏的部署）
- **预览部署**：连接错误被容忍（数据库可能尚未配置）
- **CI 构建**（非 Vercel）：迁移完全跳过

### 第三步：运行时初始化

应用程序启动时，`instrumentation.ts` 触发数据库初始化：

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // Auto-initialize database (migrate and seed if needed)
  try {
    await initializeDatabase();
  } catch (error) {
    if (isProduction) {
      throw error; // Fail fast in production
    }
    // In development/preview, allow app to start for debugging
  }
}
```

初始化序列：

1. 运行待处理迁移（Drizzle 处理幂等性）
2. 检查数据库是否已播种
3. 如果没有，获取 PostgreSQL 咨询锁并运行种子脚本
4. 播种后释放锁

### 第四步：部署到 Vercel

对于 Vercel 部署，连接您的仓库并配置：

1. 将 **Framework Preset** 设置为 Next.js
2. 将 **Build Command** 设置为 `pnpm build`
3. 将 **Install Command** 设置为 `pnpm install`
4. 在 Vercel 仪表板中添加所有必需的环境变量
5. 部署

### 第五步：验证部署

部署后验证：

```bash
# Check health endpoint
curl https://yourdomain.com/api/health

# Check version endpoint
curl https://yourdomain.com/api/version
```

## 安全标头

模板在 `next.config.ts` 中自动配置安全标头：

```typescript
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-DNS-Prefetch-Control", value: "on" },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          key: "Content-Security-Policy",
          value: "default-src 'self'; script-src 'self' 'unsafe-inline' ...",
        },
      ],
    },
  ];
}
```

## 连接池配置

数据库连接池可通过 `DB_POOL_SIZE` 环境变量配置：

```typescript
const getPoolSize = (): number => {
  const envPoolSize = process.env.DB_POOL_SIZE;
  if (envPoolSize) {
    const parsed = parseInt(envPoolSize, 10);
    return isNaN(parsed) ? 20 : Math.max(1, Math.min(parsed, 50));
  }
  return getNodeEnv() === 'production' ? 20 : 10;
};
```

- **生产默认值**：20 个连接
- **开发默认值**：10 个连接
- **可配置范围**：1 到 50 个连接
- **空闲超时**：20 秒
- **连接超时**：30 秒

## 下一步

- [SSL 与自定义域名](./ssl-domains.md) -- 配置自定义域名和 SSL 证书
- [数据库管理](./database-management.md) -- 生产数据库操作
- [备份与恢复](./backup-recovery.md) -- 数据库备份策略
- [监控](./monitoring.md) -- 配置错误跟踪和性能监控
