---
id: users-schema-deep-dive
title: "Users Schema Deep Dive"
sidebar_label: "סכימת משתמשים"
sidebar_position: 51
---

# Users Schema Deep Dive

## סקירה כללית

מודול המשתמשים הוא שכבת הזהות המרכזית של תבנית Ever Works. הוא מקיף את הטבלה הבסיסית `users` (תואמת ל-NextAuth), `client_profiles` עבור נתוני פרופיל מורחבים, טבלאות הקשורות לאימות (`accounts`, `sessions`, @@@TOK004@TOK004@@K@, @0@@TOK004@@K@, @0@ `passwordResetTokens`), ומערכת RBAC (`roles`, `permissions`, `rolePermissions`, `userRoles`).

**קובץ מקור:** `template/lib/db/schema.ts`
**קובץ יחסים:** `template/lib/db/migrations/relations.ts`

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

## טבלה: `client_profiles`

פרופיל מורחב עבור משתמשי אפליקציה (לקוחות). מאחסן פרטים אישיים, הגדרות חשבון, מצב ניהול והעדפות מיקום.

### עמודות

|עמודה|שם DB|הקלד|ניתן לבטל|ברירת מחדל|אילוצים|
|---|---|---|---|---|---|
|`id`|`id`|`text`|לא|`crypto.randomUUID()`|מפתח ראשי|
|`userId`|`userId`|`text`|לא| - |FK -> `users.id` (CASCADE)|
|`email`|`email`|`text`|לא| - | - |
|`name`|`name`|`text`|לא| - | - |
|`displayName`|`display_name`|`text`|כן| - | - |
|`username`|`username`|`text`|כן| - |ייחודי|
|`bio`|`bio`|`text`|כן| - | - |
|`jobTitle`|`job_title`|`text`|כן| - | - |
|`company`|`company`|`text`|כן| - | - |
|`industry`|`industry`|`text`|כן| - | - |
|`phone`|`phone`|`text`|כן| - | - |
|`website`|`website`|`text`|כן| - | - |
|`location`|`location`|`text`|כן| - | - |
|`avatar`|`avatar`|`text`|כן| - | - |
|`accountType`|`account_type`|`text (enum)`|כן|`'individual'`|`individual`, `business`, `enterprise`|
|`status`|`status`|`text (enum)`|כן|`'active'`|`active`, `inactive`, `suspended`, `banned`, `trial`|
|`plan`|`plan`|`text (enum)`|כן|`'free'`|`free`, `standard`, `premium`|
|`timezone`|`timezone`|`text`|כן|`'UTC'`| - |
|`language`|`language`|`text`|כן|`'en'`| - |
|`country`|`country`|`text`|כן| - | - |
|`currency`|`currency`|`text`|כן|`'USD'`| - |
|`defaultLatitude`|`default_latitude`|`doublePrecision`|כן| - |"קרוב אליי" חזרה|
|`defaultLongitude`|`default_longitude`|`doublePrecision`|כן| - |"קרוב אליי" חזרה|
|`defaultCity`|`default_city`|`text`|כן| - | - |
|`defaultCountry`|`default_country`|`text`|כן| - | - |
|`locationPrivacy`|`location_privacy`|`text`|כן|`'private'`| - |
|`twoFactorEnabled`|`two_factor_enabled`|`boolean`|כן|`false`| - |
|`emailVerified`|`email_verified`|`boolean`|כן|`false`| - |
|`totalSubmissions`|`total_submissions`|`integer`|כן| `0` | - |
|`notes`|`notes`|`text`|כן| - |הערות מנהל|
|`tags`|`tags`|`text`|כן| - | - |
|`warningCount`|`warning_count`|`integer`|כן| `0` |מתינות|
|`suspendedAt`|`suspended_at`|`timestamp (tz)`|כן| - |מתינות|
|`bannedAt`|`banned_at`|`timestamp (tz)`|כן| - |מתינות|
|`createdAt`|`created_at`|`timestamp`|לא|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|לא|`now()`| - |

### אינדקסים

|שם|עמודות|הקלד|
|---|---|---|
|`client_profile_user_id_unique_idx`|`userId`|ייחודי|
|`client_profile_email_idx`|`email`|B-עץ|
|`client_profile_status_idx`|`status`|B-עץ|
|`client_profile_plan_idx`|`plan`|B-עץ|
|`client_profile_account_type_idx`|`accountType`|B-עץ|
|`client_profile_username_idx`|`username`|B-עץ|
|`client_profile_created_at_idx`|`createdAt`|B-עץ|
|`client_profiles_username_unique`|`username`|ייחודי|

