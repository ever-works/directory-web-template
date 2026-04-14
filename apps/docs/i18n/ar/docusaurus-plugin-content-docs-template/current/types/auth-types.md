---
id: auth-types
title: تعريفات نوع المصادقة
sidebar_label: أنواع المصادقة
sidebar_position: 18
---

# تعريفات نوع المصادقة

**المصدر:** `types/next-auth.d.ts`، `lib/config/schemas/auth.schema.ts`، `lib/db/schema.ts`، `lib/types/user.ts`

تعمل أنواع المصادقة على توسيع الأنواع الأساسية لـ NextAuth وتحديد التكوين لموفري OAuth ورموز JWT وإدارة الجلسة.

## ملحقات المصادقة التالية

### `Session`

نوع الجلسة الموسعة مع الحقول المخصصة.

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

|الميدان|الوصف|
|-------|-------------|
|`id`|معرف مستخدم قاعدة البيانات|
|`clientProfileId`|معرف ملف تعريف العميل المرتبط|
|`provider`|اسم موفر OAuth (على سبيل المثال، `'google'`، `'github'`)|
|`isAdmin`|ما إذا كان المستخدم لديه امتيازات المسؤول|
|`customerId`|معرف عميل مزود الدفع|

### `User`

تم إرجاع نوع المستخدم الموسع أثناء المصادقة.

```typescript
interface User extends DefaultUser {
  isAdmin?: boolean;
  clientProfileId?: string;
  customerId?: string;
}
```

### `JWT`

حمولة رمزية JWT ممتدة.

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

## تكوين المصادقة

### `AuthConfig`

تكوين المصادقة المصادق عليه من مخطط Zod.

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

التكوين لموفر OAuth واحد. يتم حساب العلامة `enabled` تلقائيًا من خلال وجود بيانات الاعتماد.

```typescript
interface OAuthProvider {
  clientId?: string;
  clientSecret?: string;
  enabled: boolean;      // true when both clientId AND clientSecret are set
}
```

## مخطط قاعدة البيانات

### `users` الجدول

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

### `accounts` الجدول

يربط المستخدمين بموفري OAuth (جدول محول NextAuth).

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

### `sessions` الجدول

```typescript
{
  sessionToken: text,    // Primary key
  userId: text,          // FK -> users.id
  expires: timestamp,    // Session expiry
}
```

### `clientProfiles` الجدول

بيانات الملف الشخصي الموسعة للمستخدمين المصادق عليهم.

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

## أنواع واجهة المستخدم الشخصية

### `ExtendedUser`

نوع المستخدم مع بيانات ملف تعريف العميل الاختيارية لزر ملف التعريف.

```typescript
interface ExtendedUser extends NextAuthUser {
  clientProfile?: { username?: string };
}
```

### `PresenceStatus` و`RoleLabel`

أنواع مستوى العرض لقائمة ملف التعريف.

```typescript
type PresenceStatus = 'online' | 'offline' | 'away' | 'busy';
type RoleLabel = 'Admin' | 'User' | 'Client';
```

## تكوين ميزات المصادقة

يتم عرضه على صفحات تسجيل الدخول/الاشتراك، المحددة في `lib/config/auth-features.ts`:

```typescript
interface AuthFeature {
  icon: LucideIcon;
  colorVariant: 'primary' | 'accent' | 'secondary';
  titleKey: string;          // i18n translation key
  descriptionKey: string;    // i18n translation key
}
```

## مثال الاستخدام

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

## الأنواع ذات الصلة

- [أنواع الأذونات](./permission-types.md) - التحكم الدقيق في الوصول
- [أنواع الأدوار](./role-types.md) - تعريفات الأدوار المخصصة للمستخدمين
- [أنواع المستخدمين](./user-types.md) - أنواع إدارة المستخدم الإدارية
