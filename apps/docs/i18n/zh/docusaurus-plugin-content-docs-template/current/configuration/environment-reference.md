---
id: environment-reference
title: 环境变量完整参考
sidebar_label: 环境变量参考
sidebar_position: 1
---

# 环境变量完整参考

本页面提供 Ever Works 模板所使用的所有环境变量的完整参考。变量按类别组织，包含类型、默认值和是否必填。

将 `.env.example` 复制到 `.env.local` 并填写您的部署所需的值。

## 内容与数据仓库

| 变量 | 类型 | 必填 | 默认 | 描述 |
|----------|------|----------|---------|-------------|
| `DATA_REPOSITORY` | string (URL) | **是** | -- | 内容数据的 Git 仓库 URL |
| `GH_TOKEN` | string | 否 | -- | GitHub 个人访问令牌（用于私有仓库） |
| `GITHUB_TOKEN` | string | 否 | -- | 备用 GitHub 令牌变量 |
| `GITHUB_BRANCH` | string | 否 | `master` | 克隆内容的 Git 分支 |

## 数据库

| 变量 | 类型 | 必填 | 默认 | 描述 |
|----------|------|----------|---------|-------------|
| `DATABASE_URL` | string | 建议 | -- | 数据库连接字符串（SQLite 或 Postgres） |

未设置 `DATABASE_URL` 时，依赖数据库的功能（评分、评论、收藏、调查、精选项目）将通过功能标志系统自动禁用。

## 身份验证

| 变量 | 类型 | 必填 | 默认 | 描述 |
|----------|------|----------|---------|-------------|
| `AUTH_SECRET` | string | **是** | -- | NextAuth 密钥（`openssl rand -base64 32`） |
| `COOKIE_SECRET` | string | **是** | -- | Cookie 加密密钥 |
| `COOKIE_DOMAIN` | string | 否 | -- | Cookie 域名（例如 `localhost`） |
| `COOKIE_SECURE` | boolean | 否 | `true` | 安全 Cookie 标志 |
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | string | 否 | `15m` | 访问令牌 TTL |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | string | 否 | `7d` | 刷新令牌 TTL |

### OAuth 提供者

| 变量 | 类型 | 必填 | 描述 |
|----------|------|----------|-------------|
| `GOOGLE_CLIENT_ID` | string | 否 | Google OAuth 客户端 ID |
| `GOOGLE_CLIENT_SECRET` | string | 否 | Google OAuth 客户端密钥 |
| `GITHUB_CLIENT_ID` | string | 否 | GitHub OAuth 客户端 ID |
| `GITHUB_CLIENT_SECRET` | string | 否 | GitHub OAuth 客户端密钥 |
| `MICROSOFT_CLIENT_ID` | string | 否 | Microsoft OAuth 客户端 ID |
| `MICROSOFT_CLIENT_SECRET` | string | 否 | Microsoft OAuth 客户端密钥 |
| `FB_CLIENT_ID` | string | 否 | Facebook OAuth 客户端 ID |
| `FB_CLIENT_SECRET` | string | 否 | Facebook OAuth 客户端密钥 |
| `X_CLIENT_ID` | string | 否 | X (Twitter) OAuth 客户端 ID |
| `X_CLIENT_SECRET` | string | 否 | X (Twitter) OAuth 客户端密钥 |
| `LINKEDIN_CLIENT_ID` | string | 否 | LinkedIn OAuth 客户端 ID |
| `LINKEDIN_CLIENT_SECRET` | string | 否 | LinkedIn OAuth 客户端密钥 |

当客户端 ID 和密钥均设置时，OAuth 提供者自动启用。

## 站点与品牌（客户端安全）

所有 `NEXT_PUBLIC_*` 变量对浏览器公开。

