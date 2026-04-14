---
id: user-repository
title: Gebruikersopslagplaats
sidebar_label: Gebruikersopslagplaats
sidebar_position: 17
---

# Gebruikersopslagplaats

De klasse `UserRepository` biedt de gegevenstoegangslaag voor gebruikersrecords op authenticatieniveau. Het omhult `UserDbService` met validatie (via Zod-schema's), uniciteitscontroles en consistente foutafhandeling.

**Bronbestand:** `template/lib/repositories/user.repository.ts`

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

## Klasse definitie

```ts
export class UserRepository {
  private userDbService: UserDbService;

  constructor() {
    this.userDbService = new UserDbService();
  }
}
```

### Afhankelijkheden

|Importeren|Doel|
|--------|---------|
|`UserDbService`|Databaseservice voor CRUD-bewerkingen van gebruikers|
|`AuthUserData`|Type dat een geverifieerd gebruikersrecord vertegenwoordigt|
|`CreateUserRequest` / `UpdateUserRequest`|Vraag DTO's aan voor het maken en bijwerken|
|`UserListOptions`|Filter- en pagineringsopties|
|`AuthUserListResponse`|Gepagineerd antwoordtype|
|`userValidationSchema` / `updateUserValidationSchema`|Zod-validatieschema's|

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

Haalt een enkele gebruiker op aan de hand van zijn unieke ID.

```ts
async findById(id: string): Promise<AuthUserData | null>
```

Retourneert `null` als er geen gebruiker overeenkomt.

---

### `getAllUsers(): Promise<AuthUserData[]>`

Returns every user record without pagination. Intended for use in admin dropdowns, assignment lists, and similar UI elements where the full user set is needed.

```ts
async getAllUsers(): Promise<AuthUserData[]>
```

---

### `getStats(): Promise<UserStats>`

Retourneert verzamelde gebruikersstatistieken.

```ts
async getStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
}>
```

Afgevaardigden naar `userDbService.getUserStats()`.

---

### `usernameExists(username, excludeId?): Promise<boolean>`

Checks whether a given username is already taken. Optionally excludes a specific user ID (useful during updates).

```ts
async usernameExists(username: string, excludeId?: string): Promise<boolean>
```

Delegates to `userDbService.clientProfileUsernameExists`.

---

### `emailExists(email, excludeId?): Promise<boolean>`

Controleert of een e-mailadres al in gebruik is. Voert een hoofdletterongevoelige vergelijking uit door alle gebruikers te laden en in het geheugen te filteren.

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

Werkt een bestaande gebruiker bij na validatie en bestaanscontrole.

```ts
async update(id: string, data: UpdateUserRequest): Promise<AuthUserData>
```

**Verwerkingsstappen:**

1. Valideert invoer met `updateUserValidationSchema.parse(data)` (Zod)
2. Controleert of de gebruiker bestaat via `findById`
3. Past de update toe via `userDbService.updateUser`

Genereert een `Error("User not found")` als de doelgebruiker niet bestaat.

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

## Patroon voor foutafhandeling

Alle openbare methoden volgen een consistente strategie voor foutafhandeling:

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

Dit zorgt ervoor dat domeinspecifieke fouten (e-mail opgehaald, gebruiker niet gevonden) zich netjes verspreiden naar API-routes, terwijl onverwachte fouten worden geregistreerd en vervangen door veilige berichten.

---

## Validation Schemas

The repository uses two Zod schemas from `@/lib/types/user`:

- **`userValidationSchema`** -- full user creation schema; the repository picks only `email` and `password`
- **`updateUserValidationSchema`** -- partial update schema that validates whichever fields are provided

---

## Gebruiksvoorbeeld

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
