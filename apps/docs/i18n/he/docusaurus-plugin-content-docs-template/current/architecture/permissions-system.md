---
id: permissions-system
title: "מערכת הרשאות"
sidebar_label: "מערכת הרשאות"
sidebar_position: 18
---

# מערכת הרשאות

התבנית מיישמת מערכת הרשאות מפורטת, מבוססת משאבים, עם הגדרות הרשאות בטוחות בסוג, קבוצות לוגיות לארגון ממשק המשתמש ופונקציות שירות לניהול מצב וזיהוי שינויים.

## סקירה כללית של אדריכלות

```mermaid
graph TD
    A[PERMISSIONS Constant] --> B[Permission Type]
    A --> C[getAllPermissions]
    A --> D[getPermissionsForResource]
    B --> E[PERMISSION_GROUPS]
    E --> F[Content Management Group]
    E --> G[User Management Group]
    E --> H[System & Analytics Group]
    B --> I[Permission Utils]
    I --> J[createPermissionState]
    I --> K[calculatePermissionChanges]
    I --> L[filterPermissions]
    A --> M[DEFAULT_ROLES]
    M --> N[Super Admin]
    M --> O[Content Manager]
```

## קבצי מקור

|קובץ|מטרה|
|------|---------|
|`lib/permissions/definitions.ts`|קבועי הרשאות, חילוץ סוגים, תפקידי ברירת מחדל|
|`lib/permissions/groups.ts`|קיבוץ הרשאות מוכווני ממשק משתמש עם מטא נתונים|
|`lib/permissions/utils.ts`|ניהול מצב, חישוב הבדל וסינון|

## הגדרות הרשאה

ההרשאות עוקבות אחר מוסכמות שמות של `resource:action`. האובייקט `PERMISSIONS` מארגן אותם לפי משאב:

```typescript
export const PERMISSIONS = {
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
  tags: {
    read: 'tags:read',
    create: 'tags:create',
    update: 'tags:update',
    delete: 'tags:delete',
  },
  roles: {
    read: 'roles:read',
    create: 'roles:create',
    update: 'roles:update',
    delete: 'roles:delete',
  },
  users: {
    read: 'users:read',
    create: 'users:create',
    update: 'users:update',
    delete: 'users:delete',
    assignRoles: 'users:assignRoles',
  },
  analytics: {
    read: 'analytics:read',
    export: 'analytics:export',
  },
  system: {
    settings: 'system:settings',
  },
} as const;
```

### רשימת הרשאות מלאה

|משאב|פעולות|
|----------|---------|
|`items`|`read`, `create`, `update`, `delete`, `review`, `approve`, `reject`|
|`categories`|`read`, `create`, `update`, `delete`|
|`tags`|`read`, `create`, `update`, `delete`|
|`roles`|`read`, `create`, `update`, `delete`|
|`users`|`read`, `create`, `update`, `delete`, `assignRoles`|
|`analytics`|`read`, `export`|
|`system`|`settings`|

## סוג הרשאה בטוחה לפי סוג

הסוג `Permission` מופק מהקבוע `PERMISSIONS` תוך שימוש בסוגים מותנים רקורסיביים:

```typescript
type PermissionValues<T> = T extends Record<string, infer U>
  ? U extends Record<string, infer V>
    ? V extends string ? V : never
    : never
  : never;

export type Permission = PermissionValues<typeof PERMISSIONS>;
// Resolves to: 'items:read' | 'items:create' | ... | 'system:settings'
```

זה מבטיח בטיחות בזמן ההידור: כל מחרוזת הרשאה שאינה קיימת בקבוע `PERMISSIONS` תגרום לשגיאת TypeScript.

## פונקציות שאילתה

```typescript
// Get all permissions as a flat array
export function getAllPermissions(): Permission[];

// Get permissions for a specific resource
export function getPermissionsForResource(resource: keyof typeof PERMISSIONS): Permission[];

// Validate whether a string is a valid permission
export function isValidPermission(permission: string): permission is Permission;
```

## תפקידי ברירת מחדל

שתי הגדרות תפקיד מובנות מספקות נקודות התחלה:

