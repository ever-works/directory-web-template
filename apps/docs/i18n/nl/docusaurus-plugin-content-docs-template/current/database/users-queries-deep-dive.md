---
id: users-queries-deep-dive
title: Gebruikersquery's Deep Dive
sidebar_label: Gebruikersquery's Deep Dive
sidebar_position: 61
---

# Gebruikersquery's Deep Dive

Uitgebreid naslagwerk voor alle gebruikersgerelateerde functies voor databasequery's, inclusief het opzoeken van gebruikers, authenticatiehelpers, controles van beheerdersrollen en hulpprogramma's voor het beheren van klantprofielen.

## Overzicht

De gebruikersquerylaag is verdeeld over meerdere modules:

- **`user.queries.ts`** -- CRUD-bewerkingen van kerngebruikers, authenticatie-lookups en beheerderscontroles
- **`client.queries.ts`** -- Klantprofielbeheer, zoeken, statistieken en accountbewerkingen
- **`utils.ts`** -- Gedeelde hulpprogramma's voor het genereren van gebruikersnaam en e-mailverwerking
- **`auth.queries.ts`** -- Wachtwoordreset en tokenbeheer voor e-mailverificatie

## Bronbestanden

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

Zoekt een gebruiker op aan de hand van zijn ID.

```typescript
async function getUserById(id: string): Promise<User | null>
```

**Parameters:**

|Parameter|Typ|Vereist|Beschrijving|
|-----------|----------|----------|-------------|
|`id`|`string`|Ja|Gebruikers-ID|

**Retourneert:** `Promise<User | null>` -- Gebruikersobject of `null` indien niet gevonden

**SQL-patroon:**

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

Werkt de wachtwoord-hash van een gebruiker bij.

```typescript
async function updateUserPassword(
  newPasswordHash: string,
  userId: string
): Promise<void>
```

**Parameters:**

|Parameter|Typ|Vereist|Beschrijving|
|-------------------|----------|----------|----------------------|
|`newPasswordHash`|`string`|Ja|Nieuwe bcrypt-hash|
|`userId`|`string`|Ja|Doelgebruikers-ID|

**SQL-patroon:**

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

Stelt de tijdstempel voor e-mailverificatie voor een gebruiker in of wist deze.

```typescript
async function updateUserVerification(
  email: string,
  verified: boolean
): Promise<void>
```

**Parameters:**

|Parameter|Typ|Vereist|Beschrijving|
|------------|-----------|----------|------------------------|
|`email`|`string`|Ja|E-mailadres van gebruiker|
|`verified`|`boolean`|Ja|Verificatiestatus|

**SQL-patroon:**

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

Werkt de naam van een klantprofiel bij.

```typescript
async function updateClientProfileName(
  userId: string,
  name: string
): Promise<void>
```

**Parameters:**

|Parameter|Typ|Vereist|Beschrijving|
|-----------|----------|----------|--------------|
|`userId`|`string`|Ja|Gebruikers-ID|
|`name`|`string`|Ja|Nieuwe naam|

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

## Functiereferentie: auth.queries.ts

### `getPasswordResetTokenByEmail`

```typescript
async function getPasswordResetTokenByEmail(email: string)
```

Haalt het token voor het opnieuw instellen van het wachtwoord op per e-mail. Retourneert het tokenrecord of `undefined`.

### `getPasswordResetTokenByToken`

```typescript
async function getPasswordResetTokenByToken(token: string)
```

Haalt het token voor het opnieuw instellen van het wachtwoord op via de tokenreeks zelf.

### `deletePasswordResetToken`

```typescript
async function deletePasswordResetToken(token: string)
```

Verwijdert een token voor het opnieuw instellen van het wachtwoord nadat het is verbruikt.

### `getVerificationTokenByEmail`

```typescript
async function getVerificationTokenByEmail(email: string)
```

Haalt e-mailverificatietoken op per e-mail.

### `getVerificationTokenByToken`

```typescript
async function getVerificationTokenByToken(token: string)
```

Haalt een e-mailverificatietoken op via de tokenreeks.

### `deleteVerificationToken`

```typescript
async function deleteVerificationToken(token: string)
```

Verwijdert een verificatietoken nadat het is verbruikt.

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

## Prestatienotities

1. **DATABASE_URL guard** -- `getUserByEmail`, `getUserById` en `isUserAdmin` controleren op `DATABASE_URL` voordat u een query uitvoert. Hierdoor kan de applicatie op een goede manier degraderen als er geen database is geconfigureerd.

2. **Patroon voor zachte verwijdering** -- `softDeleteUser` maakt gebruik van e-mailmangeling in plaats van fysieke verwijdering, waardoor de referentiële integriteit in het hele systeem behouden blijft.

3. **Rolcontrole** -- `isUserAdmin` gebruikt een enkele JOIN-query in plaats van meerdere zoekopdrachten, waarbij zowel de beheerdersvlag als de actieve status in één handeling worden gecontroleerd.

## Gebruiksvoorbeelden

### Beheerderstoegang in middleware controleren

```typescript
import { getUserByEmail, isUserAdmin } from '@/lib/db/queries';

const user = await getUserByEmail(session.user.email);
if (user && await isUserAdmin(user.id)) {
  // Grant admin access
}
```

### Gebruikersregistratiestroom

```typescript
import { insertNewUser, updateUserVerification } from '@/lib/db/queries';

const [user] = await insertNewUser({
  email: 'newuser@example.com',
  passwordHash: hashedPassword,
});

// After email verification
await updateUserVerification('newuser@example.com', true);
```
