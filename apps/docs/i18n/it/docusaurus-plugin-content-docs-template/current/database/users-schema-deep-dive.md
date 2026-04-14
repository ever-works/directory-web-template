---
id: users-schema-deep-dive
title: "Approfondimento sullo schema degli utenti"
sidebar_label: "Schema degli utenti"
sidebar_position: 51
---

# Approfondimento sullo schema degli utenti

## Panoramica

Il modulo utenti è il livello di identità principale del modello Ever Works. Comprende la tabella di base `users` (compatibile con NextAuth), `client_profiles` per i dati del profilo esteso, le tabelle relative all'autenticazione (`accounts`, `sessions`, `authenticators`, `verificationTokens`, `passwordResetTokens`) e il sistema RBAC (`roles`, `permissions`, `rolePermissions`, `userRoles`).

**File sorgente:** `template/lib/db/schema.ts`
**File delle relazioni:** `template/lib/db/migrations/relations.ts`

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

## Tabella: `client_profiles`

Profilo esteso per gli utenti dell'applicazione (client). Memorizza i dettagli personali, le impostazioni dell'account, lo stato di moderazione e le preferenze di posizione.

### Colonne

|Colonna|Nome del DB|Digitare|Nullabile|Predefinito|Vincoli|
|---|---|---|---|---|---|
|`id`|`id`|`text`|No|`crypto.randomUUID()`|Chiave primaria|
|`userId`|`userId`|`text`|No| - |FK -> `users.id` (CASCATA)|
|`email`|`email`|`text`|No| - | - |
|`name`|`name`|`text`|No| - | - |
|`displayName`|`display_name`|`text`|Sì| - | - |
|`username`|`username`|`text`|Sì| - |Unico|
|`bio`|`bio`|`text`|Sì| - | - |
|`jobTitle`|`job_title`|`text`|Sì| - | - |
|`company`|`company`|`text`|Sì| - | - |
|`industry`|`industry`|`text`|Sì| - | - |
|`phone`|`phone`|`text`|Sì| - | - |
|`website`|`website`|`text`|Sì| - | - |
|`location`|`location`|`text`|Sì| - | - |
|`avatar`|`avatar`|`text`|Sì| - | - |
|`accountType`|`account_type`|`text (enum)`|Sì|`'individual'`|`individual`, `business`, `enterprise`|
|`status`|`status`|`text (enum)`|Sì|`'active'`|`active`, `inactive`, `suspended`, `banned`, `trial`|
|`plan`|`plan`|`text (enum)`|Sì|`'free'`|`free`, `standard`, `premium`|
|`timezone`|`timezone`|`text`|Sì|`'UTC'`| - |
|`language`|`language`|`text`|Sì|`'en'`| - |
|`country`|`country`|`text`|Sì| - | - |
|`currency`|`currency`|`text`|Sì|`'USD'`| - |
|`defaultLatitude`|`default_latitude`|`doublePrecision`|Sì| - |Ripiego "Vicino a me".|
|`defaultLongitude`|`default_longitude`|`doublePrecision`|Sì| - |Ripiego "Vicino a me".|
|`defaultCity`|`default_city`|`text`|Sì| - | - |
|`defaultCountry`|`default_country`|`text`|Sì| - | - |
|`locationPrivacy`|`location_privacy`|`text`|Sì|`'private'`| - |
|`twoFactorEnabled`|`two_factor_enabled`|`boolean`|Sì|`false`| - |
|`emailVerified`|`email_verified`|`boolean`|Sì|`false`| - |
|`totalSubmissions`|`total_submissions`|`integer`|Sì| `0` | - |
|`notes`|`notes`|`text`|Sì| - |Note dell'amministratore|
|`tags`|`tags`|`text`|Sì| - | - |
|`warningCount`|`warning_count`|`integer`|Sì| `0` |Moderazione|
|`suspendedAt`|`suspended_at`|`timestamp (tz)`|Sì| - |Moderazione|
|`bannedAt`|`banned_at`|`timestamp (tz)`|Sì| - |Moderazione|
|`createdAt`|`created_at`|`timestamp`|No|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|No|`now()`| - |

### Indici

|Nome|Colonne|Digitare|
|---|---|---|
|`client_profile_user_id_unique_idx`|`userId`|Unico|
|`client_profile_email_idx`|`email`|B-albero|
|`client_profile_status_idx`|`status`|B-albero|
|`client_profile_plan_idx`|`plan`|B-albero|
|`client_profile_account_type_idx`|`accountType`|B-albero|
|`client_profile_username_idx`|`username`|B-albero|
|`client_profile_created_at_idx`|`createdAt`|B-albero|
|`client_profiles_username_unique`|`username`|Unico|

