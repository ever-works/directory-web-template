---
id: scaling
title: 扩展与高可用性
sidebar_label: 扩展
sidebar_position: 4
---

# 扩展与高可用性

本指南涵盖将 Ever Works Template 从单实例部署扩展到高可用生产配置的策略，包括 serverless 配置、连接池、CDN 优化和边缘函数。

## 部署架构

该模板支持多种部署架构：

| 架构 | 最适用于 | 扩展模型 |
|---|---|---|
| Vercel（Serverless） | 大多数部署 | 自动水平扩展 |
| Docker（独立） | 自托管、本地部署 | 手动或基于编排器 |
| Node.js（直接） | 开发、简单部署 | 单实例或 PM2 集群 |

## Serverless 配置（Vercel）

### 独立输出

该模板配置了独立输出以优化 serverless 部署：

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: "standalone",
};
```

独立模式在 `.next/standalone/` 中创建自包含的构建，只包含运行应用程序所需的文件。通过减小部署包大小来最小化冷启动时间。

### 函数配置

在 `vercel.json` 或通过路由级配置来配置 serverless 函数设置：

```typescript
// app/api/heavy-computation/route.ts
export const maxDuration = 60; // 秒（Pro 计划：最高 300 秒）
export const dynamic = 'force-dynamic';
```

### 推荐的函数设置

| 路由类型 | 最大时长 | 内存 | 说明 |
|---|---|---|---|
| API 路由（简单） | 10 秒 | 1024 MB | 大多数端点的默认值 |
| API 路由（数据处理） | 30 秒 | 1024 MB | 批量操作 |
| Cron 任务 | 60 秒 | 1024 MB | 后台任务执行 |
| Webhook 处理程序 | 30 秒 | 1024 MB | 支付、OAuth 回调 |
| 静态页面 | 不适用 | 不适用 | 构建时预渲染 |

### 冷启动优化

使用以下技术最小化冷启动：

| 技术 | 实现 | 影响 |
|---|---|---|
| 最小化函数大小 | 配置中的 `serverExternalPackages` | 减少初始化时间 |
| 避免模块级导入 | 对重型模块使用动态 `import()` | 延迟加载到需要时 |
| 尽可能使用边缘运行时 | `export const runtime = 'edge'` | 几乎零冷启动 |
| 保持函数温热 | 带监控的健康检查端点 | 保持函数活跃 |

## 数据库连接池

### 问题

在 serverless 环境中，每个函数调用可能会打开新的数据库连接。如果没有连接池，可能会耗尽数据库的连接限制。

### 解决方案：连接池

在应用程序和数据库之间使用连接池：

| 连接池 | 提供商 | 配置 |
|---|---|---|
| PgBouncer | Supabase（内置） | 使用池化连接字符串（端口 6543） |
| Neon Pooler | Neon（内置） | 使用 `-pooler` 连接字符串 |
| PgBouncer | 自托管 | 与 PostgreSQL 一起部署 PgBouncer |

### 配置

对池化连接和直接连接使用不同的连接字符串：

```bash
# 应用程序查询使用池化连接（对 serverless 安全）
DATABASE_URL=postgresql://user:pass@host:6543/db?pgbouncer=true

# 仅迁移使用直接连接
DIRECT_DATABASE_URL=postgresql://user:pass@host:5432/db
```

更新 `drizzle.config.ts` 使用直接连接进行迁移：

```typescript
export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL,
  },
} satisfies Config;
```

### 连接限制

| 层级 | 最大连接数 | 推荐连接池大小 |
|---|---|---|
| Hobby（Neon/Supabase） | 50–100 | 10–20 |
| Pro（Neon/Supabase） | 200–500 | 50–100 |
| Enterprise | 1000+ | 100–200 |

### 代码中的连接管理

模板的数据库模块应在函数实例上重用单个连接池：

```typescript
// lib/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// 每个 serverless 实例创建一次连接池
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, {
  max: 10,          // 连接池中的最大连接数
  idle_timeout: 20, // 20 秒后关闭空闲连接
  connect_timeout: 10,
});

export const db = drizzle(client);
```

## CDN 与缓存

### Vercel 边缘网络

在 Vercel 上部署时，边缘网络自动提供：

- 全球 CDN 分发（超过 30 个区域）
- 静态资产的自动缓存
- ISR 页面（增量静态再生成）的边缘缓存
- DDoS 保护

### Cache-Control 头

为不同内容类型配置缓存：

```typescript
// 带缓存头的 API 路由
export async function GET() {
  const data = await fetchData();

  return Response.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
```

### 按内容类型的缓存策略

| 内容类型 | 缓存策略 | TTL | 说明 |
|---|---|---|---|
| 静态资产（JS、CSS、图片） | 不可变 | 1 年 | 内容哈希文件名 |
| 公开页面 | ISR | 60–300 秒 | 按需重新验证 |
| API 响应（公开） | `s-maxage` | 10–60 秒 | CDN 级缓存 |
| API 响应（已认证） | `no-store` | 0 | 永不存储用户数据 |
| CMS 内容页面 | ISR | 300 秒 | 内容同步后重新验证 |

### ISR（增量静态再生成）

对内容丰富但不常更改的页面使用 ISR：

```typescript
// app/[locale]/discover/[page]/page.tsx
export const revalidate = 300; // 每 5 分钟重新生成

export default async function DiscoverPage({ params }) {
  const items = await fetchItems(params.page);
  return <ItemGrid items={items} />;
}
```

### 按需重新验证

内容更新后触发重新验证：

```typescript
// app/api/revalidate/route.ts
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  const { secret, path } = await request.json();

  if (secret !== process.env.REVALIDATION_SECRET) {
    return Response.json({ error: 'Invalid secret' }, { status: 401 });
  }

  revalidatePath(path);
  return Response.json({ revalidated: true });
}
```

## 边缘函数

### 何时使用边缘运行时

边缘函数运行在 Cloudflare Workers（通过 Vercel）上，提供几乎零冷启动时间。适用于：

| 使用场景 | 示例 |
|---|---|
| 基于地理位置的路由 | 将用户重定向到区域内容 |
| A/B 测试 | 导向实验变体 |
| 身份验证检查 | 快速会话验证 |
| 响应转换 | 添加头、修改响应 |
| 简单 API 端点 | 轻量级数据获取 |

### 边缘运行时限制

| 限制 | 详情 |
|---|---|
| 无 Node.js API | 不能使用 `fs`、`child_process` 等 |
| 无原生模块 | 不能直接使用 `bcryptjs`、`postgres` |
| 有限执行时间 | 最长 30 秒（Vercel Pro） |
| 有限内存 | 128 MB |
| 无 Drizzle ORM | 使用边缘兼容的数据库客户端 |

### 边缘函数示例

```typescript
// app/api/geo/route.ts
export const runtime = 'edge';