| 变量 | 类型 | 默认 | 描述 |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_APP_URL` | string (URL) | `http://localhost:3000` | 目录应用 URL |
| `NEXT_PUBLIC_SITE_URL` | string (URL) | `https://ever.works` | 公司公共网站 URL |
| `NEXT_PUBLIC_API_BASE_URL` | string (URL) | `http://localhost:3000` | API 基础 URL |
| `NEXT_PUBLIC_SITE_NAME` | string | `Ever Works` | 元数据中的站点名称 |
| `NEXT_PUBLIC_SITE_TAGLINE` | string | `The Open-Source, AI-Powered Directory Builder` | 站点标语 |
| `NEXT_PUBLIC_BRAND_NAME` | string | `Ever Works` | schema.org 的品牌名称 |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | string | （见 .env.example） | SEO 描述（160 字符以内） |
| `NEXT_PUBLIC_SITE_KEYWORDS` | string (CSV) | `Ever Works,Directory Builder,...` | 逗号分隔的 SEO 关键词 |
| `NEXT_PUBLIC_SITE_LOGO` | string | `/logo-ever-works.svg` | Logo 路径（相对于 /public） |

### OG 图片主题

| 变量 | 类型 | 默认 | 描述 |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_OG_GRADIENT_START` | string (hex) | `#667eea` | OG 图片渐变起始色 |
| `NEXT_PUBLIC_OG_GRADIENT_END` | string (hex) | `#764ba2` | OG 图片渐变结束色 |

### 社交媒体链接

| 变量 | 类型 | 默认 | 描述 |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_SOCIAL_GITHUB` | string (URL) | `https://github.com/ever-works` | GitHub 链接 |
| `NEXT_PUBLIC_SOCIAL_X` | string (URL) | `https://x.com/everplatform` | X (Twitter) 链接 |
| `NEXT_PUBLIC_SOCIAL_LINKEDIN` | string (URL) | （见 .env.example） | LinkedIn 链接 |
| `NEXT_PUBLIC_SOCIAL_FACEBOOK` | string (URL) | （见 .env.example） | Facebook 链接 |
| `NEXT_PUBLIC_SOCIAL_BLOG` | string (URL) | `https://blog.ever.works` | 博客链接 |
| `NEXT_PUBLIC_SOCIAL_EMAIL` | string | `ever@ever.works` | 联系邮箱 |

### 署名

| 变量 | 类型 | 默认 | 描述 |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_ATTRIBUTION_URL` | string (URL) | `https://ever.works` | "由...构建"链接 URL |
| `NEXT_PUBLIC_ATTRIBUTION_NAME` | string | `Ever Works` | "由...构建"链接文本 |

## 支付提供者

### Stripe

| 变量 | 类型 | 必填 | 描述 |
|----------|------|----------|-------------|
| `STRIPE_SECRET_KEY` | string | 否 | Stripe 密钥（仅服务端） |
| `STRIPE_PUBLISHABLE_KEY` | string | 否 | Stripe 可发布密钥 |
| `STRIPE_WEBHOOK_SECRET` | string | 否 | Webhook 签名密钥 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | string | 否 | 客户端安全可发布密钥 |
| `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING` | boolean | 否 | 从 Stripe API 加载价格 |
| `NEXT_PUBLIC_STRIPE_PAYMENT_FORM_ENABLED` | boolean | 否 | 启用 Stripe 结账 |

#### Stripe 多货币价格 ID

对于 Standard 和 Premium 计划，模板支持特定货币的价格 ID：

```
NEXT_PUBLIC_STRIPE_STANDARD_PRODUCT_ID=
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_USD=
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_EUR=
...
```

### LemonSqueezy

| 变量 | 类型 | 描述 |
|----------|------|-------------|
| `LEMONSQUEEZY_API_KEY` | string | API 密钥 |
| `LEMONSQUEEZY_STORE_ID` | string | 商店标识符 |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | string | Webhook 密钥 |
| `LEMONSQUEEZY_WEBHOOK_URL` | string | Webhook 端点 URL |
| `LEMONSQUEEZY_TEST_MODE` | boolean | 启用测试模式 |
| `NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID` | string | 免费计划变体 |
| `NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID` | string | 标准计划变体 |
| `NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID` | string | 高级计划变体 |
| `NEXT_PUBLIC_LEMONSQUEEZY_PAYMENT_FORM_ENABLED` | boolean | 启用结账 |

