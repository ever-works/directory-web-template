---
id: users-schema-deep-dive
title: "用户架构深入探究"
sidebar_label: "用户架构"
sidebar_position: 51
---

# 用户架构深入探究

## 概述

用户模块是 Ever Works 模板的核心身份层。它包含基本 `users` 表（兼容 NextAuth）、用于扩展配置文件数据的 `client_profiles`、身份验证相关表（`accounts`、`sessions`、`authenticators`、`verificationTokens`、`passwordResetTokens`）以及 RBAC 系统（`roles`、`permissions`、`rolePermissions`、`userRoles`）。

**源文件：** `template/lib/db/schema.ts`
**关系文件：** `template/lib/db/migrations/relations.ts`

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

## 表：`client_profiles`

应用程序用户（客户端）的扩展配置文件。存储个人详细信息、帐户设置、审核状态和位置首选项。

### 专栏

|专栏|数据库名称|类型|可空|默认|约束条件|
|---|---|---|---|---|---|
|`id`|`id`|`text`|否|`crypto.randomUUID()`|主键|
|`userId`|`userId`|`text`|否| - |FK -> `users.id`（级联）|
|`email`|`email`|`text`|否| - | - |
|`name`|`name`|`text`|否| - | - |
|`displayName`|`display_name`|`text`|是的| - | - |
|`username`|`username`|`text`|是的| - |独特|
|`bio`|`bio`|`text`|是的| - | - |
|`jobTitle`|`job_title`|`text`|是的| - | - |
|`company`|`company`|`text`|是的| - | - |
|`industry`|`industry`|`text`|是的| - | - |
|`phone`|`phone`|`text`|是的| - | - |
|`website`|`website`|`text`|是的| - | - |
|`location`|`location`|`text`|是的| - | - |
|`avatar`|`avatar`|`text`|是的| - | - |
|`accountType`|`account_type`|`text (enum)`|是的|`'individual'`|`individual`、`business`、`enterprise`|
|`status`|`status`|`text (enum)`|是的|`'active'`|`active`、`inactive`、`suspended`、`banned`、`trial`|
|`plan`|`plan`|`text (enum)`|是的|`'free'`|`free`、`standard`、`premium`|
|`timezone`|`timezone`|`text`|是的|`'UTC'`| - |
|`language`|`language`|`text`|是的|`'en'`| - |
|`country`|`country`|`text`|是的| - | - |
|`currency`|`currency`|`text`|是的|`'USD'`| - |
|`defaultLatitude`|`default_latitude`|`doublePrecision`|是的| - |“靠近我”后备|
|`defaultLongitude`|`default_longitude`|`doublePrecision`|是的| - |“靠近我”后备|
|`defaultCity`|`default_city`|`text`|是的| - | - |
|`defaultCountry`|`default_country`|`text`|是的| - | - |
|`locationPrivacy`|`location_privacy`|`text`|是的|`'private'`| - |
|`twoFactorEnabled`|`two_factor_enabled`|`boolean`|是的|`false`| - |
|`emailVerified`|`email_verified`|`boolean`|是的|`false`| - |
|`totalSubmissions`|`total_submissions`|`integer`|是的| `0` | - |
|`notes`|`notes`|`text`|是的| - |管理员备注|
|`tags`|`tags`|`text`|是的| - | - |
|`warningCount`|`warning_count`|`integer`|是的| `0` |适度|
|`suspendedAt`|`suspended_at`|`timestamp (tz)`|是的| - |适度|
|`bannedAt`|`banned_at`|`timestamp (tz)`|是的| - |适度|
|`createdAt`|`created_at`|`timestamp`|否|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|否|`now()`| - |

### 索引

|名称|专栏|类型|
|---|---|---|
|`client_profile_user_id_unique_idx`|`userId`|独特|
|`client_profile_email_idx`|`email`|B树|
|`client_profile_status_idx`|`status`|B树|
|`client_profile_plan_idx`|`plan`|B树|
|`client_profile_account_type_idx`|`accountType`|B树|
|`client_profile_username_idx`|`username`|B树|
|`client_profile_created_at_idx`|`createdAt`|B树|
|`client_profiles_username_unique`|`username`|独特|

