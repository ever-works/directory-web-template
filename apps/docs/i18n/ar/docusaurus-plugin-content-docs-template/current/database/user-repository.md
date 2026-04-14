---
id: user-repository
title: مستودع المستخدم
sidebar_label: مستودع المستخدم
sidebar_position: 17
---

# مستودع المستخدم

توفر فئة `UserRepository` طبقة الوصول إلى البيانات لسجلات المستخدم على مستوى المصادقة. إنه يلتف `UserDbService` مع التحقق من الصحة (عبر مخططات Zod)، وعمليات التحقق من التفرد، ومعالجة الأخطاء بشكل متسق.

**الملف المصدر:** `template/lib/repositories/user.repository.ts`

---

## Architecture Overview

```
API Route / Server Action
        |
  UserRepository           <-- validation, uniqueness checks, error wrapping
        |
  UserDbService            <-- database CRUD via Drizzle ORM
        |
  PostgreSQL / SQLite      <-- users table
```

Unlike the Git-backed repositories (items, tags, categories), the User Repository operates directly against the relational database through `UserDbService`.

---

## تعريف الفئة

```ts
export class UserRepository {
  private userDbService: UserDbService;

  constructor() {
    this.userDbService = new UserDbService();
  }
}
```

### التبعيات

|استيراد|الغرض|
|--------|---------|
|`UserDbService`|خدمة قاعدة البيانات لعمليات CRUD للمستخدم|
|`AuthUserData`|اكتب يمثل سجل مستخدم تمت مصادقته|
|`CreateUserRequest` / `UpdateUserRequest`|طلب DTOs للإنشاء والتحديث|
|`UserListOptions`|خيارات التصفية وترقيم الصفحات|
|`AuthUserListResponse`|نوع الاستجابة مرقّم|
|`userValidationSchema` / `updateUserValidationSchema`|مخططات التحقق من صحة Zod|

---

## Query Methods

### `findAll(options?): Promise<AuthUserListResponse>`

Returns a paginated list of users with optional filtering.

```ts
async findAll(options: UserListOptions = {}): Promise<AuthUserListResponse>
```

**Return type:**

```ts
interface AuthUserListResponse {
  users: AuthUserData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

Delegates to `userDbService.findUsers(options)` and maps the result into the standard paginated response shape. Wraps all database errors with a generic "Failed to retrieve users" message.

---

### `findById(id): Promise<AuthUserData | null>`

يسترد مستخدمًا واحدًا بواسطة المعرف الفريد الخاص به.

```ts
async findById(id: string): Promise<AuthUserData | null>
```

يُرجع `null` في حالة عدم تطابق أي مستخدم.

---

### `getAllUsers(): Promise<AuthUserData[]>`

Returns every user record without pagination. Intended for use in admin dropdowns, assignment lists, and similar UI elements where the full user set is needed.

```ts
async getAllUsers(): Promise<AuthUserData[]>
```

---

### `getStats(): Promise<UserStats>`

إرجاع إحصائيات المستخدم الإجمالية.

```ts
async getStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
}>
```

المندوبون إلى `userDbService.getUserStats()`.

---

### `usernameExists(username, excludeId?): Promise<boolean>`

Checks whether a given username is already taken. Optionally excludes a specific user ID (useful during updates).

```ts
async usernameExists(username: string, excludeId?: string): Promise<boolean>
```

Delegates to `userDbService.clientProfileUsernameExists`.

---

### `emailExists(email, excludeId?): Promise<boolean>`

التحقق مما إذا كان عنوان البريد الإلكتروني قيد الاستخدام بالفعل. إجراء مقارنة غير حساسة لحالة الأحرف عن طريق تحميل كافة المستخدمين والتصفية في الذاكرة.

```ts
async emailExists(email: string, excludeId?: string): Promise<boolean>
```

---

## Mutation Methods

### `create(data): Promise<AuthUserData>`

Creates a new user after validation and uniqueness enforcement.

```ts
async create(data: CreateUserRequest): Promise<AuthUserData>
```

**Processing steps:**

1. Validates `email` and `password` fields using `userValidationSchema.pick(...)` (Zod)
2. Checks email uniqueness via `userDbService.emailExists`
3. Creates the user record through `userDbService.createUser`

Throws an `Error("Email already in use")` if the email is taken.

---

### `update(id, data): Promise<AuthUserData>`

يقوم بتحديث مستخدم موجود بعد التحقق من الصحة والتحقق من وجوده.

```ts
async update(id: string, data: UpdateUserRequest): Promise<AuthUserData>
```

**خطوات المعالجة:**

1. التحقق من صحة الإدخال باستخدام `updateUserValidationSchema.parse(data)` (Zod)
2. التحقق من وجود المستخدم عبر `findById`
3. يتم تطبيق التحديث من خلال `userDbService.updateUser`

يرمي `Error("User not found")` إذا كان المستخدم المستهدف غير موجود.

---

### `delete(id): Promise<void>`

Permanently deletes a user record.

```ts
async delete(id: string): Promise<void>
```

**Processing steps:**

1. Verifies the user exists via `findById`
2. Deletes through `userDbService.deleteUser`

Throws an `Error("User not found")` if the target does not exist.

> **Note:** Role-based deletion checks are handled at the profile level since `AuthUserData` contains only authentication information.

---

## نمط معالجة الأخطاء

تتبع جميع الطرق العامة إستراتيجية متسقة لمعالجة الأخطاء:

```ts
try {
  // ... operation ...
} catch (error) {
  if (error instanceof Error) {
    throw error;           // Re-throw domain errors (validation, not-found)
  }
  console.error('Error [operation]:', error);
  throw new Error('Failed to [operation]');  // Generic fallback
}
```

ويضمن ذلك نشر الأخطاء الخاصة بالمجال (تم التقاط البريد الإلكتروني أو عدم العثور على المستخدم) بشكل واضح إلى مسارات واجهة برمجة التطبيقات بينما يتم تسجيل الأخطاء غير المتوقعة واستبدالها برسائل آمنة.

---

## Validation Schemas

The repository uses two Zod schemas from `@/lib/types/user`:

- **`userValidationSchema`** -- full user creation schema; the repository picks only `email` and `password`
- **`updateUserValidationSchema`** -- partial update schema that validates whichever fields are provided

---

## مثال الاستخدام

```ts
import { UserRepository } from '@/lib/repositories/user.repository';

const userRepo = new UserRepository();

// List users with pagination
const result = await userRepo.findAll({ page: 1, limit: 25 });

// Create a new user
const newUser = await userRepo.create({
  email: 'new@example.com',
  password: 'securePassword123',
});

// Check availability
const taken = await userRepo.emailExists('test@example.com');

// Get statistics
const stats = await userRepo.getStats();
// => { total: 150, active: 142, inactive: 8 }
```

---

## Related Files

| File | Relationship |
|------|-------------|
| `lib/services/user-db.service.ts` | Underlying database service |
| `lib/types/user.ts` | Type definitions and Zod schemas |
| `lib/db/drizzle.ts` | Database connection and Drizzle instance |
| `lib/repositories/role.repository.ts` | Role management (related to user permissions) |
