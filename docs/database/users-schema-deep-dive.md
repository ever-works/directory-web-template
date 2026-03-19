---
id: users-schema-deep-dive
title: "Users Schema Deep Dive"
sidebar_label: "Users Schema"
sidebar_position: 51
---

# Users Schema Deep Dive

## Overview

The users module is the core identity layer of the Ever Works Template. It encompasses the base `users` table (NextAuth-compatible), `client_profiles` for extended profile data, authentication-related tables (`accounts`, `sessions`, `authenticators`, `verificationTokens`, `passwordResetTokens`), and the RBAC system (`roles`, `permissions`, `rolePermissions`, `userRoles`).

**Source file:** `template/lib/db/schema.ts`
**Relations file:** `template/lib/db/migrations/relations.ts`

---

## Table: `users`

The core authentication table, designed for compatibility with NextAuth (Auth.js).

### Columns

| Column | DB Name | Type | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| `id` | `id` | `text` | No | `crypto.randomUUID()` | Primary Key |
| `email` | `email` | `text` | Yes | - | Unique |
| `image` | `image` | `text` | Yes | - | Profile avatar URL |
| `emailVerified` | `emailVerified` | `timestamp` | Yes | - | Date email was verified |
| `passwordHash` | `password_hash` | `text` | Yes | - | Hashed password |
| `createdAt` | `created_at` | `timestamp` | No | `now()` | - |
| `updatedAt` | `updated_at` | `timestamp` | No | `now()` | - |
| `deletedAt` | `deleted_at` | `timestamp` | Yes | - | Soft delete |

### Indexes

| Name | Columns | Type |
|---|---|---|
| `users_email_unique` | `email` | Unique |
| `users_created_at_idx` | `createdAt` | B-tree |

### TypeScript Types

