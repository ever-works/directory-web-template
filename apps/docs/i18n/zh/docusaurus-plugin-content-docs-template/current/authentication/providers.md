---
id: providers
title: 认证提供商
sidebar_label: 提供商
sidebar_position: 3
---

# 认证提供商

## 支持的提供商

### Google OAuth
1. 访问 Google Cloud Console
2. 创建 OAuth 2.0 凭据
3. 添加重定向 URI：http://localhost:3000/api/auth/callback/google
4. 设置 GOOGLE_CLIENT_ID 和 GOOGLE_CLIENT_SECRET

### GitHub OAuth
1. 访问 GitHub 设置 > 开发者设置 > OAuth Apps
2. 新建 OAuth 应用
3. 回调 URL：http://localhost:3000/api/auth/callback/github
4. 设置 GITHUB_CLIENT_ID 和 GITHUB_CLIENT_SECRET

### Facebook OAuth
1. 访问 developers.facebook.com
2. 创建应用
3. 添加 Facebook Login 产品
4. 设置 FACEBOOK_CLIENT_ID 和 FACEBOOK_CLIENT_SECRET

### Microsoft OAuth
1. 访问 Azure Active Directory
2. 注册新应用程序
3. 添加重定向 URI
4. 设置 MICROSOFT_CLIENT_ID 和 MICROSOFT_CLIENT_SECRET

### 凭据（邮箱/密码）
用于邮箱和密码认证的内置提供商。使用 bcrypt 进行密码哈希。
