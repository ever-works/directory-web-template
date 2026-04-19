---
id: users-queries-deep-dive
title: Aprofundamento das consultas do usuário
sidebar_label: Aprofundamento das consultas do usuário
sidebar_position: 61
---

# Aprofundamento das consultas do usuário

Referência abrangente para todas as funções de consulta de banco de dados relacionadas ao usuário, incluindo pesquisa de usuário, auxiliares de autenticação, verificações de função administrativa e utilitários de gerenciamento de perfil de cliente.

## Visão geral

A camada de consulta do usuário é dividida em vários módulos:

- **`user.queries.ts`** -- Principais operações CRUD do usuário, pesquisas de autenticação e verificações administrativas
- **`client.queries.ts`** -- Gerenciamento de perfil de cliente, pesquisa, estatísticas e operações de conta
- **`utils.ts`** -- Utilitários compartilhados para geração de nome de usuário e processamento de e-mail
- **`auth.queries.ts`** -- Redefinição de senha e gerenciamento de token de verificação de e-mail

## Arquivos de origem

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

Procura um usuário por seu ID.

```typescript
async function getUserById(id: string): Promise<User | null>
```

**Parâmetros:**

|Parâmetro|Tipo|Obrigatório|Descrição|
|-----------|----------|----------|-------------|
|`id`|`string`|Sim|ID do usuário|

**Retorna:** `Promise<User | null>` -- Objeto de usuário ou `null` se não for encontrado

**Padrão SQL:**

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

Atualiza o hash de senha de um usuário.

```typescript
async function updateUserPassword(
  newPasswordHash: string,
  userId: string
): Promise<void>
```

**Parâmetros:**

|Parâmetro|Tipo|Obrigatório|Descrição|
|-------------------|----------|----------|----------------------|
|`newPasswordHash`|`string`|Sim|Novo hash bcrypt|
|`userId`|`string`|Sim|ID do usuário de destino|

**Padrão SQL:**

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

Define ou limpa o carimbo de data/hora de verificação de e-mail de um usuário.

```typescript
async function updateUserVerification(
  email: string,
  verified: boolean
): Promise<void>
```

**Parâmetros:**

|Parâmetro|Tipo|Obrigatório|Descrição|
|------------|-----------|----------|------------------------|
|`email`|`string`|Sim|E-mail do usuário|
|`verified`|`boolean`|Sim|Status de verificação|

**Padrão SQL:**

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

Atualiza o nome em um perfil de cliente.

```typescript
async function updateClientProfileName(
  userId: string,
  name: string
): Promise<void>
```

**Parâmetros:**

|Parâmetro|Tipo|Obrigatório|Descrição|
|-----------|----------|----------|--------------|
|`userId`|`string`|Sim|ID do usuário|
|`name`|`string`|Sim|Novo nome|

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

## Referência da função: auth.queries.ts

### `getPasswordResetTokenByEmail`

```typescript
async function getPasswordResetTokenByEmail(email: string)
```

Recupera token de redefinição de senha por e-mail. Retorna o registro do token ou `undefined`.

### `getPasswordResetTokenByToken`

```typescript
async function getPasswordResetTokenByToken(token: string)
```

Recupera o token de redefinição de senha pela própria string do token.

### `deletePasswordResetToken`

```typescript
async function deletePasswordResetToken(token: string)
```

Exclui um token de redefinição de senha após ele ter sido consumido.

### `getVerificationTokenByEmail`

```typescript
async function getVerificationTokenByEmail(email: string)
```

Recupera o token de verificação de email por email.

### `getVerificationTokenByToken`

```typescript
async function getVerificationTokenByToken(token: string)
```

Recupera o token de verificação de e-mail pela string do token.

### `deleteVerificationToken`

```typescript
async function deleteVerificationToken(token: string)
```

Exclui um token de verificação após ele ter sido consumido.

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

## Notas de Desempenho

1. **DATABASE_URL guard** -- `getUserByEmail`, `getUserById` e `isUserAdmin` verificam `DATABASE_URL` antes de consultar. Isso permite que o aplicativo seja degradado normalmente quando nenhum banco de dados estiver configurado.

2. **Padrão de exclusão reversível** -- `softDeleteUser` usa manipulação de e-mail em vez de exclusão física, preservando a integridade referencial em todo o sistema.

3. **Verificação de função** -- `isUserAdmin` usa uma única consulta JOIN em vez de várias pesquisas, verificando o sinalizador admin e o status ativo em uma operação.

## Exemplos de uso

### Verificando o acesso de administrador no middleware

```typescript
import { getUserByEmail, isUserAdmin } from '@/lib/db/queries';

const user = await getUserByEmail(session.user.email);
if (user && await isUserAdmin(user.id)) {
  // Grant admin access
}
```

### Fluxo de registro de usuário

```typescript
import { insertNewUser, updateUserVerification } from '@/lib/db/queries';

const [user] = await insertNewUser({
  email: 'newuser@example.com',
  passwordHash: hashedPassword,
});

// After email verification
await updateUserVerification('newuser@example.com', true);
```
