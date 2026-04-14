---
id: users-schema-deep-dive
title: "Подробное описание схемы пользователей"
sidebar_label: "Схема пользователей"
sidebar_position: 51
---

# Подробное описание схемы пользователей

## Обзор

Модуль пользователей — это основной уровень идентификации шаблона Ever Works. Он включает в себя базовую таблицу `users` (совместимую с NextAuth), `client_profiles` для данных расширенного профиля, таблицы, связанные с аутентификацией (`accounts`, `sessions`, `authenticators`, `verificationTokens`, `passwordResetTokens`) и систему RBAC. (`roles`, `permissions`, `rolePermissions`, `userRoles`).

**Исходный файл:** `template/lib/db/schema.ts`
**Файл отношений:** `template/lib/db/migrations/relations.ts`

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

Расширенный профиль для пользователей приложения (клиентов). Сохраняет личные данные, настройки учетной записи, состояние модерации и предпочтения местоположения.

### Столбцы

|Столбец|Имя БД|Тип|Обнуляемый|По умолчанию|Ограничения|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Нет|`crypto.randomUUID()`|Первичный ключ|
|`userId`|`userId`|`text`|Нет| - |ФК -> `users.id` (КАСКАД)|
|`email`|`email`|`text`|Нет| - | - |
|`name`|`name`|`text`|Нет| - | - |
|`displayName`|`display_name`|`text`|Да| - | - |
|`username`|`username`|`text`|Да| - |Уникальный|
|`bio`|`bio`|`text`|Да| - | - |
|`jobTitle`|`job_title`|`text`|Да| - | - |
|`company`|`company`|`text`|Да| - | - |
|`industry`|`industry`|`text`|Да| - | - |
|`phone`|`phone`|`text`|Да| - | - |
|`website`|`website`|`text`|Да| - | - |
|`location`|`location`|`text`|Да| - | - |
|`avatar`|`avatar`|`text`|Да| - | - |
|`accountType`|`account_type`|`text (enum)`|Да|`'individual'`|`individual`, `business`, `enterprise`|
|`status`|`status`|`text (enum)`|Да|`'active'`|`active`, `inactive`, `suspended`, `banned`, `trial`|
|`plan`|`plan`|`text (enum)`|Да|`'free'`|`free`, `standard`, `premium`|
|`timezone`|`timezone`|`text`|Да|`'UTC'`| - |
|`language`|`language`|`text`|Да|`'en'`| - |
|`country`|`country`|`text`|Да| - | - |
|`currency`|`currency`|`text`|Да|`'USD'`| - |
|`defaultLatitude`|`default_latitude`|`doublePrecision`|Да| - |Резервный вариант «Рядом со мной»|
|`defaultLongitude`|`default_longitude`|`doublePrecision`|Да| - |Резервный вариант «Рядом со мной»|
|`defaultCity`|`default_city`|`text`|Да| - | - |
|`defaultCountry`|`default_country`|`text`|Да| - | - |
|`locationPrivacy`|`location_privacy`|`text`|Да|`'private'`| - |
|`twoFactorEnabled`|`two_factor_enabled`|`boolean`|Да|`false`| - |
|`emailVerified`|`email_verified`|`boolean`|Да|`false`| - |
|`totalSubmissions`|`total_submissions`|`integer`|Да| `0` | - |
|`notes`|`notes`|`text`|Да| - |Заметки администратора|
|`tags`|`tags`|`text`|Да| - | - |
|`warningCount`|`warning_count`|`integer`|Да| `0` |Модерация|
|`suspendedAt`|`suspended_at`|`timestamp (tz)`|Да| - |Модерация|
|`bannedAt`|`banned_at`|`timestamp (tz)`|Да| - |Модерация|
|`createdAt`|`created_at`|`timestamp`|Нет|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|Нет|`now()`| - |

### Индексы

|Имя|Столбцы|Тип|
|---|---|---|
|`client_profile_user_id_unique_idx`|`userId`|Уникальный|
|`client_profile_email_idx`|`email`|B-дерево|
|`client_profile_status_idx`|`status`|B-дерево|
|`client_profile_plan_idx`|`plan`|B-дерево|
|`client_profile_account_type_idx`|`accountType`|B-дерево|
|`client_profile_username_idx`|`username`|B-дерево|
|`client_profile_created_at_idx`|`createdAt`|B-дерево|
|`client_profiles_username_unique`|`username`|Уникальный|