export async function GET(request: Request) {
  const country = request.headers.get('x-vercel-ip-country') || 'US';
  const city = request.headers.get('x-vercel-ip-city') || 'Unknown';

  return Response.json({
    country,
    city,
    timestamp: Date.now(),
  });
}
```

## 水平扩展策略

### 无状态应用程序设计

该模板在应用程序层设计为无状态：

| 组件 | 数据位置 | 对扩展的影响 |
|---|---|---|
| 会话 | 数据库或 JWT | 实例间无共享状态 |
| 后台任务 | 任务管理器（每实例或 Trigger.dev） | 多实例时使用 Trigger.dev |
| 文件上传 | 外部存储（S3、Supabase） | 不依赖本地文件系统 |
| CMS 内容 | Git 仓库（构建/启动时克隆） | 只读，每个实例相同 |
| 缓存 | 内存（每实例）或 Redis | 考虑用 Redis 共享缓存 |

### 多实例注意事项

运行多个实例时（Docker Swarm、Kubernetes 或多个 Vercel 函数）：

1. **后台任务**：使用 Trigger.dev 或 Vercel Cron 而非 `LocalJobManager`，以避免重复执行。
2. **数据库连接**：启用连接池以避免连接耗尽。
3. **会话存储**：使用基于数据库的会话而非内存存储。
4. **缓存失效**：实现共享缓存（Redis）或接受实例缓存的最终一致性。

## 扩展时的监控

### 关键追踪指标

| 指标 | 工具 | 阈值 |
|---|---|---|
| 响应时间（p95） | Sentry、Vercel Analytics | < 500 毫秒 |
| 错误率 | Sentry | < 1% |
| 数据库连接数 | 数据库仪表板 | < 最大值的 80% |
| 函数冷启动 | Vercel Analytics | 监控频率 |
| 缓存命中率 | 应用程序日志 | > 80% |
| 内存使用率 | Vercel/Docker 指标 | < 限制的 80% |

### Sentry 性能监控

该模板配置了带采样率的 Sentry：

```typescript
Sentry.init({
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
```

根据流量量调整 `tracesSampleRate`：

| 日请求量 | 推荐采样率 |
|---|---|
| < 10,000 | 1.0（100%） |
| 10,000–100,000 | 0.1（10%） |
| 100,000–1,000,000 | 0.01（1%） |
| > 1,000,000 | 0.001（0.1%） |

## 负载测试

### 推荐工具

| 工具 | 使用场景 | 复杂度 |
|---|---|---|
| `autocannon` | 快速 HTTP 基准测试 | 低 |
| `k6` | 脚本化负载测试 | 中 |
| `Artillery` | 复杂场景 | 中 |
| `Locust` | Python 基础、分布式 | 高 |

### 负载测试示例

```bash
# 使用 autocannon 快速基准测试
npx autocannon -c 50 -d 30 https://your-app.vercel.app/api/health

# 使用 k6 进行更详细的测试
k6 run load-test.js
```

### 测试检查清单

| 测试 | 目标 | 通过标准 |
|---|---|---|
| 首页加载 | 100 个并发用户 | p95 < 1 秒 |
| API 端点 | 200 请求/秒 | p95 < 500 毫秒，0% 错误 |
| 搜索查询 | 50 个并发用户 | p95 < 2 秒 |
| 认证流程 | 20 个并发用户 | 全部成功，无超时 |

## 可扩展性检查清单

| 类别 | 项目 | 优先级 |
|---|---|---|
| **数据库** | 启用连接池 | 关键 |
| **数据库** | 读密集型工作负载使用只读副本 | 高 |
| **数据库** | 为慢查询添加索引 | 高 |
| **缓存** | 配置 CDN 缓存头 | 关键 |
| **缓存** | 为 CMS 内容页面实现 ISR | 高 |
| **缓存** | 添加 Redis 作为共享缓存（多实例） | 中 |
| **计算** | 对轻量路由使用边缘运行时 | 中 |
| **计算** | 使用外部包优化冷启动 | 高 |
| **任务** | 迁移到 Trigger.dev 用于多实例 | 高 |
| **任务** | 配置 Vercel Cron 用于计划任务 | 高 |
| **监控** | 配置具有适当采样率的 Sentry | 关键 |
| **监控** | 配置错误率和延迟告警 | 高 |
| **测试** | 在重要发布前运行负载测试 | 高 |
