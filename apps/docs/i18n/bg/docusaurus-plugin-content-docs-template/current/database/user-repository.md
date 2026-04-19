---
id: user-repository
title: Потребителско хранилище
sidebar_label: Потребителско хранилище
sidebar_position: 17
---

# Потребителско хранилище

Класът `UserRepository` предоставя слой за достъп до данни за потребителски записи на ниво удостоверяване. Той обвива `UserDbService` с валидиране (чрез Zod схеми), проверки за уникалност и последователно обработване на грешки.

**Изходен файл:** `template/lib/repositories/user.repository.ts`

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

## Дефиниция на класа

```ts
export class UserRepository {
  private userDbService: UserDbService;

  constructor() {
    this.userDbService = new UserDbService();
  }
}
```

### Зависимости

|Импортиране|Цел|
|--------|---------|
|`UserDbService`|Услуга за база данни за потребителски CRUD операции|
|`AuthUserData`|Тип, представляващ удостоверен потребителски запис|
|`CreateUserRequest` / `UpdateUserRequest`|Поискайте DTO за създаване и актуализиране|
|`UserListOptions`|Опции за филтриране и страниране|
|`AuthUserListResponse`|Страниран тип отговор|
|`userValidationSchema` / `updateUserValidationSchema`|Схеми за валидиране на Zod|

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

Извлича един потребител по неговия уникален идентификатор.

```ts
async findById(id: string): Promise<AuthUserData | null>
```

Връща `null`, когато няма съответстващ потребител.

---

### `getAllUsers(): Promise<AuthUserData[]>`

Returns every user record without pagination. Intended for use in admin dropdowns, assignment lists, and similar UI elements where the full user set is needed.

```ts
async getAllUsers(): Promise<AuthUserData[]>
```

---

### `getStats(): Promise<UserStats>`

Връща обобщена потребителска статистика.

```ts
async getStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
}>
```

Делегати на `userDbService.getUserStats()`.

---

### `usernameExists(username, excludeId?): Promise<boolean>`

Checks whether a given username is already taken. Optionally excludes a specific user ID (useful during updates).

```ts
async usernameExists(username: string, excludeId?: string): Promise<boolean>
```

Delegates to `userDbService.clientProfileUsernameExists`.

---

### `emailExists(email, excludeId?): Promise<boolean>`

Проверява дали даден имейл адрес вече се използва. Извършва сравнение без разлика на главни и малки букви, като зарежда всички потребители и филтрира в паметта.

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

Актуализира съществуващ потребител след валидиране и проверка на съществуването.

```ts
async update(id: string, data: UpdateUserRequest): Promise<AuthUserData>
```

**Стъпки на обработка:**

1. Потвърждава въвеждането с `updateUserValidationSchema.parse(data)` (Zod)
2. Потвърждава съществуването на потребителя чрез `findById`
3. Прилага актуализацията чрез `userDbService.updateUser`

Изхвърля `Error("User not found")`, ако целевият потребител не съществува.

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

## Модел за обработка на грешки

Всички публични методи следват последователна стратегия за обработка на грешки:

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

Това гарантира, че специфичните за домейна грешки (взет имейл, потребител не е намерен) се разпространяват чисто към маршрутите на API, докато неочакваните грешки се регистрират и заменят с безопасни съобщения.

---

## Validation Schemas

The repository uses two Zod schemas from `@/lib/types/user`:

- **`userValidationSchema`** -- full user creation schema; the repository picks only `email` and `password`
- **`updateUserValidationSchema`** -- partial update schema that validates whichever fields are provided

---

## Пример за използване

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
