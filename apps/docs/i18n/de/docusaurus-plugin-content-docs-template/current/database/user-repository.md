---
id: user-repository
title: Benutzer-Repository
sidebar_label: Benutzer-Repository
sidebar_position: 17
---

# Benutzer-Repository

Die Klasse `UserRepository` stellt die Datenzugriffsschicht für Benutzerdatensätze auf Authentifizierungsebene bereit. Es umschließt `UserDbService` mit Validierung (über Zod-Schemas), Eindeutigkeitsprüfungen und konsistenter Fehlerbehandlung.

**Quelldatei:** `template/lib/repositories/user.repository.ts`

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

## Klassendefinition

```ts
export class UserRepository {
  private userDbService: UserDbService;

  constructor() {
    this.userDbService = new UserDbService();
  }
}
```

### Abhängigkeiten

|Importieren|Zweck|
|--------|---------|
|`UserDbService`|Datenbankdienst für Benutzer-CRUD-Operationen|
|`AuthUserData`|Typ, der einen authentifizierten Benutzerdatensatz darstellt|
|`CreateUserRequest` / `UpdateUserRequest`|Fordern Sie DTOs zum Erstellen und Aktualisieren an|
|`UserListOptions`|Filter- und Paginierungsoptionen|
|`AuthUserListResponse`|Paginierter Antworttyp|
|`userValidationSchema` / `updateUserValidationSchema`|Zod-Validierungsschemata|

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

Ruft einen einzelnen Benutzer anhand seiner eindeutigen Kennung ab.

```ts
async findById(id: string): Promise<AuthUserData | null>
```

Gibt `null` zurück, wenn kein Benutzer übereinstimmt.

---

### `getAllUsers(): Promise<AuthUserData[]>`

Returns every user record without pagination. Intended for use in admin dropdowns, assignment lists, and similar UI elements where the full user set is needed.

```ts
async getAllUsers(): Promise<AuthUserData[]>
```

---

### `getStats(): Promise<UserStats>`

Gibt aggregierte Benutzerstatistiken zurück.

```ts
async getStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
}>
```

Delegierte an `userDbService.getUserStats()`.

---

### `usernameExists(username, excludeId?): Promise<boolean>`

Checks whether a given username is already taken. Optionally excludes a specific user ID (useful during updates).

```ts
async usernameExists(username: string, excludeId?: string): Promise<boolean>
```

Delegates to `userDbService.clientProfileUsernameExists`.

---

### `emailExists(email, excludeId?): Promise<boolean>`

Prüft, ob eine E-Mail-Adresse bereits verwendet wird. Führt einen Vergleich ohne Berücksichtigung der Groß- und Kleinschreibung durch, indem alle Benutzer geladen und im Speicher gefiltert werden.

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

Aktualisiert einen vorhandenen Benutzer nach Validierung und Existenzprüfung.

```ts
async update(id: string, data: UpdateUserRequest): Promise<AuthUserData>
```

**Verarbeitungsschritte:**

1. Validiert die Eingabe mit `updateUserValidationSchema.parse(data)` (Zod)
2. Überprüft die Existenz des Benutzers über `findById`
3. Wendet das Update über `userDbService.updateUser` an.

Löst ein `Error("User not found")` aus, wenn der Zielbenutzer nicht existiert.

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

## Fehlerbehandlungsmuster

Alle öffentlichen Methoden folgen einer konsistenten Fehlerbehandlungsstrategie:

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

Dadurch wird sichergestellt, dass domänenspezifische Fehler (E-Mail angenommen, Benutzer nicht gefunden) sauber an API-Routen weitergegeben werden, während unerwartete Fehler protokolliert und durch sichere Nachrichten ersetzt werden.

---

## Validation Schemas

The repository uses two Zod schemas from `@/lib/types/user`:

- **`userValidationSchema`** -- full user creation schema; the repository picks only `email` and `password`
- **`updateUserValidationSchema`** -- partial update schema that validates whichever fields are provided

---

## Anwendungsbeispiel

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
