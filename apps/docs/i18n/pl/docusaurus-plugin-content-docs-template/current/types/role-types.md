---
id: role-types
title: Definicje typów systemów ról
sidebar_label: Typy ról
sidebar_position: 19
---

# Definicje typów systemów ról

**Źródło:** `lib/types/role.ts`, `lib/permissions/definitions.ts`, `lib/db/schema.ts`

Role grupują uprawnienia i są przypisywane użytkownikom. System obsługuje niestandardowe role z szczegółowymi macierzami uprawnień.

## Interfejsy

### `RoleData`

Podstawowa struktura danych roli zwrócona przez interfejs API.

```typescript
interface RoleData {
  id: string;               // Slug-style identifier (e.g., 'content-manager')
  name: string;             // Display name
  description: string;      // What this role is for
  status: RoleStatus;       // 'active' | 'inactive'
  isAdmin: boolean;         // Has full admin access
  permissions: Permission[]; // Array of permission strings
  created_at: string;       // ISO 8601 timestamp
  updated_at: string;
  created_by: string;       // User ID or 'system'
}
```

|Pole|Opis|
|-------|-------------|
|`id`|Informacja o małych literach, 3-50 znaków, wzór: `^[a-z0-9-]+$`|
|`name`|Nazwa czytelna dla człowieka, 3-100 znaków|
|`isAdmin`|Gdy `true`, rola zapewnia pełny dostęp do systemu niezależnie od indywidualnych uprawnień|
|`permissions`|Tablica ciągów `resource:action` z rejestru uprawnień|

### `RoleWithCount`

Dane roli rozszerzone o liczbę przypisań użytkowników.

```typescript
interface RoleWithCount extends RoleData {
  userCount?: number;  // Number of users with this role
}
```

### `CreateRoleRequest`

Ładunek umożliwiający utworzenie nowej roli.

```typescript
interface CreateRoleRequest {
  id: string;
  name: string;
  description: string;
  status: RoleStatus;
  isAdmin?: boolean;
  permissions: Permission[];
}
```

### `UpdateRoleRequest`

Ładunek umożliwiający aktualizację roli. Wymagany jest tylko `id`; wszystkie pozostałe pola są opcjonalne.

```typescript
interface UpdateRoleRequest extends Partial<Omit<CreateRoleRequest, 'id'>> {
  id: string;
}
```

### `RoleListOptions`

Parametry zapytania dotyczące wyświetlania ról.

```typescript
interface RoleListOptions {
  page?: number;
  limit?: number;
  status?: RoleStatus;
  sortBy?: 'name' | 'id' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}
```

### `RoleListResponse`

Odpowiedź na listę ról podzieloną na strony.

```typescript
interface RoleListResponse {
  roles: RoleData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

## Typy zadań

### `RoleAssignment`

Minimalny ładunek przypisania.

```typescript
interface RoleAssignment {
  roleId: string;
}
```

### `UserRoleAssignment`

Przypisuje rolę konkretnemu użytkownikowi.

```typescript
interface UserRoleAssignment extends RoleAssignment {
  userId: string;
}
```

### `PermissionAssignment`

Aktualizuje uprawnienia roli.

```typescript
interface PermissionAssignment extends RoleAssignment {
  permissions: Permission[];
}
```

### Wpisz aliasy

```typescript
type RolePermissionUpdate = PermissionAssignment;
type UserRoleUpdate = UserRoleAssignment;
```

## Typ stanu

```typescript
const ROLE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

type RoleStatus = 'active' | 'inactive';
```

## Zasady walidacji

```typescript
const ROLE_VALIDATION = {
  ID: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 50,
    PATTERN: /^[a-z0-9-]+$/,
  },
  NAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 100,
  },
  DESCRIPTION: {
    MAX_LENGTH: 500,
  },
} as const;
```

|Pole|Reguła|
|-------|------|
|`id`|3–50 znaków, tylko małe litery alfanumeryczne i łączniki|
|`name`|3-100 znaków|
|`description`|Maksymalnie 500 znaków|

## Role domyślne

Szablon zawiera dwie wbudowane role zdefiniowane w `lib/permissions/definitions.ts`:

|Rola|Identyfikator|Administrator|Uprawnienia|
|------|----|-------|-------------|
|Superadministrator|`super-admin`|Tak|Wszystkie uprawnienia|
|Menedżer treści|`content-manager`|Nie|Wszystkie uprawnienia `items`, `categories` i `tags`|

## Schemat bazy danych

### `roles` stół

```typescript
{
  id: text,            // Primary key
  name: text,          // Unique
  description: text,
  isAdmin: boolean,    // Default: false
  status: text,        // 'active' | 'inactive'
  created_by: text,    // Default: 'system'
  createdAt: timestamp,
  updatedAt: timestamp,
  deletedAt: timestamp, // Soft delete
}
```

### `user_roles` stół

Tabela połączeń łącząca użytkowników z rolami.

```typescript
{
  userId: text,   // FK -> users.id
  roleId: text,   // FK -> roles.id
  createdAt: timestamp,
}
// Composite primary key: (userId, roleId)
```

## Przykład użycia

```typescript
import type { CreateRoleRequest } from '@/lib/types/role';
import { PERMISSIONS } from '@/lib/permissions/definitions';

const newRole: CreateRoleRequest = {
  id: 'reviewer',
  name: 'Content Reviewer',
  description: 'Can review and approve submitted items',
  status: 'active',
  isAdmin: false,
  permissions: [
    PERMISSIONS.items.read,
    PERMISSIONS.items.review,
    PERMISSIONS.items.approve,
    PERMISSIONS.items.reject,
  ],
};
```

## Powiązane typy

- [Typy uprawnień](./permission-types.md) -- definicje i grupy uprawnień
- [Typy uwierzytelniania](./auth-types.md) -- sesje użytkowników z flagą administratora
- [Typy użytkowników](./user-types.md) -- struktury danych użytkownika
