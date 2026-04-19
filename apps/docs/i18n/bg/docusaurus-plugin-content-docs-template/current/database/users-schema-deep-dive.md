---
id: users-schema-deep-dive
title: "Задълбочено потапяне в схемата на потребителите"
sidebar_label: "Схема на потребителите"
sidebar_position: 51
---

# Задълбочено потапяне в схемата на потребителите

## Преглед

Потребителският модул е основният слой за идентичност на шаблона Ever Works. Обхваща базовата таблица `users` (съвместима с NextAuth), `client_profiles` за данни от разширени профили, таблици, свързани с удостоверяване (`accounts`, `sessions`, `authenticators`, `verificationTokens`, `passwordResetTokens`) и системата RBAC (`roles`, `permissions`, `rolePermissions`, `userRoles`).

**Изходен файл:** `template/lib/db/schema.ts`
**Файл за връзки:** `template/lib/db/migrations/relations.ts`

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

## Таблица: `client_profiles`

Разширен профил за потребители на приложения (клиенти). Съхранява лични данни, настройки на акаунта, състояние на модериране и предпочитания за местоположение.

### Колони

|Колона|Име на БД|Тип|Nullable|По подразбиране|Ограничения|
|---|---|---|---|---|---|
|`id`|`id`|`text`|не|`crypto.randomUUID()`|Първичен ключ|
|`userId`|`userId`|`text`|не| - |FK -> `users.id` (КАСКАДА)|
|`email`|`email`|`text`|не| - | - |
|`name`|`name`|`text`|не| - | - |
|`displayName`|`display_name`|`text`|да| - | - |
|`username`|`username`|`text`|да| - |Уникален|
|`bio`|`bio`|`text`|да| - | - |
|`jobTitle`|`job_title`|`text`|да| - | - |
|`company`|`company`|`text`|да| - | - |
|`industry`|`industry`|`text`|да| - | - |
|`phone`|`phone`|`text`|да| - | - |
|`website`|`website`|`text`|да| - | - |
|`location`|`location`|`text`|да| - | - |
|`avatar`|`avatar`|`text`|да| - | - |
|`accountType`|`account_type`|`text (enum)`|да|`'individual'`|`individual`, `business`, `enterprise`|
|`status`|`status`|`text (enum)`|да|`'active'`|`active`, `inactive`, `suspended`, `banned`, `trial`|
|`plan`|`plan`|`text (enum)`|да|`'free'`|`free`, `standard`, `premium`|
|`timezone`|`timezone`|`text`|да|`'UTC'`| - |
|`language`|`language`|`text`|да|`'en'`| - |
|`country`|`country`|`text`|да| - | - |
|`currency`|`currency`|`text`|да|`'USD'`| - |
|`defaultLatitude`|`default_latitude`|`doublePrecision`|да| - |Резервен вариант „Близо до мен“.|
|`defaultLongitude`|`default_longitude`|`doublePrecision`|да| - |Резервен вариант „Близо до мен“.|
|`defaultCity`|`default_city`|`text`|да| - | - |
|`defaultCountry`|`default_country`|`text`|да| - | - |
|`locationPrivacy`|`location_privacy`|`text`|да|`'private'`| - |
|`twoFactorEnabled`|`two_factor_enabled`|`boolean`|да|`false`| - |
|`emailVerified`|`email_verified`|`boolean`|да|`false`| - |
|`totalSubmissions`|`total_submissions`|`integer`|да| `0` | - |
|`notes`|`notes`|`text`|да| - |Бележки на администратора|
|`tags`|`tags`|`text`|да| - | - |
|`warningCount`|`warning_count`|`integer`|да| `0` |Умереност|
|`suspendedAt`|`suspended_at`|`timestamp (tz)`|да| - |Умереност|
|`bannedAt`|`banned_at`|`timestamp (tz)`|да| - |Умереност|
|`createdAt`|`created_at`|`timestamp`|не|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|не|`now()`| - |

### Индекси

|Име|Колони|Тип|
|---|---|---|
|`client_profile_user_id_unique_idx`|`userId`|Уникален|
|`client_profile_email_idx`|`email`|B-дърво|
|`client_profile_status_idx`|`status`|B-дърво|
|`client_profile_plan_idx`|`plan`|B-дърво|
|`client_profile_account_type_idx`|`accountType`|B-дърво|
|`client_profile_username_idx`|`username`|B-дърво|
|`client_profile_created_at_idx`|`createdAt`|B-дърво|
|`client_profiles_username_unique`|`username`|Уникален|

