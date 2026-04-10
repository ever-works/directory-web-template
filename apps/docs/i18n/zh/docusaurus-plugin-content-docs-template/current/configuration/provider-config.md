---
id: provider-config
title: "提供商配置"
sidebar_label: "提供商配置"
sidebar_position: 4
---

# 提供商配置

该模板使用集中式 `ConfigService` 单例来管理所有外部服务提供商。每个提供商通过 Zod 验证的模式配置，具有自动功能检测——当提供商所需的凭据存在时，提供商将被启用。

## ConfigService 架构

`lib/config/config-service.ts` 中的 `ConfigService` 是一个仅服务器端的单例，在启动时验证所有环境变量：

```ts
import { configService } from '@/lib/config';

// 访问配置部分
const appUrl = configService.core.APP_URL;
const stripeEnabled = configService.payment.stripe.enabled;
const posthogEnabled = configService.analytics.posthog.enabled;
```

该服务分为六个部分，每个部分都有自己的 Zod 模式：

| 部分 | 访问器 | 模式文件 |
|------|--------|---------|
| Core | `configService.core` | `schemas/core.schema.ts` |
| Auth | `configService.auth` | `schemas/auth.schema.ts` |
| Email | `configService.email` | `schemas/email.schema.ts` |
| Payment | `configService.payment` | `schemas/payment.schema.ts` |
| Analytics | `configService.analytics` | `schemas/analytics.schema.ts` |
| Integrations | `configService.integrations` | `schemas/integrations.schema.ts` |

### Tree-Shakeable 导入

各部分可以直接导入以获得更好的 tree-shaking：

```ts
import { coreConfig, paymentConfig, analyticsConfig } from '@/lib/config';

const url = coreConfig.APP_URL;
const stripeKey = paymentConfig.stripe.publishableKey;
```

### 启动时验证

所有配置在第一次导入时使用 Zod 进行验证。无效值会在可能的情况下触发 `.catch()` 回退，而真正无法恢复的错误会在启动时抛出：

```ts
const result = appConfigSchema.safeParse(rawConfig);
if (!result.success) {
  throw new Error(`[ConfigService] Configuration errors:\n${...}`);
}
```

## 身份验证提供商

定义在 `lib/config/schemas/auth.schema.ts` 中。OAuth 提供商自动检测启用状态：

```ts
const oauthProviderSchema = z.object({
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
}).transform((data) => ({
  ...data,
  enabled: Boolean(data.clientId && data.clientSecret),
}));
```

### 支持的 OAuth 提供商

| 提供商 | Client ID 变量 | Client Secret 变量 |
|-------|---------------|-------------------|
| Google | `GOOGLE_CLIENT_ID` | `GOOGLE_CLIENT_SECRET` |
| GitHub | `GITHUB_CLIENT_ID` | `GITHUB_CLIENT_SECRET` |
| Microsoft | `MICROSOFT_CLIENT_ID` | `MICROSOFT_CLIENT_SECRET` |
| Facebook | `FB_CLIENT_ID` | `FB_CLIENT_SECRET` |
| Twitter/X | `X_CLIENT_ID` | `X_CLIENT_SECRET` |
| LinkedIn | `LINKEDIN_CLIENT_ID` | `LINKEDIN_CLIENT_SECRET` |

### Supabase 身份验证后端

```ts
const supabaseConfigSchema = z.object({
  url: z.string().url().optional(),
  anonKey: z.string().optional(),
}).transform((data) => ({
  ...data,
  enabled: Boolean(data.url && data.anonKey),
}));
```

| 变量 | 描述 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名密钥 |

### 其他身份验证设置

| 变量 | 默认值 | 描述 |
|------|--------|------|
| `AUTH_SECRET` | -- | 会话签名所必需 |
| `COOKIE_SECRET` | -- | Cookie 加密密钥 |
| `COOKIE_DOMAIN` | `'localhost'` | Cookie 域名 |
| `COOKIE_SECURE` | `false` | 仅 HTTPS Cookie |
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | `'15m'` | 访问令牌有效期 |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | `'7d'` | 刷新令牌有效期 |

