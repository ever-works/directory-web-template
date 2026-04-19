---
id: auth-types
title: Authentifizierungstypdefinitionen
sidebar_label: Authentifizierungstypen
sidebar_position: 18
---

# Authentifizierungstypdefinitionen

**Quelle:** `types/next-auth.d.ts`, `lib/config/schemas/auth.schema.ts`, `lib/db/schema.ts`, `lib/types/user.ts`

Authentifizierungstypen erweitern die Basistypen von NextAuth und definieren die Konfiguration für OAuth-Anbieter, JWT-Tokens und Sitzungsverwaltung.

## NextAuth-Erweiterungen

### `Session`

Erweiterter Sitzungstyp mit benutzerdefinierten Feldern.

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

|Feld|Beschreibung|
|-------|-------------|
|`id`|Datenbankbenutzer-ID|
|`clientProfileId`|Zugehörige Clientprofil-ID|
|`provider`|Name des OAuth-Anbieters (z. B. `'google'`, `'github'`)|
|`isAdmin`|Ob der Benutzer über Administratorrechte verfügt|
|`customerId`|Kundenkennung des Zahlungsanbieters|

### `User`

Erweiterter Benutzertyp, der während der Authentifizierung zurückgegeben wird.

```typescript
interface User extends DefaultUser {
  isAdmin?: boolean;
  clientProfileId?: string;
  customerId?: string;
}
```

### `JWT`

Erweiterte JWT-Token-Nutzlast.

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

## Authentifizierungskonfiguration

### `AuthConfig`

Validierte Authentifizierungskonfiguration aus dem Zod-Schema.

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

Konfiguration für einen einzelnen OAuth-Anbieter. Das Flag `enabled` wird automatisch aus der Anwesenheit der Anmeldeinformationen berechnet.

```typescript
interface OAuthProvider {
  clientId?: string;
  clientSecret?: string;
  enabled: boolean;      // true when both clientId AND clientSecret are set
}
```

## Datenbankschema

### `users` Tabelle

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

### `accounts` Tabelle

Verknüpft Benutzer mit OAuth-Anbietern (NextAuth-Adaptertabelle).

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

### `sessions` Tabelle

```typescript
{
  sessionToken: text,    // Primary key
  userId: text,          // FK -> users.id
  expires: timestamp,    // Session expiry
}
```

### `clientProfiles` Tabelle

Erweiterte Profildaten für authentifizierte Benutzer.

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

## Profil-UI-Typen

### `ExtendedUser`

Benutzertyp mit optionalen Kundenprofildaten für die Profilschaltfläche.

```typescript
interface ExtendedUser extends NextAuthUser {
  clientProfile?: { username?: string };
}
```

### `PresenceStatus` und `RoleLabel`

Anzeigeebenentypen für das Profilmenü.

```typescript
type PresenceStatus = 'online' | 'offline' | 'away' | 'busy';
type RoleLabel = 'Admin' | 'User' | 'Client';
```

## Konfiguration der Authentifizierungsfunktionen

Wird auf Anmelde-/Anmeldeseiten angezeigt, definiert in `lib/config/auth-features.ts`:

```typescript
interface AuthFeature {
  icon: LucideIcon;
  colorVariant: 'primary' | 'accent' | 'secondary';
  titleKey: string;          // i18n translation key
  descriptionKey: string;    // i18n translation key
}
```

## Anwendungsbeispiel

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

## Verwandte Typen

- [Berechtigungstypen](./permission-types.md) – granulare Zugriffskontrolle
- [Rollentypen](./role-types.md) – Rollendefinitionen, die Benutzern zugewiesen sind
- [Benutzertypen](./user-types.md) – Admin-Benutzerverwaltungstypen
