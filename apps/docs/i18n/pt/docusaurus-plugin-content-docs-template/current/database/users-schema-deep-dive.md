---
id: users-schema-deep-dive
title: "Aprofundamento do esquema de usuários"
sidebar_label: "Esquema de usuários"
sidebar_position: 51
---

# Aprofundamento do esquema de usuários

## Visão geral

O módulo de usuários é a camada de identidade central do modelo Ever Works. Abrange a tabela base `users` (compatível com NextAuth), `client_profiles` para dados de perfil estendidos, tabelas relacionadas à autenticação (`accounts`, `sessions`, `authenticators`, `verificationTokens`, `passwordResetTokens`) e o sistema RBAC (`roles`, `permissions`, `rolePermissions`, `userRoles`).

**Arquivo fonte:** `template/lib/db/schema.ts`
**Arquivo de relações:** `template/lib/db/migrations/relations.ts`

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

Perfil estendido para usuários do aplicativo (clientes). Armazena detalhes pessoais, configurações da conta, estado de moderação e preferências de localização.

### Colunas

|Coluna|Nome do banco de dados|Tipo|Anulável|Padrão|Restrições|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Não|`crypto.randomUUID()`|Chave Primária|
|`userId`|`userId`|`text`|Não| - |FK -> `users.id` (CASCADA)|
|`email`|`email`|`text`|Não| - | - |
|`name`|`name`|`text`|Não| - | - |
|`displayName`|`display_name`|`text`|Sim| - | - |
|`username`|`username`|`text`|Sim| - |Único|
|`bio`|`bio`|`text`|Sim| - | - |
|`jobTitle`|`job_title`|`text`|Sim| - | - |
|`company`|`company`|`text`|Sim| - | - |
|`industry`|`industry`|`text`|Sim| - | - |
|`phone`|`phone`|`text`|Sim| - | - |
|`website`|`website`|`text`|Sim| - | - |
|`location`|`location`|`text`|Sim| - | - |
|`avatar`|`avatar`|`text`|Sim| - | - |
|`accountType`|`account_type`|`text (enum)`|Sim|`'individual'`|`individual`, `business`, `enterprise`|
|`status`|`status`|`text (enum)`|Sim|`'active'`|`active`, `inactive`, `suspended`, `banned`, `trial`|
|`plan`|`plan`|`text (enum)`|Sim|`'free'`|`free`, `standard`, `premium`|
|`timezone`|`timezone`|`text`|Sim|`'UTC'`| - |
|`language`|`language`|`text`|Sim|`'en'`| - |
|`country`|`country`|`text`|Sim| - | - |
|`currency`|`currency`|`text`|Sim|`'USD'`| - |
|`defaultLatitude`|`default_latitude`|`doublePrecision`|Sim| - |Alternativa "Perto de Mim"|
|`defaultLongitude`|`default_longitude`|`doublePrecision`|Sim| - |Alternativa "Perto de Mim"|
|`defaultCity`|`default_city`|`text`|Sim| - | - |
|`defaultCountry`|`default_country`|`text`|Sim| - | - |
|`locationPrivacy`|`location_privacy`|`text`|Sim|`'private'`| - |
|`twoFactorEnabled`|`two_factor_enabled`|`boolean`|Sim|`false`| - |
|`emailVerified`|`email_verified`|`boolean`|Sim|`false`| - |
|`totalSubmissions`|`total_submissions`|`integer`|Sim| `0` | - |
|`notes`|`notes`|`text`|Sim| - |Notas de administração|
|`tags`|`tags`|`text`|Sim| - | - |
|`warningCount`|`warning_count`|`integer`|Sim| `0` |Moderação|
|`suspendedAt`|`suspended_at`|`timestamp (tz)`|Sim| - |Moderação|
|`bannedAt`|`banned_at`|`timestamp (tz)`|Sim| - |Moderação|
|`createdAt`|`created_at`|`timestamp`|Não|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|Não|`now()`| - |

### Índices

|Nome|Colunas|Tipo|
|---|---|---|
|`client_profile_user_id_unique_idx`|`userId`|Único|
|`client_profile_email_idx`|`email`|Árvore B|
|`client_profile_status_idx`|`status`|Árvore B|
|`client_profile_plan_idx`|`plan`|Árvore B|
|`client_profile_account_type_idx`|`accountType`|Árvore B|
|`client_profile_username_idx`|`username`|Árvore B|
|`client_profile_created_at_idx`|`createdAt`|Árvore B|
|`client_profiles_username_unique`|`username`|Único|

