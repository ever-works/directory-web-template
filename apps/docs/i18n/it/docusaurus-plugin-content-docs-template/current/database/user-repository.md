---
id: user-repository
title: Archivio utenti
sidebar_label: Archivio utenti
sidebar_position: 17
---

# Archivio utenti

La classe `UserRepository` fornisce il livello di accesso ai dati per i record utente a livello di autenticazione. Include `UserDbService` con convalida (tramite schemi Zod), controlli di unicità e gestione coerente degli errori.

**File sorgente:** `template/lib/repositories/user.repository.ts`

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

## Definizione di classe

```ts
export class UserRepository {
  private userDbService: UserDbService;

  constructor() {
    this.userDbService = new UserDbService();
  }
}
```

### Dipendenze

|Importa|Scopo|
|--------|---------|
|`UserDbService`|Servizio database per le operazioni CRUD degli utenti|
|`AuthUserData`|Tipo che rappresenta un record utente autenticato|
|`CreateUserRequest` / `UpdateUserRequest`|Richiedi DTO per la creazione e l'aggiornamento|
|`UserListOptions`|Opzioni di filtraggio e impaginazione|
|`AuthUserListResponse`|Tipo di risposta impaginata|
|`userValidationSchema` / `updateUserValidationSchema`|Schemi di validazione Zod|

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

Recupera un singolo utente in base al suo identificatore univoco.

```ts
async findById(id: string): Promise<AuthUserData | null>
```

Restituisce `null` quando nessun utente corrisponde.

---

### `getAllUsers(): Promise<AuthUserData[]>`

Returns every user record without pagination. Intended for use in admin dropdowns, assignment lists, and similar UI elements where the full user set is needed.

```ts
async getAllUsers(): Promise<AuthUserData[]>
```

---

### `getStats(): Promise<UserStats>`

Restituisce statistiche utente aggregate.

```ts
async getStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
}>
```

Delegati a `userDbService.getUserStats()`.

---

### `usernameExists(username, excludeId?): Promise<boolean>`

Checks whether a given username is already taken. Optionally excludes a specific user ID (useful during updates).

```ts
async usernameExists(username: string, excludeId?: string): Promise<boolean>
```

Delegates to `userDbService.clientProfileUsernameExists`.

---

### `emailExists(email, excludeId?): Promise<boolean>`

Controlla se un indirizzo email è già in uso. Esegue un confronto senza distinzione tra maiuscole e minuscole caricando tutti gli utenti e filtrando in memoria.

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

Aggiorna un utente esistente dopo la convalida e il controllo dell'esistenza.

```ts
async update(id: string, data: UpdateUserRequest): Promise<AuthUserData>
```

**Fasi di elaborazione:**

1. Convalida l'input con `updateUserValidationSchema.parse(data)` (Zod)
2. Verifica che l'utente esista tramite `findById`
3. Applica l'aggiornamento tramite `userDbService.updateUser`

Genera un `Error("User not found")` se l'utente di destinazione non esiste.

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

## Modello di gestione degli errori

Tutti i metodi pubblici seguono una strategia coerente di gestione degli errori:

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

Ciò garantisce che gli errori specifici del dominio (e-mail accettate, utente non trovato) si propaghino in modo pulito ai percorsi API mentre gli errori imprevisti vengono registrati e sostituiti con messaggi sicuri.

---

## Validation Schemas

The repository uses two Zod schemas from `@/lib/types/user`:

- **`userValidationSchema`** -- full user creation schema; the repository picks only `email` and `password`
- **`updateUserValidationSchema`** -- partial update schema that validates whichever fields are provided

---

## Esempio di utilizzo

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
