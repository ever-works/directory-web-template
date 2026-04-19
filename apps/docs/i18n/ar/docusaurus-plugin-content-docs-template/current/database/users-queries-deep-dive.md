---
id: users-queries-deep-dive
title: استعلامات المستخدم الغوص العميق
sidebar_label: استعلامات المستخدم الغوص العميق
sidebar_position: 61
---

# استعلامات المستخدم الغوص العميق

مرجع شامل لجميع وظائف استعلام قاعدة البيانات المتعلقة بالمستخدم، بما في ذلك البحث عن المستخدم، ومساعدي المصادقة، والتحقق من دور المسؤول، والأدوات المساعدة لإدارة ملف تعريف العميل.

## نظرة عامة

يتم تقسيم طبقة استعلام المستخدم عبر وحدات متعددة:

- **`user.queries.ts`** - عمليات CRUD الأساسية للمستخدم، وعمليات البحث عن المصادقة، وفحوصات المسؤول
- **`client.queries.ts`** - إدارة ملف تعريف العميل والبحث والإحصائيات وعمليات الحساب
- **`utils.ts`** - أدوات مساعدة مشتركة لإنشاء اسم المستخدم ومعالجة البريد الإلكتروني
- **`auth.queries.ts`** - إعادة تعيين كلمة المرور وإدارة الرمز المميز للتحقق من البريد الإلكتروني

## ملفات المصدر

```
lib/db/queries/user.queries.ts
lib/db/queries/client.queries.ts (profile CRUD section)
lib/db/queries/utils.ts
lib/db/queries/auth.queries.ts
```

---

## Function Reference: user.queries.ts

### `getUserByEmail`

Looks up a user by their email address. Includes a guard for missing `DATABASE_URL`.

```typescript
async function getUserByEmail(email: string): Promise<User | null>
```

**Parameters:**

| Parameter | Type     | Required | Description |
|-----------|----------|----------|-------------|
| `email`   | `string` | Yes      | User email  |

**Returns:** `Promise<User | null>` -- User object or `null` if not found or database unavailable

**SQL Pattern:**

```sql
SELECT * FROM users WHERE email = ? LIMIT 1;
```

**Performance Notes:**
- Checks `DATABASE_URL` env var before querying; returns `null` immediately if unset
- Uses `.limit(1)` for efficient single-row retrieval
- Logs warnings for missing users and database errors

---

### `getUserById`

يبحث عن مستخدم من خلال معرفه.

```typescript
async function getUserById(id: string): Promise<User | null>
```

**المعلمات:**

|المعلمة|اكتب|مطلوب|الوصف|
|-----------|----------|----------|-------------|
|`id`|`string`|نعم|معرف المستخدم|

**المرتجعات:** `Promise<User | null>` - كائن المستخدم أو `null` إذا لم يتم العثور عليه

** نمط SQL: **

```sql
SELECT * FROM users WHERE id = ? LIMIT 1;
```

---

### `insertNewUser`

Creates a new user record.

```typescript
async function insertNewUser(user: NewUser): Promise<User[]>
```

**Parameters:**

| Parameter | Type      | Required | Description     |
|-----------|-----------|----------|-----------------|
| `user`    | `NewUser` | Yes      | New user data   |

**Returns:** `Promise<User[]>` -- Array containing the created user (via `RETURNING`)

**SQL Pattern:**

```sql
INSERT INTO users (...) VALUES (...) RETURNING *;
```

---

### `updateUserPassword`

يقوم بتحديث تجزئة كلمة مرور المستخدم.

```typescript
async function updateUserPassword(
  newPasswordHash: string,
  userId: string
): Promise<void>
```

**المعلمات:**

|المعلمة|اكتب|مطلوب|الوصف|
|-------------------|----------|----------|----------------------|
|`newPasswordHash`|`string`|نعم|تجزئة bcrypt الجديدة|
|`userId`|`string`|نعم|معرف المستخدم المستهدف|

** نمط SQL: **

```sql
UPDATE users SET password_hash = ? WHERE id = ?;
```

---

### `updateUser`

Updates user details (currently limited to email).

```typescript
async function updateUser(
  values: Pick<NewUser, 'email'>,
  userId: string
): Promise<void>
```

**Parameters:**

| Parameter | Type                       | Required | Description      |
|-----------|----------------------------|----------|------------------|
| `values`  | `Pick<NewUser, 'email'>`   | Yes      | Fields to update |
| `userId`  | `string`                   | Yes      | Target user ID   |

---

### `updateUserVerification`

يقوم بتعيين أو مسح الطابع الزمني للتحقق من البريد الإلكتروني للمستخدم.

```typescript
async function updateUserVerification(
  email: string,
  verified: boolean
): Promise<void>
```

**المعلمات:**

|المعلمة|اكتب|مطلوب|الوصف|
|------------|-----------|----------|------------------------|
|`email`|`string`|نعم|البريد الإلكتروني للمستخدم|
|`verified`|`boolean`|نعم|حالة التحقق|

** نمط SQL: **

```sql
UPDATE users SET email_verified = CASE WHEN ? THEN NOW() ELSE NULL END
WHERE email = ?;
```

---

### `softDeleteUser`

Soft deletes a user by setting `deletedAt` and mangling the email to prevent reuse.

```typescript
async function softDeleteUser(userId: string): Promise<void>
```

