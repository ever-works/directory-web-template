---
id: auth-types
title: Definicje typów uwierzytelniania
sidebar_label: Typy uwierzytelniania
sidebar_position: 18
---

# Definicje typów uwierzytelniania

**Źródło:** `types/next-auth.d.ts`, `lib/config/schemas/auth.schema.ts`, `lib/db/schema.ts`, `lib/types/user.ts`

Typy uwierzytelniania rozszerzają typy podstawowe NextAuth i definiują konfigurację dostawców OAuth, tokenów JWT i zarządzania sesją.

## NastępneRozszerzenia uwierzytelniania

### `Session`

Rozszerzony typ sesji z niestandardowymi polami.

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

|Pole|Opis|
|-------|-------------|
|`id`|Identyfikator użytkownika bazy danych|
|`clientProfileId`|Powiązany identyfikator profilu klienta|
|`provider`|Nazwa dostawcy OAuth (np. `'google'`, `'github'`)|
|`isAdmin`|Czy użytkownik ma uprawnienia administratora|
|`customerId`|Identyfikator klienta dostawcy płatności|

### `User`

Rozszerzony typ użytkownika zwrócony podczas uwierzytelniania.

```typescript
interface User extends DefaultUser {
  isAdmin?: boolean;
  clientProfileId?: string;
  customerId?: string;
}
```

### `JWT`

Rozszerzony ładunek tokenu JWT.

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

## Konfiguracja uwierzytelniania

### `AuthConfig`

Sprawdzona konfiguracja uwierzytelniania ze schematu Zod.

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

Konfiguracja dla jednego dostawcy OAuth. Flaga `enabled` jest obliczana automatycznie na podstawie obecności poświadczeń.

```typescript
interface OAuthProvider {
  clientId?: string;
  clientSecret?: string;
  enabled: boolean;      // true when both clientId AND clientSecret are set
}
```

## Schemat bazy danych

### `users` stół

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

### `accounts` stół

Łączy użytkowników z dostawcami OAuth (tabela adapterów NextAuth).

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

### `sessions` stół

```typescript
{
  sessionToken: text,    // Primary key
  userId: text,          // FK -> users.id
  expires: timestamp,    // Session expiry
}
```

### `clientProfiles` stół

Rozszerzone dane profilowe dla uwierzytelnionych użytkowników.

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

## Typy interfejsu użytkownika profilu

### `ExtendedUser`

Typ użytkownika z opcjonalnymi danymi profilu klienta dla przycisku profilu.

```typescript
interface ExtendedUser extends NextAuthUser {
  clientProfile?: { username?: string };
}
```

### `PresenceStatus` i `RoleLabel`

Typy na poziomie wyświetlania dla menu profilu.

```typescript
type PresenceStatus = 'online' | 'offline' | 'away' | 'busy';
type RoleLabel = 'Admin' | 'User' | 'Client';
```

## Konfiguracja funkcji uwierzytelniania

Wyświetlane na stronach logowania/rejestracji, zdefiniowane w `lib/config/auth-features.ts`:

```typescript
interface AuthFeature {
  icon: LucideIcon;
  colorVariant: 'primary' | 'accent' | 'secondary';
  titleKey: string;          // i18n translation key
  descriptionKey: string;    // i18n translation key
}
```

## Przykład użycia

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

## Powiązane typy

- [Typy uprawnień](./permission-types.md) -- szczegółowa kontrola dostępu
- [Role Types](./role-types.md) -- definicje ról przypisane użytkownikom
- [Typy użytkowników](./user-types.md) — typy zarządzania użytkownikami administracyjnymi
