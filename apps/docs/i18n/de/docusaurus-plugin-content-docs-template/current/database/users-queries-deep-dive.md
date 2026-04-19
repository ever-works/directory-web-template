---
id: users-queries-deep-dive
title: Benutzerabfragen im Detail
sidebar_label: Benutzerabfragen im Detail
sidebar_position: 61
---

# Benutzerabfragen im Detail

Umfassende Referenz für alle benutzerbezogenen Datenbankabfragefunktionen, einschließlich Benutzersuche, Authentifizierungshilfen, Administratorrollenprüfungen und Dienstprogramme zur Clientprofilverwaltung.

## Übersicht

Die Benutzerabfrageebene ist auf mehrere Module aufgeteilt:

- **`user.queries.ts`** – Kernbenutzer-CRUD-Vorgänge, Authentifizierungssuchen und Administratorprüfungen
- **`client.queries.ts`** – Kundenprofilverwaltung, Suche, Statistiken und Kontovorgänge
- **`utils.ts`** – Gemeinsame Dienstprogramme für die Generierung von Benutzernamen und die E-Mail-Verarbeitung
- **`auth.queries.ts`** – Passwort-Reset und E-Mail-Verifizierungs-Token-Verwaltung

## Quelldateien

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

Sucht einen Benutzer anhand seiner ID.

```typescript
async function getUserById(id: string): Promise<User | null>
```

**Parameter:**

|Parameter|Typ|Erforderlich|Beschreibung|
|-----------|----------|----------|-------------|
|`id`|`string`|Ja|Benutzer-ID|

**Rückgabe:** `Promise<User | null>` – Benutzerobjekt oder `null`, wenn es nicht gefunden wird

**SQL-Muster:**

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

Aktualisiert den Passwort-Hash eines Benutzers.

```typescript
async function updateUserPassword(
  newPasswordHash: string,
  userId: string
): Promise<void>
```

**Parameter:**

|Parameter|Typ|Erforderlich|Beschreibung|
|-------------------|----------|----------|----------------------|
|`newPasswordHash`|`string`|Ja|Neuer bcrypt-Hash|
|`userId`|`string`|Ja|Zielbenutzer-ID|

**SQL-Muster:**

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

Legt den E-Mail-Überprüfungszeitstempel für einen Benutzer fest oder löscht ihn.

```typescript
async function updateUserVerification(
  email: string,
  verified: boolean
): Promise<void>
```

**Parameter:**

|Parameter|Typ|Erforderlich|Beschreibung|
|------------|-----------|----------|------------------------|
|`email`|`string`|Ja|Benutzer-E-Mail|
|`verified`|`boolean`|Ja|Verifizierungsstatus|

**SQL-Muster:**

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

Aktualisiert den Namen in einem Clientprofil.

```typescript
async function updateClientProfileName(
  userId: string,
  name: string
): Promise<void>
```

**Parameter:**

|Parameter|Typ|Erforderlich|Beschreibung|
|-----------|----------|----------|--------------|
|`userId`|`string`|Ja|Benutzer-ID|
|`name`|`string`|Ja|Neuer Name|

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

## Funktionsreferenz: auth.queries.ts

### `getPasswordResetTokenByEmail`

```typescript
async function getPasswordResetTokenByEmail(email: string)
```

Ruft das Passwort-Reset-Token per E-Mail ab. Gibt den Token-Datensatz oder `undefined` zurück.

### `getPasswordResetTokenByToken`

```typescript
async function getPasswordResetTokenByToken(token: string)
```

Ruft das Passwort-Reset-Token anhand der Token-Zeichenfolge selbst ab.

### `deletePasswordResetToken`

```typescript
async function deletePasswordResetToken(token: string)
```

Löscht ein Passwort-Reset-Token, nachdem es verbraucht wurde.

### `getVerificationTokenByEmail`

```typescript
async function getVerificationTokenByEmail(email: string)
```

Ruft das E-Mail-Verifizierungstoken per E-Mail ab.

### `getVerificationTokenByToken`

```typescript
async function getVerificationTokenByToken(token: string)
```

Ruft das E-Mail-Verifizierungstoken anhand der Tokenzeichenfolge ab.

### `deleteVerificationToken`

```typescript
async function deleteVerificationToken(token: string)
```

Löscht ein Verifizierungstoken, nachdem es verbraucht wurde.

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

## Leistungshinweise

1. **DATABASE_URL Guard** – `getUserByEmail`, `getUserById` und `isUserAdmin` prüfen vor der Abfrage auf `DATABASE_URL`. Dadurch kann die Anwendung ordnungsgemäß heruntergefahren werden, wenn keine Datenbank konfiguriert ist.

2. **Soft-Delete-Muster** – `softDeleteUser` verwendet E-Mail-Verstümmelung statt physischer Löschung, wodurch die referenzielle Integrität im gesamten System gewahrt bleibt.

3. **Rollenüberprüfung** – `isUserAdmin` verwendet eine einzige JOIN-Abfrage anstelle mehrerer Suchvorgänge und prüft sowohl das Admin-Flag als auch den aktiven Status in einem Vorgang.

## Anwendungsbeispiele

### Überprüfen des Administratorzugriffs in der Middleware

```typescript
import { getUserByEmail, isUserAdmin } from '@/lib/db/queries';

const user = await getUserByEmail(session.user.email);
if (user && await isUserAdmin(user.id)) {
  // Grant admin access
}
```

### Ablauf der Benutzerregistrierung

```typescript
import { insertNewUser, updateUserVerification } from '@/lib/db/queries';

const [user] = await insertNewUser({
  email: 'newuser@example.com',
  passwordHash: hashedPassword,
});

// After email verification
await updateUserVerification('newuser@example.com', true);
```
