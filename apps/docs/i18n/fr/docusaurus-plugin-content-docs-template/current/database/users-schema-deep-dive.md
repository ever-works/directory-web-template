---
id: users-schema-deep-dive
title: "Analyse approfondie du schéma des utilisateurs"
sidebar_label: "Schéma des utilisateurs"
sidebar_position: 51
---

# Analyse approfondie du schéma des utilisateurs

## Aperçu

Le module utilisateurs est la couche d'identité principale du modèle Ever Works. Il englobe la table de base `users` (compatible NextAuth), `client_profiles` pour les données de profil étendues, les tables liées à l'authentification (`accounts`, `sessions`, `authenticators`, `verificationTokens`, `passwordResetTokens`) et le système RBAC. (`roles`, `permissions`, `rolePermissions`, `userRoles`).

**Fichier source :** `template/lib/db/schema.ts`
**Fichier relationnel :** `template/lib/db/migrations/relations.ts`

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

## Tableau : `client_profiles`

Profil étendu pour les utilisateurs de l'application (clients). Stocke les informations personnelles, les paramètres du compte, l’état de modération et les préférences de localisation.

### Colonnes

|Colonne|Nom de la base de données|Tapez|Nullable|Par défaut|Contraintes|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Non|`crypto.randomUUID()`|Clé primaire|
|`userId`|`userId`|`text`|Non| - |FK -> `users.id` (CASCADE)|
|`email`|`email`|`text`|Non| - | - |
|`name`|`name`|`text`|Non| - | - |
|`displayName`|`display_name`|`text`|Oui| - | - |
|`username`|`username`|`text`|Oui| - |Unique|
|`bio`|`bio`|`text`|Oui| - | - |
|`jobTitle`|`job_title`|`text`|Oui| - | - |
|`company`|`company`|`text`|Oui| - | - |
|`industry`|`industry`|`text`|Oui| - | - |
|`phone`|`phone`|`text`|Oui| - | - |
|`website`|`website`|`text`|Oui| - | - |
|`location`|`location`|`text`|Oui| - | - |
|`avatar`|`avatar`|`text`|Oui| - | - |
|`accountType`|`account_type`|`text (enum)`|Oui|`'individual'`|`individual`, `business`, `enterprise`|
|`status`|`status`|`text (enum)`|Oui|`'active'`|`active`, `inactive`, `suspended`, `banned`, `trial`|
|`plan`|`plan`|`text (enum)`|Oui|`'free'`|`free`, `standard`, `premium`|
|`timezone`|`timezone`|`text`|Oui|`'UTC'`| - |
|`language`|`language`|`text`|Oui|`'en'`| - |
|`country`|`country`|`text`|Oui| - | - |
|`currency`|`currency`|`text`|Oui|`'USD'`| - |
|`defaultLatitude`|`default_latitude`|`doublePrecision`|Oui| - |Solution de secours « À proximité de moi »|
|`defaultLongitude`|`default_longitude`|`doublePrecision`|Oui| - |Solution de secours « À proximité de moi »|
|`defaultCity`|`default_city`|`text`|Oui| - | - |
|`defaultCountry`|`default_country`|`text`|Oui| - | - |
|`locationPrivacy`|`location_privacy`|`text`|Oui|`'private'`| - |
|`twoFactorEnabled`|`two_factor_enabled`|`boolean`|Oui|`false`| - |
|`emailVerified`|`email_verified`|`boolean`|Oui|`false`| - |
|`totalSubmissions`|`total_submissions`|`integer`|Oui| `0` | - |
|`notes`|`notes`|`text`|Oui| - |Notes d'administration|
|`tags`|`tags`|`text`|Oui| - | - |
|`warningCount`|`warning_count`|`integer`|Oui| `0` |Modération|
|`suspendedAt`|`suspended_at`|`timestamp (tz)`|Oui| - |Modération|
|`bannedAt`|`banned_at`|`timestamp (tz)`|Oui| - |Modération|
|`createdAt`|`created_at`|`timestamp`|Non|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|Non|`now()`| - |

### Index

|Nom|Colonnes|Tapez|
|---|---|---|
|`client_profile_user_id_unique_idx`|`userId`|Unique|
|`client_profile_email_idx`|`email`|Arbre B|
|`client_profile_status_idx`|`status`|Arbre B|
|`client_profile_plan_idx`|`plan`|Arbre B|
|`client_profile_account_type_idx`|`accountType`|Arbre B|
|`client_profile_username_idx`|`username`|Arbre B|
|`client_profile_created_at_idx`|`createdAt`|Arbre B|
|`client_profiles_username_unique`|`username`|Unique|

