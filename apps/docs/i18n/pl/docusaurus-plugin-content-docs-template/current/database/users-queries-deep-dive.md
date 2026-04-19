---
id: users-queries-deep-dive
title: Użytkownik pyta o głębokie nurkowanie
sidebar_label: Użytkownik pyta o głębokie nurkowanie
sidebar_position: 61
---

# Użytkownik pyta o głębokie nurkowanie

Kompleksowe źródło informacji o wszystkich funkcjach zapytań do baz danych związanych z użytkownikami, w tym o wyszukiwaniu użytkowników, pomocach uwierzytelniania, sprawdzaniu ról administratorów i narzędziach do zarządzania profilami klientów.

## Przegląd

Warstwa zapytań użytkownika jest podzielona na wiele modułów:

- **`user.queries.ts`** — Operacje CRUD użytkownika podstawowego, sprawdzanie uwierzytelnienia i kontrole administracyjne
- **`client.queries.ts`** — Zarządzanie profilami klientów, wyszukiwanie, statystyki i operacje na kontach
- **`utils.ts`** — Współdzielone narzędzia do generowania nazw użytkowników i przetwarzania wiadomości e-mail
- **`auth.queries.ts`** — Resetowanie hasła i zarządzanie tokenami weryfikującymi adres e-mail

## Pliki źródłowe

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

Wyszukuje użytkownika według jego identyfikatora.

```typescript
async function getUserById(id: string): Promise<User | null>
```

**Parametry:**

|Parametr|Wpisz|Wymagane|Opis|
|-----------|----------|----------|-------------|
|`id`|`string`|Tak|Identyfikator użytkownika|

**Zwroty:** `Promise<User | null>` -- Obiekt użytkownika lub `null` jeśli nie został znaleziony

**Wzorzec SQL:**

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

Aktualizuje skrót hasła użytkownika.

```typescript
async function updateUserPassword(
  newPasswordHash: string,
  userId: string
): Promise<void>
```

**Parametry:**

|Parametr|Wpisz|Wymagane|Opis|
|-------------------|----------|----------|----------------------|
|`newPasswordHash`|`string`|Tak|Nowy skrót bcrypt|
|`userId`|`string`|Tak|Docelowy identyfikator użytkownika|

**Wzorzec SQL:**

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

Ustawia lub czyści znacznik czasu weryfikacji adresu e-mail dla użytkownika.

```typescript
async function updateUserVerification(
  email: string,
  verified: boolean
): Promise<void>
```

**Parametry:**

|Parametr|Wpisz|Wymagane|Opis|
|------------|-----------|----------|------------------------|
|`email`|`string`|Tak|Adres e-mail użytkownika|
|`verified`|`boolean`|Tak|Stan weryfikacji|

**Wzorzec SQL:**

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

Aktualizuje nazwę w profilu klienta.

```typescript
async function updateClientProfileName(
  userId: string,
  name: string
): Promise<void>
```

**Parametry:**

|Parametr|Wpisz|Wymagane|Opis|
|-----------|----------|----------|--------------|
|`userId`|`string`|Tak|Identyfikator użytkownika|
|`name`|`string`|Tak|Nowa nazwa|

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

## Odniesienie do funkcji: auth.queries.ts

### `getPasswordResetTokenByEmail`

```typescript
async function getPasswordResetTokenByEmail(email: string)
```

Pobiera token resetowania hasła e-mailem. Zwraca rekord tokenu lub `undefined`.

### `getPasswordResetTokenByToken`

```typescript
async function getPasswordResetTokenByToken(token: string)
```

Pobiera token resetowania hasła przez sam ciąg tokenu.

### `deletePasswordResetToken`

```typescript
async function deletePasswordResetToken(token: string)
```

Usuwa token resetowania hasła po jego zużyciu.

### `getVerificationTokenByEmail`

```typescript
async function getVerificationTokenByEmail(email: string)
```

Pobiera token weryfikacyjny e-mailem przez e-mail.

### `getVerificationTokenByToken`

```typescript
async function getVerificationTokenByToken(token: string)
```

Pobiera token weryfikacji adresu e-mail za pomocą ciągu tokenu.

### `deleteVerificationToken`

```typescript
async function deleteVerificationToken(token: string)
```

Usuwa token weryfikacyjny po jego zużyciu.

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

## Uwagi dotyczące wydajności

1. **Ochrona BAZY DANYCH_URL** -- `getUserByEmail`, `getUserById` i `isUserAdmin` sprawdzają `DATABASE_URL` przed wysłaniem zapytania. Umożliwia to płynną degradację aplikacji, gdy nie jest skonfigurowana żadna baza danych.

2. **Wzorzec miękkiego usuwania** -- `softDeleteUser` wykorzystuje manipulowanie pocztą elektroniczną zamiast fizycznego usuwania, zachowując integralność referencyjną w całym systemie.

3. **Sprawdzanie roli** -- `isUserAdmin` używa pojedynczego zapytania JOIN zamiast wielu wyszukiwań, sprawdzając zarówno flagę administratora, jak i status aktywny w jednej operacji.

## Przykłady użycia

### Sprawdzanie dostępu administratora w oprogramowaniu pośrednim

```typescript
import { getUserByEmail, isUserAdmin } from '@/lib/db/queries';

const user = await getUserByEmail(session.user.email);
if (user && await isUserAdmin(user.id)) {
  // Grant admin access
}
```

### Przepływ rejestracji użytkownika

```typescript
import { insertNewUser, updateUserVerification } from '@/lib/db/queries';

const [user] = await insertNewUser({
  email: 'newuser@example.com',
  passwordHash: hashedPassword,
});

// After email verification
await updateUserVerification('newuser@example.com', true);
```
