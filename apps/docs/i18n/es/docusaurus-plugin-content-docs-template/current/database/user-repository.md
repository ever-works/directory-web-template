---
id: user-repository
title: Repositorio de usuarios
sidebar_label: Repositorio de usuarios
sidebar_position: 17
---

# Repositorio de usuarios

La clase `UserRepository` proporciona la capa de acceso a datos para registros de usuario a nivel de autenticación. Incluye `UserDbService` con validación (a través de esquemas Zod), comprobaciones de unicidad y manejo consistente de errores.

**Archivo fuente:** `template/lib/repositories/user.repository.ts`

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

## Definición de clase

```ts
export class UserRepository {
  private userDbService: UserDbService;

  constructor() {
    this.userDbService = new UserDbService();
  }
}
```

### Dependencias

|Importar|Propósito|
|--------|---------|
|`UserDbService`|Servicio de base de datos para operaciones CRUD de usuario.|
|`AuthUserData`|Tipo que representa un registro de usuario autenticado|
|`CreateUserRequest` / `UpdateUserRequest`|Solicitar DTO para crear y actualizar|
|`UserListOptions`|Opciones de filtrado y paginación.|
|`AuthUserListResponse`|Tipo de respuesta paginada|
|`userValidationSchema` / `updateUserValidationSchema`|Esquemas de validación de Zod|

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

Recupera un único usuario por su identificador único.

```ts
async findById(id: string): Promise<AuthUserData | null>
```

Devuelve `null` cuando ningún usuario coincide.

---

### `getAllUsers(): Promise<AuthUserData[]>`

Returns every user record without pagination. Intended for use in admin dropdowns, assignment lists, and similar UI elements where the full user set is needed.

```ts
async getAllUsers(): Promise<AuthUserData[]>
```

---

### `getStats(): Promise<UserStats>`

Devuelve estadísticas agregadas de usuarios.

```ts
async getStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
}>
```

Delegados a `userDbService.getUserStats()`.

---

### `usernameExists(username, excludeId?): Promise<boolean>`

Checks whether a given username is already taken. Optionally excludes a specific user ID (useful during updates).

```ts
async usernameExists(username: string, excludeId?: string): Promise<boolean>
```

Delegates to `userDbService.clientProfileUsernameExists`.

---

### `emailExists(email, excludeId?): Promise<boolean>`

Comprueba si una dirección de correo electrónico ya está en uso. Realiza una comparación que no distingue entre mayúsculas y minúsculas cargando todos los usuarios y filtrando en la memoria.

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

Actualiza un usuario existente después de la validación y verificación de existencia.

```ts
async update(id: string, data: UpdateUserRequest): Promise<AuthUserData>
```

**Pasos de procesamiento:**

1. Valida la entrada con `updateUserValidationSchema.parse(data)` (Zod)
2. Verifica que el usuario existe a través de `findById`
3. Aplica la actualización a través de `userDbService.updateUser`

Lanza un `Error("User not found")` si el usuario de destino no existe.

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

## Patrón de manejo de errores

Todos los métodos públicos siguen una estrategia consistente de manejo de errores:

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

Esto garantiza que los errores específicos del dominio (correo electrónico recibido, usuario no encontrado) se propaguen limpiamente a las rutas API mientras que los errores inesperados se registran y reemplazan con mensajes seguros.

---

## Validation Schemas

The repository uses two Zod schemas from `@/lib/types/user`:

- **`userValidationSchema`** -- full user creation schema; the repository picks only `email` and `password`
- **`updateUserValidationSchema`** -- partial update schema that validates whichever fields are provided

---

## Ejemplo de uso

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