### סוגי TypeScript

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

## טבלה: `sessions`

הפעלות משתמש פעילות עבור NextAuth.

### עמודות

|עמודה|שם DB|הקלד|ניתן לבטל|ברירת מחדל|אילוצים|
|---|---|---|---|---|---|
|`sessionToken`|`sessionToken`|`text`|לא| - |מפתח ראשי|
|`userId`|`userId`|`text`|לא| - |FK -> `users.id` (CASCADE)|
|`expires`|`expires`|`timestamp`|לא| - | - |

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

## טבלאות RBAC

### טבלה: `roles`

|עמודה|שם DB|הקלד|ניתן לבטל|ברירת מחדל|אילוצים|
|---|---|---|---|---|---|
|`id`|`id`|`text`|לא| - |מפתח ראשי|
|`name`|`name`|`text`|לא| - |ייחודי|
|`description`|`description`|`text`|כן| - | - |
|`isAdmin`|`is_admin`|`boolean`|לא|`false`| - |
|`status`|`status`|`text (enum)`|כן|`'active'`|`active`, `inactive`|
|`created_by`|`created_by`|`text`|כן|`'system'`| - |
|`createdAt`|`created_at`|`timestamp`|לא|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|לא|`now()`| - |
|`deletedAt`|`deleted_at`|`timestamp`|כן| - |מחיקה רכה|

**אינדקסים:** `roles_status_idx`, `roles_is_admin_idx`, `roles_created_at_idx`

### טבלה: `permissions`

|עמודה|שם DB|הקלד|ניתן לבטל|ברירת מחדל|אילוצים|
|---|---|---|---|---|---|
|`id`|`id`|`text`|לא|`crypto.randomUUID()`|מפתח ראשי|
|`key`|`key`|`text`|לא| - |ייחודי|
|`description`|`description`|`text`|כן| - | - |
|`createdAt`|`created_at`|`timestamp`|לא|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|לא|`now()`| - |

### טבלה: `role_permissions` (צומת)

|עמודה|שם DB|הקלד|ניתן לבטל|ברירת מחדל|אילוצים|
|---|---|---|---|---|---|
|`roleId`|`role_id`|`text`|לא| - |FK -> `roles.id` (CASCADE)|
|`permissionId`|`permission_id`|`text`|לא| - |FK -> `permissions.id` (CASCADE)|
|`createdAt`|`created_at`|`timestamp`|לא|`now()`| - |

**מפתח ראשי:** מורכב `(roleId, permissionId)`
**אינדקסים:** `role_permissions_role_idx`, `role_permissions_permission_idx`, `role_permissions_created_at_idx`

### טבלה: `user_roles` (צומת)

|עמודה|שם DB|הקלד|ניתן לבטל|ברירת מחדל|אילוצים|
|---|---|---|---|---|---|
|`userId`|`user_id`|`text`|לא| - |FK -> `users.id` (CASCADE)|
|`roleId`|`role_id`|`text`|לא| - |FK -> `roles.id` (CASCADE)|
|`createdAt`|`created_at`|`timestamp`|לא|`now()`| - |

**מפתח ראשי:** מורכב `(userId, roleId)`
**אינדקסים:** `user_roles_user_idx`, `user_roles_role_idx`, `user_roles_created_at_idx`

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

## טבלאות אסימונים

### טבלה: `verificationTokens`

|עמודה|הקלד|אילוצים|
|---|---|---|
|`identifier`|`text`|חלק PK מרוכב|
|`email`|`text`|לא NULL|
|`token`|`text`|חלק PK מרוכב|
|`expires`|`timestamp`|לא NULL|

**מפתח ראשי:** מורכב `(identifier, token)`

### טבלה: `passwordResetTokens`

|עמודה|הקלד|אילוצים|
|---|---|---|
|`id`|`text`|מפתח ראשי (`crypto.randomUUID()`)|
|`email`|`text`|לא NULL|
|`token`|`text`|לא NULL, ייחודי|
|`expires`|`timestamp`|לא NULL|

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

## דוגמאות לשאילתות

### קבל משתמש עם פרופיל

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

### בדוק את תפקידי המשתמש

```typescript
import { userRoles, roles } from '@/lib/db/schema';

const userRoleList = await db
    .select({ roleName: roles.name, isAdmin: roles.isAdmin })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));
```

### רישום פעילות

```typescript
import { activityLogs, ActivityType } from '@/lib/db/schema';

await db.insert(activityLogs).values({
    userId,
    action: ActivityType.SIGN_IN,
    ipAddress: request.headers.get('x-forwarded-for'),
});
```
