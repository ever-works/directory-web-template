---
id: user-types
title: Definiciones de tipo de usuario y perfil
sidebar_label: Tipos de usuarios
sidebar_position: 2
---

# Definiciones de tipo de usuario y perfil

**Fuente:** `lib/types/user.ts` y `lib/types/profile.ts`

Estos módulos definen tipos de usuarios administradores (autenticación y gestión) y perfiles de usuarios públicos (visualización y cartera).

## Tipos de usuarios (`user.ts`)

### Tipo de alias

#### `UserStatus`

```typescript
type UserStatus = 'active' | 'inactive';
```

### Interfaces

#### `AuthUserData`

Datos de usuario de solo autenticación almacenados en la tabla `users`. Esta es la representación mínima de usuario utilizada para los flujos de autenticación.

```typescript
interface AuthUserData {
  id: string;
  email: string;
  username?: string;
  name?: string;
  title?: string;
  avatar?: string;
  role?: string;
  roleName?: string;
  status?: UserStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
}
```

#### `UserData`

Datos de usuario completos que incluyen información de perfil de `clientProfiles`. Esta es la representación de usuario completa utilizada en todo el panel de administración.

```typescript
interface UserData {
  id: string;
  username: string;
  email: string;
  name: string;
  title?: string;
  avatar?: string;
  role: string;
  roleName?: string;
  status: UserStatus;
  created_at: string;
  updated_at: string;
  created_by: string;
}
```

**Diferencia con `AuthUserData`:** En `UserData`, `username`, `name`, `role`, `status` y `created_by` son todos obligatorios (no opcionales).

#### `CreateUserRequest`

Carga útil para crear un nuevo usuario administrador.

```typescript
interface CreateUserRequest {
  username: string;
  email: string;
  name: string;
  title?: string;
  avatar?: string;
  role: string;
  password: string;
}
```

#### `UpdateUserRequest`

Carga útil para actualizar un usuario existente. Todos los campos son opcionales.

```typescript
interface UpdateUserRequest {
  username?: string;
  email?: string;
  name?: string;
  title?: string;
  avatar?: string;
  role?: string;
  status?: UserStatus;
}
```

#### `AuthUserListResponse`

Respuesta paginada para listas de usuarios de autenticación.

```typescript
interface AuthUserListResponse {
  users: AuthUserData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

#### `UserListResponse`

Respuesta paginada para listas completas de usuarios.

```typescript
interface UserListResponse {
  users: UserData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

#### `UserResponse`

Envoltorio de respuesta de usuario único.

```typescript
interface UserResponse {
  user: UserData;
}
```

#### `UserListOptions`

Parámetros de consulta para filtrar y paginar listas de usuarios.

```typescript
interface UserListOptions {
  includeInactive?: boolean;
  sortBy?: 'name' | 'username' | 'email' | 'role' | 'created_at';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: UserStatus;
}
```

#### `UserWithCount`

Datos de usuario ampliados con un campo de recuento opcional para estadísticas.

```typescript
interface UserWithCount extends UserData {
  count?: number;
}
```

### Esquemas de validación de Zod

#### `userValidationSchema`

Esquema de validación completo para crear un usuario:

```typescript
const userValidationSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, hyphens, and underscores'),
  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters'),
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  title: z.string()
    .max(100, 'Title must be less than 100 characters')
    .optional(),
  role: z.string()
    .min(1, 'Role is required'),
  status: z.enum(['active', 'inactive']).optional(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, '
      + 'one uppercase letter, and one number'),
});
```

#### `updateUserValidationSchema`

Esquema parcial para actualizaciones (excluye contraseña):

```typescript
const updateUserValidationSchema = userValidationSchema
  .partial()
  .omit({ password: true });
```

### Constantes de validación

```typescript
const USER_VALIDATION = {
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 30,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  TITLE_MAX_LENGTH: 100,
  EMAIL_MAX_LENGTH: 255,
  PASSWORD_MIN_LENGTH: 8,
  AVATAR_MAX_SIZE: 2 * 1024 * 1024, // 2MB
  AVATAR_ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
} as const;
```

### Funciones auxiliares

#### `isValidUserStatus`

Escriba guard que reduce una cadena a `UserStatus`:

```typescript
function isValidUserStatus(status: string): status is UserStatus {
  return status === 'active' || status === 'inactive';
}
```

#### `generateUserId`

Genera un UUID para un nuevo usuario:

```typescript
function generateUserId(): string {
  return crypto.randomUUID();
}
```

#### `formatDateForYaml`

Formatea un `Date` como una cadena compatible con YAML (`YYYY-MM-DD HH:mm`):

```typescript
function formatDateForYaml(date: Date = new Date()): string;

// Example: formatDateForYaml(new Date('2025-03-15T10:30:00'))
// => "2025-03-15 10:30"
```

---

## Profile Types (`profile.ts`)

### `Profile`

Public-facing user profile structure used for the profile display page.

```typescript
interface Profile {
  username: string;
  displayName: string;
  bio: string;
  avatar: string;
  location: string;
  company: string;
  jobTitle: string;
  website: string;
  socialLinks: Array<{
    platform: string;
    url: string;
    displayName: string;
  }>;
  skills: Array<{
    name: string;
    level: number;
  }>;
  interests: string[];
  portfolio: Array<{
    id: string;
    title: cuerda;
    description: string;
    imageUrl: string;
    externalUrl: string;
    tags: string[];
    isFeatured: boolean;
  }>;
  themeColor: string;
  isPublic: boolean;
  memberSince: string;
  submissions: Array<{
    id: string;
    title: cuerda;
    description: string;
    category: string;
    status: 'approved' | 'pending' | 'rejected';
    submittedAt: string;
    updatedAt: string;
    url: string;
    imageUrl?: string;
  }>;
}
```

**Nested types explained:**

- `socialLinks` - Links to external social platforms (GitHub, LinkedIn, Twitter, etc.)
- `skills` - Skill entries with a proficiency `level` (e.g., 1-5 or 1-100)
- `portfolio` - Showcase items with optional featured flag for prominent display
- `submissions` - Items submitted by this user, with their current review status

## Usage Examples

### Creating a user with validation

```typescript
import { userValidationSchema } from '@/lib/types/user';
import type { CreateUserRequest } from '@/lib/types/user';

const input: CreateUserRequest = {
  username: 'johndoe',
  email: 'john@example.com',
  name: 'John Doe',
  role: 'editor',
  password: 'SecurePass1',
};

const result = userValidationSchema.safeParse(input);
if (!result.success) {
  console.error(result.error.flatten());
}
```

### Filtering users

```typescript
import type { UserListOptions } from '@/lib/types/user';

const options: UserListOptions = {
  role: 'editor',
  status: 'active',
  sortBy: 'created_at',
  sortOrder: 'desc',
  page: 1,
  limit: 25,
  search: 'john',
};
```

### Using the profile type

```typescript
import type { Profile } from '@/lib/types/profile';

function renderProfile(profile: Profile) {
  const visibleSkills = profile.skills
    .filter(s => s.level >= 3)
    .sort((a, b) => b.level - a.level);

  const featuredPortfolio = profile.portfolio
    .filter(p => p.isFeatured);

  return { visibleSkills, featuredPortfolio };
}
```

## Related Types

- [`RoleData`](./category-types.md) from `role.ts` defines the roles referenced in `UserData.role`
- [`ClientProfileWithAuth`](./user-types.md) from `lib/db/queries` is the database-level user profile representation
- [`Profile`](#profile) is the public-facing profile, while `UserData` is the admin-facing representation