### Types de scripts dactylographiés

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

## Tableau : `sessions`

Sessions utilisateur actives pour NextAuth.

### Colonnes

|Colonne|Nom de la base de données|Tapez|Nullable|Par défaut|Contraintes|
|---|---|---|---|---|---|
|`sessionToken`|`sessionToken`|`text`|Non| - |Clé primaire|
|`userId`|`userId`|`text`|Non| - |FK -> `users.id` (CASCADE)|
|`expires`|`expires`|`timestamp`|Non| - | - |

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

## Tableaux RBAC

### Tableau : `roles`

|Colonne|Nom de la base de données|Tapez|Nullable|Par défaut|Contraintes|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Non| - |Clé primaire|
|`name`|`name`|`text`|Non| - |Unique|
|`description`|`description`|`text`|Oui| - | - |
|`isAdmin`|`is_admin`|`boolean`|Non|`false`| - |
|`status`|`status`|`text (enum)`|Oui|`'active'`|`active`, `inactive`|
|`created_by`|`created_by`|`text`|Oui|`'system'`| - |
|`createdAt`|`created_at`|`timestamp`|Non|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|Non|`now()`| - |
|`deletedAt`|`deleted_at`|`timestamp`|Oui| - |Suppression logicielle|

**Index :** `roles_status_idx`, `roles_is_admin_idx`, `roles_created_at_idx`

### Tableau : `permissions`

|Colonne|Nom de la base de données|Tapez|Nullable|Par défaut|Contraintes|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Non|`crypto.randomUUID()`|Clé primaire|
|`key`|`key`|`text`|Non| - |Unique|
|`description`|`description`|`text`|Oui| - | - |
|`createdAt`|`created_at`|`timestamp`|Non|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|Non|`now()`| - |

### Tableau : `role_permissions` (jonction)

|Colonne|Nom de la base de données|Tapez|Nullable|Par défaut|Contraintes|
|---|---|---|---|---|---|
|`roleId`|`role_id`|`text`|Non| - |FK -> `roles.id` (CASCADE)|
|`permissionId`|`permission_id`|`text`|Non| - |FK -> `permissions.id` (CASCADE)|
|`createdAt`|`created_at`|`timestamp`|Non|`now()`| - |

**Clé primaire :** Composite `(roleId, permissionId)`
**Index :** `role_permissions_role_idx`, `role_permissions_permission_idx`, `role_permissions_created_at_idx`

### Tableau : `user_roles` (jonction)

|Colonne|Nom de la base de données|Tapez|Nullable|Par défaut|Contraintes|
|---|---|---|---|---|---|
|`userId`|`user_id`|`text`|Non| - |FK -> `users.id` (CASCADE)|
|`roleId`|`role_id`|`text`|Non| - |FK -> `roles.id` (CASCADE)|
|`createdAt`|`created_at`|`timestamp`|Non|`now()`| - |

**Clé primaire :** Composite `(userId, roleId)`
**Index :** `user_roles_user_idx`, `user_roles_role_idx`, `user_roles_created_at_idx`

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

## Tableaux de jetons

### Tableau : `verificationTokens`

|Colonne|Tapez|Contraintes|
|---|---|---|
|`identifier`|`text`|Pièce composite PK|
|`email`|`text`|PAS NUL|
|`token`|`text`|Pièce composite PK|
|`expires`|`timestamp`|PAS NUL|

**Clé primaire :** Composite `(identifier, token)`

### Tableau : `passwordResetTokens`

|Colonne|Tapez|Contraintes|
|---|---|---|
|`id`|`text`|Clé primaire (`crypto.randomUUID()`)|
|`email`|`text`|PAS NUL|
|`token`|`text`|NON NULL, Unique|
|`expires`|`timestamp`|PAS NUL|

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

## Exemples de requête

### Obtenir un utilisateur avec un profil

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

### Vérifier les rôles des utilisateurs

```typescript
import { userRoles, roles } from '@/lib/db/schema';

const userRoleList = await db
    .select({ roleName: roles.name, isAdmin: roles.isAdmin })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));
```

### Enregistrer une activité

```typescript
import { activityLogs, ActivityType } from '@/lib/db/schema';

await db.insert(activityLogs).values({
    userId,
    action: ActivityType.SIGN_IN,
    ipAddress: request.headers.get('x-forwarded-for'),
});
```