### TypeScript 类型

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

## 表：`sessions`

NextAuth 的活动用户会话。

### 专栏

|专栏|数据库名称|类型|可空|默认|约束条件|
|---|---|---|---|---|---|
|`sessionToken`|`sessionToken`|`text`|否| - |主键|
|`userId`|`userId`|`text`|否| - |FK -> `users.id`（级联）|
|`expires`|`expires`|`timestamp`|否| - | - |

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

## RBAC 表

### 表：`roles`

|专栏|数据库名称|类型|可空|默认|约束条件|
|---|---|---|---|---|---|
|`id`|`id`|`text`|否| - |主键|
|`name`|`name`|`text`|否| - |独特|
|`description`|`description`|`text`|是的| - | - |
|`isAdmin`|`is_admin`|`boolean`|否|`false`| - |
|`status`|`status`|`text (enum)`|是的|`'active'`|`active`、`inactive`|
|`created_by`|`created_by`|`text`|是的|`'system'`| - |
|`createdAt`|`created_at`|`timestamp`|否|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|否|`now()`| - |
|`deletedAt`|`deleted_at`|`timestamp`|是的| - |软删除|

**索引：** `roles_status_idx`、`roles_is_admin_idx`、`roles_created_at_idx`

### 表：`permissions`

|专栏|数据库名称|类型|可空|默认|约束条件|
|---|---|---|---|---|---|
|`id`|`id`|`text`|否|`crypto.randomUUID()`|主键|
|`key`|`key`|`text`|否| - |独特|
|`description`|`description`|`text`|是的| - | - |
|`createdAt`|`created_at`|`timestamp`|否|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|否|`now()`| - |

### 表：`role_permissions`（连接点）

|专栏|数据库名称|类型|可空|默认|约束条件|
|---|---|---|---|---|---|
|`roleId`|`role_id`|`text`|否| - |FK -> `roles.id`（级联）|
|`permissionId`|`permission_id`|`text`|否| - |FK -> `permissions.id`（级联）|
|`createdAt`|`created_at`|`timestamp`|否|`now()`| - |

**主键：** 复合`(roleId, permissionId)`
**索引：** `role_permissions_role_idx`、`role_permissions_permission_idx`、`role_permissions_created_at_idx`

### 表：`user_roles`（连接点）

|专栏|数据库名称|类型|可空|默认|约束条件|
|---|---|---|---|---|---|
|`userId`|`user_id`|`text`|否| - |FK -> `users.id`（级联）|
|`roleId`|`role_id`|`text`|否| - |FK -> `roles.id`（级联）|
|`createdAt`|`created_at`|`timestamp`|否|`now()`| - |

**主键：** 复合`(userId, roleId)`
**索引：** `user_roles_user_idx`、`user_roles_role_idx`、`user_roles_created_at_idx`

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

## 代币表

### 表：`verificationTokens`

|专栏|类型|约束条件|
|---|---|---|
|`identifier`|`text`|综合PK部分|
|`email`|`text`|非空|
|`token`|`text`|综合PK部分|
|`expires`|`timestamp`|非空|

**主键：** 复合`(identifier, token)`

### 表：`passwordResetTokens`

|专栏|类型|约束条件|
|---|---|---|
|`id`|`text`|主键 (`crypto.randomUUID()`)|
|`email`|`text`|非空|
|`token`|`text`|非空，唯一|
|`expires`|`timestamp`|非空|

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

## 查询示例

### 获取具有个人资料的用户

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

### 检查用户角色

```typescript
import { userRoles, roles } from '@/lib/db/schema';

const userRoleList = await db
    .select({ roleName: roles.name, isAdmin: roles.isAdmin })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));
```

### 记录活动

```typescript
import { activityLogs, ActivityType } from '@/lib/db/schema';

await db.insert(activityLogs).values({
    userId,
    action: ActivityType.SIGN_IN,
    ipAddress: request.headers.get('x-forwarded-for'),
});
```
