---
id: config-system
title: 配置系统
sidebar_label: 配置系统
sidebar_position: 0
---

# 配置系统

Ever Works 模板使用基于 Zod 验证模式构建的集中式、类型安全配置系统。所有环境变量在应用程序启动时进行验证，对缺失或无效配置提供即时反馈。该系统同时支持仅服务端的密钥和适用于客户端的公共变量。

## 架构

```
lib/config/
  config-service.ts        # 集中式 ConfigService 单例
  client.ts                # 客户端安全配置（NEXT_PUBLIC_*）
  env.ts                   # 遗留 env 模式（API 配置）
  server-config.ts         # 已废弃的服务器辅助函数（使用 ConfigService）
  feature-flags.ts         # 功能可用性标记
  index.ts                 # 桶导出
  types.ts                 # TypeScript 类型定义
  schemas/
    index.ts               # 模式桶导出
    core.schema.ts         # URL、站点信息、数据库、内容
    auth.schema.ts         # 认证密钥、OAuth 提供商、JWT、Cookie
    email.schema.ts        # SMTP、Resend、Novu 配置
    payment.schema.ts      # Stripe、LemonSqueezy、Polar、定价
    analytics.schema.ts    # PostHog、Sentry、Vercel Analytics、Recaptcha
    integrations.schema.ts # Trigger.dev、Twenty CRM、Cron
  billing/
    index.ts               # 计费配置桶
    stripe.config.ts       # Stripe 专属配置
    lemonsqueezy.config.ts # LemonSqueezy 配置
    polar.config.ts        # Polar 配置
    solidgate.config.ts    # Solidgate 配置
    types.ts               # 计费类型
  utils/
    env-parser.ts          # 环境变量解析工具
    validation-logger.ts   # 验证结果格式化和日志记录
```

## ConfigService 单例

配置系统的核心是 `lib/config/config-service.ts` 中的 `ConfigService` 类。它：

1. 通过收集器函数收集所有环境变量
2. 根据合并的 Zod 模式验证它们
3. 将验证后的配置存储为单例
4. 为每个配置节提供类型化的 getter

```typescript
import { configService } from '@/lib/config';

// 访问特定节
const appUrl = configService.core.APP_URL;
const stripeEnabled = configService.payment.stripe.enabled;
const posthogKey = configService.analytics.posthog.key;
const crmMode = configService.integrations.twentyCrm.syncMode;
```

### 节导出

为了 tree-shaking 和简便性，各个节也可以直接导出：

```typescript
import {
  coreConfig,
  authConfig,
  emailConfig,
  paymentConfig,
  analyticsConfig,
  integrationsConfig,
} from '@/lib/config/config-service';

// 无需 ConfigService 前缀直接访问
const dbUrl = coreConfig.DATABASE_URL;
```

### 仅服务端强制

`ConfigService` 模块导入 `'server-only'`，这意味着：

- 只能在服务器组件、API 路由和服务端代码中使用
- 尝试在客户端组件中导入它会产生构建错误
- 防止意外暴露 API 密钥等密钥

## 客户端配置（`lib/config/client.ts`）

客户端安全配置位于单独的模块中，仅读取 `NEXT_PUBLIC_*` 变量：

```typescript
import { siteConfig, pricingConfig, clientEnv } from '@/lib/config/client';

// 站点品牌
siteConfig.name        // NEXT_PUBLIC_SITE_NAME
siteConfig.tagline     // NEXT_PUBLIC_SITE_TAGLINE
siteConfig.url         // NEXT_PUBLIC_APP_URL
siteConfig.logo        // NEXT_PUBLIC_SITE_LOGO
siteConfig.brandName   // NEXT_PUBLIC_BRAND_NAME
siteConfig.social      // 社交媒体链接
siteConfig.attribution // "使用...构建"归因

// 定价
pricingConfig.free     // NEXT_PUBLIC_PRODUCT_PRICE_FREE
pricingConfig.standard // NEXT_PUBLIC_PRODUCT_PRICE_STANDARD
pricingConfig.premium  // NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM

// 环境
clientEnv.isDevelopment
clientEnv.isProduction
clientEnv.isTest
```

该模块可以安全地在任何组件中导入，包括客户端代码。

## 验证模式

每个配置节在 `lib/config/schemas/` 中都有专用的 Zod 模式：