**Parameters:**

| Parameter | Type     | Required | Description  |
|-----------|----------|----------|--------------|
| `userId`  | `string` | Yes      | User ID      |

**SQL Pattern:**

```sql
UPDATE users
SET deleted_at = CURRENT_TIMESTAMP,
    email = CONCAT(email, '-', id, '-deleted')
WHERE id = ?;
```

**Design Note:** The email is mangled with the user ID and a `-deleted` suffix to free up the original email address for potential re-registration while maintaining audit traceability.

---

### `updateClientProfileName`

يقوم بتحديث الاسم في ملف تعريف العميل.

```typescript
async function updateClientProfileName(
  userId: string,
  name: string
): Promise<void>
```

**المعلمات:**

|المعلمة|اكتب|مطلوب|الوصف|
|-----------|----------|----------|--------------|
|`userId`|`string`|نعم|معرف المستخدم|
|`name`|`string`|نعم|اسم جديد|

---

### `isUserAdmin`

Checks if a user has an active admin role by joining `userRoles` with `roles`.

```typescript
async function isUserAdmin(userId: string): Promise<boolean>
```

**Parameters:**

| Parameter | Type     | Required | Description  |
|-----------|----------|----------|--------------|
| `userId`  | `string` | Yes      | User ID      |

**Returns:** `Promise<boolean>` -- `true` if user has an active admin role

**SQL Pattern:**

```sql
SELECT roles.is_admin FROM user_roles
INNER JOIN roles ON user_roles.role_id = roles.id
WHERE user_roles.user_id = ?
  AND roles.is_admin = true
  AND roles.status = 'active'
LIMIT 1;
```

**Performance Notes:**
- Uses `INNER JOIN` for efficient filtering
- Checks both `isAdmin` flag and `active` status
- Returns `false` silently when `DATABASE_URL` is not set

---

## مرجع الوظيفة: auth.queries.ts

### `getPasswordResetTokenByEmail`

```typescript
async function getPasswordResetTokenByEmail(email: string)
```

استرداد رمز إعادة تعيين كلمة المرور عن طريق البريد الإلكتروني. إرجاع سجل الرمز المميز أو `undefined`.

### `getPasswordResetTokenByToken`

```typescript
async function getPasswordResetTokenByToken(token: string)
```

يسترد رمز إعادة تعيين كلمة المرور من خلال سلسلة الرمز المميز نفسها.

### `deletePasswordResetToken`

```typescript
async function deletePasswordResetToken(token: string)
```

حذف رمز إعادة تعيين كلمة المرور بعد استهلاكه.

### `getVerificationTokenByEmail`

```typescript
async function getVerificationTokenByEmail(email: string)
```

يسترد رمز التحقق من البريد الإلكتروني عن طريق البريد الإلكتروني.

### `getVerificationTokenByToken`

```typescript
async function getVerificationTokenByToken(token: string)
```

يسترد رمز التحقق من البريد الإلكتروني من خلال سلسلة الرمز المميز.

### `deleteVerificationToken`

```typescript
async function deleteVerificationToken(token: string)
```

حذف رمز التحقق المميز بعد استهلاكه.

---

## Function Reference: utils.ts

### `extractUsernameFromEmail`

Safely extracts a username from an email address.

```typescript
function extractUsernameFromEmail(email: string): string | null
```

**Rules:**
- Splits email at `@` and takes the local part
- Removes invalid characters (keeps `a-zA-Z0-9._-`)
- Truncates to 30 characters
- Normalizes to lowercase
- Returns `null` for malformed input

### `ensureUniqueUsername`

Generates a unique username by appending numeric suffixes if needed.

```typescript
async function ensureUniqueUsername(baseUsername: string): Promise<string>
```

**Behavior:**
- Checks if `baseUsername` is available in `clientProfiles`
- If taken, tries `baseUsername1`, `baseUsername2`, etc.
- Fails after 1000 attempts with an error

---

## ملاحظات الأداء

1. **DATABASE_URL Guard** - `getUserByEmail`، `getUserById`، و`isUserAdmin` تحقق من `DATABASE_URL` قبل الاستعلام. يسمح هذا للتطبيق بالتدهور بشكل آمن عند عدم تكوين قاعدة بيانات.

2. **نمط الحذف الناعم** -- يستخدم `softDeleteUser` إدارة البريد الإلكتروني بدلاً من الحذف الفعلي، مما يحافظ على التكامل المرجعي عبر النظام.

3. **التحقق من الدور** -- يستخدم `isUserAdmin` استعلام JOIN واحد بدلاً من عمليات البحث المتعددة، والتحقق من كل من علامة المسؤول والحالة النشطة في عملية واحدة.

## أمثلة الاستخدام

### التحقق من وصول المسؤول في البرامج الوسيطة

```typescript
import { getUserByEmail, isUserAdmin } from '@/lib/db/queries';

const user = await getUserByEmail(session.user.email);
if (user && await isUserAdmin(user.id)) {
  // Grant admin access
}
```

### تدفق تسجيل المستخدم

```typescript
import { insertNewUser, updateUserVerification } from '@/lib/db/queries';

const [user] = await insertNewUser({
  email: 'newuser@example.com',
  passwordHash: hashedPassword,
});

// After email verification
await updateUserVerification('newuser@example.com', true);
```
