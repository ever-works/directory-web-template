---
id: users-schema-deep-dive
title: "نظرة عميقة على مخطط المستخدمين"
sidebar_label: "مخطط المستخدمين"
sidebar_position: 51
---

# نظرة عميقة على مخطط المستخدمين

## نظرة عامة

وحدة المستخدمين هي طبقة الهوية الأساسية لقالب Ever Works. وهو يشمل الجدول `users` الأساسي (متوافق مع NextAuth)، و`client_profiles` لبيانات الملف الشخصي الموسعة، والجداول المرتبطة بالمصادقة (`accounts`، `sessions`، `authenticators`، `verificationTokens`، `passwordResetTokens`)، ونظام RBAC (`roles`، `permissions`، `rolePermissions`، `userRoles`).

**الملف المصدر:** `template/lib/db/schema.ts`
**ملف العلاقات:** `template/lib/db/migrations/relations.ts`

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

## الجدول: `client_profiles`

ملف تعريف موسع لمستخدمي التطبيق (العملاء). يخزن التفاصيل الشخصية وإعدادات الحساب وحالة الإشراف وتفضيلات الموقع.

### أعمدة

|العمود|اسم قاعدة البيانات|اكتب|لاغية|الافتراضي|القيود|
|---|---|---|---|---|---|
|`id`|`id`|`text`|لا|`crypto.randomUUID()`|المفتاح الأساسي|
|`userId`|`userId`|`text`|لا| - |FK -> `users.id` (CASCADE)|
|`email`|`email`|`text`|لا| - | - |
|`name`|`name`|`text`|لا| - | - |
|`displayName`|`display_name`|`text`|نعم| - | - |
|`username`|`username`|`text`|نعم| - |فريدة من نوعها|
|`bio`|`bio`|`text`|نعم| - | - |
|`jobTitle`|`job_title`|`text`|نعم| - | - |
|`company`|`company`|`text`|نعم| - | - |
|`industry`|`industry`|`text`|نعم| - | - |
|`phone`|`phone`|`text`|نعم| - | - |
|`website`|`website`|`text`|نعم| - | - |
|`location`|`location`|`text`|نعم| - | - |
|`avatar`|`avatar`|`text`|نعم| - | - |
|`accountType`|`account_type`|`text (enum)`|نعم|`'individual'`|`individual`، `business`، `enterprise`|
|`status`|`status`|`text (enum)`|نعم|`'active'`|`active`، `inactive`، `suspended`، `banned`، `trial`|
|`plan`|`plan`|`text (enum)`|نعم|`'free'`|`free`، `standard`، `premium`|
|`timezone`|`timezone`|`text`|نعم|`'UTC'`| - |
|`language`|`language`|`text`|نعم|`'en'`| - |
|`country`|`country`|`text`|نعم| - | - |
|`currency`|`currency`|`text`|نعم|`'USD'`| - |
|`defaultLatitude`|`default_latitude`|`doublePrecision`|نعم| - |خيار "بالقرب مني" الاحتياطي|
|`defaultLongitude`|`default_longitude`|`doublePrecision`|نعم| - |خيار "بالقرب مني" الاحتياطي|
|`defaultCity`|`default_city`|`text`|نعم| - | - |
|`defaultCountry`|`default_country`|`text`|نعم| - | - |
|`locationPrivacy`|`location_privacy`|`text`|نعم|`'private'`| - |
|`twoFactorEnabled`|`two_factor_enabled`|`boolean`|نعم|`false`| - |
|`emailVerified`|`email_verified`|`boolean`|نعم|`false`| - |
|`totalSubmissions`|`total_submissions`|`integer`|نعم| `0` | - |
|`notes`|`notes`|`text`|نعم| - |ملاحظات المشرف|
|`tags`|`tags`|`text`|نعم| - | - |
|`warningCount`|`warning_count`|`integer`|نعم| `0` |الاعتدال|
|`suspendedAt`|`suspended_at`|`timestamp (tz)`|نعم| - |الاعتدال|
|`bannedAt`|`banned_at`|`timestamp (tz)`|نعم| - |الاعتدال|
|`createdAt`|`created_at`|`timestamp`|لا|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|لا|`now()`| - |

### الفهارس

|الاسم|أعمدة|اكتب|
|---|---|---|
|`client_profile_user_id_unique_idx`|`userId`|فريدة من نوعها|
|`client_profile_email_idx`|`email`|شجرة ب|
|`client_profile_status_idx`|`status`|شجرة ب|
|`client_profile_plan_idx`|`plan`|شجرة ب|
|`client_profile_account_type_idx`|`accountType`|شجرة ب|
|`client_profile_username_idx`|`username`|شجرة ب|
|`client_profile_created_at_idx`|`createdAt`|شجرة ب|
|`client_profiles_username_unique`|`username`|فريدة من نوعها|