### Tipi di TypeScript

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

## Tabella: `sessions`

Sessioni utente attive per NextAuth.

### Colonne

|Colonna|Nome del DB|Digitare|Nullabile|Predefinito|Vincoli|
|---|---|---|---|---|---|
|`sessionToken`|`sessionToken`|`text`|No| - |Chiave primaria|
|`userId`|`userId`|`text`|No| - |FK -> `users.id` (CASCATA)|
|`expires`|`expires`|`timestamp`|No| - | - |

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

## Tabelle RBAC

### Tabella: `roles`

|Colonna|Nome del DB|Digitare|Nullabile|Predefinito|Vincoli|
|---|---|---|---|---|---|
|`id`|`id`|`text`|No| - |Chiave primaria|
|`name`|`name`|`text`|No| - |Unico|
|`description`|`description`|`text`|Sì| - | - |
|`isAdmin`|`is_admin`|`boolean`|No|`false`| - |
|`status`|`status`|`text (enum)`|Sì|`'active'`|`active`, `inactive`|
|`created_by`|`created_by`|`text`|Sì|`'system'`| - |
|`createdAt`|`created_at`|`timestamp`|No|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|No|`now()`| - |
|`deletedAt`|`deleted_at`|`timestamp`|Sì| - |Eliminazione temporanea|

**Indici:** `roles_status_idx`, `roles_is_admin_idx`, `roles_created_at_idx`

### Tabella: `permissions`

|Colonna|Nome del DB|Digitare|Nullabile|Predefinito|Vincoli|
|---|---|---|---|---|---|
|`id`|`id`|`text`|No|`crypto.randomUUID()`|Chiave primaria|
|`key`|`key`|`text`|No| - |Unico|
|`description`|`description`|`text`|Sì| - | - |
|`createdAt`|`created_at`|`timestamp`|No|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|No|`now()`| - |

### Tabella: `role_permissions` (incrocio)

|Colonna|Nome del DB|Digitare|Nullabile|Predefinito|Vincoli|
|---|---|---|---|---|---|
|`roleId`|`role_id`|`text`|No| - |FK -> `roles.id` (CASCATA)|
|`permissionId`|`permission_id`|`text`|No| - |FK -> `permissions.id` (CASCATA)|
|`createdAt`|`created_at`|`timestamp`|No|`now()`| - |

**Chiave primaria:** Composita `(roleId, permissionId)`
**Indici:** `role_permissions_role_idx`, `role_permissions_permission_idx`, `role_permissions_created_at_idx`

### Tabella: `user_roles` (incrocio)

|Colonna|Nome del DB|Digitare|Nullabile|Predefinito|Vincoli|
|---|---|---|---|---|---|
|`userId`|`user_id`|`text`|No| - |FK -> `users.id` (CASCATA)|
|`roleId`|`role_id`|`text`|No| - |FK -> `roles.id` (CASCATA)|
|`createdAt`|`created_at`|`timestamp`|No|`now()`| - |

**Chiave primaria:** Composita `(userId, roleId)`
**Indici:** `user_roles_user_idx`, `user_roles_role_idx`, `user_roles_created_at_idx`

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

## Tabelle dei gettoni

### Tabella: `verificationTokens`

|Colonna|Digitare|Vincoli|
|---|---|---|
|`identifier`|`text`|Parte PK composita|
|`email`|`text`|NON NULLO|
|`token`|`text`|Parte PK composita|
|`expires`|`timestamp`|NON NULLO|

**Chiave primaria:** Composita `(identifier, token)`

### Tabella: `passwordResetTokens`

|Colonna|Digitare|Vincoli|
|---|---|---|
|`id`|`text`|Chiave primaria (`crypto.randomUUID()`)|
|`email`|`text`|NON NULLO|
|`token`|`text`|NON NULLO, Unico|
|`expires`|`timestamp`|NON NULLO|

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

## Esempi di query

### Ottieni utente con profilo

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

### Controlla i ruoli utente

```typescript
import { userRoles, roles } from '@/lib/db/schema';

const userRoleList = await db
    .select({ roleName: roles.name, isAdmin: roles.isAdmin })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));
```

### Registra un'attività

```typescript
import { activityLogs, ActivityType } from '@/lib/db/schema';

await db.insert(activityLogs).values({
    userId,
    action: ActivityType.SIGN_IN,
    ipAddress: request.headers.get('x-forwarded-for'),
});
```