### Типы TypeScript

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

Активные пользовательские сеансы для NextAuth.

### Столбцы

|Столбец|Имя БД|Тип|Обнуляемый|По умолчанию|Ограничения|
|---|---|---|---|---|---|
|`sessionToken`|`sessionToken`|`text`|Нет| - |Первичный ключ|
|`userId`|`userId`|`text`|Нет| - |ФК -> `users.id` (КАСКАД)|
|`expires`|`expires`|`timestamp`|Нет| - | - |

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

## Таблицы RBAC

### Таблица: `roles`

|Столбец|Имя БД|Тип|Обнуляемый|По умолчанию|Ограничения|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Нет| - |Первичный ключ|
|`name`|`name`|`text`|Нет| - |Уникальный|
|`description`|`description`|`text`|Да| - | - |
|`isAdmin`|`is_admin`|`boolean`|Нет|`false`| - |
|`status`|`status`|`text (enum)`|Да|`'active'`|`active`, `inactive`|
|`created_by`|`created_by`|`text`|Да|`'system'`| - |
|`createdAt`|`created_at`|`timestamp`|Нет|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|Нет|`now()`| - |
|`deletedAt`|`deleted_at`|`timestamp`|Да| - |Мягкое удаление|

**Индексы:** `roles_status_idx`, `roles_is_admin_idx`, `roles_created_at_idx`

### Таблица: `permissions`

|Столбец|Имя БД|Тип|Обнуляемый|По умолчанию|Ограничения|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Нет|`crypto.randomUUID()`|Первичный ключ|
|`key`|`key`|`text`|Нет| - |Уникальный|
|`description`|`description`|`text`|Да| - | - |
|`createdAt`|`created_at`|`timestamp`|Нет|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|Нет|`now()`| - |

### Таблица: `role_permissions` (развязка)

|Столбец|Имя БД|Тип|Обнуляемый|По умолчанию|Ограничения|
|---|---|---|---|---|---|
|`roleId`|`role_id`|`text`|Нет| - |ФК -> `roles.id` (КАСКАД)|
|`permissionId`|`permission_id`|`text`|Нет| - |ФК -> `permissions.id` (КАСКАД)|
|`createdAt`|`created_at`|`timestamp`|Нет|`now()`| - |

**Первичный ключ:** Составной `(roleId, permissionId)`
**Индексы:** `role_permissions_role_idx`, `role_permissions_permission_idx`, `role_permissions_created_at_idx`

### Таблица: `user_roles` (развязка)

|Столбец|Имя БД|Тип|Обнуляемый|По умолчанию|Ограничения|
|---|---|---|---|---|---|
|`userId`|`user_id`|`text`|Нет| - |ФК -> `users.id` (КАСКАД)|
|`roleId`|`role_id`|`text`|Нет| - |ФК -> `roles.id` (КАСКАД)|
|`createdAt`|`created_at`|`timestamp`|Нет|`now()`| - |

**Первичный ключ:** Составной `(userId, roleId)`
**Индексы:** `user_roles_user_idx`, `user_roles_role_idx`, `user_roles_created_at_idx`

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

## Таблицы токенов

### Таблица: `verificationTokens`

|Столбец|Тип|Ограничения|
|---|---|---|
|`identifier`|`text`|Составная часть ПК|
|`email`|`text`|НЕ НУЛЬ|
|`token`|`text`|Составная часть ПК|
|`expires`|`timestamp`|НЕ НУЛЬ|

**Первичный ключ:** Составной `(identifier, token)`

### Таблица: `passwordResetTokens`

|Столбец|Тип|Ограничения|
|---|---|---|
|`id`|`text`|Первичный ключ (`crypto.randomUUID()`)|
|`email`|`text`|НЕ НУЛЬ|
|`token`|`text`|НЕ NULL, уникальный|
|`expires`|`timestamp`|НЕ НУЛЬ|

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

## Примеры запросов

### Получить пользователя с профилем

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

### Проверьте роли пользователей

```typescript
import { userRoles, roles } from '@/lib/db/schema';

const userRoleList = await db
    .select({ roleName: roles.name, isAdmin: roles.isAdmin })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));
```

### Зарегистрировать действие

```typescript
import { activityLogs, ActivityType } from '@/lib/db/schema';

await db.insert(activityLogs).values({
    userId,
    action: ActivityType.SIGN_IN,
    ipAddress: request.headers.get('x-forwarded-for'),
});
```
