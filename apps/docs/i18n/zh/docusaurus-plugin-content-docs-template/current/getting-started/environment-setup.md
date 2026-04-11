---
title: "环境配置"
sidebar_label: "环境配置"
sidebar_position: 3
---

# 环境配置

## 必需的环境变量

```env
NODE_ENV=development
AUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000
COOKIE_SECRET=your-cookie-secret
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
GH_TOKEN=your-github-token
DATA_REPOSITORY=https://github.com/your-org/your-data-repo
```

## 可选环境变量

### OAuth 提供商

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
```

### 支付服务

```env
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
LEMONSQUEEZY_API_KEY=
POLAR_API_KEY=
```

### 电子邮件服务

```env
EMAIL_SERVER=
EMAIL_FROM=
```

### 分析

```env
NEXT_PUBLIC_ANALYTICS_ID=
SENTRY_DSN=
```
