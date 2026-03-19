---
id: auth-types
title: Auth Type Definitions
sidebar_label: Auth Types
sidebar_position: 18
---

# Auth Type Definitions

**Source:** `types/next-auth.d.ts`, `lib/config/schemas/auth.schema.ts`, `lib/db/schema.ts`, `lib/types/user.ts`

Authentication types extend NextAuth's base types and define the configuration for OAuth providers, JWT tokens, and session management.

## NextAuth Extensions

### `Session`

Extended session type with custom fields.

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

| Field | Description |
|-------|-------------|
| `id` | Database user ID |
| `clientProfileId` | Associated client profile ID |
| `provider` | OAuth provider name (e.g., `'google'`, `'github'`) |
| `isAdmin` | Whether the user has admin privileges |
| `customerId` | Payment provider customer identifier |

### `User`

Extended user type returned during authentication.

```typescript
interface User extends DefaultUser {
  isAdmin?: boolean;
  clientProfileId?: string;
  customerId?: string;
}
```

### `JWT`

Extended JWT token payload.

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

## Auth Configuration

### `AuthConfig`

Validated authentication configuration from Zod schema.

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

Configuration for a single OAuth provider. The `enabled` flag is auto-computed from credential presence.

```typescript
interface OAuthProvider {
  clientId?: string;
  clientSecret?: string;
  enabled: boolean;      // true when both clientId AND clientSecret are set
}
```

## Database Schema

### `users` table

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

### `accounts` table

Links users to OAuth providers (NextAuth adapter table).

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

### `sessions` table

```typescript
{
  sessionToken: text,    // Primary key
  userId: text,          // FK -> users.id
  expires: timestamp,    // Session expiry
}
```

### `clientProfiles` table

Extended profile data for authenticated users.

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

## Profile UI Types

### `ExtendedUser`

User type with optional client profile data for the profile button.

```typescript
interface ExtendedUser extends NextAuthUser {
  clientProfile?: { username?: string };
}
```

### `PresenceStatus` and `RoleLabel`

Display-level types for the profile menu.

```typescript
type PresenceStatus = 'online' | 'offline' | 'away' | 'busy';
type RoleLabel = 'Admin' | 'User' | 'Client';
```

## Auth Features Configuration

Displayed on login/signup pages, defined in `lib/config/auth-features.ts`:

```typescript
interface AuthFeature {
  icon: LucideIcon;
  colorVariant: 'primary' | 'accent' | 'secondary';
  titleKey: string;          // i18n translation key
  descriptionKey: string;    // i18n translation key
}
```

## Usage Example

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

## Related Types

- [Permission Types](./permission-types.md) -- granular access control
- [Role Types](./role-types.md) -- role definitions assigned to users
- [User Types](./user-types.md) -- admin user management types
