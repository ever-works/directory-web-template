---
id: user-repository
title: Repozytorium użytkowników
sidebar_label: Repozytorium użytkowników
sidebar_position: 17
---

# Repozytorium użytkowników

Klasa `UserRepository` zapewnia warstwę dostępu do danych dla rekordów użytkowników na poziomie uwierzytelniania. Obejmuje `UserDbService` walidacją (za pomocą schematów Zoda), sprawdzaniem unikalności i spójną obsługą błędów.

**Plik źródłowy:** `template/lib/repositories/user.repository.ts`

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

## Definicja klasy

```ts
export class UserRepository {
  private userDbService: UserDbService;

  constructor() {
    this.userDbService = new UserDbService();
  }
}
```

### Zależności

|Importuj|Cel|
|--------|---------|
|`UserDbService`|Usługa bazy danych dla operacji CRUD użytkownika|
|`AuthUserData`|Typ reprezentujący rekord uwierzytelnionego użytkownika|
|`CreateUserRequest` / `UpdateUserRequest`|Poproś DTO o utworzenie i aktualizację|
|`UserListOptions`|Opcje filtrowania i paginacji|
|`AuthUserListResponse`|Typ odpowiedzi podzielony na strony|
|`userValidationSchema` / `updateUserValidationSchema`|Schematy walidacji Zoda|

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

Pobiera pojedynczego użytkownika według jego unikalnego identyfikatora.

```ts
async findById(id: string): Promise<AuthUserData | null>
```

Zwraca `null`, gdy żaden użytkownik nie pasuje.

---

### `getAllUsers(): Promise<AuthUserData[]>`

Returns every user record without pagination. Intended for use in admin dropdowns, assignment lists, and similar UI elements where the full user set is needed.

```ts
async getAllUsers(): Promise<AuthUserData[]>
```

---

### `getStats(): Promise<UserStats>`

Zwraca zbiorcze statystyki użytkowników.

```ts
async getStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
}>
```

Delegaci do `userDbService.getUserStats()`.

---

### `usernameExists(username, excludeId?): Promise<boolean>`

Checks whether a given username is already taken. Optionally excludes a specific user ID (useful during updates).

```ts
async usernameExists(username: string, excludeId?: string): Promise<boolean>
```

Delegates to `userDbService.clientProfileUsernameExists`.

---

### `emailExists(email, excludeId?): Promise<boolean>`

Sprawdza, czy adres e-mail jest już używany. Wykonuje porównanie bez uwzględniania wielkości liter, ładując wszystkich użytkowników i filtrując w pamięci.

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

Aktualizuje istniejącego użytkownika po sprawdzeniu poprawności i istnieniu.

```ts
async update(id: string, data: UpdateUserRequest): Promise<AuthUserData>
```

**Etapy przetwarzania:**

1. Sprawdza wprowadzone dane za pomocą `updateUserValidationSchema.parse(data)` (Zod)
2. Sprawdza, czy użytkownik istnieje poprzez `findById`
3. Stosuje aktualizację poprzez `userDbService.updateUser`

Zgłasza `Error("User not found")`, jeśli użytkownik docelowy nie istnieje.

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

## Wzór obsługi błędów

Wszystkie metody publiczne stosują spójną strategię obsługi błędów:

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

Dzięki temu błędy specyficzne dla domeny (odebrana poczta e-mail, nie znaleziono użytkownika) będą prawidłowo propagowane do tras API, a nieoczekiwane błędy będą rejestrowane i zastępowane bezpiecznymi wiadomościami.

---

## Validation Schemas

The repository uses two Zod schemas from `@/lib/types/user`:

- **`userValidationSchema`** -- full user creation schema; the repository picks only `email` and `password`
- **`updateUserValidationSchema`** -- partial update schema that validates whichever fields are provided

---

## Przykład użycia

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
