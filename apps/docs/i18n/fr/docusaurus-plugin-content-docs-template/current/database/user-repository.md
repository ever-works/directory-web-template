---
id: user-repository
title: Référentiel d'utilisateurs
sidebar_label: Référentiel d'utilisateurs
sidebar_position: 17
---

# Référentiel d'utilisateurs

La classe `UserRepository` fournit la couche d'accès aux données pour les enregistrements utilisateur au niveau de l'authentification. Il enveloppe `UserDbService` avec validation (via les schémas Zod), contrôles d'unicité et gestion cohérente des erreurs.

**Fichier source :** `template/lib/repositories/user.repository.ts`

---

## Architecture Overview

```
API Route / Server Action
        |
  UserRepository           <-- validation, uniqueness checks, error wrapping
        |
  UserDbService            <-- database CRUD via Drizzle ORM
        |
  PostgreSQL / SQLite      <-- users table
```

Unlike the Git-backed repositories (items, tags, categories), the User Repository operates directly against the relational database through `UserDbService`.

---

## Définition de classe

```ts
export class UserRepository {
  private userDbService: UserDbService;

  constructor() {
    this.userDbService = new UserDbService();
  }
}
```

### Dépendances

|Importer|Objectif|
|--------|---------|
|`UserDbService`|Service de base de données pour les opérations CRUD des utilisateurs|
|`AuthUserData`|Type représentant un enregistrement d'utilisateur authentifié|
|`CreateUserRequest` / `UpdateUserRequest`|Demander des DTO pour la création et la mise à jour|
|`UserListOptions`|Options de filtrage et de pagination|
|`AuthUserListResponse`|Type de réponse paginée|
|`userValidationSchema` / `updateUserValidationSchema`|Schémas de validation Zod|

---

## Query Methods

### `findAll(options?): Promise<AuthUserListResponse>`

Returns a paginated list of users with optional filtering.

```ts
async findAll(options: UserListOptions = {}): Promise<AuthUserListResponse>
```

**Return type:**

```ts
interface AuthUserListResponse {
  users: AuthUserData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

Delegates to `userDbService.findUsers(options)` and maps the result into the standard paginated response shape. Wraps all database errors with a generic "Failed to retrieve users" message.

---

### `findById(id): Promise<AuthUserData | null>`

Récupère un seul utilisateur par son identifiant unique.

```ts
async findById(id: string): Promise<AuthUserData | null>
```

Renvoie `null` lorsqu'aucun utilisateur ne correspond.

---

### `getAllUsers(): Promise<AuthUserData[]>`

Returns every user record without pagination. Intended for use in admin dropdowns, assignment lists, and similar UI elements where the full user set is needed.

```ts
async getAllUsers(): Promise<AuthUserData[]>
```

---

### `getStats(): Promise<UserStats>`

Renvoie les statistiques globales des utilisateurs.

```ts
async getStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
}>
```

Délégués à `userDbService.getUserStats()`.

---

### `usernameExists(username, excludeId?): Promise<boolean>`

Checks whether a given username is already taken. Optionally excludes a specific user ID (useful during updates).

```ts
async usernameExists(username: string, excludeId?: string): Promise<boolean>
```

Delegates to `userDbService.clientProfileUsernameExists`.

---

### `emailExists(email, excludeId?): Promise<boolean>`

Vérifie si une adresse e-mail est déjà utilisée. Effectue une comparaison insensible à la casse en chargeant tous les utilisateurs et en filtrant en mémoire.

```ts
async emailExists(email: string, excludeId?: string): Promise<boolean>
```

---

## Mutation Methods

### `create(data): Promise<AuthUserData>`

Creates a new user after validation and uniqueness enforcement.

```ts
async create(data: CreateUserRequest): Promise<AuthUserData>
```

**Processing steps:**

1. Validates `email` and `password` fields using `userValidationSchema.pick(...)` (Zod)
2. Checks email uniqueness via `userDbService.emailExists`
3. Creates the user record through `userDbService.createUser`

Throws an `Error("Email already in use")` if the email is taken.

---

### `update(id, data): Promise<AuthUserData>`

Met à jour un utilisateur existant après validation et vérification d'existence.

```ts
async update(id: string, data: UpdateUserRequest): Promise<AuthUserData>
```

**Étapes de traitement :**

1. Valide l'entrée avec `updateUserValidationSchema.parse(data)` (Zod)
2. Vérifie que l'utilisateur existe via `findById`
3. Applique la mise à jour via `userDbService.updateUser`

Lance un `Error("User not found")` si l'utilisateur cible n'existe pas.

---

### `delete(id): Promise<void>`

Permanently deletes a user record.

```ts
async delete(id: string): Promise<void>
```

**Processing steps:**

1. Verifies the user exists via `findById`
2. Deletes through `userDbService.deleteUser`

Throws an `Error("User not found")` if the target does not exist.

> **Note:** Role-based deletion checks are handled at the profile level since `AuthUserData` contains only authentication information.

---

## Modèle de gestion des erreurs

Toutes les méthodes publiques suivent une stratégie cohérente de gestion des erreurs :

```ts
try {
  // ... operation ...
} catch (error) {
  if (error instanceof Error) {
    throw error;           // Re-throw domain errors (validation, not-found)
  }
  console.error('Error [operation]:', error);
  throw new Error('Failed to [operation]');  // Generic fallback
}
```

Cela garantit que les erreurs spécifiques au domaine (e-mail pris, utilisateur introuvable) se propagent proprement aux routes API tandis que les erreurs inattendues sont enregistrées et remplacées par des messages sécurisés.

---

## Validation Schemas

The repository uses two Zod schemas from `@/lib/types/user`:

- **`userValidationSchema`** -- full user creation schema; the repository picks only `email` and `password`
- **`updateUserValidationSchema`** -- partial update schema that validates whichever fields are provided

---

## Exemple d'utilisation

```ts
import { UserRepository } from '@/lib/repositories/user.repository';

const userRepo = new UserRepository();

// List users with pagination
const result = await userRepo.findAll({ page: 1, limit: 25 });

// Create a new user
const newUser = await userRepo.create({
  email: 'new@example.com',
  password: 'securePassword123',
});

// Check availability
const taken = await userRepo.emailExists('test@example.com');

// Get statistics
const stats = await userRepo.getStats();
// => { total: 150, active: 142, inactive: 8 }
```

---

## Related Files

| File | Relationship |
|------|-------------|
| `lib/services/user-db.service.ts` | Underlying database service |
| `lib/types/user.ts` | Type definitions and Zod schemas |
| `lib/db/drizzle.ts` | Database connection and Drizzle instance |
| `lib/repositories/role.repository.ts` | Role management (related to user permissions) |
