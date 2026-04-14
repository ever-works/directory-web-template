---
id: users-schema-deep-dive
title: "Gebruikersschema Deep Dive"
sidebar_label: "Gebruikersschema"
sidebar_position: 51
---

# Gebruikersschema Deep Dive

## Overzicht

De gebruikersmodule is de kernidentiteitslaag van de Ever Works-sjabloon. Het omvat de basistabel `users` (NextAuth-compatibel), `client_profiles` voor uitgebreide profielgegevens, authenticatiegerelateerde tabellen (`accounts`, `sessions`, `authenticators`, `verificationTokens`, `passwordResetTokens`), en het RBAC-systeem (`roles`, `permissions`, `rolePermissions`, `userRoles`).

**Bronbestand:** `template/lib/db/schema.ts`
**Relatiebestand:** `template/lib/db/migrations/relations.ts`

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

## Tabel: `client_profiles`

Uitgebreid profiel voor applicatiegebruikers (clients). Slaat persoonlijke gegevens, accountinstellingen, moderatiestatus en locatievoorkeuren op.

### Kolommen

|Kolom|DB-naam|Typ|Nulleerbaar|Standaard|Beperkingen|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Nee|`crypto.randomUUID()`|Primaire sleutel|
|`userId`|`userId`|`text`|Nee| - |FK -> `users.id` (CASCADE)|
|`email`|`email`|`text`|Nee| - | - |
|`name`|`name`|`text`|Nee| - | - |
|`displayName`|`display_name`|`text`|Ja| - | - |
|`username`|`username`|`text`|Ja| - |Uniek|
|`bio`|`bio`|`text`|Ja| - | - |
|`jobTitle`|`job_title`|`text`|Ja| - | - |
|`company`|`company`|`text`|Ja| - | - |
|`industry`|`industry`|`text`|Ja| - | - |
|`phone`|`phone`|`text`|Ja| - | - |
|`website`|`website`|`text`|Ja| - | - |
|`location`|`location`|`text`|Ja| - | - |
|`avatar`|`avatar`|`text`|Ja| - | - |
|`accountType`|`account_type`|`text (enum)`|Ja|`'individual'`|`individual`, `business`, `enterprise`|
|`status`|`status`|`text (enum)`|Ja|`'active'`|`active`, `inactive`, `suspended`, `banned`, `trial`|
|`plan`|`plan`|`text (enum)`|Ja|`'free'`|`free`, `standard`, `premium`|
|`timezone`|`timezone`|`text`|Ja|`'UTC'`| - |
|`language`|`language`|`text`|Ja|`'en'`| - |
|`country`|`country`|`text`|Ja| - | - |
|`currency`|`currency`|`text`|Ja|`'USD'`| - |
|`defaultLatitude`|`default_latitude`|`doublePrecision`|Ja| - |Terugval "Bij mij in de buurt".|
|`defaultLongitude`|`default_longitude`|`doublePrecision`|Ja| - |Terugval "Bij mij in de buurt".|
|`defaultCity`|`default_city`|`text`|Ja| - | - |
|`defaultCountry`|`default_country`|`text`|Ja| - | - |
|`locationPrivacy`|`location_privacy`|`text`|Ja|`'private'`| - |
|`twoFactorEnabled`|`two_factor_enabled`|`boolean`|Ja|`false`| - |
|`emailVerified`|`email_verified`|`boolean`|Ja|`false`| - |
|`totalSubmissions`|`total_submissions`|`integer`|Ja| `0` | - |
|`notes`|`notes`|`text`|Ja| - |Beheernotities|
|`tags`|`tags`|`text`|Ja| - | - |
|`warningCount`|`warning_count`|`integer`|Ja| `0` |Matiging|
|`suspendedAt`|`suspended_at`|`timestamp (tz)`|Ja| - |Matiging|
|`bannedAt`|`banned_at`|`timestamp (tz)`|Ja| - |Matiging|
|`createdAt`|`created_at`|`timestamp`|Nee|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|Nee|`now()`| - |

### Indexen

|Naam|Kolommen|Typ|
|---|---|---|
|`client_profile_user_id_unique_idx`|`userId`|Uniek|
|`client_profile_email_idx`|`email`|B-boom|
|`client_profile_status_idx`|`status`|B-boom|
|`client_profile_plan_idx`|`plan`|B-boom|
|`client_profile_account_type_idx`|`accountType`|B-boom|
|`client_profile_username_idx`|`username`|B-boom|
|`client_profile_created_at_idx`|`createdAt`|B-boom|
|`client_profiles_username_unique`|`username`|Uniek|

