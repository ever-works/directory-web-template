---
id: role-types
title: تعريفات نوع نظام الدور
sidebar_label: أنواع الأدوار
sidebar_position: 19
---

# تعريفات نوع نظام الدور

**المصدر:** `lib/types/role.ts`، `lib/permissions/definitions.ts`، `lib/db/schema.ts`

تقوم الأدوار بتجميع الأذونات معًا ويتم تعيينها للمستخدمين. يدعم النظام الأدوار المخصصة بمصفوفات الأذونات الدقيقة.

## واجهات

### `RoleData`

بنية بيانات الدور الأساسي التي يتم إرجاعها بواسطة واجهة برمجة التطبيقات (API).

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

|الميدان|الوصف|
|-------|-------------|
|`id`|سبيكة صغيرة، من 3 إلى 50 حرفًا، النمط: `^[a-z0-9-]+$`|
|`name`|اسم يمكن قراءته بواسطة الإنسان، من 3 إلى 100 حرف|
|`isAdmin`|عندما `true`، يمنح الدور الوصول الكامل للنظام بغض النظر عن الأذونات الفردية|
|`permissions`|صفيف من سلاسل `resource:action` من سجل الأذونات|

### `RoleWithCount`

تم توسيع بيانات الدور مع عدد مهام المستخدم.

```typescript
interface RoleWithCount extends RoleData {
  userCount?: number;  // Number of users with this role
}
```

### `CreateRoleRequest`

الحمولة لإنشاء دور جديد.

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

الحمولة لتحديث الدور. مطلوب فقط `id`؛ جميع الحقول الأخرى اختيارية.

```typescript
interface UpdateRoleRequest extends Partial<Omit<CreateRoleRequest, 'id'>> {
  id: string;
}
```

### `RoleListOptions`

معلمات الاستعلام لإدراج الأدوار.

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

استجابة قائمة الأدوار المرقّمة.

```typescript
interface RoleListResponse {
  roles: RoleData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

## أنواع المهام

### `RoleAssignment`

الحد الأدنى من حمولة المهمة.

```typescript
interface RoleAssignment {
  roleId: string;
}
```

### `UserRoleAssignment`

يعين دوراً لمستخدم معين.

```typescript
interface UserRoleAssignment extends RoleAssignment {
  userId: string;
}
```

### `PermissionAssignment`

يقوم بتحديث الأذونات على الدور.

```typescript
interface PermissionAssignment extends RoleAssignment {
  permissions: Permission[];
}
```

### اكتب الأسماء المستعارة

```typescript
type RolePermissionUpdate = PermissionAssignment;
type UserRoleUpdate = UserRoleAssignment;
```

## نوع الحالة

```typescript
const ROLE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

type RoleStatus = 'active' | 'inactive';
```

## قواعد التحقق من الصحة

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

|الميدان|القاعدة|
|-------|------|
|`id`|3-50 حرفًا وأحرفًا أبجدية رقمية صغيرة وواصلات فقط|
|`name`|3-100 حرف|
|`description`|الحد الأقصى 500 حرف|

## الأدوار الافتراضية

يأتي القالب مع دورين مضمنين محددين في `lib/permissions/definitions.ts`:

|الدور|معرف|المشرف|الأذونات|
|------|----|-------|-------------|
|مدير سوبر|`super-admin`|نعم|جميع الأذونات|
|مدير المحتوى|`content-manager`|لا|جميع الأذونات `items` و`categories` و`tags`|

## مخطط قاعدة البيانات

### `roles` الجدول

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

### `user_roles` الجدول

جدول الوصلات الذي يربط المستخدمين بالأدوار.

```typescript
{
  userId: text,   // FK -> users.id
  roleId: text,   // FK -> roles.id
  createdAt: timestamp,
}
// Composite primary key: (userId, roleId)
```

## مثال الاستخدام

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

## الأنواع ذات الصلة

- [أنواع الأذونات](./permission-types.md) - تعريفات الأذونات ومجموعاتها
- [أنواع المصادقة](./auth-types.md) - جلسات المستخدم مع علامة المسؤول
- [أنواع المستخدمين](./user-types.md) - هياكل بيانات المستخدم
