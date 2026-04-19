---
id: auth-types
title: Definities van verificatietypen
sidebar_label: Verificatietypen
sidebar_position: 18
---

# Definities van verificatietypen

**Bron:** `types/next-auth.d.ts`, `lib/config/schemas/auth.schema.ts`, `lib/db/schema.ts`, `lib/types/user.ts`

Authenticatietypen breiden de basistypen van NextAuth uit en definiëren de configuratie voor OAuth-providers, JWT-tokens en sessiebeheer.

## NextAuth-extensies

### `Session`

Uitgebreid sessietype met aangepaste velden.

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

|Veld|Beschrijving|
|-------|-------------|
|`id`|Databasegebruikers-ID|
|`clientProfileId`|Bijbehorende klantprofiel-ID|
|`provider`|Naam OAuth-provider (bijvoorbeeld `'google'`, `'github'`)|
|`isAdmin`|Of de gebruiker beheerdersrechten heeft|
|`customerId`|Klantidentificatie van de betalingsprovider|

### `User`

Uitgebreid gebruikerstype geretourneerd tijdens authenticatie.

```typescript
interface User extends DefaultUser {
  isAdmin?: boolean;
  clientProfileId?: string;
  customerId?: string;
}
```

### `JWT`

Uitgebreide JWT-tokenpayload.

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

## Verificatieconfiguratie

### `AuthConfig`

Gevalideerde authenticatieconfiguratie van Zod-schema.

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

Configuratie voor één OAuth-provider. De vlag `enabled` wordt automatisch berekend op basis van de aanwezigheid van de referenties.

```typescript
interface OAuthProvider {
  clientId?: string;
  clientSecret?: string;
  enabled: boolean;      // true when both clientId AND clientSecret are set
}
```

## Databaseschema

### `users` tabel

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

### `accounts` tabel

Koppelt gebruikers aan OAuth-providers (NextAuth-adaptertabel).

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

### `sessions` tabel

```typescript
{
  sessionToken: text,    // Primary key
  userId: text,          // FK -> users.id
  expires: timestamp,    // Session expiry
}
```

### `clientProfiles` tabel

Uitgebreide profielgegevens voor geverifieerde gebruikers.

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

## Profiel UI-typen

### `ExtendedUser`

Gebruikerstype met optionele klantprofielgegevens voor de profielknop.

```typescript
interface ExtendedUser extends NextAuthUser {
  clientProfile?: { username?: string };
}
```

### `PresenceStatus` en `RoleLabel`

Typen op weergaveniveau voor het profielmenu.

```typescript
type PresenceStatus = 'online' | 'offline' | 'away' | 'busy';
type RoleLabel = 'Admin' | 'User' | 'Client';
```

## Configuratie van verificatiefuncties

Weergegeven op inlog-/aanmeldingspagina's, gedefinieerd in `lib/config/auth-features.ts`:

```typescript
interface AuthFeature {
  icon: LucideIcon;
  colorVariant: 'primary' | 'accent' | 'secondary';
  titleKey: string;          // i18n translation key
  descriptionKey: string;    // i18n translation key
}
```

## Gebruiksvoorbeeld

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

## Gerelateerde typen

- [Permissietypen](./permission-types.md) - gedetailleerde toegangscontrole
- [Roltypes](./role-types.md) -- roldefinities toegewezen aan gebruikers
- [Gebruikerstypen](./user-types.md) -- typen beheerdersgebruikersbeheer
