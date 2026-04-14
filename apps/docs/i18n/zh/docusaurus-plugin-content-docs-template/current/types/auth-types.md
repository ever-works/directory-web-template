---
id: auth-types
title: 身份验证类型定义
sidebar_label: 身份验证类型
sidebar_position: 18
---

# 身份验证类型定义

**来源：** `types/next-auth.d.ts`、`lib/config/schemas/auth.schema.ts`、`lib/db/schema.ts`、`lib/types/user.ts`

身份验证类型扩展了 NextAuth 的基本类型，并定义 OAuth 提供程序、JWT 令牌和会话管理的配置。

## NextAuth 扩展

### `Session`

具有自定义字段的扩展会话类型。

```typescript
declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      clientProfileId?: string;
      provider?: string;
      isAdmin?: boolean;
      customerId?: string;  // Payment provider customer ID
    } & DefaultSession["user"];
  }
}
```

|领域|描述|
|-------|-------------|
|`id`|数据库用户ID|
|`clientProfileId`|关联的客户资料 ID|
|`provider`|OAuth 提供商名称（例如`'google'`、`'github'`）|
|`isAdmin`|用户是否具有管理员权限|
|`customerId`|支付提供商客户标识符|

### `User`

身份验证期间返回的扩展用户类型。

```typescript
interface User extends DefaultUser {
  isAdmin?: boolean;
  clientProfileId?: string;
  customerId?: string;
}
```

### `JWT`

扩展 JWT 令牌有效负载。

```typescript
declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    clientProfileId?: string;
    provider?: string;
    isAdmin?: boolean;
    customerId?: string;
  }
}
```

## 认证配置

### `AuthConfig`

已验证 Zod 模式的身份验证配置。

```typescript
interface AuthConfig {
  AUTH_SECRET?: string;
  jwt: {
    accessTokenExpiresIn: string;    // Default: '15m'
    refreshTokenExpiresIn: string;   // Default: '7d'
  };
  cookie: {
    secret?: string;
    domain: string;     // Default: 'localhost'
    secure: boolean;    // Default: false
  };
  google: OAuthProvider;
  github: OAuthProvider;
  microsoft: OAuthProvider;
  facebook: OAuthProvider;
  twitter: OAuthProvider;
  linkedin: OAuthProvider;
  supabase: { url?: string; anonKey?: string; enabled: boolean };
  seedUser: {
    adminEmail?: string;
    adminPassword?: string;
    fakeUserCount: number;   // Default: 10
  };
}
```

### `OAuthProvider`

单个 OAuth 提供程序的配置。 `enabled` 标志是根据凭证存在自动计算的。

```typescript
interface OAuthProvider {
  clientId?: string;
  clientSecret?: string;
  enabled: boolean;      // true when both clientId AND clientSecret are set
}
```

## 数据库架构

### `users`表

```typescript
{
  id: text,                    // UUID primary key
  email: text,                 // Unique email
  image: text,                 // Profile image URL
  emailVerified: timestamp,    // When email was confirmed
  passwordHash: text,          // bcrypt hash for credentials auth
  createdAt: timestamp,
  updatedAt: timestamp,
  deletedAt: timestamp,        // Soft delete
}
```

### `accounts`表

将用户链接到 OAuth 提供程序（NextAuth 适配器表）。

```typescript
{
  userId: text,                 // FK -> users.id
  type: text,                   // 'oauth' | 'credentials'
  provider: text,               // e.g., 'google', 'github'
  providerAccountId: text,      // ID from the OAuth provider
  email: text,                  // For credentials accounts
  passwordHash: text,           // For credentials accounts
  refresh_token: text,
  access_token: text,
  expires_at: integer,
  token_type: text,
  scope: text,
  id_token: text,
  session_state: text,
}
```

### `sessions`表

```typescript
{
  sessionToken: text,    // Primary key
  userId: text,          // FK -> users.id
  expires: timestamp,    // Session expiry
}
```

### `clientProfiles`表

经过身份验证的用户的扩展配置文件数据。

```typescript
{
  id: text,
  userId: text,          // FK -> users.id
  email: text,
  name: text,
  displayName: text,
  username: text,        // Unique
  bio: text,
  jobTitle: text,
  company: text,
  phone: text,
  website: text,
  location: text,
  avatar: text,
  accountType: 'individual' | 'business' | 'enterprise',
  status: 'active' | 'inactive' | 'suspended' | 'banned' | 'trial',
  plan: 'free' | 'standard' | 'premium',
  timezone: text,        // Default: 'UTC'
  language: text,        // Default: 'en'
  country: text,
  currency: text,        // Default: 'USD'
  twoFactorEnabled: boolean,
  emailVerified: boolean,
  totalSubmissions: integer,
}
```

## 配置文件 UI 类型

### `ExtendedUser`

用户类型以及配置文件按钮的可选客户端配置文件数据。

```typescript
interface ExtendedUser extends NextAuthUser {
  clientProfile?: { username?: string };
}
```

### `PresenceStatus` 和`RoleLabel`

配置文件菜单的显示级别类型。

```typescript
type PresenceStatus = 'online' | 'offline' | 'away' | 'busy';
type RoleLabel = 'Admin' | 'User' | 'Client';
```

## 身份验证功能配置

显示在登录/注册页面上，在`lib/config/auth-features.ts`中定义：

```typescript
interface AuthFeature {
  icon: LucideIcon;
  colorVariant: 'primary' | 'accent' | 'secondary';
  titleKey: string;          // i18n translation key
  descriptionKey: string;    // i18n translation key
}
```

## 使用示例

```typescript
import { useSession } from 'next-auth/react';

function AdminGuard({ children }) {
  const { data: session } = useSession();

  if (!session?.user?.isAdmin) {
    return <p>Access denied</p>;
  }

  return children;
}
```

## 相关类型

- [权限类型](./permission-types.md) -- 粒度访问控制
- [角色类型](./role-types.md) -- 分配给用户的角色定义
- [User Types](./user-types.md) -- admin 用户管理类型