### TypeScript-typen

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

## Tabel: `sessions`

Actieve gebruikerssessies voor NextAuth.

### Kolommen

|Kolom|DB-naam|Typ|Nulleerbaar|Standaard|Beperkingen|
|---|---|---|---|---|---|
|`sessionToken`|`sessionToken`|`text`|Nee| - |Primaire sleutel|
|`userId`|`userId`|`text`|Nee| - |FK -> `users.id` (CASCADE)|
|`expires`|`expires`|`timestamp`|Nee| - | - |

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

## RBAC-tabellen

### Tabel: `roles`

|Kolom|DB-naam|Typ|Nulleerbaar|Standaard|Beperkingen|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Nee| - |Primaire sleutel|
|`name`|`name`|`text`|Nee| - |Uniek|
|`description`|`description`|`text`|Ja| - | - |
|`isAdmin`|`is_admin`|`boolean`|Nee|`false`| - |
|`status`|`status`|`text (enum)`|Ja|`'active'`|`active`, `inactive`|
|`created_by`|`created_by`|`text`|Ja|`'system'`| - |
|`createdAt`|`created_at`|`timestamp`|Nee|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|Nee|`now()`| - |
|`deletedAt`|`deleted_at`|`timestamp`|Ja| - |Zacht verwijderen|

**Indexen:** `roles_status_idx`, `roles_is_admin_idx`, `roles_created_at_idx`

### Tabel: `permissions`

|Kolom|DB-naam|Typ|Nulleerbaar|Standaard|Beperkingen|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Nee|`crypto.randomUUID()`|Primaire sleutel|
|`key`|`key`|`text`|Nee| - |Uniek|
|`description`|`description`|`text`|Ja| - | - |
|`createdAt`|`created_at`|`timestamp`|Nee|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|Nee|`now()`| - |

### Tabel: `role_permissions` (knooppunt)

|Kolom|DB-naam|Typ|Nulleerbaar|Standaard|Beperkingen|
|---|---|---|---|---|---|
|`roleId`|`role_id`|`text`|Nee| - |FK -> `roles.id` (CASCADE)|
|`permissionId`|`permission_id`|`text`|Nee| - |FK -> `permissions.id` (CASCADE)|
|`createdAt`|`created_at`|`timestamp`|Nee|`now()`| - |

**Primaire sleutel:** Samengesteld `(roleId, permissionId)`
**Indexen:** `role_permissions_role_idx`, `role_permissions_permission_idx`, `role_permissions_created_at_idx`

### Tabel: `user_roles` (knooppunt)

|Kolom|DB-naam|Typ|Nulleerbaar|Standaard|Beperkingen|
|---|---|---|---|---|---|
|`userId`|`user_id`|`text`|Nee| - |FK -> `users.id` (CASCADE)|
|`roleId`|`role_id`|`text`|Nee| - |FK -> `roles.id` (CASCADE)|
|`createdAt`|`created_at`|`timestamp`|Nee|`now()`| - |

**Primaire sleutel:** Samengesteld `(userId, roleId)`
**Indexen:** `user_roles_user_idx`, `user_roles_role_idx`, `user_roles_created_at_idx`

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

## Token-tabellen

### Tabel: `verificationTokens`

|Kolom|Typ|Beperkingen|
|---|---|---|
|`identifier`|`text`|Composiet PK-onderdeel|
|`email`|`text`|NIET NUL|
|`token`|`text`|Composiet PK-onderdeel|
|`expires`|`timestamp`|NIET NUL|

**Primaire sleutel:** Samengesteld `(identifier, token)`

### Tabel: `passwordResetTokens`

|Kolom|Typ|Beperkingen|
|---|---|---|
|`id`|`text`|Primaire sleutel (`crypto.randomUUID()`)|
|`email`|`text`|NIET NUL|
|`token`|`text`|NIET NULL, uniek|
|`expires`|`timestamp`|NIET NUL|

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

## Voorbeelden van zoekopdrachten

### Gebruiker met profiel ophalen

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

### Controleer gebruikersrollen

```typescript
import { userRoles, roles } from '@/lib/db/schema';

const userRoleList = await db
    .select({ roleName: roles.name, isAdmin: roles.isAdmin })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));
```

### Registreer een activiteit

```typescript
import { activityLogs, ActivityType } from '@/lib/db/schema';

await db.insert(activityLogs).values({
    userId,
    action: ActivityType.SIGN_IN,
    ipAddress: request.headers.get('x-forwarded-for'),
});
```
