---
id: users-queries-deep-dive
title: Потребителски запитвания Deep Dive
sidebar_label: Потребителски запитвания Deep Dive
sidebar_position: 61
---

# Потребителски запитвания Deep Dive

Изчерпателна справка за всички свързани с потребителя функции за заявки към базата данни, включително потребителско търсене, помощници за удостоверяване, проверки на администраторски роли и помощни програми за управление на клиентски профили.

## Преглед

Слоят на потребителската заявка е разделен на множество модули:

- **`user.queries.ts`** -- Основни потребителски CRUD операции, справки за удостоверяване и администраторски проверки
- **`client.queries.ts`** -- Управление на клиентски профил, търсене, статистика и операции по акаунта
- **`utils.ts`** -- Споделени помощни програми за генериране на потребителско име и обработка на имейл
- **`auth.queries.ts`** -- Повторно задаване на парола и управление на маркери за потвърждение на имейл

## Изходни файлове

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

Търси потребител по неговия ID.

```typescript
async function getUserById(id: string): Promise<User | null>
```

**Параметри:**

|Параметър|Тип|Задължително|Описание|
|-----------|----------|----------|-------------|
|`id`|`string`|да|Потребителско име|

**Връща:** `Promise<User | null>` -- Потребителски обект или `null`, ако не е намерен

**SQL модел:**

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

Актуализира хеш паролата на потребителя.

```typescript
async function updateUserPassword(
  newPasswordHash: string,
  userId: string
): Promise<void>
```

**Параметри:**

|Параметър|Тип|Задължително|Описание|
|-------------------|----------|----------|----------------------|
|`newPasswordHash`|`string`|да|Нов bcrypt хеш|
|`userId`|`string`|да|ID на целеви потребител|

**SQL модел:**

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

Задава или изчиства клеймото за време за потвърждение на имейл за потребител.

```typescript
async function updateUserVerification(
  email: string,
  verified: boolean
): Promise<void>
```

**Параметри:**

|Параметър|Тип|Задължително|Описание|
|------------|-----------|----------|------------------------|
|`email`|`string`|да|Имейл на потребителя|
|`verified`|`boolean`|да|Статус на проверка|

**SQL модел:**

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

Актуализира името на клиентски профил.

```typescript
async function updateClientProfileName(
  userId: string,
  name: string
): Promise<void>
```

**Параметри:**

|Параметър|Тип|Задължително|Описание|
|-----------|----------|----------|--------------|
|`userId`|`string`|да|Потребителско име|
|`name`|`string`|да|Ново име|

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

## Препратка към функция: auth.queries.ts

### `getPasswordResetTokenByEmail`

```typescript
async function getPasswordResetTokenByEmail(email: string)
```

Извлича маркер за нулиране на парола по имейл. Връща записа на токена или `undefined`.

### `getPasswordResetTokenByToken`

```typescript
async function getPasswordResetTokenByToken(token: string)
```

Извлича токен за нулиране на парола чрез самия низ на токена.

### `deletePasswordResetToken`

```typescript
async function deletePasswordResetToken(token: string)
```

Изтрива маркер за нулиране на парола, след като е бил използван.

### `getVerificationTokenByEmail`

```typescript
async function getVerificationTokenByEmail(email: string)
```

Извлича маркер за потвърждение на имейл по имейл.

### `getVerificationTokenByToken`

```typescript
async function getVerificationTokenByToken(token: string)
```

Извлича маркер за потвърждение на имейл чрез низа на маркера.

### `deleteVerificationToken`

```typescript
async function deleteVerificationToken(token: string)
```

Изтрива токен за потвърждение, след като е бил изразходван.

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

## Бележки за ефективността

1. **DATABASE_URL guard** -- `getUserByEmail`, `getUserById` и `isUserAdmin` проверяват за `DATABASE_URL` преди заявка. Това позволява на приложението да се деградира елегантно, когато не е конфигурирана база данни.

2. **Модел за меко изтриване** -- `softDeleteUser` използва манипулиране на имейли, вместо физическо изтриване, като запазва референтната цялост в цялата система.

3. **Проверка на роли** -- `isUserAdmin` използва една заявка за JOIN вместо множество търсения, като проверява както флага на администратора, така и активното състояние в една операция.

## Примери за използване

### Проверка на администраторския достъп в междинния софтуер

```typescript
import { getUserByEmail, isUserAdmin } from '@/lib/db/queries';

const user = await getUserByEmail(session.user.email);
if (user && await isUserAdmin(user.id)) {
  // Grant admin access
}
```

### Процес на регистрация на потребител

```typescript
import { insertNewUser, updateUserVerification } from '@/lib/db/queries';

const [user] = await insertNewUser({
  email: 'newuser@example.com',
  passwordHash: hashedPassword,
});

// After email verification
await updateUserVerification('newuser@example.com', true);
```
