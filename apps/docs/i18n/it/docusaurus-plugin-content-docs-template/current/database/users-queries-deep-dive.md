---
id: users-queries-deep-dive
title: L'utente interroga in modo approfondito
sidebar_label: L'utente interroga in modo approfondito
sidebar_position: 61
---

# L'utente interroga in modo approfondito

Riferimento completo per tutte le funzioni di query del database relative agli utenti, tra cui ricerca utente, assistenti per l'autenticazione, controlli del ruolo di amministratore e utilità di gestione del profilo cliente.

## Panoramica

Il livello di query dell'utente è suddiviso in più moduli:

- **`user.queries.ts`** -- Operazioni CRUD degli utenti principali, ricerche di autenticazione e controlli di amministrazione
- **`client.queries.ts`** -- Gestione del profilo cliente, ricerca, statistiche e operazioni sull'account
- **`utils.ts`** -- Utilità condivise per la generazione di nomi utente e l'elaborazione della posta elettronica
- **`auth.queries.ts`** -- Reimpostazione della password e gestione dei token di verifica e-mail

## File di origine

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

Cerca un utente in base al suo ID.

```typescript
async function getUserById(id: string): Promise<User | null>
```

**Parametri:**

|Parametro|Digitare|Obbligatorio|Descrizione|
|-----------|----------|----------|-------------|
|`id`|`string`|Sì|ID utente|

**Restituisce:** `Promise<User | null>` -- Oggetto utente o `null` se non trovato

**Modello SQL:**

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

Aggiorna l'hash della password di un utente.

```typescript
async function updateUserPassword(
  newPasswordHash: string,
  userId: string
): Promise<void>
```

**Parametri:**

|Parametro|Digitare|Obbligatorio|Descrizione|
|-------------------|----------|----------|----------------------|
|`newPasswordHash`|`string`|Sì|Nuovo hash bcrypt|
|`userId`|`string`|Sì|ID utente di destinazione|

**Modello SQL:**

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

Imposta o cancella il timestamp di verifica dell'e-mail per un utente.

```typescript
async function updateUserVerification(
  email: string,
  verified: boolean
): Promise<void>
```

**Parametri:**

|Parametro|Digitare|Obbligatorio|Descrizione|
|------------|-----------|----------|------------------------|
|`email`|`string`|Sì|E-mail dell'utente|
|`verified`|`boolean`|Sì|Stato di verifica|

**Modello SQL:**

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

Aggiorna il nome su un profilo client.

```typescript
async function updateClientProfileName(
  userId: string,
  name: string
): Promise<void>
```

**Parametri:**

|Parametro|Digitare|Obbligatorio|Descrizione|
|-----------|----------|----------|--------------|
|`userId`|`string`|Sì|ID utente|
|`name`|`string`|Sì|Nuovo nome|

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

## Riferimento funzione: auth.queries.ts

### `getPasswordResetTokenByEmail`

```typescript
async function getPasswordResetTokenByEmail(email: string)
```

Recupera il token di reimpostazione della password tramite e-mail. Restituisce il record del token o `undefined`.

### `getPasswordResetTokenByToken`

```typescript
async function getPasswordResetTokenByToken(token: string)
```

Recupera il token di reimpostazione della password tramite la stringa del token stessa.

### `deletePasswordResetToken`

```typescript
async function deletePasswordResetToken(token: string)
```

Elimina un token di reimpostazione della password dopo che è stato utilizzato.

### `getVerificationTokenByEmail`

```typescript
async function getVerificationTokenByEmail(email: string)
```

Recupera il token di verifica e-mail tramite e-mail.

### `getVerificationTokenByToken`

```typescript
async function getVerificationTokenByToken(token: string)
```

Recupera il token di verifica dell'e-mail tramite la stringa del token.

### `deleteVerificationToken`

```typescript
async function deleteVerificationToken(token: string)
```

Elimina un token di verifica dopo che è stato utilizzato.

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

## Note sulle prestazioni

1. **DATABASE_URL guard** -- `getUserByEmail`, `getUserById` e `isUserAdmin` controlla `DATABASE_URL` prima di eseguire una query. Ciò consente all'applicazione di degradarsi normalmente quando non è configurato alcun database.

2. **Modello di eliminazione temporanea** -- `softDeleteUser` utilizza la manipolazione dei messaggi di posta elettronica anziché l'eliminazione fisica, preservando l'integrità referenziale in tutto il sistema.

3. **Verifica dei ruoli** -- `isUserAdmin` utilizza una singola query JOIN anziché più ricerche, controllando sia il flag di amministrazione che lo stato attivo in un'unica operazione.

## Esempi di utilizzo

### Verifica dell'accesso amministrativo nel middleware

```typescript
import { getUserByEmail, isUserAdmin } from '@/lib/db/queries';

const user = await getUserByEmail(session.user.email);
if (user && await isUserAdmin(user.id)) {
  // Grant admin access
}
```

### Flusso di registrazione dell'utente

```typescript
import { insertNewUser, updateUserVerification } from '@/lib/db/queries';

const [user] = await insertNewUser({
  email: 'newuser@example.com',
  passwordHash: hashedPassword,
});

// After email verification
await updateUserVerification('newuser@example.com', true);
```
