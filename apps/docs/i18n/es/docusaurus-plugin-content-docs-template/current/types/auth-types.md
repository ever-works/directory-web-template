---
id: auth-types
title: Definiciones de tipos de autenticación
sidebar_label: Tipos de autenticación
sidebar_position: 18
---

# Definiciones de tipos de autenticación

**Fuente:** `types/next-auth.d.ts`, `lib/config/schemas/auth.schema.ts`, `lib/db/schema.ts`, `lib/types/user.ts`

Los tipos de autenticación amplían los tipos básicos de NextAuth y definen la configuración para proveedores de OAuth, tokens JWT y gestión de sesiones.

## Extensiones de autenticación siguiente

### `Session`

Tipo de sesión extendida con campos personalizados.

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

|campo|Descripción|
|-------|-------------|
|`id`|ID de usuario de la base de datos|
|`clientProfileId`|ID de perfil de cliente asociado|
|`provider`|Nombre del proveedor de OAuth (por ejemplo, `'google'`, `'github'`)|
|`isAdmin`|Si el usuario tiene privilegios de administrador|
|`customerId`|Identificador de cliente del proveedor de pagos|

### `User`

Tipo de usuario extendido devuelto durante la autenticación.

```typescript
interface User extends DefaultUser {
  isAdmin?: boolean;
  clientProfileId?: string;
  customerId?: string;
}
```

### `JWT`

Carga útil del token JWT extendida.

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

## Configuración de autenticación

### `AuthConfig`

Configuración de autenticación validada desde el esquema Zod.

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

Configuración para un único proveedor de OAuth. El indicador `enabled` se calcula automáticamente a partir de la presencia de credenciales.

```typescript
interface OAuthProvider {
  clientId?: string;
  clientSecret?: string;
  enabled: boolean;      // true when both clientId AND clientSecret are set
}
```

## Esquema de base de datos

### `users` tabla

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

### `accounts` tabla

Vincula a los usuarios con proveedores de OAuth (tabla de adaptadores NextAuth).

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

### `sessions` tabla

```typescript
{
  sessionToken: text,    // Primary key
  userId: text,          // FK -> users.id
  expires: timestamp,    // Session expiry
}
```

### `clientProfiles` tabla

Datos de perfil extendidos para usuarios autenticados.

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

## Tipos de interfaz de usuario de perfil

### `ExtendedUser`

Tipo de usuario con datos de perfil de cliente opcionales para el botón de perfil.

```typescript
interface ExtendedUser extends NextAuthUser {
  clientProfile?: { username?: string };
}
```

### `PresenceStatus` y `RoleLabel`

Tipos de nivel de visualización para el menú de perfil.

```typescript
type PresenceStatus = 'online' | 'offline' | 'away' | 'busy';
type RoleLabel = 'Admin' | 'User' | 'Client';
```

## Configuración de funciones de autenticación

Se muestra en las páginas de inicio de sesión/registro, definidas en `lib/config/auth-features.ts`:

```typescript
interface AuthFeature {
  icon: LucideIcon;
  colorVariant: 'primary' | 'accent' | 'secondary';
  titleKey: string;          // i18n translation key
  descriptionKey: string;    // i18n translation key
}
```

## Ejemplo de uso

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

## Tipos relacionados

- [Tipos de permisos](./permission-types.md) -- control de acceso granular
- [Tipos de roles](./role-types.md): definiciones de roles asignadas a los usuarios
- [Tipos de usuarios](./user-types.md) -- tipos de administración de usuarios administradores
