---
id: environment-variables
title: 环境变量
sidebar_label: 环境变量
sidebar_position: 3
---

# 环境变量

本指南涵盖 Ever Works 模板 Web 应用所需的所有环境变量，包括验证、安全性以及不同部署场景的配置。

## 验证系统

应用在启动时通过 `scripts/check-env.js` 验证必需的环境变量。缺少关键变量将导致启动失败，并提供明确的错误信息。

## 变量参考

### 核心（必需）

| 变量 | 说明 | 示例 |
|------|------|------|
| `NODE_ENV` | 运行环境 | `production` |
| `AUTH_SECRET` | NextAuth 签名/加密密钥（最少 32 个字符）| `openssl rand -base64 32` |
| `DATABASE_URL` | PostgreSQL 连接字符串 | `postgresql://user:pass@host/db` |
| `DATA_REPOSITORY` | 内容 Git 仓库 URL | `https://github.com/org/repo` |

### 认证

| 变量 | 说明 | 必需 |
|------|------|------|
| `AUTH_SECRET` | 会话令牌签名密钥 | ✅ 必需 |
| `AUTH_URL` | 生产完整 URL（Vercel 上可省略）| 🔄 可选 |

### OAuth 提供商

| 变量 | 提供商 | 说明 |
|------|--------|------|
| `AUTH_GITHUB_ID` | GitHub | OAuth 应用 Client ID |
| `AUTH_GITHUB_SECRET` | GitHub | OAuth 应用 Client Secret |
| `AUTH_GOOGLE_ID` | Google | OAuth Client ID |
| `AUTH_GOOGLE_SECRET` | Google | OAuth Client Secret |

### Cookies

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `COOKIE_SECRET` | Cookie 加密密钥 | 必需 |
| `COOKIE_DOMAIN` | Cookie 作用域域名 | `localhost` |
| `COOKIE_SECURE` | 仅 HTTPS cookie | 生产 `true` |

### 数据库

| 变量 | 说明 | 示例 |
|------|------|------|
| `DATABASE_URL` | PostgreSQL 主要连接 | `postgresql://...` |
| `DB_POOL_SIZE` | 最大连接池大小 | `20` |

### 邮件

| 变量 | 说明 | 示例 |
|------|------|------|
| `EMAIL_SERVER` | SMTP URL | `smtp://user:pass@smtp.example.com:587` |
| `EMAIL_FROM` | 发件人地址 | `noreply@yourdomain.com` |

也支持独立的 SMTP 变量（`EMAIL_SERVER_HOST`、`EMAIL_SERVER_PORT` 等）。

### 支付 – Stripe

| 变量 | 说明 |
|------|------|
| `STRIPE_SECRET_KEY` | Stripe 密钥（`sk_live_...`）|
| `STRIPE_PUBLISHABLE_KEY` | Stripe 公开密钥（`pk_live_...`）|
| `STRIPE_WEBHOOK_SECRET` | Webhook 签名密钥（`whsec_...`）|

### 支付 – Lemon Squeezy

| 变量 | 说明 |
|------|------|
| `LEMONSQUEEZY_API_KEY` | LemonSqueezy API 密钥 |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Webhook 签名密钥 |

### 支付 – Paddle

| 变量 | 说明 |
|------|------|
| `PADDLE_API_KEY` | Paddle API 密钥 |
| `PADDLE_WEBHOOK_SECRET` | Webhook 签名密钥 |

### 分析

| 变量 | 服务 | 说明 |
|------|------|------|
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog | 项目 API 密钥 |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog | 实例 URL |
| `NEXT_PUBLIC_GA_ID` | Google Analytics | GA4 标识符 |

### 错误追踪

| 变量 | 说明 |
|------|------|
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry 数据源名称 |
| `SENTRY_AUTH_TOKEN` | Source Maps 上传令牌 |
| `SENTRY_ORG` | Sentry 组织 slug |
| `SENTRY_PROJECT` | Sentry 项目 slug |

### 时事通讯

| 变量 | 服务 | 说明 |
|------|------|------|
| `MAILCHIMP_API_KEY` | Mailchimp | API 密钥 |
| `MAILCHIMP_LIST_ID` | Mailchimp | 受众列表 ID |
| `CONVERTKIT_API_KEY` | ConvertKit | API 密钥 |
| `RESEND_API_KEY` | Resend | API 密钥 |

### 后台任务

| 变量 | 说明 |
|------|------|
| `CRON_SECRET` | 验证 Vercel cron 调用（至少 32 个字符）|
| `TRIGGER_SECRET_KEY` | Trigger.dev 密钥（设置后优先于 Vercel Crons）|

### 公开客户端变量

以 `NEXT_PUBLIC_` 开头的变量会打包到客户端代码中：

| 变量 | 说明 |
|------|------|
| `NEXT_PUBLIC_APP_URL` | 生产应用 URL |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog 客户端密钥 |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog 主机 URL |
| `NEXT_PUBLIC_GA_ID` | Google Analytics ID |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN（客户端错误）|

**⚠️ 警告：** 切勿将敏感密钥（数据库凭据、私钥等）赋予 `NEXT_PUBLIC_` 变量。

## 设置方式

### 本地开发

在 `apps/web/` 目录创建 `.env.local` 文件：

```bash
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local with your values
```

### Vercel

**推荐方法：** 使用 Vercel 控制台

1. 进入 **项目设置** → **环境变量**
2. 以目标环境（Production、Preview、Development）添加变量
3. 部署——变量在构建和运行时自动注入

**または使用 Vercel CLI：**

```bash
# Add a variable
vercel env add DATABASE_URL

# List all variables
vercel env ls

# Pull to local file
vercel env pull .env.local
```

## 生产安全检查清单

- [ ] 使用安全随机生成的 `AUTH_SECRET`（`openssl rand -base64 32`）
- [ ] 使用安全随机生成的 `COOKIE_SECRET`（`openssl rand -base64 32`）
- [ ] 使用安全随机生成的 `CRON_SECRET`（`openssl rand -base64 32`）
- [ ] `COOKIE_SECURE=true`（生产必须）
- [ ] 数据库连接字符串中使用强密码
- [ ] Stripe 中使用 `sk_live_...` 而非测试密钥
- [ ] Sentry `SENTRY_AUTH_TOKEN` 具有最低必要权限
- [ ] 未公开敏感值（数据库密码、私钥等）
