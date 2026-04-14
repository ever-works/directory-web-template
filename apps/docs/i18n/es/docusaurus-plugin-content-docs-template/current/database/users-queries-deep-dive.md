---
id: users-queries-deep-dive
title: Consultas de usuarios en profundidad
sidebar_label: Consultas de usuarios en profundidad
sidebar_position: 61
---

# Consultas de usuarios en profundidad

Referencia completa para todas las funciones de consulta de bases de datos relacionadas con el usuario, incluida la búsqueda de usuarios, asistentes de autenticación, comprobaciones de roles de administrador y utilidades de administración de perfiles de clientes.

## Descripción general

La capa de consulta del usuario se divide en varios módulos:

- **`user.queries.ts`** -- Operaciones CRUD del usuario principal, búsquedas de autenticación y comprobaciones administrativas
- **`client.queries.ts`** -- Gestión de perfiles de clientes, búsqueda, estadísticas y operaciones de cuentas
- **`utils.ts`** -- Utilidades compartidas para generación de nombres de usuario y procesamiento de correo electrónico
- **`auth.queries.ts`** -- Restablecimiento de contraseña y gestión de token de verificación de correo electrónico

## Archivos fuente

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

Busca un usuario por su ID.

```typescript
async function getUserById(id: string): Promise<User | null>
```

**Parámetros:**

|Parámetro|Tipo|Requerido|Descripción|
|-----------|----------|----------|-------------|
|`id`|`string`|si|ID de usuario|

**Devoluciones:** `Promise<User | null>` -- Objeto de usuario o `null` si no se encuentra

**Patrón SQL:**

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

Actualiza el hash de contraseña de un usuario.

```typescript
async function updateUserPassword(
  newPasswordHash: string,
  userId: string
): Promise<void>
```

**Parámetros:**

|Parámetro|Tipo|Requerido|Descripción|
|-------------------|----------|----------|----------------------|
|`newPasswordHash`|`string`|si|Nuevo hash de bcrypt|
|`userId`|`string`|si|ID de usuario de destino|

**Patrón SQL:**

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

Establece o borra la marca de tiempo de verificación de correo electrónico para un usuario.

```typescript
async function updateUserVerification(
  email: string,
  verified: boolean
): Promise<void>
```

**Parámetros:**

|Parámetro|Tipo|Requerido|Descripción|
|------------|-----------|----------|------------------------|
|`email`|`string`|si|Correo electrónico del usuario|
|`verified`|`boolean`|si|Estado de verificación|

**Patrón SQL:**

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

Actualiza el nombre en el perfil de un cliente.

```typescript
async function updateClientProfileName(
  userId: string,
  name: string
): Promise<void>
```

**Parámetros:**

|Parámetro|Tipo|Requerido|Descripción|
|-----------|----------|----------|--------------|
|`userId`|`string`|si|ID de usuario|
|`name`|`string`|si|Nuevo nombre|

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

## Referencia de función: auth.queries.ts

### `getPasswordResetTokenByEmail`

```typescript
async function getPasswordResetTokenByEmail(email: string)
```

Recupera el token de restablecimiento de contraseña por correo electrónico. Devuelve el registro del token o `undefined`.

### `getPasswordResetTokenByToken`

```typescript
async function getPasswordResetTokenByToken(token: string)
```

Recupera el token de restablecimiento de contraseña mediante la propia cadena del token.

### `deletePasswordResetToken`

```typescript
async function deletePasswordResetToken(token: string)
```

Elimina un token de restablecimiento de contraseña después de que se haya consumido.

### `getVerificationTokenByEmail`

```typescript
async function getVerificationTokenByEmail(email: string)
```

Recupera el token de verificación de correo electrónico por correo electrónico.

### `getVerificationTokenByToken`

```typescript
async function getVerificationTokenByToken(token: string)
```

Recupera el token de verificación de correo electrónico por la cadena del token.

### `deleteVerificationToken`

```typescript
async function deleteVerificationToken(token: string)
```

Elimina un token de verificación después de que se haya consumido.

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

## Notas de rendimiento

1. **DATABASE_URL guard** -- `getUserByEmail`, `getUserById` y `isUserAdmin` comprueba `DATABASE_URL` antes de realizar la consulta. Esto permite que la aplicación se degrade correctamente cuando no se configura ninguna base de datos.

2. **Patrón de eliminación temporal**: `softDeleteUser` utiliza la manipulación del correo electrónico en lugar de la eliminación física, preservando la integridad referencial en todo el sistema.

3. **Comprobación de roles**: `isUserAdmin` utiliza una única consulta JOIN en lugar de múltiples búsquedas, verificando tanto el indicador de administrador como el estado activo en una sola operación.

## Ejemplos de uso

### Comprobando el acceso de administrador en middleware

```typescript
import { getUserByEmail, isUserAdmin } from '@/lib/db/queries';

const user = await getUserByEmail(session.user.email);
if (user && await isUserAdmin(user.id)) {
  // Grant admin access
}
```

### Flujo de registro de usuarios

```typescript
import { insertNewUser, updateUserVerification } from '@/lib/db/queries';

const [user] = await insertNewUser({
  email: 'newuser@example.com',
  passwordHash: hashedPassword,
});

// After email verification
await updateUserVerification('newuser@example.com', true);
```
