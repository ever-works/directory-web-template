---
id: auth-types
title: הגדרות סוג אימות
sidebar_label: סוגי אישורים
sidebar_position: 18
---

# הגדרות סוג אימות

**מקור:** `types/next-auth.d.ts`, `lib/config/schemas/auth.schema.ts`, `lib/db/schema.ts`, `lib/types/user.ts`

סוגי אימות מרחיבים את סוגי הבסיס של NextAuth ומגדירים את התצורה עבור ספקי OAuth, אסימוני JWT וניהול הפעלה.

## NextAuth הרחבות

### `Session`

סוג הפעלה מורחב עם שדות מותאמים אישית.

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

|שדה|תיאור|
|-------|-------------|
|`id`|זיהוי משתמש של מסד נתונים|
|`clientProfileId`|מזהה פרופיל לקוח משויך|
|`provider`|שם ספק OAuth (לדוגמה, `'google'`, `'github'`)|
|`isAdmin`|האם למשתמש יש הרשאות אדמין|
|`customerId`|מזהה לקוח של ספק תשלומים|

### `User`

סוג משתמש מורחב הוחזר במהלך האימות.

```typescript
interface User extends DefaultUser {
  isAdmin?: boolean;
  clientProfileId?: string;
  customerId?: string;
}
```

### `JWT`

מטען אסימון JWT מורחב.

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

## תצורת אישור

### `AuthConfig`

תצורת אימות מאומתת מסכימת Zod.

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

תצורה עבור ספק OAuth יחיד. הדגל `enabled` מחושב אוטומטית מנוכחות אישורים.

```typescript
interface OAuthProvider {
  clientId?: string;
  clientSecret?: string;
  enabled: boolean;      // true when both clientId AND clientSecret are set
}
```

## סכמת מסד נתונים

### `users` שולחן

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

### `accounts` שולחן

קישור משתמשים לספקי OAuth (טבלת מתאמי NextAuth).

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

### `sessions` שולחן

```typescript
{
  sessionToken: text,    // Primary key
  userId: text,          // FK -> users.id
  expires: timestamp,    // Session expiry
}
```

### `clientProfiles` שולחן

נתוני פרופיל מורחבים עבור משתמשים מאומתים.

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

## סוגי ממשק משתמש של פרופילים

### `ExtendedUser`

סוג משתמש עם נתוני פרופיל לקוח אופציונליים עבור לחצן הפרופיל.

```typescript
interface ExtendedUser extends NextAuthUser {
  clientProfile?: { username?: string };
}
```

### `PresenceStatus` ו-`RoleLabel`

סוגים ברמת התצוגה עבור תפריט הפרופיל.

```typescript
type PresenceStatus = 'online' | 'offline' | 'away' | 'busy';
type RoleLabel = 'Admin' | 'User' | 'Client';
```

## תצורת תכונות אימות

מוצג בדפי כניסה/הרשמה, המוגדרים ב-`lib/config/auth-features.ts`:

```typescript
interface AuthFeature {
  icon: LucideIcon;
  colorVariant: 'primary' | 'accent' | 'secondary';
  titleKey: string;          // i18n translation key
  descriptionKey: string;    // i18n translation key
}
```

## דוגמה לשימוש

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

## סוגים קשורים

- [סוגי הרשאות](./permission-types.md) -- בקרת גישה פרטנית
- [סוגי תפקידים](./role-types.md) -- הגדרות תפקידים שהוקצו למשתמשים
- [סוגי משתמש](./user-types.md) -- סוגי ניהול משתמש של מנהל מערכת
