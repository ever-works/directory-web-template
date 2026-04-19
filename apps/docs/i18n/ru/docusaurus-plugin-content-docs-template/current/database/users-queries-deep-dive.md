---
id: users-queries-deep-dive
title: Подробное изучение пользовательских запросов
sidebar_label: Подробное изучение пользовательских запросов
sidebar_position: 61
---

# Подробное изучение пользовательских запросов

Комплексный справочник по всем функциям запросов к базе данных, связанным с пользователем, включая поиск пользователей, помощники по аутентификации, проверки ролей администратора и утилиты управления профилями клиентов.

## Обзор

Уровень пользовательских запросов разделен на несколько модулей:

- **`user.queries.ts`** — основные пользовательские операции CRUD, поиск аутентификации и проверки администратора.
- **`client.queries.ts`** -- Управление профилем клиента, поиск, статистика и операции со счетом.
- **`utils.ts`** — общие утилиты для генерации имени пользователя и обработки электронной почты.
- **`auth.queries.ts`** — сброс пароля и управление токенами проверки электронной почты.

## Исходные файлы

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

Ищет пользователя по его идентификатору.

```typescript
async function getUserById(id: string): Promise<User | null>
```

**Параметры:**

|Параметр|Тип|Требуется|Описание|
|-----------|----------|----------|-------------|
|`id`|`string`|Да|Идентификатор пользователя|

**Возвраты:** `Promise<User | null>` -- Пользовательский объект или `null`, если не найден.

**Шаблон SQL:**

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

Обновляет хэш пароля пользователя.

```typescript
async function updateUserPassword(
  newPasswordHash: string,
  userId: string
): Promise<void>
```

**Параметры:**

|Параметр|Тип|Требуется|Описание|
|-------------------|----------|----------|----------------------|
|`newPasswordHash`|`string`|Да|Новый хэш bcrypt|
|`userId`|`string`|Да|Целевой идентификатор пользователя|

**Шаблон SQL:**

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

Устанавливает или очищает отметку времени проверки электронной почты для пользователя.

```typescript
async function updateUserVerification(
  email: string,
  verified: boolean
): Promise<void>
```

**Параметры:**

|Параметр|Тип|Требуется|Описание|
|------------|-----------|----------|------------------------|
|`email`|`string`|Да|Электронная почта пользователя|
|`verified`|`boolean`|Да|Статус проверки|

**Шаблон SQL:**

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

Обновляет имя в профиле клиента.

```typescript
async function updateClientProfileName(
  userId: string,
  name: string
): Promise<void>
```

**Параметры:**

|Параметр|Тип|Требуется|Описание|
|-----------|----------|----------|--------------|
|`userId`|`string`|Да|Идентификатор пользователя|
|`name`|`string`|Да|Новое имя|

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

## Ссылка на функцию: auth.queries.ts

### `getPasswordResetTokenByEmail`

```typescript
async function getPasswordResetTokenByEmail(email: string)
```

Получает токен сброса пароля по электронной почте. Возвращает запись токена или `undefined`.

### `getPasswordResetTokenByToken`

```typescript
async function getPasswordResetTokenByToken(token: string)
```

Получает токен сброса пароля по самой строке токена.

### `deletePasswordResetToken`

```typescript
async function deletePasswordResetToken(token: string)
```

Удаляет токен сброса пароля после его использования.

### `getVerificationTokenByEmail`

```typescript
async function getVerificationTokenByEmail(email: string)
```

Получает токен подтверждения электронной почты по электронной почте.

### `getVerificationTokenByToken`

```typescript
async function getVerificationTokenByToken(token: string)
```

Получает токен подтверждения электронной почты по строке токена.

### `deleteVerificationToken`

```typescript
async function deleteVerificationToken(token: string)
```

Удаляет токен проверки после его использования.

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

## Примечания по производительности

1. **DATABASE_URL Guard** -- `getUserByEmail`, `getUserById` и `isUserAdmin` проверяйте наличие `DATABASE_URL` перед запросом. Это позволяет приложению корректно снижать производительность, если база данных не настроена.

2. **Шаблон мягкого удаления** – `softDeleteUser` использует искажение электронной почты, а не физическое удаление, сохраняя ссылочную целостность во всей системе.

3. **Проверка роли** – `isUserAdmin` использует один запрос JOIN, а не несколько поисков, проверяя и флаг администратора, и активный статус за одну операцию.

## Примеры использования

### Проверка доступа администратора в промежуточном программном обеспечении

```typescript
import { getUserByEmail, isUserAdmin } from '@/lib/db/queries';

const user = await getUserByEmail(session.user.email);
if (user && await isUserAdmin(user.id)) {
  // Grant admin access
}
```

### Процесс регистрации пользователя

```typescript
import { insertNewUser, updateUserVerification } from '@/lib/db/queries';

const [user] = await insertNewUser({
  email: 'newuser@example.com',
  passwordHash: hashedPassword,
});

// After email verification
await updateUserVerification('newuser@example.com', true);
```