### 核心模式（`core.schema.ts`）

验证：`NODE_ENV`、`APP_URL`、`SITE_URL`、`API_BASE_URL`、`DATABASE_URL`、站点元数据（名称、标语、描述、关键词、logo）、社交链接、OG 图片主题、归因和内容仓库设置。

### 认证模式（`auth.schema.ts`）

验证：`AUTH_SECRET`、`COOKIE_SECRET`、JWT 令牌过期设置、Cookie 配置、OAuth 提供商凭据（Google、GitHub、Microsoft、Facebook、X/Twitter、LinkedIn）、Supabase 配置和种子用户凭据。

### 邮件模式（`email.schema.ts`）

验证：`EMAIL_PROVIDER`（resend/novu）、`EMAIL_FROM`、`EMAIL_SUPPORT`、`COMPANY_NAME`、SMTP 设置（主机、端口、用户、密码）、Resend API 密钥和 Novu API 密钥。

### 支付模式（`payment.schema.ts`）

验证：Stripe（密钥、可发布密钥、Webhook 密钥、价格 ID、动态定价、多货币）、LemonSqueezy（API 密钥、商店 ID、Webhook、变体 ID）、Polar（访问令牌、Webhook、组织、计划 ID）、产品定价、试用金额。

### 分析模式（`analytics.schema.ts`）

验证：PostHog（密钥、主机、调试、会话录制、自动捕获、个人 API 密钥、项目 ID）、Sentry（DSN、组织、项目、认证令牌、调试）、Vercel Analytics、Recaptcha（站点密钥、密钥）、异常追踪提供商。

### 集成模式（`integrations.schema.ts`）

验证：Trigger.dev（已启用、API 密钥、URL、环境）、Twenty CRM（基础 URL、API 密钥、已启用、同步模式）、Cron（密钥）。

## 验证行为

验证系统使用 Zod 的 `.catch()` 进行优雅降级：

```typescript
// 来自 integrations.schema.ts
export const twentyCrmConfigSchema = z
  .object({
    baseUrl: z.string().url().optional().catch(undefined),
    apiKey: z.string().optional(),
    enabled: z.boolean().default(false),
    syncMode: twentyCrmSyncModeSchema,
  })
  .transform((data) => ({
    ...data,
    enabled: data.enabled ?? Boolean(data.baseUrl && data.apiKey),
  }));
```

- 带 `.catch()` 的**可选字段**以默认值优雅恢复
- 不带 `.catch()` 的**必填字段**会在启动时导致失败
- **转换步骤**计算派生值（如自动检测启用状态）

验证结果在启动时通过 `validation-logger.ts` 记录，显示哪些集成处于活动状态以及关于缺失可选配置的警告。

## 功能标记（`lib/config/feature-flags.ts`）

功能标记提供了一个简单机制来启用/禁用依赖数据库的功能：

```typescript
import { getFeatureFlags, isFeatureEnabled } from '@/lib/config/feature-flags';

const flags = getFeatureFlags();
// { ratings: true, comments: true, favorites: true, featuredItems: true, surveys: true }

if (isFeatureEnabled('comments')) {
  // 渲染评论区
}
```

所有功能标记目前都与 `DATABASE_URL` 的可用性挂钩。当没有配置数据库时，交互式功能被禁用，同时目录继续提供静态内容。

## 从旧版配置迁移

`server-config.ts` 模块包含已废弃的辅助函数。迁移路径：

| 已废弃 | 替代 |
|-----------|-------------|
| `getServerConfig().supportEmail` | `configService.email.EMAIL_SUPPORT` |
| `getServerConfig().appUrl` | `configService.core.APP_URL` |
| `getServerConfig().stripeSecretKey` | `configService.payment.stripe.secretKey` |
| `isDevelopment()` | `configService.core.NODE_ENV === 'development'` |
| `getEmailConfig()` | `configService.email` |

## 相关文件

- `lib/config/config-service.ts` — ConfigService 单例
- `lib/config/client.ts` — 客户端安全配置
- `lib/config/schemas/*.schema.ts` — Zod 验证模式
- `lib/config/feature-flags.ts` — 功能标记
- `lib/config/types.ts` — TypeScript 类型定义
- `.env.example` — 完整的环境变量参考
