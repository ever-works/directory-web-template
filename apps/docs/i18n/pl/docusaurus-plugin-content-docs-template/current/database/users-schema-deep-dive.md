---
id: users-schema-deep-dive
title: "Głębokie nurkowanie w schemacie użytkowników"
sidebar_label: "Schemat użytkowników"
sidebar_position: 51
---

# Głębokie nurkowanie w schemacie użytkowników

## Przegląd

Moduł użytkowników jest podstawową warstwą tożsamości szablonu Ever Works. Obejmuje podstawową tabelę `users` (kompatybilną z NextAuth), `client_profiles` dla rozszerzonych danych profilowych, tabele związane z uwierzytelnianiem (`accounts`, `sessions`, `authenticators`, `verificationTokens`, `passwordResetTokens`) oraz system RBAC (`roles`, `permissions`, `rolePermissions`, `userRoles`).

**Plik źródłowy:** `template/lib/db/schema.ts`
**Plik relacji:** `template/lib/db/migrations/relations.ts`

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

## Tabela: `client_profiles`

Rozszerzony profil dla użytkowników aplikacji (klientów). Przechowuje dane osobowe, ustawienia konta, stan moderacji i preferencje dotyczące lokalizacji.

### Kolumny

|Kolumna|Nazwa bazy danych|Wpisz|Możliwość wartości null|Domyślne|Ograniczenia|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Nie|`crypto.randomUUID()`|Klucz podstawowy|
|`userId`|`userId`|`text`|Nie| - |FK -> `users.id` (KASKADA)|
|`email`|`email`|`text`|Nie| - | - |
|`name`|`name`|`text`|Nie| - | - |
|`displayName`|`display_name`|`text`|Tak| - | - |
|`username`|`username`|`text`|Tak| - |Wyjątkowy|
|`bio`|`bio`|`text`|Tak| - | - |
|`jobTitle`|`job_title`|`text`|Tak| - | - |
|`company`|`company`|`text`|Tak| - | - |
|`industry`|`industry`|`text`|Tak| - | - |
|`phone`|`phone`|`text`|Tak| - | - |
|`website`|`website`|`text`|Tak| - | - |
|`location`|`location`|`text`|Tak| - | - |
|`avatar`|`avatar`|`text`|Tak| - | - |
|`accountType`|`account_type`|`text (enum)`|Tak|`'individual'`|`individual`, `business`, `enterprise`|
|`status`|`status`|`text (enum)`|Tak|`'active'`|`active`, `inactive`, `suspended`, `banned`, `trial`|
|`plan`|`plan`|`text (enum)`|Tak|`'free'`|`free`, `standard`, `premium`|
|`timezone`|`timezone`|`text`|Tak|`'UTC'`| - |
|`language`|`language`|`text`|Tak|`'en'`| - |
|`country`|`country`|`text`|Tak| - | - |
|`currency`|`currency`|`text`|Tak|`'USD'`| - |
|`defaultLatitude`|`default_latitude`|`doublePrecision`|Tak| - |Powrót do „Blisko mnie”.|
|`defaultLongitude`|`default_longitude`|`doublePrecision`|Tak| - |Powrót do „Blisko mnie”.|
|`defaultCity`|`default_city`|`text`|Tak| - | - |
|`defaultCountry`|`default_country`|`text`|Tak| - | - |
|`locationPrivacy`|`location_privacy`|`text`|Tak|`'private'`| - |
|`twoFactorEnabled`|`two_factor_enabled`|`boolean`|Tak|`false`| - |
|`emailVerified`|`email_verified`|`boolean`|Tak|`false`| - |
|`totalSubmissions`|`total_submissions`|`integer`|Tak| `0` | - |
|`notes`|`notes`|`text`|Tak| - |Notatki administratora|
|`tags`|`tags`|`text`|Tak| - | - |
|`warningCount`|`warning_count`|`integer`|Tak| `0` |Umiarkowanie|
|`suspendedAt`|`suspended_at`|`timestamp (tz)`|Tak| - |Umiarkowanie|
|`bannedAt`|`banned_at`|`timestamp (tz)`|Tak| - |Umiarkowanie|
|`createdAt`|`created_at`|`timestamp`|Nie|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|Nie|`now()`| - |

### Indeksy

|Imię|Kolumny|Wpisz|
|---|---|---|
|`client_profile_user_id_unique_idx`|`userId`|Wyjątkowy|
|`client_profile_email_idx`|`email`|Drzewo B|
|`client_profile_status_idx`|`status`|Drzewo B|
|`client_profile_plan_idx`|`plan`|Drzewo B|
|`client_profile_account_type_idx`|`accountType`|Drzewo B|
|`client_profile_username_idx`|`username`|Drzewo B|
|`client_profile_created_at_idx`|`createdAt`|Drzewo B|
|`client_profiles_username_unique`|`username`|Wyjątkowy|