## 支付提供商

定义在 `lib/config/schemas/payment.schema.ts` 中。每个提供商在其所需凭据设置后自动启用。

### Stripe

当 `secretKey` 和 `publishableKey` 存在时自动启用：

| 变量 | 描述 |
|------|------|
| `STRIPE_SECRET_KEY` | 服务器端密钥 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | 客户端可发布密钥 |
| `STRIPE_WEBHOOK_SECRET` | Webhook 签名验证 |
| `NEXT_PUBLIC_STRIPE_FREE_PRICE` | 免费计划价格 ID |
| `NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID` | 标准计划价格 ID |
| `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID` | 高级计划价格 ID |

### LemonSqueezy

当 `apiKey` 和 `storeId` 存在时自动启用：

| 变量 | 描述 |
|------|------|
| `LEMONSQUEEZY_API_KEY` | API 密钥 |
| `LEMONSQUEEZY_STORE_ID` | 商店标识符 |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Webhook 密钥 |
| `LEMONSQUEEZY_WEBHOOK_URL` | Webhook 端点 URL |
| `LEMONSQUEEZY_TEST_MODE` | 启用测试模式（`'true'`/`'false'`） |
| `NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID` | 免费计划的变体 ID |
| `NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID` | 标准计划的变体 ID |
| `NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID` | 高级计划的变体 ID |

### Polar

当 `accessToken` 和 `organizationId` 存在时自动启用：

| 变量 | 默认值 | 描述 |
|------|--------|------|
| `POLAR_ACCESS_TOKEN` | -- | API 访问令牌 |
| `POLAR_ORGANIZATION_ID` | -- | 组织 ID |
| `POLAR_WEBHOOK_SECRET` | -- | Webhook 密钥 |
| `POLAR_SANDBOX` | `true` | 沙箱模式（生产环境设置为 `'false'`） |
| `POLAR_API_URL` | -- | 自定义 API URL |
| `NEXT_PUBLIC_POLAR_FREE_PLAN_ID` | -- | 免费层级的计划 ID |
| `NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID` | -- | 标准层级的计划 ID |
| `NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID` | -- | 高级层级的计划 ID |

### 产品定价显示

| 变量 | 默认值 | 描述 |
|------|--------|------|
| `NEXT_PUBLIC_PRODUCT_PRICE_FREE` | `0` | 免费计划的显示价格 |
| `NEXT_PUBLIC_PRODUCT_PRICE_STANDARD` | `10` | 标准计划的显示价格 |
| `NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM` | `20` | 高级计划的显示价格 |

## 邮件提供商

定义在 `lib/config/schemas/email.schema.ts` 中。

### SMTP

当 `host`、`user` 和 `password` 都存在时自动启用：

| 变量 | 默认值 | 描述 |
|------|--------|------|
| `SMTP_HOST` | -- | SMTP 服务器主机名 |
| `SMTP_PORT` | `587` | SMTP 服务器端口 |
| `SMTP_USER` | -- | SMTP 身份验证用户名 |
| `SMTP_PASSWORD` | -- | SMTP 身份验证密码 |

### Resend

当 `apiKey` 存在时自动启用：

| 变量 | 描述 |
|------|------|
| `RESEND_API_KEY` | Resend API 密钥 |

### Novu

当 `apiKey` 存在时自动启用：

| 变量 | 描述 |
|------|------|
| `NOVU_API_KEY` | Novu API 密钥 |

### 邮件设置

| 变量 | 默认值 | 描述 |
|------|--------|------|
| `COMPANY_NAME` | `'Ever Works'` | 邮件模板中的公司名称 |
| `EMAIL_PROVIDER` | `'resend'` | 活跃邮件提供商（`'resend'`、`'novu'`） |
| `EMAIL_FROM` | -- | 发件人邮件地址 |
| `EMAIL_SUPPORT` | -- | 支持邮件地址 |

