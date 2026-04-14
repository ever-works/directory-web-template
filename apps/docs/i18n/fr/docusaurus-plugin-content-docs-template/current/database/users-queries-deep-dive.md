---
id: users-queries-deep-dive
title: Requêtes des utilisateurs en profondeur
sidebar_label: Requêtes des utilisateurs en profondeur
sidebar_position: 61
---

# Requêtes des utilisateurs en profondeur

Référence complète pour toutes les fonctions de requête de base de données liées aux utilisateurs, y compris la recherche d'utilisateurs, les aides à l'authentification, les vérifications des rôles d'administrateur et les utilitaires de gestion de profil client.

## Aperçu

La couche de requête utilisateur est répartie sur plusieurs modules :

- **`user.queries.ts`** -- Opérations CRUD des utilisateurs principaux, recherches d'authentification et vérifications administratives
- **`client.queries.ts`** -- Gestion du profil client, recherche, statistiques et opérations de compte
- **`utils.ts`** -- Utilitaires partagés pour la génération de noms d'utilisateur et le traitement des e-mails
- **`auth.queries.ts`** -- Réinitialisation du mot de passe et gestion des jetons de vérification des e-mails

## Fichiers sources

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

Recherche un utilisateur par son identifiant.

```typescript
async function getUserById(id: string): Promise<User | null>
```

**Paramètres :**

|Paramètre|Tapez|Obligatoire|Descriptif|
|-----------|----------|----------|-------------|
|`id`|`string`|Oui|Identifiant utilisateur|

**Renvoie :** `Promise<User | null>` -- Objet utilisateur ou `null` s'il est introuvable

**Modèle SQL :**

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

Met à jour le hachage du mot de passe d'un utilisateur.

```typescript
async function updateUserPassword(
  newPasswordHash: string,
  userId: string
): Promise<void>
```

**Paramètres :**

|Paramètre|Tapez|Obligatoire|Descriptif|
|-------------------|----------|----------|----------------------|
|`newPasswordHash`|`string`|Oui|Nouveau hachage bcrypt|
|`userId`|`string`|Oui|ID utilisateur cible|

**Modèle SQL :**

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

Définit ou efface l'horodatage de vérification du courrier électronique pour un utilisateur.

```typescript
async function updateUserVerification(
  email: string,
  verified: boolean
): Promise<void>
```

**Paramètres :**

|Paramètre|Tapez|Obligatoire|Descriptif|
|------------|-----------|----------|------------------------|
|`email`|`string`|Oui|E-mail de l'utilisateur|
|`verified`|`boolean`|Oui|Statut de vérification|

**Modèle SQL :**

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

Met à jour le nom sur un profil client.

```typescript
async function updateClientProfileName(
  userId: string,
  name: string
): Promise<void>
```

**Paramètres :**

|Paramètre|Tapez|Obligatoire|Descriptif|
|-----------|----------|----------|--------------|
|`userId`|`string`|Oui|Identifiant utilisateur|
|`name`|`string`|Oui|Nouveau nom|

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

## Référence de la fonction : auth.queries.ts

### `getPasswordResetTokenByEmail`

```typescript
async function getPasswordResetTokenByEmail(email: string)
```

Récupère le jeton de réinitialisation du mot de passe par e-mail. Renvoie l'enregistrement du jeton ou `undefined`.

### `getPasswordResetTokenByToken`

```typescript
async function getPasswordResetTokenByToken(token: string)
```

Récupère le jeton de réinitialisation du mot de passe par la chaîne du jeton elle-même.

### `deletePasswordResetToken`

```typescript
async function deletePasswordResetToken(token: string)
```

Supprime un jeton de réinitialisation de mot de passe après son utilisation.

### `getVerificationTokenByEmail`

```typescript
async function getVerificationTokenByEmail(email: string)
```

Récupère le jeton de vérification du courrier électronique par courrier électronique.

### `getVerificationTokenByToken`

```typescript
async function getVerificationTokenByToken(token: string)
```

Récupère le jeton de vérification du courrier électronique par la chaîne du jeton.

### `deleteVerificationToken`

```typescript
async function deleteVerificationToken(token: string)
```

Supprime un jeton de vérification une fois qu'il a été consommé.

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

## Notes de performances

1. **DATABASE_URL guard** -- `getUserByEmail`, `getUserById` et `isUserAdmin` vérifient `DATABASE_URL` avant d'interroger. Cela permet à l'application de se dégrader normalement lorsqu'aucune base de données n'est configurée.

2. **Modèle de suppression logicielle** -- `softDeleteUser` utilise la modification des e-mails plutôt que la suppression physique, préservant ainsi l'intégrité référentielle dans l'ensemble du système.

3. **Vérification des rôles** -- `isUserAdmin` utilise une seule requête JOIN plutôt que plusieurs recherches, vérifiant à la fois l'indicateur d'administrateur et l'état actif en une seule opération.

## Exemples d'utilisation

### Vérification de l'accès administrateur dans le middleware

```typescript
import { getUserByEmail, isUserAdmin } from '@/lib/db/queries';

const user = await getUserByEmail(session.user.email);
if (user && await isUserAdmin(user.id)) {
  // Grant admin access
}
```

### Flux d'enregistrement des utilisateurs

```typescript
import { insertNewUser, updateUserVerification } from '@/lib/db/queries';

const [user] = await insertNewUser({
  email: 'newuser@example.com',
  passwordHash: hashedPassword,
});

// After email verification
await updateUserVerification('newuser@example.com', true);
```