### Typy TypeScriptu

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

## Tabela: `sessions`

Aktywne sesje użytkowników dla NextAuth.

### Kolumny

|Kolumna|Nazwa bazy danych|Wpisz|Możliwość wartości null|Domyślne|Ograniczenia|
|---|---|---|---|---|---|
|`sessionToken`|`sessionToken`|`text`|Nie| - |Klucz podstawowy|
|`userId`|`userId`|`text`|Nie| - |FK -> `users.id` (KASKADA)|
|`expires`|`expires`|`timestamp`|Nie| - | - |

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

## Tabele RBAC

### Tabela: `roles`

|Kolumna|Nazwa bazy danych|Wpisz|Możliwość wartości null|Domyślne|Ograniczenia|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Nie| - |Klucz podstawowy|
|`name`|`name`|`text`|Nie| - |Wyjątkowy|
|`description`|`description`|`text`|Tak| - | - |
|`isAdmin`|`is_admin`|`boolean`|Nie|`false`| - |
|`status`|`status`|`text (enum)`|Tak|`'active'`|`active`, `inactive`|
|`created_by`|`created_by`|`text`|Tak|`'system'`| - |
|`createdAt`|`created_at`|`timestamp`|Nie|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|Nie|`now()`| - |
|`deletedAt`|`deleted_at`|`timestamp`|Tak| - |Miękkie usuwanie|

**Indeksy:** `roles_status_idx`, `roles_is_admin_idx`, `roles_created_at_idx`

### Tabela: `permissions`

|Kolumna|Nazwa bazy danych|Wpisz|Możliwość wartości null|Domyślne|Ograniczenia|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Nie|`crypto.randomUUID()`|Klucz podstawowy|
|`key`|`key`|`text`|Nie| - |Wyjątkowy|
|`description`|`description`|`text`|Tak| - | - |
|`createdAt`|`created_at`|`timestamp`|Nie|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|Nie|`now()`| - |

### Tabela: `role_permissions` (skrzyżowanie)

|Kolumna|Nazwa bazy danych|Wpisz|Możliwość wartości null|Domyślne|Ograniczenia|
|---|---|---|---|---|---|
|`roleId`|`role_id`|`text`|Nie| - |FK -> `roles.id` (KASKADA)|
|`permissionId`|`permission_id`|`text`|Nie| - |FK -> `permissions.id` (KASKADA)|
|`createdAt`|`created_at`|`timestamp`|Nie|`now()`| - |

**Klucz podstawowy:** Kompozyt `(roleId, permissionId)`
**Indeksy:** `role_permissions_role_idx`, `role_permissions_permission_idx`, `role_permissions_created_at_idx`

### Tabela: `user_roles` (skrzyżowanie)

|Kolumna|Nazwa bazy danych|Wpisz|Możliwość wartości null|Domyślne|Ograniczenia|
|---|---|---|---|---|---|
|`userId`|`user_id`|`text`|Nie| - |FK -> `users.id` (KASKADA)|
|`roleId`|`role_id`|`text`|Nie| - |FK -> `roles.id` (KASKADA)|
|`createdAt`|`created_at`|`timestamp`|Nie|`now()`| - |

**Klucz podstawowy:** Kompozyt `(userId, roleId)`
**Indeksy:** `user_roles_user_idx`, `user_roles_role_idx`, `user_roles_created_at_idx`

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

## Tablice tokenów

### Tabela: `verificationTokens`

|Kolumna|Wpisz|Ograniczenia|
|---|---|---|
|`identifier`|`text`|Kompozytowa część PK|
|`email`|`text`|NIE NULL|
|`token`|`text`|Kompozytowa część PK|
|`expires`|`timestamp`|NIE NULL|

**Klucz podstawowy:** Kompozyt `(identifier, token)`

### Tabela: `passwordResetTokens`

|Kolumna|Wpisz|Ograniczenia|
|---|---|---|
|`id`|`text`|Klucz podstawowy (`crypto.randomUUID()`)|
|`email`|`text`|NIE NULL|
|`token`|`text`|NIE NULL, unikalny|
|`expires`|`timestamp`|NIE NULL|

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

## Przykłady zapytań

### Pobierz użytkownika z profilem

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

### Sprawdź role użytkowników

```typescript
import { userRoles, roles } from '@/lib/db/schema';

const userRoleList = await db
    .select({ roleName: roles.name, isAdmin: roles.isAdmin })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));
```

### Rejestruj aktywność

```typescript
import { activityLogs, ActivityType } from '@/lib/db/schema';

await db.insert(activityLogs).values({
    userId,
    action: ActivityType.SIGN_IN,
    ipAddress: request.headers.get('x-forwarded-for'),
});
```
