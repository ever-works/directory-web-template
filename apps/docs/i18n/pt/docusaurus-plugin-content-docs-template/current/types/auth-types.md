---
id: auth-types
title: Definições de tipo de autenticação
sidebar_label: Tipos de autenticação
sidebar_position: 18
---

# Definições de tipo de autenticação

**Fonte:** `types/next-auth.d.ts`, `lib/config/schemas/auth.schema.ts`, `lib/db/schema.ts`, `lib/types/user.ts`

Os tipos de autenticação estendem os tipos básicos do NextAuth e definem a configuração para provedores OAuth, tokens JWT e gerenciamento de sessão.

## Extensões NextAuth

### `Session`

Tipo de sessão estendida com campos personalizados.

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

|Campo|Descrição|
|-------|-------------|
|`id`|ID do usuário do banco de dados|
|`clientProfileId`|ID do perfil do cliente associado|
|`provider`|Nome do provedor OAuth (por exemplo, `'google'`, `'github'`)|
|`isAdmin`|Se o usuário tem privilégios de administrador|
|`customerId`|Identificador do cliente do provedor de pagamento|

### `User`

Tipo de usuário estendido retornado durante a autenticação.

```typescript
interface User extends DefaultUser {
  isAdmin?: boolean;
  clientProfileId?: string;
  customerId?: string;
}
```

### `JWT`

Carga estendida do token JWT.

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

## Configuração de autenticação

### `AuthConfig`

Configuração de autenticação validada do esquema Zod.

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

Configuração para um único provedor OAuth. O sinalizador `enabled` é calculado automaticamente a partir da presença da credencial.

```typescript
interface OAuthProvider {
  clientId?: string;
  clientSecret?: string;
  enabled: boolean;      // true when both clientId AND clientSecret are set
}
```

## Esquema de banco de dados

### `users` tabela

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

### `accounts` tabela

Vincula usuários a provedores OAuth (tabela de adaptadores NextAuth).

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

### `sessions` tabela

```typescript
{
  sessionToken: text,    // Primary key
  userId: text,          // FK -> users.id
  expires: timestamp,    // Session expiry
}
```

### `clientProfiles` tabela

Dados de perfil estendido para usuários autenticados.

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

## Tipos de UI de perfil

### `ExtendedUser`

Tipo de usuário com dados de perfil de cliente opcionais para o botão de perfil.

```typescript
interface ExtendedUser extends NextAuthUser {
  clientProfile?: { username?: string };
}
```

### `PresenceStatus` e `RoleLabel`

Tipos de nível de exibição para o menu de perfil.

```typescript
type PresenceStatus = 'online' | 'offline' | 'away' | 'busy';
type RoleLabel = 'Admin' | 'User' | 'Client';
```

## Configuração de recursos de autenticação

Exibido nas páginas de login/inscrição, definidas em `lib/config/auth-features.ts`:

```typescript
interface AuthFeature {
  icon: LucideIcon;
  colorVariant: 'primary' | 'accent' | 'secondary';
  titleKey: string;          // i18n translation key
  descriptionKey: string;    // i18n translation key
}
```

## Exemplo de uso

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

## Tipos Relacionados

- [Tipos de permissão](./permission-types.md) – controle de acesso granular
- [Tipos de função](./role-types.md) – definições de função atribuídas aos usuários
- [Tipos de usuário](./user-types.md) - tipos de gerenciamento de usuários administradores