### Tipos de TypeScript

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

Sessões de usuário ativas para NextAuth.

### Colunas

|Coluna|Nome do banco de dados|Tipo|Anulável|Padrão|Restrições|
|---|---|---|---|---|---|
|`sessionToken`|`sessionToken`|`text`|Não| - |Chave Primária|
|`userId`|`userId`|`text`|Não| - |FK -> `users.id` (CASCADA)|
|`expires`|`expires`|`timestamp`|Não| - | - |

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

## Tabelas RBAC

### Tabela: `roles`

|Coluna|Nome do banco de dados|Tipo|Anulável|Padrão|Restrições|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Não| - |Chave Primária|
|`name`|`name`|`text`|Não| - |Único|
|`description`|`description`|`text`|Sim| - | - |
|`isAdmin`|`is_admin`|`boolean`|Não|`false`| - |
|`status`|`status`|`text (enum)`|Sim|`'active'`|`active`, `inactive`|
|`created_by`|`created_by`|`text`|Sim|`'system'`| - |
|`createdAt`|`created_at`|`timestamp`|Não|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|Não|`now()`| - |
|`deletedAt`|`deleted_at`|`timestamp`|Sim| - |Exclusão suave|

**Índices:** `roles_status_idx`, `roles_is_admin_idx`, `roles_created_at_idx`

### Tabela: `permissions`

|Coluna|Nome do banco de dados|Tipo|Anulável|Padrão|Restrições|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Não|`crypto.randomUUID()`|Chave Primária|
|`key`|`key`|`text`|Não| - |Único|
|`description`|`description`|`text`|Sim| - | - |
|`createdAt`|`created_at`|`timestamp`|Não|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|Não|`now()`| - |

### Tabela: `role_permissions` (junção)

|Coluna|Nome do banco de dados|Tipo|Anulável|Padrão|Restrições|
|---|---|---|---|---|---|
|`roleId`|`role_id`|`text`|Não| - |FK -> `roles.id` (CASCADA)|
|`permissionId`|`permission_id`|`text`|Não| - |FK -> `permissions.id` (CASCADA)|
|`createdAt`|`created_at`|`timestamp`|Não|`now()`| - |

**Chave primária:** Composto `(roleId, permissionId)`
**Índices:** `role_permissions_role_idx`, `role_permissions_permission_idx`, `role_permissions_created_at_idx`

### Tabela: `user_roles` (junção)

|Coluna|Nome do banco de dados|Tipo|Anulável|Padrão|Restrições|
|---|---|---|---|---|---|
|`userId`|`user_id`|`text`|Não| - |FK -> `users.id` (CASCADA)|
|`roleId`|`role_id`|`text`|Não| - |FK -> `roles.id` (CASCADA)|
|`createdAt`|`created_at`|`timestamp`|Não|`now()`| - |

**Chave primária:** Composto `(userId, roleId)`
**Índices:** `user_roles_user_idx`, `user_roles_role_idx`, `user_roles_created_at_idx`

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

## Tabelas de tokens

### Tabela: `verificationTokens`

|Coluna|Tipo|Restrições|
|---|---|---|
|`identifier`|`text`|Parte PK composta|
|`email`|`text`|NÃO NULO|
|`token`|`text`|Parte PK composta|
|`expires`|`timestamp`|NÃO NULO|

**Chave primária:** Composto `(identifier, token)`

### Tabela: `passwordResetTokens`

|Coluna|Tipo|Restrições|
|---|---|---|
|`id`|`text`|Chave primária (`crypto.randomUUID()`)|
|`email`|`text`|NÃO NULO|
|`token`|`text`|NÃO NULO, Único|
|`expires`|`timestamp`|NÃO NULO|

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

## Exemplos de consulta

### Obter usuário com perfil

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

### Verifique as funções do usuário

```typescript
import { userRoles, roles } from '@/lib/db/schema';

const userRoleList = await db
    .select({ roleName: roles.name, isAdmin: roles.isAdmin })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));
```

### Registrar uma atividade

```typescript
import { activityLogs, ActivityType } from '@/lib/db/schema';

await db.insert(activityLogs).values({
    userId,
    action: ActivityType.SIGN_IN,
    ipAddress: request.headers.get('x-forwarded-for'),
});
```
