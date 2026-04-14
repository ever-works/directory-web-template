---
id: auth-types
title: Definizioni del tipo di autenticazione
sidebar_label: Tipi di autenticazione
sidebar_position: 18
---

# Definizioni del tipo di autenticazione

**Fonte:** `types/next-auth.d.ts`, `lib/config/schemas/auth.schema.ts`, `lib/db/schema.ts`, `lib/types/user.ts`

I tipi di autenticazione estendono i tipi di base di NextAuth e definiscono la configurazione per i provider OAuth, i token JWT e la gestione delle sessioni.

## Estensioni NextAuth

### `Session`

Tipo di sessione estesa con campi personalizzati.

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

|Campo|Descrizione|
|-------|-------------|
|`id`|ID utente del database|
|`clientProfileId`|ID del profilo cliente associato|
|`provider`|Nome del provider OAuth (ad esempio, `'google'`, `'github'`)|
|`isAdmin`|Se l'utente dispone dei privilegi di amministratore|
|`customerId`|Identificatore del cliente del fornitore di servizi di pagamento|

### `User`

Tipo utente esteso restituito durante l'autenticazione.

```typescript
interface User extends DefaultUser {
  isAdmin?: boolean;
  clientProfileId?: string;
  customerId?: string;
}
```

### `JWT`

Carico utile del token JWT esteso.

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

## Configurazione autenticazione

### `AuthConfig`

Configurazione di autenticazione convalidata dallo schema Zod.

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

Configurazione per un singolo provider OAuth. Il flag `enabled` viene calcolato automaticamente dalla presenza delle credenziali.

```typescript
interface OAuthProvider {
  clientId?: string;
  clientSecret?: string;
  enabled: boolean;      // true when both clientId AND clientSecret are set
}
```

## Schema della banca dati

### `users` tabella

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

### `accounts` tabella

Collega gli utenti ai provider OAuth (tabella dell'adattatore NextAuth).

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

### `sessions` tabella

```typescript
{
  sessionToken: text,    // Primary key
  userId: text,          // FK -> users.id
  expires: timestamp,    // Session expiry
}
```

### `clientProfiles` tabella

Dati del profilo esteso per gli utenti autenticati.

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

## Tipi di interfaccia utente del profilo

### `ExtendedUser`

Tipo di utente con dati del profilo cliente facoltativi per il pulsante del profilo.

```typescript
interface ExtendedUser extends NextAuthUser {
  clientProfile?: { username?: string };
}
```

### `PresenceStatus` e `RoleLabel`

Tipi a livello di visualizzazione per il menu del profilo.

```typescript
type PresenceStatus = 'online' | 'offline' | 'away' | 'busy';
type RoleLabel = 'Admin' | 'User' | 'Client';
```

## Configurazione delle funzionalità di autenticazione

Visualizzato nelle pagine di accesso/registrazione, definite in `lib/config/auth-features.ts`:

```typescript
interface AuthFeature {
  icon: LucideIcon;
  colorVariant: 'primary' | 'accent' | 'secondary';
  titleKey: string;          // i18n translation key
  descriptionKey: string;    // i18n translation key
}
```

## Esempio di utilizzo

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

## Tipi correlati

- [Tipi di autorizzazione](./permission-types.md): controllo granulare degli accessi
- [Tipi di ruolo](./role-types.md) -- definizioni di ruolo assegnate agli utenti
- [Tipi di utente](./user-types.md) -- tipi di gestione degli utenti amministratori
