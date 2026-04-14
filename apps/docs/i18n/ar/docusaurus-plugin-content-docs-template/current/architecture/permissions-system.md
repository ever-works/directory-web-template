---
id: permissions-system
title: "نظام الأذونات"
sidebar_label: "نظام الأذونات"
sidebar_position: 18
---

# نظام الأذونات

يطبق القالب نظام أذونات دقيقًا قائمًا على الموارد مع تعريفات أذونات آمنة للنوع، ومجموعات منطقية لتنظيم واجهة المستخدم، ووظائف الأداة المساعدة لإدارة الحالة واكتشاف التغيير.

## نظرة عامة على الهندسة المعمارية

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

## ملفات المصدر

|ملف|الغرض|
|------|---------|
|`lib/permissions/definitions.ts`|ثوابت الأذونات، واستخراج النوع، والأدوار الافتراضية|
|`lib/permissions/groups.ts`|مجموعات الأذونات الموجهة لواجهة المستخدم مع البيانات التعريفية|
|`lib/permissions/utils.ts`|إدارة الحالة، وحساب الفرق، والتصفية|

## تعريفات الإذن

تتبع الأذونات اصطلاح التسمية `resource:action`. يقوم الكائن `PERMISSIONS` بتنظيمها حسب المورد:

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

### قائمة الأذونات الكاملة

|الموارد|الإجراءات|
|----------|---------|
|`items`|`read`، `create`، `update`، `delete`، `review`، `approve`، `reject`|
|`categories`|`read`، `create`، `update`، `delete`|
|`tags`|`read`، `create`، `update`، `delete`|
|`roles`|`read`، `create`، `update`، `delete`|
|`users`|`read`، `create`، `update`، `delete`، `assignRoles`|
|`analytics`|`read`، `export`|
|`system`|`settings`|

## نوع الإذن الآمن

يتم استخراج النوع `Permission` من الثابت `PERMISSIONS` باستخدام الأنواع الشرطية العودية:

```typescript
type PermissionValues<T> = T extends Record<string, infer U>
  ? U extends Record<string, infer V>
    ? V extends string ? V : never
    : never
  : never;

export type Permission = PermissionValues<typeof PERMISSIONS>;
// Resolves to: 'items:read' | 'items:create' | ... | 'system:settings'
```

وهذا يضمن سلامة وقت الترجمة: أي سلسلة إذن غير موجودة في الثابت `PERMISSIONS` ستتسبب في حدوث خطأ في TypeScript.

## وظائف الاستعلام

```typescript
// Get all permissions as a flat array
export function getAllPermissions(): Permission[];

// Get permissions for a specific resource
export function getPermissionsForResource(resource: keyof typeof PERMISSIONS): Permission[];

// Validate whether a string is a valid permission
export function isValidPermission(permission: string): permission is Permission;
```

## الأدوار الافتراضية

يوفر تعريفان مضمنان للأدوار نقاط بداية:

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

## مجموعات الأذونات

تنظم المجموعات أذونات عرض واجهة المستخدم باستخدام الرموز والأوصاف:

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

### وظائف الاستعلام الجماعي

```typescript
// Find which group a permission belongs to
export function getPermissionGroup(permission: Permission): PermissionGroup | undefined;

// Get all permissions in a group by group ID
export function getPermissionsByGroup(groupId: string): Permission[];
```

### تنسيق عرض الأذونات

```typescript
// Format for display: "items:approve" -> "Approve Items"
export function formatPermissionName(permission: Permission): string;

// Generate description: "items:approve" -> "Approve submissions items and submissions"
export function formatPermissionDescription(permission: Permission): string;
```

يستخدم منسق الوصف جداول البحث لكل من الإجراءات والموارد:

|العمل|بادئة الوصف|
|--------|-------------------|
|`read`|عرض والوصول|
|`create`|إنشاء جديد|
|`update`|تحرير الموجودة|
|`delete`|إزالة|
|`review`|مراجعة ومعتدلة|
|`approve`|الموافقة على التقديمات|
|`reject`|رفض التقديمات|
|`assignRoles`|إسناد الأدوار إلى|
|`export`|تصدير البيانات من|
|`settings`|إدارة الإعدادات ل|

## إدارة حالة الإذن

توفر وحدة الأدوات المساعدة وظائف لإدارة حالة الإذن في واجهة المستخدم:

### إنشاء حالة من الأذونات

```typescript
export function createPermissionState(currentPermissions: Permission[]): PermissionState;
// Returns: { 'items:read': true, 'items:create': true, ... }
```

### استخراج الأذونات المحددة

```typescript
export function getSelectedPermissions(permissionState: PermissionState): Permission[];
// Filters the state object to return only permissions where value is `true`
```

### كشف التغيير

```typescript
export function calculatePermissionChanges(
  originalPermissions: Permission[],
  newPermissions: Permission[]
): PermissionChanges;
// Returns: { added: Permission[], removed: Permission[] }
```

### فحص المساواة

```typescript
export function arePermissionsEqual(
  permissions1: Permission[],
  permissions2: Permission[]
): boolean;
// Uses Set-based comparison for order-independent equality
```

### تصفية البحث

```typescript
export function filterPermissions(
  permissions: Permission[],
  searchTerm: string
): Permission[];
// Matches against permission string and space-separated format
// e.g., "assign" matches "users:assignRoles" and "users assignRoles"
```

## مثال الاستخدام

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
