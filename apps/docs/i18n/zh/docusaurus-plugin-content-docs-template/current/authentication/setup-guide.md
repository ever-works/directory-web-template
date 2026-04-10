---
id: setup-guide
title: 认证配置指南
sidebar_label: 配置指南
sidebar_position: 2
---

# 认证配置指南

如何在您的 Ever Works 应用程序中配置认证。

## 必需的环境变量

```env
AUTH_SECRET="your-generated-secret"
NEXTAUTH_SECRET="same-as-auth-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### 生成安全密钥：
```bash
openssl rand -base64 32
# 或
npx auth secret
```

## OAuth 提供商配置

添加到 .env.local：
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
FACEBOOK_CLIENT_ID=your_facebook_client_id
FACEBOOK_CLIENT_SECRET=your_facebook_client_secret
```

## NextAuth.js 配置

认证配置位于 apps/web/auth.config.ts，包括：
- 会话策略：JWT
- 会话数据的回调函数
- 用户创建的事件处理器

## 测试认证

1. 启动开发服务器：pnpm run dev
2. 访问 http://localhost:3000/sign-in
3. 使用凭据测试
4. 测试 OAuth 流程