### Polar

| 变量 | 类型 | 描述 |
|----------|------|-------------|
| `POLAR_ACCESS_TOKEN` | string | 访问令牌 |
| `POLAR_WEBHOOK_SECRET` | string | Webhook 密钥 |
| `POLAR_ORGANIZATION_ID` | string | 组织 ID |
| `POLAR_SANDBOX` | boolean | 沙盒模式（默认：`true`） |
| `POLAR_API_URL` | string (URL) | 自定义 API URL |
| `NEXT_PUBLIC_POLAR_FREE_PLAN_ID` | string | 免费计划 ID |
| `NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID` | string | 标准计划 ID |
| `NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID` | string | 高级计划 ID |
| `NEXT_PUBLIC_POLAR_PAYMENT_FORM_ENABLED` | boolean | 启用结账 |

### Solidgate

| 变量 | 类型 | 描述 |
|----------|------|-------------|
| `SOLIDGATE_API_KEY` | string | API 密钥 |
| `SOLIDGATE_SECRET_KEY` | string | 密钥 |
| `SOLIDGATE_WEBHOOK_SECRET` | string | Webhook 密钥 |
| `SOLIDGATE_MERCHANT_ID` | string | 商户 ID |
| `SOLIDGATE_API_BASE_URL` | string (URL) | API 基础 URL |
| `NEXT_PUBLIC_SOLIDGATE_PUBLISHABLE_KEY` | string | 客户端安全密钥 |

### 产品定价

| 变量 | 类型 | 默认 | 描述 |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_PRODUCT_PRICE_FREE` | number | `0` | 免费套餐价格 |
| `NEXT_PUBLIC_PRODUCT_PRICE_STANDARD` | number | `10` | 标准套餐价格 |
| `NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM` | number | `20` | 高级套餐价格 |
| `NEXT_PUBLIC_PREMIUM_TRIAL_AMOUNT_ID` | string | -- | 高级试用金额 ID |
| `NEXT_PUBLIC_STANDARD_TRIAL_AMOUNT_ID` | string | -- | 标准试用金额 ID |
| `NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT` | boolean | `false` | 启用试用金额 |

## 分析与监控

### PostHog

| 变量 | 类型 | 默认 | 描述 |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_POSTHOG_KEY` | string | -- | PostHog 项目 API 密钥 |
| `NEXT_PUBLIC_POSTHOG_HOST` | string (URL) | `https://us.i.posthog.com` | PostHog 主机 |
| `POSTHOG_DEBUG` | boolean | `false` | 启用调试日志 |
| `POSTHOG_SESSION_RECORDING_ENABLED` | boolean | `true` | 会话录制 |
| `POSTHOG_AUTO_CAPTURE` | boolean | `false` | 自动捕获事件 |
| `POSTHOG_PERSONAL_API_KEY` | string | -- | 服务端 API 密钥 |
| `POSTHOG_PROJECT_ID` | string | -- | 分析项目 ID |
| `POSTHOG_EXCEPTION_TRACKING` | boolean | `true` | 异常跟踪 |

### Sentry

| 变量 | 类型 | 默认 | 描述 |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | string (URL) | -- | Sentry DSN |
| `SENTRY_ORG` | string | `ever-co` | Sentry 组织 |
| `SENTRY_PROJECT` | string | `ever-works` | Sentry 项目名称 |
| `SENTRY_AUTH_TOKEN` | string | -- | Sentry 认证令牌 |
| `SENTRY_ENABLE_DEV` | boolean | `false` | 在开发中启用 |
| `SENTRY_DEBUG` | boolean | `false` | 调试模式 |
| `SENTRY_EXCEPTION_TRACKING` | boolean | `true` | 异常跟踪 |

