---
id: auth-types
title: Définitions des types d'authentification
sidebar_label: Types d'authentification
sidebar_position: 18
---

# Définitions des types d'authentification

**Source :** `types/next-auth.d.ts`, `lib/config/schemas/auth.schema.ts`, `lib/db/schema.ts`, `lib/types/user.ts`

Les types d'authentification étendent les types de base de NextAuth et définissent la configuration des fournisseurs OAuth, des jetons JWT et de la gestion des sessions.

## Extensions NextAuth

### `Session`

Type de session étendue avec champs personnalisés.

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

|Champ|Descriptif|
|-------|-------------|
|`id`|ID utilisateur de la base de données|
|`clientProfileId`|ID de profil client associé|
|`provider`|Nom du fournisseur OAuth (par exemple, `'google'`, `'github'`)|
|`isAdmin`|Si l'utilisateur dispose de privilèges d'administrateur|
|`customerId`|Identifiant client du fournisseur de paiement|

### `User`

Type d'utilisateur étendu renvoyé lors de l'authentification.

```typescript
interface User extends DefaultUser {
  isAdmin?: boolean;
  clientProfileId?: string;
  customerId?: string;
}
```

### `JWT`

Charge utile du jeton JWT étendue.

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

## Configuration d'authentification

### `AuthConfig`

Configuration d'authentification validée à partir du schéma Zod.

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

Configuration pour un seul fournisseur OAuth. L'indicateur `enabled` est calculé automatiquement à partir de la présence des informations d'identification.

```typescript
interface OAuthProvider {
  clientId?: string;
  clientSecret?: string;
  enabled: boolean;      // true when both clientId AND clientSecret are set
}
```

## Schéma de base de données

### `users` tableau

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

### `accounts` tableau

Relie les utilisateurs aux fournisseurs OAuth (tableau des adaptateurs NextAuth).

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

### `sessions` tableau

```typescript
{
  sessionToken: text,    // Primary key
  userId: text,          // FK -> users.id
  expires: timestamp,    // Session expiry
}
```

### `clientProfiles` tableau

Données de profil étendues pour les utilisateurs authentifiés.

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

## Types d'interface utilisateur de profil

### `ExtendedUser`

Type d'utilisateur avec données de profil client facultatives pour le bouton de profil.

```typescript
interface ExtendedUser extends NextAuthUser {
  clientProfile?: { username?: string };
}
```

### `PresenceStatus` et `RoleLabel`

Types de niveau d'affichage pour le menu de profil.

```typescript
type PresenceStatus = 'online' | 'offline' | 'away' | 'busy';
type RoleLabel = 'Admin' | 'User' | 'Client';
```

## Configuration des fonctionnalités d'authentification

Affiché sur les pages de connexion/inscription, définies dans `lib/config/auth-features.ts` :

```typescript
interface AuthFeature {
  icon: LucideIcon;
  colorVariant: 'primary' | 'accent' | 'secondary';
  titleKey: string;          // i18n translation key
  descriptionKey: string;    // i18n translation key
}
```

## Exemple d'utilisation

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

## Types associés

- [Types d'autorisations](./permission-types.md) -- contrôle d'accès granulaire
- [Types de rôle](./role-types.md) -- définitions de rôles attribuées aux utilisateurs
- [Types d'utilisateurs](./user-types.md) -- types de gestion des utilisateurs administrateurs
