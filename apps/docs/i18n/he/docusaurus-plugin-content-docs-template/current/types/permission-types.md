---
id: permission-types
title: הגדרות סוג ההרשאה
sidebar_label: סוגי הרשאות
sidebar_position: 13
---

# הגדרות סוג ההרשאה

**מקור:** `lib/permissions/definitions.ts`, `lib/permissions/groups.ts`, `lib/db/schema.ts`

מערכת ההרשאות משתמשת בתבנית מחרוזת `resource:action` כדי להגדיר בקרת גישה פרטנית. הרשאות מוקצות לתפקידים, אשר מוקצים למשתמשים.

## סוג ליבה

### `Permission`

איחוד של כל מחרוזות ההרשאות התקפות, הנגזרות מהקבוע `PERMISSIONS`.

```typescript
type Permission =
  | 'items:read' | 'items:create' | 'items:update'
  | 'items:delete' | 'items:review' | 'items:approve' | 'items:reject'
  | 'categories:read' | 'categories:create'
  | 'categories:update' | 'categories:delete'
  | 'tags:read' | 'tags:create' | 'tags:update' | 'tags:delete'
  | 'roles:read' | 'roles:create' | 'roles:update' | 'roles:delete'
  | 'users:read' | 'users:create' | 'users:update'
  | 'users:delete' | 'users:assignRoles'
  | 'analytics:read' | 'analytics:export'
  | 'system:settings';
```

## מרשם ההרשאות

הקבוע `PERMISSIONS` מארגן הרשאות לפי משאב.

```typescript
const PERMISSIONS = {
  items: {
    read: 'items:read',
    create: 'items:create',
    update: 'items:update',
    delete: 'items:delete',
    review: 'items:review',
    approve: 'items:approve',
    reject: 'items:reject',
  },
  categories: {
    read: 'categories:read',
    create: 'categories:create',
    update: 'categories:update',
    delete: 'categories:delete',
  },
  tags: { read, create, update, delete },
  roles: { read, create, update, delete },
  users: { read, create, update, delete, assignRoles },
  analytics: { read, export },
  system: { settings },
} as const;
```

|משאב|פעולות|
|----------|---------|
|`items`|`read`, `create`, `update`, `delete`, `review`, `approve`, `reject`|
|`categories`|`read`, `create`, `update`, `delete`|
|`tags`|`read`, `create`, `update`, `delete`|
|`roles`|`read`, `create`, `update`, `delete`|
|`users`|`read`, `create`, `update`, `delete`, `assignRoles`|
|`analytics`|`read`, `export`|
|`system`|`settings`|

## ממשקים

### `PermissionGroup`

הרשאות הקשורות לקבוצות עבור ממשק הניהול.

```typescript
interface PermissionGroup {
  id: string;           // 'content' | 'users' | 'system'
  name: string;         // Display name
  description: string;  // What this group covers
  icon: string;         // Lucide icon name
  permissions: Permission[];
}
```

התבנית נשלחת עם שלוש קבוצות מובנות:

|קבוצה|הרשאות כלולות|
|-------|---------------------|
|`content`|כל ההרשאות `items`, `categories` ו-`tags`|
|`users`|כל ההרשאות `users` ו-`roles`|
|`system`|כל ההרשאות `analytics` ו-`system`|

## סכמת מסד נתונים

### `permissions` שולחן

```typescript
{
  id: text,          // UUID primary key
  key: text,         // Unique permission string (e.g., 'items:read')
  description: text,
  createdAt: timestamp,
  updatedAt: timestamp,
}
```

### `role_permissions` שולחן

טבלת צומת המקשרת בין תפקידים להרשאות שלהם.

```typescript
{
  roleId: text,       // FK -> roles.id
  permissionId: text, // FK -> permissions.id
  createdAt: timestamp,
}
```

## פונקציות שירות

|פונקציה|חזרה|תיאור|
|----------|--------|-------------|
|`getAllPermissions()`|`Permission[]`|מחזירה כל מחרוזת הרשאות|
|`getPermissionsForResource(resource)`|`Permission[]`|מחזיר הרשאות עבור משאב ספציפי|
|`isValidPermission(str)`|`boolean`|הקלד שומר בודק אם מחרוזת היא הרשאה חוקית|
|`getPermissionGroup(perm)`|`PermissionGroup`|מוצא לאיזו קבוצה שייכת הרשאה|
|`formatPermissionName(perm)`|`string`|פורמט `'items:create'` כ-`'Create Items'`|
|`formatPermissionDescription(perm)`|`string`|מייצר תיאור קריא אנושי|

## דוגמה לשימוש

```typescript
import { PERMISSIONS, isValidPermission } from '@/lib/permissions/definitions';
import { PERMISSION_GROUPS } from '@/lib/permissions/groups';

// Check a specific permission
if (userPermissions.includes(PERMISSIONS.items.approve)) {
  // Show approve button
}

// Validate a permission string from API input
if (isValidPermission(input)) {
  // Safe to assign
}
```

## סוגים קשורים

- [סוגי תפקידים](./role-types.md) -- הגדרות תפקידים והקצאות
- [Auth Types](./auth-types.md) -- הפעלת משתמש עם דגל `isAdmin`