### 其他分析

| 变量 | 类型 | 默认 | 描述 |
|----------|------|---------|-------------|
| `EXCEPTION_TRACKING_PROVIDER` | string | `posthog` | 异常提供者（`posthog` 或 `sentry`） |
| `ANALYZE` | boolean | `true` | 启用包分析 |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | string | -- | reCAPTCHA 站点密钥 |
| `RECAPTCHA_SECRET_KEY` | string | -- | reCAPTCHA 密钥 |
| `NEXT_PUBLIC_SPEED_INSIGHTS_ENABLED` | boolean | `false` | Vercel 速度洞察 |
| `NEXT_PUBLIC_SPEED_INSIGHTS_SAMPLE_RATE` | number | `0.5` | 速度洞察采样率 |

## 邮件

| 变量 | 类型 | 默认 | 描述 |
|----------|------|---------|-------------|
| `EMAIL_PROVIDER` | string | `resend` | 邮件提供者（`resend` 或 `novu`） |
| `EMAIL_FROM` | string | `info@ever.works` | 通知发件地址 |
| `EMAIL_SUPPORT` | string | `support@ever.works` | 支持邮件地址 |
| `COMPANY_NAME` | string | `Ever Works` | 邮件模板中的公司名称 |
| `RESEND_API_KEY` | string | -- | Resend API 密钥 |
| `NOVU_API_KEY` | string | -- | Novu API 密钥 |
| `SMTP_HOST` | string | -- | SMTP 服务器主机名 |
| `SMTP_PORT` | number | `587` | SMTP 端口 |
| `SMTP_USER` | string | -- | SMTP 用户名 |
| `SMTP_PASSWORD` | string | -- | SMTP 密码 |

## 集成

### Twenty CRM

| 变量 | 类型 | 默认 | 描述 |
|----------|------|---------|-------------|
| `TWENTY_CRM_BASE_URL` | string (URL) | -- | Twenty CRM 实例 URL |
| `TWENTY_CRM_API_KEY` | string | -- | 认证 API 密钥 |
| `TWENTY_CRM_ENABLED` | boolean | `false` | 显式启用/禁用 |
| `TWENTY_CRM_SYNC_MODE` | string | `disabled` | 同步模式（`disabled`、`platform`、`direct_crm`） |

### Trigger.dev（后台任务）

| 变量 | 类型 | 默认 | 描述 |
|----------|------|---------|-------------|
| `TRIGGER_DEV_ENABLED` | boolean | `false` | 启用 Trigger.dev |
| `TRIGGER_DEV_API_KEY` | string | -- | API 密钥 |
| `TRIGGER_DEV_API_URL` | string (URL) | -- | 自定义 API URL |
| `TRIGGER_DEV_ENVIRONMENT` | string | `development` | 环境（`development`、`staging`、`production`） |

### Cron 任务

| 变量 | 类型 | 描述 |
|----------|------|-------------|
| `CRON_SECRET` | string | Cron 端点认证密钥 |

### 地图与位置

| 变量 | 类型 | 描述 |
|----------|------|-------------|
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | string | Mapbox 公共令牌（`pk.*`） |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | string | Google Maps 浏览器受限密钥 |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | string | Google Maps 地图 ID |

### Ever Works 平台 API

| 变量 | 类型 | 默认 | 描述 |
|----------|------|---------|-------------|
| `PLATFORM_API_URL` | string (URL) | `https://api.ever.works/api` | 平台 API URL |
| `PLATFORM_API_SECRET_TOKEN` | string | -- | 平台 API 认证令牌 |

## Vercel 与部署

| 变量 | 类型 | 描述 |
|----------|------|-------------|
| `VERCEL_TOKEN` | string | Vercel 个人访问令牌 |
| `VERCEL_PROJECT_ID` | string | Vercel 项目 ID |