## 分析提供商

定义在 `lib/config/schemas/analytics.schema.ts` 中。

### PostHog

当 `key` 存在时自动启用：

| 变量 | 默认值 | 描述 |
|------|--------|------|
| `NEXT_PUBLIC_POSTHOG_KEY` | -- | PostHog 项目 API 密钥 |
| `NEXT_PUBLIC_POSTHOG_HOST` | `'https://us.i.posthog.com'` | PostHog 主机 URL |
| `POSTHOG_DEBUG` | `false` | 启用调试模式 |
| `POSTHOG_SESSION_RECORDING_ENABLED` | `true` | 启用会话录制 |
| `POSTHOG_AUTO_CAPTURE` | `false` | 自动捕获事件 |
| `POSTHOG_EXCEPTION_TRACKING` | `true` | 跟踪异常 |
| `POSTHOG_PERSONAL_API_KEY` | -- | 个人 API 密钥（管理控制台） |
| `POSTHOG_PROJECT_ID` | -- | 项目 ID（管理控制台） |

### Sentry

当 `dsn` 存在时自动启用：

| 变量 | 默认值 | 描述 |
|------|--------|------|
| `NEXT_PUBLIC_SENTRY_DSN` | -- | Sentry DSN |
| `SENTRY_ORG` | -- | Sentry 组织标识符 |
| `SENTRY_PROJECT` | -- | Sentry 项目名称 |
| `SENTRY_AUTH_TOKEN` | -- | 源映射的身份验证令牌 |
| `SENTRY_ENABLE_DEV` | `false` | 在开发环境中启用 |
| `SENTRY_DEBUG` | `false` | 调试模式 |

### reCAPTCHA

当 `siteKey` 和 `secretKey` 都存在时自动启用：

| 变量 | 描述 |
|------|------|
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | 客户端站点密钥 |
| `RECAPTCHA_SECRET_KEY` | 服务器端密钥 |

### Vercel Analytics

| 变量 | 默认值 | 描述 |
|------|--------|------|
| `NEXT_PUBLIC_SPEED_INSIGHTS_ENABLED` | `false` | 启用 Vercel Speed Insights |
| `NEXT_PUBLIC_SPEED_INSIGHTS_SAMPLE_RATE` | `0.5` | 采样率（0--1） |

### 异常跟踪提供商

| 变量 | 默认值 | 描述 |
|------|--------|------|
| `EXCEPTION_TRACKING_PROVIDER` | `'posthog'` | `'posthog'`、`'sentry'` 或 `'none'` |

## 检查提供商状态

```ts
import { configService } from '@/lib/config';

// 检查 Stripe 是否已配置
if (configService.payment.stripe.enabled) {
  // Stripe 已准备好使用
}

// 检查是否有邮件提供商可用
const hasEmail = configService.email.resend.enabled
  || configService.email.novu.enabled
  || configService.email.smtp.enabled;

// 列出已启用的 OAuth 提供商
const oauthProviders = ['google', 'github', 'microsoft', 'facebook', 'twitter', 'linkedin']
  .filter(p => configService.auth[p].enabled);
```

## 相关文件

| 路径 | 描述 |
|------|------|
| `lib/config/config-service.ts` | ConfigService 单例 |
| `lib/config/schemas/auth.schema.ts` | 身份验证提供商模式 |
| `lib/config/schemas/payment.schema.ts` | 支付提供商模式 |
| `lib/config/schemas/email.schema.ts` | 邮件提供商模式 |
| `lib/config/schemas/analytics.schema.ts` | 分析提供商模式 |
| `lib/config/schemas/integrations.schema.ts` | 集成提供商模式 |
| `lib/config/schemas/core.schema.ts` | 核心配置模式 |
| `lib/config/types.ts` | TypeScript 类型定义 |
| `lib/config/index.ts` | Barrel 导出 |
| `.env.example` | 完整环境变量参考 |