### TypeScript типове

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

## Таблица: `sessions`

Активни потребителски сесии за NextAuth.

### Колони

|Колона|Име на БД|Тип|Nullable|По подразбиране|Ограничения|
|---|---|---|---|---|---|
|`sessionToken`|`sessionToken`|`text`|не| - |Първичен ключ|
|`userId`|`userId`|`text`|не| - |FK -> `users.id` (КАСКАДА)|
|`expires`|`expires`|`timestamp`|не| - | - |

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

## RBAC таблици

### Таблица: `roles`

|Колона|Име на БД|Тип|Nullable|По подразбиране|Ограничения|
|---|---|---|---|---|---|
|`id`|`id`|`text`|не| - |Първичен ключ|
|`name`|`name`|`text`|не| - |Уникален|
|`description`|`description`|`text`|да| - | - |
|`isAdmin`|`is_admin`|`boolean`|не|`false`| - |
|`status`|`status`|`text (enum)`|да|`'active'`|`active`, `inactive`|
|`created_by`|`created_by`|`text`|да|`'system'`| - |
|`createdAt`|`created_at`|`timestamp`|не|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|не|`now()`| - |
|`deletedAt`|`deleted_at`|`timestamp`|да| - |Меко изтриване|

**Индекси:** `roles_status_idx`, `roles_is_admin_idx`, `roles_created_at_idx`

### Таблица: `permissions`

|Колона|Име на БД|Тип|Nullable|По подразбиране|Ограничения|
|---|---|---|---|---|---|
|`id`|`id`|`text`|не|`crypto.randomUUID()`|Първичен ключ|
|`key`|`key`|`text`|не| - |Уникален|
|`description`|`description`|`text`|да| - | - |
|`createdAt`|`created_at`|`timestamp`|не|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|не|`now()`| - |

### Таблица: `role_permissions` (кръстовище)

|Колона|Име на БД|Тип|Nullable|По подразбиране|Ограничения|
|---|---|---|---|---|---|
|`roleId`|`role_id`|`text`|не| - |FK -> `roles.id` (КАСКАДА)|
|`permissionId`|`permission_id`|`text`|не| - |FK -> `permissions.id` (КАСКАДА)|
|`createdAt`|`created_at`|`timestamp`|не|`now()`| - |

**Първичен ключ:** Композитен `(roleId, permissionId)`
**Индекси:** `role_permissions_role_idx`, `role_permissions_permission_idx`, `role_permissions_created_at_idx`

### Таблица: `user_roles` (кръстовище)

|Колона|Име на БД|Тип|Nullable|По подразбиране|Ограничения|
|---|---|---|---|---|---|
|`userId`|`user_id`|`text`|не| - |FK -> `users.id` (КАСКАДА)|
|`roleId`|`role_id`|`text`|не| - |FK -> `roles.id` (КАСКАДА)|
|`createdAt`|`created_at`|`timestamp`|не|`now()`| - |

**Първичен ключ:** Композитен `(userId, roleId)`
**Индекси:** `user_roles_user_idx`, `user_roles_role_idx`, `user_roles_created_at_idx`

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

## Таблици с токени

### Таблица: `verificationTokens`

|Колона|Тип|Ограничения|
|---|---|---|
|`identifier`|`text`|Композитна PK част|
|`email`|`text`|НЕ НУЛЕВ|
|`token`|`text`|Композитна PK част|
|`expires`|`timestamp`|НЕ НУЛЕВ|

**Първичен ключ:** Композитен `(identifier, token)`

### Таблица: `passwordResetTokens`

|Колона|Тип|Ограничения|
|---|---|---|
|`id`|`text`|Първичен ключ (`crypto.randomUUID()`)|
|`email`|`text`|НЕ НУЛЕВ|
|`token`|`text`|НЕ NULL, уникално|
|`expires`|`timestamp`|НЕ НУЛЕВ|

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

## Примери за заявки

### Вземете потребител с профил

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

### Проверете потребителските роли

```typescript
import { userRoles, roles } from '@/lib/db/schema';

const userRoleList = await db
    .select({ roleName: roles.name, isAdmin: roles.isAdmin })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));
```

### Регистрирайте активност

```typescript
import { activityLogs, ActivityType } from '@/lib/db/schema';

await db.insert(activityLogs).values({
    userId,
    action: ActivityType.SIGN_IN,
    ipAddress: request.headers.get('x-forwarded-for'),
});
```
