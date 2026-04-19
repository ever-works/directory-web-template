---
id: user-repository
title: Пользовательский репозиторий
sidebar_label: Пользовательский репозиторий
sidebar_position: 17
---

# Пользовательский репозиторий

Класс `UserRepository` обеспечивает уровень доступа к данным для записей пользователей на уровне аутентификации. Он включает `UserDbService` с проверкой (через схемы Zod), проверкой уникальности и последовательной обработкой ошибок.

**Исходный файл:** `template/lib/repositories/user.repository.ts`

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

## Определение класса

```ts
export class UserRepository {
  private userDbService: UserDbService;

  constructor() {
    this.userDbService = new UserDbService();
  }
}
```

### Зависимости

|Импорт|Цель|
|--------|---------|
|`UserDbService`|Служба базы данных для пользовательских операций CRUD|
|`AuthUserData`|Тип, представляющий запись аутентифицированного пользователя.|
|`CreateUserRequest` / `UpdateUserRequest`|Запросить DTO для создания и обновления|
|`UserListOptions`|Параметры фильтрации и пагинации|
|`AuthUserListResponse`|Тип ответа с разбивкой на страницы|
|`userValidationSchema` / `updateUserValidationSchema`|Схемы проверки Zod|

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

Извлекает одного пользователя по его уникальному идентификатору.

```ts
async findById(id: string): Promise<AuthUserData | null>
```

Возвращает `null`, если ни один пользователь не соответствует.

---

### `getAllUsers(): Promise<AuthUserData[]>`

Returns every user record without pagination. Intended for use in admin dropdowns, assignment lists, and similar UI elements where the full user set is needed.

```ts
async getAllUsers(): Promise<AuthUserData[]>
```

---

### `getStats(): Promise<UserStats>`

Возвращает совокупную статистику пользователей.

```ts
async getStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
}>
```

Делегаты `userDbService.getUserStats()`.

---

### `usernameExists(username, excludeId?): Promise<boolean>`

Checks whether a given username is already taken. Optionally excludes a specific user ID (useful during updates).

```ts
async usernameExists(username: string, excludeId?: string): Promise<boolean>
```

Delegates to `userDbService.clientProfileUsernameExists`.

---

### `emailExists(email, excludeId?): Promise<boolean>`

Проверяет, используется ли уже адрес электронной почты. Выполняет сравнение без учета регистра, загружая всех пользователей и фильтруя их в памяти.

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

Обновляет существующего пользователя после проверки и проверки существования.

```ts
async update(id: string, data: UpdateUserRequest): Promise<AuthUserData>
```

**Этапы обработки:**

1. Проверяет ввод с помощью `updateUserValidationSchema.parse(data)` (Zod)
2. Проверяет существование пользователя через `findById`
3. Применяет обновление через `userDbService.updateUser`

Выдает `Error("User not found")`, если целевой пользователь не существует.

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

## Шаблон обработки ошибок

Все общедоступные методы следуют последовательной стратегии обработки ошибок:

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

Это гарантирует, что ошибки, специфичные для домена (электронная почта получена, пользователь не найден), беспрепятственно распространяются на маршруты API, а непредвиденные ошибки регистрируются и заменяются безопасными сообщениями.

---

## Validation Schemas

The repository uses two Zod schemas from `@/lib/types/user`:

- **`userValidationSchema`** -- full user creation schema; the repository picks only `email` and `password`
- **`updateUserValidationSchema`** -- partial update schema that validates whichever fields are provided

---

## Пример использования

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