### أنواع تايب سكريبت

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

## الجدول: `sessions`

جلسات المستخدم النشطة لـ NextAuth.

### أعمدة

|العمود|اسم قاعدة البيانات|اكتب|لاغية|الافتراضي|القيود|
|---|---|---|---|---|---|
|`sessionToken`|`sessionToken`|`text`|لا| - |المفتاح الأساسي|
|`userId`|`userId`|`text`|لا| - |FK -> `users.id` (CASCADE)|
|`expires`|`expires`|`timestamp`|لا| - | - |

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

## جداول RBAC

### الجدول: `roles`

|العمود|اسم قاعدة البيانات|اكتب|لاغية|الافتراضي|القيود|
|---|---|---|---|---|---|
|`id`|`id`|`text`|لا| - |المفتاح الأساسي|
|`name`|`name`|`text`|لا| - |فريدة من نوعها|
|`description`|`description`|`text`|نعم| - | - |
|`isAdmin`|`is_admin`|`boolean`|لا|`false`| - |
|`status`|`status`|`text (enum)`|نعم|`'active'`|`active`، `inactive`|
|`created_by`|`created_by`|`text`|نعم|`'system'`| - |
|`createdAt`|`created_at`|`timestamp`|لا|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|لا|`now()`| - |
|`deletedAt`|`deleted_at`|`timestamp`|نعم| - |حذف ناعم|

**الفهارس:** `roles_status_idx`، `roles_is_admin_idx`، `roles_created_at_idx`

### الجدول: `permissions`

|العمود|اسم قاعدة البيانات|اكتب|لاغية|الافتراضي|القيود|
|---|---|---|---|---|---|
|`id`|`id`|`text`|لا|`crypto.randomUUID()`|المفتاح الأساسي|
|`key`|`key`|`text`|لا| - |فريدة من نوعها|
|`description`|`description`|`text`|نعم| - | - |
|`createdAt`|`created_at`|`timestamp`|لا|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|لا|`now()`| - |

### الجدول: `role_permissions` (الوصلة)

|العمود|اسم قاعدة البيانات|اكتب|لاغية|الافتراضي|القيود|
|---|---|---|---|---|---|
|`roleId`|`role_id`|`text`|لا| - |FK -> `roles.id` (CASCADE)|
|`permissionId`|`permission_id`|`text`|لا| - |FK -> `permissions.id` (CASCADE)|
|`createdAt`|`created_at`|`timestamp`|لا|`now()`| - |

**المفتاح الأساسي:** مركب `(roleId, permissionId)`
**الفهارس:** `role_permissions_role_idx`، `role_permissions_permission_idx`، `role_permissions_created_at_idx`

### الجدول: `user_roles` (الوصلة)

|العمود|اسم قاعدة البيانات|اكتب|لاغية|الافتراضي|القيود|
|---|---|---|---|---|---|
|`userId`|`user_id`|`text`|لا| - |FK -> `users.id` (CASCADE)|
|`roleId`|`role_id`|`text`|لا| - |FK -> `roles.id` (CASCADE)|
|`createdAt`|`created_at`|`timestamp`|لا|`now()`| - |

**المفتاح الأساسي:** مركب `(userId, roleId)`
**الفهارس:** `user_roles_user_idx`، `user_roles_role_idx`، `user_roles_created_at_idx`

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

## جداول الرموز

### الجدول: `verificationTokens`

|العمود|اكتب|القيود|
|---|---|---|
|`identifier`|`text`|جزء PK مركب|
|`email`|`text`|ليست فارغة|
|`token`|`text`|جزء PK مركب|
|`expires`|`timestamp`|ليست فارغة|

**المفتاح الأساسي:** مركب `(identifier, token)`

### الجدول: `passwordResetTokens`

|العمود|اكتب|القيود|
|---|---|---|
|`id`|`text`|المفتاح الأساسي (`crypto.randomUUID()`)|
|`email`|`text`|ليست فارغة|
|`token`|`text`|ليست فارغة، فريدة من نوعها|
|`expires`|`timestamp`|ليست فارغة|

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

## أمثلة الاستعلام

### احصل على المستخدم مع الملف الشخصي

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

### التحقق من أدوار المستخدم

```typescript
import { userRoles, roles } from '@/lib/db/schema';

const userRoleList = await db
    .select({ roleName: roles.name, isAdmin: roles.isAdmin })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));
```

### قم بتسجيل نشاط ما

```typescript
import { activityLogs, ActivityType } from '@/lib/db/schema';

await db.insert(activityLogs).values({
    userId,
    action: ActivityType.SIGN_IN,
    ipAddress: request.headers.get('x-forwarded-for'),
});
```