```typescript
export const DEFAULT_ROLES = {
  SUPER_ADMIN: {
    id: 'super-admin',
    name: 'Super Administrator',
    description: 'Full system access with all permissions',
    permissions: getAllPermissions(), // Every permission
  },
  CONTENT_MANAGER: {
    id: 'content-manager',
    name: 'Content Manager',
    description: 'Manage content including items, categories, and tags',
    permissions: [
      ...getPermissionsForResource('items'),
      ...getPermissionsForResource('categories'),
      ...getPermissionsForResource('tags'),
    ],
  },
} as const;
```

## קבוצות הרשאה

קבוצות מארגנות הרשאות לתצוגת ממשק משתמש עם סמלים ותיאורים:

```typescript
export interface PermissionGroup {
  id: string;
  name: string;
  description: string;
  icon: string;       // Lucide icon name
  permissions: Permission[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'content',
    name: 'Content Management',
    description: 'Manage items, categories, and tags',
    icon: 'FileText',
    permissions: [...items, ...categories, ...tags],
  },
  {
    id: 'users',
    name: 'User Management',
    description: 'Manage users and their roles',
    icon: 'Users',
    permissions: [...users, ...roles],
  },
  {
    id: 'system',
    name: 'System & Analytics',
    description: 'System settings and analytics access',
    icon: 'Settings',
    permissions: [...analytics, ...system],
  },
];
```

### פונקציות שאילתות קבוצתיות

```typescript
// Find which group a permission belongs to
export function getPermissionGroup(permission: Permission): PermissionGroup | undefined;

// Get all permissions in a group by group ID
export function getPermissionsByGroup(groupId: string): Permission[];
```

### עיצוב תצוגה הרשאה

```typescript
// Format for display: "items:approve" -> "Approve Items"
export function formatPermissionName(permission: Permission): string;

// Generate description: "items:approve" -> "Approve submissions items and submissions"
export function formatPermissionDescription(permission: Permission): string;
```

מעצב התיאור משתמש בטבלאות חיפוש הן עבור פעולות והן עבור משאבים:

|פעולה|קידומת תיאור|
|--------|-------------------|
|`read`|צפה וגישה|
|`create`|צור חדש|
|`update`|ערוך קיים|
|`delete`|הסר|
|`review`|סקירה ומנחה|
|`approve`|אשר הגשות|
|`reject`|דחה הגשות|
|`assignRoles`|הקצה תפקידים ל|
|`export`|ייצוא נתונים מ|
|`settings`|נהל הגדרות עבור|

## ניהול מדינת הרשות

מודול השירותים מספק פונקציות לניהול מצב ההרשאה בממשק המשתמש:

### יצירת מצב מהרשאות

```typescript
export function createPermissionState(currentPermissions: Permission[]): PermissionState;
// Returns: { 'items:read': true, 'items:create': true, ... }
```

### חילוץ הרשאות נבחרות

```typescript
export function getSelectedPermissions(permissionState: PermissionState): Permission[];
// Filters the state object to return only permissions where value is `true`
```

### שינוי איתור

```typescript
export function calculatePermissionChanges(
  originalPermissions: Permission[],
  newPermissions: Permission[]
): PermissionChanges;
// Returns: { added: Permission[], removed: Permission[] }
```

### בדיקת שוויון

```typescript
export function arePermissionsEqual(
  permissions1: Permission[],
  permissions2: Permission[]
): boolean;
// Uses Set-based comparison for order-independent equality
```

### סינון חיפוש

```typescript
export function filterPermissions(
  permissions: Permission[],
  searchTerm: string
): Permission[];
// Matches against permission string and space-separated format
// e.g., "assign" matches "users:assignRoles" and "users assignRoles"
```

## דוגמה לשימוש

```typescript
import { PERMISSIONS, getAllPermissions } from '@/lib/permissions/definitions';
import { PERMISSION_GROUPS, formatPermissionName } from '@/lib/permissions/groups';
import { createPermissionState, calculatePermissionChanges } from '@/lib/permissions/utils';

// Check a specific permission
if (userPermissions.includes(PERMISSIONS.items.approve)) {
  // User can approve items
}

// Build a permission editor UI
const state = createPermissionState(user.permissions);

// After user toggles permissions
const changes = calculatePermissionChanges(user.permissions, newPermissions);
console.log(`Added: ${changes.added.length}, Removed: ${changes.removed.length}`);
```