```typescript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

---

## Table: `client_profiles`

Extended profile for application users (clients). Stores personal details, account settings, moderation state, and location preferences.

### Columns

| Column | DB Name | Type | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| `id` | `id` | `text` | No | `crypto.randomUUID()` | Primary Key |
| `userId` | `userId` | `text` | No | - | FK -> `users.id` (CASCADE) |
| `email` | `email` | `text` | No | - | - |
| `name` | `name` | `text` | No | - | - |
| `displayName` | `display_name` | `text` | Yes | - | - |
| `username` | `username` | `text` | Yes | - | Unique |
| `bio` | `bio` | `text` | Yes | - | - |
| `jobTitle` | `job_title` | `text` | Yes | - | - |
| `company` | `company` | `text` | Yes | - | - |
| `industry` | `industry` | `text` | Yes | - | - |
| `phone` | `phone` | `text` | Yes | - | - |
| `website` | `website` | `text` | Yes | - | - |
| `location` | `location` | `text` | Yes | - | - |
| `avatar` | `avatar` | `text` | Yes | - | - |
| `accountType` | `account_type` | `text (enum)` | Yes | `'individual'` | `individual`, `business`, `enterprise` |
| `status` | `status` | `text (enum)` | Yes | `'active'` | `active`, `inactive`, `suspended`, `banned`, `trial` |
| `plan` | `plan` | `text (enum)` | Yes | `'free'` | `free`, `standard`, `premium` |
| `timezone` | `timezone` | `text` | Yes | `'UTC'` | - |
| `language` | `language` | `text` | Yes | `'en'` | - |
| `country` | `country` | `text` | Yes | - | - |
| `currency` | `currency` | `text` | Yes | `'USD'` | - |
| `defaultLatitude` | `default_latitude` | `doublePrecision` | Yes | - | "Near Me" fallback |
| `defaultLongitude` | `default_longitude` | `doublePrecision` | Yes | - | "Near Me" fallback |
| `defaultCity` | `default_city` | `text` | Yes | - | - |
| `defaultCountry` | `default_country` | `text` | Yes | - | - |
| `locationPrivacy` | `location_privacy` | `text` | Yes | `'private'` | - |
| `twoFactorEnabled` | `two_factor_enabled` | `boolean` | Yes | `false` | - |
| `emailVerified` | `email_verified` | `boolean` | Yes | `false` | - |
| `totalSubmissions` | `total_submissions` | `integer` | Yes | `0` | - |
| `notes` | `notes` | `text` | Yes | - | Admin notes |
| `tags` | `tags` | `text` | Yes | - | - |
| `warningCount` | `warning_count` | `integer` | Yes | `0` | Moderation |
| `suspendedAt` | `suspended_at` | `timestamp (tz)` | Yes | - | Moderation |
| `bannedAt` | `banned_at` | `timestamp (tz)` | Yes | - | Moderation |
| `createdAt` | `created_at` | `timestamp` | No | `now()` | - |
| `updatedAt` | `updated_at` | `timestamp` | No | `now()` | - |

### Indexes

| Name | Columns | Type |
|---|---|---|
| `client_profile_user_id_unique_idx` | `userId` | Unique |
| `client_profile_email_idx` | `email` | B-tree |
| `client_profile_status_idx` | `status` | B-tree |
| `client_profile_plan_idx` | `plan` | B-tree |
| `client_profile_account_type_idx` | `accountType` | B-tree |
| `client_profile_username_idx` | `username` | B-tree |
| `client_profile_created_at_idx` | `createdAt` | B-tree |
| `client_profiles_username_unique` | `username` | Unique |

### TypeScript Types

```typescript
export type ClientProfile = typeof clientProfiles.$inferSelect;
export type NewClientProfile = typeof clientProfiles.$inferInsert;
export type ClientProfileWithUser = ClientProfile & {
    user: typeof users.$inferSelect;
};
```

---

## Table: `accounts`

OAuth provider accounts linked to users. Follows the NextAuth adapter pattern.

### Columns

| Column | DB Name | Type | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| `userId` | `userId` | `text` | No | - | FK -> `users.id` (CASCADE) |
| `type` | `type` | `text` | No | - | `AdapterAccountType` |
| `provider` | `provider` | `text` | No | - | Compound PK part |
| `providerAccountId` | `providerAccountId` | `text` | No | - | Compound PK part |
| `email` | `email` | `text` | Yes | - | Client auth |
| `passwordHash` | `password_hash` | `text` | Yes | - | Client auth |
| `refresh_token` | `refresh_token` | `text` | Yes | - | OAuth |
| `access_token` | `access_token` | `text` | Yes | - | OAuth |
| `expires_at` | `expires_at` | `integer` | Yes | - | OAuth |
| `token_type` | `token_type` | `text` | Yes | - | OAuth |
| `scope` | `scope` | `text` | Yes | - | OAuth |
| `id_token` | `id_token` | `text` | Yes | - | OAuth |
| `session_state` | `session_state` | `text` | Yes | - | OAuth |

### Primary Key

Composite: `(provider, providerAccountId)`

### Indexes

| Name | Columns | Type |
|---|---|---|
| `accounts_email_idx` | `email` | B-tree |
| `accounts_provider_idx` | `provider` | B-tree |

---

## Table: `sessions`

Active user sessions for NextAuth.

### Columns

| Column | DB Name | Type | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| `sessionToken` | `sessionToken` | `text` | No | - | Primary Key |
| `userId` | `userId` | `text` | No | - | FK -> `users.id` (CASCADE) |
| `expires` | `expires` | `timestamp` | No | - | - |

---

## Table: `authenticators`

WebAuthn/FIDO2 authenticator credentials.

### Columns

| Column | DB Name | Type | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| `credentialID` | `credentialID` | `text` | No | - | Unique |
| `userId` | `userId` | `text` | No | - | FK -> `users.id` (CASCADE) |
| `providerAccountId` | `providerAccountId` | `text` | No | - | - |
| `credentialPublicKey` | `credentialPublicKey` | `text` | No | - | - |
| `counter` | `counter` | `integer` | No | - | - |
| `credentialDeviceType` | `credentialDeviceType` | `text` | No | - | - |
| `credentialBackedUp` | `credentialBackedUp` | `boolean` | No | - | - |
| `transports` | `transports` | `text` | Yes | - | - |

### Primary Key

Composite: `(userId, credentialID)`

---

## RBAC Tables

### Table: `roles`

| Column | DB Name | Type | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| `id` | `id` | `text` | No | - | Primary Key |
| `name` | `name` | `text` | No | - | Unique |
| `description` | `description` | `text` | Yes | - | - |
| `isAdmin` | `is_admin` | `boolean` | No | `false` | - |
| `status` | `status` | `text (enum)` | Yes | `'active'` | `active`, `inactive` |
| `created_by` | `created_by` | `text` | Yes | `'system'` | - |
| `createdAt` | `created_at` | `timestamp` | No | `now()` | - |
| `updatedAt` | `updated_at` | `timestamp` | No | `now()` | - |
| `deletedAt` | `deleted_at` | `timestamp` | Yes | - | Soft delete |

**Indexes:** `roles_status_idx`, `roles_is_admin_idx`, `roles_created_at_idx`

### Table: `permissions`

| Column | DB Name | Type | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| `id` | `id` | `text` | No | `crypto.randomUUID()` | Primary Key |
| `key` | `key` | `text` | No | - | Unique |
| `description` | `description` | `text` | Yes | - | - |
| `createdAt` | `created_at` | `timestamp` | No | `now()` | - |
| `updatedAt` | `updated_at` | `timestamp` | No | `now()` | - |

### Table: `role_permissions` (junction)

| Column | DB Name | Type | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| `roleId` | `role_id` | `text` | No | - | FK -> `roles.id` (CASCADE) |
| `permissionId` | `permission_id` | `text` | No | - | FK -> `permissions.id` (CASCADE) |
| `createdAt` | `created_at` | `timestamp` | No | `now()` | - |

**Primary Key:** Composite `(roleId, permissionId)`
**Indexes:** `role_permissions_role_idx`, `role_permissions_permission_idx`, `role_permissions_created_at_idx`

### Table: `user_roles` (junction)

| Column | DB Name | Type | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| `userId` | `user_id` | `text` | No | - | FK -> `users.id` (CASCADE) |
| `roleId` | `role_id` | `text` | No | - | FK -> `roles.id` (CASCADE) |
| `createdAt` | `created_at` | `timestamp` | No | `now()` | - |

**Primary Key:** Composite `(userId, roleId)`
**Indexes:** `user_roles_user_idx`, `user_roles_role_idx`, `user_roles_created_at_idx`

---

## Relations Diagram

```mermaid
erDiagram
    users ||--o{ accounts : "has many"
    users ||--o{ sessions : "has many"
    users ||--o{ authenticators : "has many"
    users ||--o{ favorites : "has many"
    users ||--o{ notifications : "has many"
    users ||--o{ paymentAccounts : "has many"
    users ||--o{ subscriptions : "has many"
    users ||--o{ activityLogs : "has many"
    users ||--|| client_profiles : "has one"
    users ||--o{ user_roles : "has many"
    roles ||--o{ user_roles : "has many"
    roles ||--o{ role_permissions : "has many"
    permissions ||--o{ role_permissions : "has many"
    client_profiles ||--o{ comments : "has many"
    client_profiles ||--o{ votes : "has many"
    client_profiles ||--o{ activityLogs : "has many"

    users {
        text id PK
        text email UK
        text password_hash
        timestamp emailVerified
        timestamp created_at
    }

    client_profiles {
        text id PK
        text userId FK_UK
        text email
        text name
        text username UK
        text status
        text plan
    }

    roles {
        text id PK
        text name UK
        boolean is_admin
        text status
    }

    permissions {
        text id PK
        text key UK
        text description
    }

    user_roles {
        text user_id FK_PK
        text role_id FK_PK
    }

    role_permissions {
        text role_id FK_PK
        text permission_id FK_PK
    }
```

---

## Token Tables

### Table: `verificationTokens`

| Column | Type | Constraints |
|---|---|---|
| `identifier` | `text` | Composite PK part |
| `email` | `text` | NOT NULL |
| `token` | `text` | Composite PK part |
| `expires` | `timestamp` | NOT NULL |

**Primary Key:** Composite `(identifier, token)`

### Table: `passwordResetTokens`

| Column | Type | Constraints |
|---|---|---|
| `id` | `text` | Primary Key (`crypto.randomUUID()`) |
| `email` | `text` | NOT NULL |
| `token` | `text` | NOT NULL, Unique |
| `expires` | `timestamp` | NOT NULL |

---

## Activity Tracking

### Table: `activityLogs`

| Column | DB Name | Type | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| `id` | `id` | `serial` | No | auto-increment | Primary Key |
| `userId` | `userId` | `text` | Yes | - | FK -> `users.id` (CASCADE) |
| `clientId` | `clientId` | `text` | Yes | - | FK -> `client_profiles.id` (CASCADE) |
| `action` | `action` | `text` | No | - | - |
| `timestamp` | `timestamp` | `timestamp` | No | `now()` | - |
| `ipAddress` | `ip_address` | `varchar(45)` | Yes | - | IPv4/IPv6 |

**Indexes:** `activity_logs_user_idx`, `activity_logs_timestamp_idx`, `activity_logs_action_idx`

### Activity Type Enum

```typescript
export enum ActivityType {
    SIGN_UP = 'SIGN_UP',
    SIGN_IN = 'SIGN_IN',
    SIGN_OUT = 'SIGN_OUT',
    VERIFY_EMAIL = 'VERIFY_EMAIL',
    UPDATE_PASSWORD = 'UPDATE_PASSWORD',
    DELETE_ACCOUNT = 'DELETE_ACCOUNT',
    UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
    UPDATE_TWENTY_CRM_CONFIG = 'UPDATE_TWENTY_CRM_CONFIG'
}
```

---

## Query Examples

### Get user with profile

```typescript
import { db } from '@/lib/db/drizzle';
import { users, clientProfiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const result = await db
    .select()
    .from(users)
    .leftJoin(clientProfiles, eq(users.id, clientProfiles.userId))
    .where(eq(users.id, userId));
```

### Check user roles

```typescript
import { userRoles, roles } from '@/lib/db/schema';

const userRoleList = await db
    .select({ roleName: roles.name, isAdmin: roles.isAdmin })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));
```

### Log an activity

```typescript
import { activityLogs, ActivityType } from '@/lib/db/schema';

await db.insert(activityLogs).values({
    userId,
    action: ActivityType.SIGN_IN,
    ipAddress: request.headers.get('x-forwarded-for'),
});
```
