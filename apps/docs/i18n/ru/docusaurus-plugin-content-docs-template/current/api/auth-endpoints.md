---
id: auth-endpoints
title: 身份验证 API 端点
sidebar_label: 身份验证端点
sidebar_position: 4
---

# 身份验证 API 端点

身份验证端点处理 NextAuth.js 路由处理、密码管理和当前用户会话检索。核心 NextAuth 包罗万象的路由自动管理所有 OAuth 回调、会话管理和 CSRF 保护。

## NextAuth 处理程序 (`/api/auth/[...nextauth]`)

catch-all 路由从 `lib/auth/index.ts` 导出 NextAuth 的处理程序：

```typescript
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
```

此单一路由处理所有 NextAuth 操作：

### 获取端点（通过 NextAuth）

|路径|描述|
|------|-------------|
|`/api/auth/signin`|呈现登录页面或重定向到提供商|
|`/api/auth/signout`|处理注销|
|`/api/auth/session`|以 JSON 格式获取当前会话|
|`/api/auth/csrf`|获取CSRF令牌|
|`/api/auth/providers`|列出可用的身份验证提供者|
|`/api/auth/callback/[provider]`|OAuth 回调处理程序|

### POST 端点（通过 NextAuth）

|路径|描述|
|------|-------------|
|`/api/auth/signin/[provider]`|开始向提供商登录|
|`/api/auth/signout`|处理退出|
|`/api/auth/callback/credentials`|处理凭据登录|
|`/api/auth/_log`|Auth.js 内部日志记录|

### OAuth 回调流程

当用户通过 OAuth 提供者进行身份验证时：

```
1. User clicks "Sign in with Google"
2. Redirect to Google consent screen
3. Google redirects back to /api/auth/callback/google
4. NextAuth verifies the OAuth code
5. signIn callback runs (lib/auth/index.ts)
   -> Validates user email
   -> Allows account linking for OAuth
6. jwt callback enriches token
   -> Sets userId, provider, isAdmin
   -> Creates client profile for new OAuth users
7. Session created, user redirected to callback URL
```

### 自定义页面

NextAuth 配置为使用自定义身份验证页面而不是默认的 NextAuth UI：

|目的|自定义路径|
|---------|-------------|
|登录|`/auth/signin`|
|退出|`/auth/signout`|
|错误|`/auth/error`|
|验证请求|`/auth/verify-request`|
|新用户注册|`/auth/register`|

## 密码管理 (`/api/auth/change-password`)

|方法|路径|描述|
|--------|------|-------------|
|`POST`|`/api/auth/change-password`|更改经过身份验证的用户的密码|

### 请求正文

```json
{
  "currentPassword": "old-password",
  "newPassword": "new-secure-password"
}
```

### 认证

需要有效的会话。终端在更新之前验证当前密码。

### 回应

```json
// Success
{ "success": true, "message": "Password changed successfully" }

// Error
{ "success": false, "error": "Current password is incorrect" }
```

## 当前用户 (`/api/current-user`)

|方法|路径|描述|
|--------|------|-------------|
|`GET`|`/api/current-user`|获取当前经过身份验证的用户数据|

### 回应

返回包含应用程序特定字段的会话用户对象：

```json
{
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "image": "https://...",
    "isAdmin": false,
    "clientProfileId": "profile-uuid",
    "provider": "google"
  }
}
```

### 未经身份验证的响应

当不存在有效会话时，返回 `null` 或 `401` 状态。

## 会话令牌处理

NextAuth 将会话令牌存储在仅 HTTP 的 cookie 中：

|Cookie 名称|环境|
|------------|-------------|
|`next-auth.session-token`|开发（HTTP）|
|`__Secure-next-auth.session-token`|生产（HTTPS）|

### 跨站请求伪造保护

NextAuth 包括内置的 CSRF 保护。 CSRF 令牌 cookie (`next-auth.csrf-token`) 在客户端上设置，并且必须包含在对 NextAuth 端点的 POST 请求中。

## 错误处理

身份验证错误映射到 `lib/auth/error-handler.ts` 中的用户友好消息：

|错误模式|用户留言|
|--------------|--------------|
|`GOOGLE_CLIENT_ID`相关|Google 身份验证配置不正确|
|`GITHUB_CLIENT_ID`相关|GitHub 身份验证配置不正确|
|`FB_CLIENT_ID`相关|Facebook 身份验证配置不正确|
|`MICROSOFT_CLIENT_ID`相关|Microsoft 身份验证配置不正确|
|`SUPABASE`相关|Supabase 身份验证配置不正确|
|`NEXTAUTH`相关|NextAuth 未正确配置|

`handleAuthError()` 函数捕获这些错误并返回结构化的`{ error: string }` 响应。

## 验证事件

`lib/auth/index.ts` 中的 NextAuth 配置处理生命周期事件：

### 注销事件

使用户的会话缓存无效，以确保不提供过时的会话数据：

```typescript
events: {
  signOut: async (event) => {
    const token = 'token' in event ? event.token : undefined;
    if (token?.userId) {
      await invalidateSessionCache(undefined, token.userId);
    }
  }
}
```

### 用户更新事件

当用户数据更改时（例如，配置文件更新、角色更改），使会话缓存失效：

```typescript
events: {
  updateUser: async ({ user }) => {
    if (user?.id) {
      await invalidateSessionCache(undefined, user.id);
    }
  }
}
```

## 相关配置

|文件|目的|
|------|---------|
|`auth.config.ts`|顶级提供商配置|
|`lib/auth/index.ts`|具有回调和事件的 NextAuth 实例|
|`lib/auth/providers.ts`|OAuth 提供者工厂|
|`lib/auth/credentials.ts`|电子邮件/密码提供商|
|`lib/auth/cached-session.ts`|会话缓存层|
|`lib/auth/admin-guard.ts`|管理路由中间件|
