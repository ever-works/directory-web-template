---
id: role-types
title: הגדרות סוג מערכת תפקידים
sidebar_label: סוגי תפקידים
sidebar_position: 19
---

# הגדרות סוג מערכת תפקידים

**מקור:** `lib/types/role.ts`, `lib/permissions/definitions.ts`, `lib/db/schema.ts`

תפקידים מקבצים הרשאות יחד ומוקצים למשתמשים. המערכת תומכת בתפקידים מותאמים אישית עם מטריצות הרשאות מפורטות.

## ממשקים

### `RoleData`

מבנה נתוני התפקיד הראשי המוחזר על ידי ה-API.

```typescript
interface RoleData {
  id: string;               // Slug-style identifier (e.g., 'content-manager')
  name: string;             // Display name
  description: string;      // What this role is for
  status: RoleStatus;       // 'active' | 'inactive'
  isAdmin: boolean;         // Has full admin access
  permissions: Permission[]; // Array of permission strings
  created_at: string;       // ISO 8601 timestamp
  updated_at: string;
  created_by: string;       // User ID or 'system'
}
```

|שדה|תיאור|
|-------|-------------|
|`id`|שבלול באותיות קטנות, 3-50 תווים, תבנית: `^[a-z0-9-]+$`|
|`name`|שם קריא לאדם, 3-100 תווים|
|`isAdmin`|כאשר `true`, התפקיד מעניק גישה מלאה למערכת ללא קשר להרשאות בודדות|
|`permissions`|מערך של מחרוזות `resource:action` ממרשם ההרשאות|

### `RoleWithCount`

נתוני תפקיד מורחבים עם ספירת הקצאת משתמשים.

```typescript
interface RoleWithCount extends RoleData {
  userCount?: number;  // Number of users with this role
}
```

### `CreateRoleRequest`

מטען ליצירת תפקיד חדש.

```typescript
interface CreateRoleRequest {
  id: string;
  name: string;
  description: string;
  status: RoleStatus;
  isAdmin?: boolean;
  permissions: Permission[];
}
```

### `UpdateRoleRequest`

מטען לעדכון תפקיד. נדרש רק `id`; כל שאר השדות הם אופציונליים.

```typescript
interface UpdateRoleRequest extends Partial<Omit<CreateRoleRequest, 'id'>> {
  id: string;
}
```

### `RoleListOptions`

פרמטרי שאילתה עבור רישום תפקידים.

```typescript
interface RoleListOptions {
  page?: number;
  limit?: number;
  status?: RoleStatus;
  sortBy?: 'name' | 'id' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}
```

### `RoleListResponse`

תגובת רשימת תפקידים מדורגת.

```typescript
interface RoleListResponse {
  roles: RoleData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

## סוגי מטלות

### `RoleAssignment`

מטען הקצאה מינימלי.

```typescript
interface RoleAssignment {
  roleId: string;
}
```

### `UserRoleAssignment`

מקצה תפקיד למשתמש ספציפי.

```typescript
interface UserRoleAssignment extends RoleAssignment {
  userId: string;
}
```

### `PermissionAssignment`

מעדכן את ההרשאות בתפקיד.

```typescript
interface PermissionAssignment extends RoleAssignment {
  permissions: Permission[];
}
```

### הקלד כינויים

```typescript
type RolePermissionUpdate = PermissionAssignment;
type UserRoleUpdate = UserRoleAssignment;
```

## סוג סטטוס

```typescript
const ROLE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

type RoleStatus = 'active' | 'inactive';
```

## כללי אימות

```typescript
const ROLE_VALIDATION = {
  ID: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 50,
    PATTERN: /^[a-z0-9-]+$/,
  },
  NAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 100,
  },
  DESCRIPTION: {
    MAX_LENGTH: 500,
  },
} as const;
```

|שדה|כלל|
|-------|------|
|`id`|3-50 תווים, אותיות קטנות אלפאנומריות ומקפים בלבד|
|`name`|3-100 תווים|
|`description`|מקסימום 500 תווים|

## תפקידי ברירת מחדל

התבנית מגיעה עם שני תפקידים מובנים המוגדרים ב-`lib/permissions/definitions.ts`:

|תפקיד|תעודה מזהה|מנהל מערכת|הרשאות|
|------|----|-------|-------------|
|מנהל על|`super-admin`|כן|כל ההרשאות|
|מנהל תוכן|`content-manager`|לא|כל ההרשאות `items`, `categories` ו-`tags`|

## סכמת מסד נתונים

### `roles` שולחן

```typescript
{
  id: text,            // Primary key
  name: text,          // Unique
  description: text,
  isAdmin: boolean,    // Default: false
  status: text,        // 'active' | 'inactive'
  created_by: text,    // Default: 'system'
  createdAt: timestamp,
  updatedAt: timestamp,
  deletedAt: timestamp, // Soft delete
}
```

### `user_roles` שולחן

טבלת צומת המקשרת משתמשים לתפקידים.

```typescript
{
  userId: text,   // FK -> users.id
  roleId: text,   // FK -> roles.id
  createdAt: timestamp,
}
// Composite primary key: (userId, roleId)
```

## דוגמה לשימוש

```typescript
import type { CreateRoleRequest } from '@/lib/types/role';
import { PERMISSIONS } from '@/lib/permissions/definitions';

const newRole: CreateRoleRequest = {
  id: 'reviewer',
  name: 'Content Reviewer',
  description: 'Can review and approve submitted items',
  status: 'active',
  isAdmin: false,
  permissions: [
    PERMISSIONS.items.read,
    PERMISSIONS.items.review,
    PERMISSIONS.items.approve,
    PERMISSIONS.items.reject,
  ],
};
```

## סוגים קשורים

- [סוגי הרשאות](./permission-types.md) -- הגדרות וקבוצות של הרשאות
- [Auth Types](./auth-types.md) -- הפעלות משתמש עם דגל אדמין
- [סוגי משתמש](./user-types.md) -- מבני נתונים של משתמש
