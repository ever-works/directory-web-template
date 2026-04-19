---
id: user-repository
title: Repositório de usuários
sidebar_label: Repositório de usuários
sidebar_position: 17
---

# Repositório de usuários

A classe `UserRepository` fornece a camada de acesso a dados para registros de usuário em nível de autenticação. Ele envolve `UserDbService` com validação (via esquemas Zod), verificações de exclusividade e tratamento de erros consistente.

**Arquivo fonte:** `template/lib/repositories/user.repository.ts`

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

## Definição de classe

```ts
export class UserRepository {
  private userDbService: UserDbService;

  constructor() {
    this.userDbService = new UserDbService();
  }
}
```

### Dependências

|Importar|Objetivo|
|--------|---------|
|`UserDbService`|Serviço de banco de dados para operações CRUD do usuário|
|`AuthUserData`|Tipo que representa um registro de usuário autenticado|
|`CreateUserRequest` / `UpdateUserRequest`|Solicitar DTOs para criação e atualização|
|`UserListOptions`|Opções de filtragem e paginação|
|`AuthUserListResponse`|Tipo de resposta paginada|
|`userValidationSchema` / `updateUserValidationSchema`|Esquemas de validação Zod|

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

Recupera um único usuário por seu identificador exclusivo.

```ts
async findById(id: string): Promise<AuthUserData | null>
```

Retorna `null` quando nenhum usuário corresponde.

---

### `getAllUsers(): Promise<AuthUserData[]>`

Returns every user record without pagination. Intended for use in admin dropdowns, assignment lists, and similar UI elements where the full user set is needed.

```ts
async getAllUsers(): Promise<AuthUserData[]>
```

---

### `getStats(): Promise<UserStats>`

Retorna estatísticas agregadas do usuário.

```ts
async getStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
}>
```

Delegados para `userDbService.getUserStats()`.

---

### `usernameExists(username, excludeId?): Promise<boolean>`

Checks whether a given username is already taken. Optionally excludes a specific user ID (useful during updates).

```ts
async usernameExists(username: string, excludeId?: string): Promise<boolean>
```

Delegates to `userDbService.clientProfileUsernameExists`.

---

### `emailExists(email, excludeId?): Promise<boolean>`

Verifica se um endereço de e-mail já está em uso. Executa uma comparação que não diferencia maiúsculas de minúsculas, carregando todos os usuários e filtrando na memória.

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

Atualiza um usuário existente após validação e verificação de existência.

```ts
async update(id: string, data: UpdateUserRequest): Promise<AuthUserData>
```

**Etapas de processamento:**

1. Valida a entrada com `updateUserValidationSchema.parse(data)` (Zod)
2. Verifica se o usuário existe via `findById`
3. Aplica a atualização através de `userDbService.updateUser`

Lança um `Error("User not found")` se o usuário de destino não existir.

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

## Padrão de tratamento de erros

Todos os métodos públicos seguem uma estratégia consistente de tratamento de erros:

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

Isso garante que erros específicos do domínio (e-mail recebido, usuário não encontrado) se propaguem de forma limpa para rotas de API enquanto erros inesperados são registrados e substituídos por mensagens seguras.

---

## Validation Schemas

The repository uses two Zod schemas from `@/lib/types/user`:

- **`userValidationSchema`** -- full user creation schema; the repository picks only `email` and `password`
- **`updateUserValidationSchema`** -- partial update schema that validates whichever fields are provided

---

## Exemplo de uso

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
