---
id: permission-types
title: تعريفات نوع الإذن
sidebar_label: أنواع الأذونات
sidebar_position: 13
---

# تعريفات نوع الإذن

**المصدر:** `lib/permissions/definitions.ts`، `lib/permissions/groups.ts`، `lib/db/schema.ts`

يستخدم نظام الأذونات نمط سلسلة `resource:action` لتحديد التحكم في الوصول الدقيق. يتم تعيين الأذونات للأدوار، والتي يتم تعيينها للمستخدمين.

## النوع الأساسي

### `Permission`

اتحاد كافة سلاسل الأذونات الصالحة، المشتقة من الثابت `PERMISSIONS`.

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

## سجل الأذونات

يقوم الثابت `PERMISSIONS` بتنظيم الأذونات حسب المورد.

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

|الموارد|الإجراءات|
|----------|---------|
|`items`|`read`، `create`، `update`، `delete`، `review`، `approve`، `reject`|
|`categories`|`read`، `create`، `update`، `delete`|
|`tags`|`read`، `create`، `update`، `delete`|
|`roles`|`read`، `create`، `update`، `delete`|
|`users`|`read`، `create`، `update`، `delete`، `assignRoles`|
|`analytics`|`read`، `export`|
|`system`|`settings`|

## واجهات

### `PermissionGroup`

الأذونات ذات الصلة بالمجموعات لواجهة مستخدم المسؤول.

```typescript
interface PermissionGroup {
  id: string;           // 'content' | 'users' | 'system'
  name: string;         // Display name
  description: string;  // What this group covers
  icon: string;         // Lucide icon name
  permissions: Permission[];
}
```

يأتي القالب مع ثلاث مجموعات مدمجة:

|المجموعة|الأذونات متضمنة|
|-------|---------------------|
|`content`|جميع الأذونات `items` و`categories` و`tags`|
|`users`|جميع الأذونات `users` و`roles`|
|`system`|جميع الأذونات `analytics` و`system`|

## مخطط قاعدة البيانات

### `permissions` الجدول

```typescript
{
  id: text,          // UUID primary key
  key: text,         // Unique permission string (e.g., 'items:read')
  description: text,
  createdAt: timestamp,
  updatedAt: timestamp,
}
```

### `role_permissions` الجدول

جدول الوصلات الذي يربط الأدوار بأذوناتها.

```typescript
{
  roleId: text,       // FK -> roles.id
  permissionId: text, // FK -> permissions.id
  createdAt: timestamp,
}
```

## وظائف المرافق

|وظيفة|العودة|الوصف|
|----------|--------|-------------|
|`getAllPermissions()`|`Permission[]`|إرجاع كل سلسلة إذن|
|`getPermissionsForResource(resource)`|`Permission[]`|إرجاع أذونات لمورد معين|
|`isValidPermission(str)`|`boolean`|اكتب التحقق من الحماية إذا كانت السلسلة إذنًا صالحًا|
|`getPermissionGroup(perm)`|`PermissionGroup`|يجد المجموعة التي ينتمي إليها الإذن|
|`formatPermissionName(perm)`|`string`|التنسيقات `'items:create'` كـ `'Create Items'`|
|`formatPermissionDescription(perm)`|`string`|يولد وصفًا يمكن قراءته بواسطة الإنسان|

## مثال الاستخدام

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

## الأنواع ذات الصلة

- [أنواع الأدوار](./role-types.md) - تعريفات الأدوار والمهام
- [أنواع المصادقة](./auth-types.md) - جلسة المستخدم مع علامة `isAdmin`
