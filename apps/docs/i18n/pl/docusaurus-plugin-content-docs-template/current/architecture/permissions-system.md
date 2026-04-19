---
id: permissions-system
title: "System uprawnień"
sidebar_label: "System uprawnień"
sidebar_position: 18
---

# System uprawnień

Szablon implementuje szczegółowy, oparty na zasobach system uprawnień z definicjami uprawnień bezpiecznymi dla typów, grupami logicznymi dla organizacji interfejsu użytkownika i funkcjami narzędziowymi do zarządzania stanem i wykrywania zmian.

## Przegląd architektury

```mermaid
graph TD
    A[PERMISSIONS Constant] --> B[Permission Type]
    A --> C[getAllPermissions]
    A --> D[getPermissionsForResource]
    B --> E[PERMISSION_GROUPS]
    E --> F[Content Management Group]
    E --> G[User Management Group]
    E --> H[System & Analytics Group]
    B --> I[Permission Utils]
    I --> J[createPermissionState]
    I --> K[calculatePermissionChanges]
    I --> L[filterPermissions]
    A --> M[DEFAULT_ROLES]
    M --> N[Super Admin]
    M --> O[Content Manager]
```

## Pliki źródłowe

|Plik|Cel|
|------|---------|
|`lib/permissions/definitions.ts`|Stałe uprawnień, ekstrakcja typów, role domyślne|
|`lib/permissions/groups.ts`|Grupowanie uprawnień zorientowane na interfejs użytkownika z metadanymi|
|`lib/permissions/utils.ts`|Zarządzanie stanem, obliczanie różnic i filtrowanie|

## Definicje uprawnień

Uprawnienia są zgodne z konwencją nazewnictwa `resource:action`. Obiekt `PERMISSIONS` organizuje je według zasobów:

```typescript
export const PERMISSIONS = {
  items: {
    read: 'items:read',
    create: 'items:create',
    update: 'items:update',
    delete: 'items:delete',
    review: 'items:review',
    approve: 'items:approve',
    reject: 'items:reject',
  },
  categories: {
    read: 'categories:read',
    create: 'categories:create',
    update: 'categories:update',
    delete: 'categories:delete',
  },
  tags: {
    read: 'tags:read',
    create: 'tags:create',
    update: 'tags:update',
    delete: 'tags:delete',
  },
  roles: {
    read: 'roles:read',
    create: 'roles:create',
    update: 'roles:update',
    delete: 'roles:delete',
  },
  users: {
    read: 'users:read',
    create: 'users:create',
    update: 'users:update',
    delete: 'users:delete',
    assignRoles: 'users:assignRoles',
  },
  analytics: {
    read: 'analytics:read',
    export: 'analytics:export',
  },
  system: {
    settings: 'system:settings',
  },
} as const;
```

### Pełna lista uprawnień

|Zasób|Działania|
|----------|---------|
|`items`|`read`, `create`, `update`, `delete`, `review`, `approve`, `reject`|
|`categories`|`read`, `create`, `update`, `delete`|
|`tags`|`read`, `create`, `update`, `delete`|
|`roles`|`read`, `create`, `update`, `delete`|
|`users`|`read`, `create`, `update`, `delete`, `assignRoles`|
|`analytics`|`read`, `export`|
|`system`|`settings`|

## Typ zezwolenia bezpieczny dla typu

Typ `Permission` jest wyodrębniany ze stałej `PERMISSIONS` za pomocą rekurencyjnych typów warunkowych:

```typescript
type PermissionValues<T> = T extends Record<string, infer U>
  ? U extends Record<string, infer V>
    ? V extends string ? V : never
    : never
  : never;

export type Permission = PermissionValues<typeof PERMISSIONS>;
// Resolves to: 'items:read' | 'items:create' | ... | 'system:settings'
```

Zapewnia to bezpieczeństwo w czasie kompilacji: każdy ciąg uprawnień, który nie istnieje w stałej `PERMISSIONS`, spowoduje błąd TypeScriptu.

## Funkcje zapytań

```typescript
// Get all permissions as a flat array
export function getAllPermissions(): Permission[];

// Get permissions for a specific resource
export function getPermissionsForResource(resource: keyof typeof PERMISSIONS): Permission[];

// Validate whether a string is a valid permission
export function isValidPermission(permission: string): permission is Permission;
```

## Role domyślne

Dwie wbudowane definicje ról zapewniają punkty wyjścia:

```typescript
export const DEFAULT_ROLES = {
  SUPER_ADMIN: {
    id: 'super-admin',
    name: 'Super Administrator',
    description: 'Full system access with all permissions',
    permissions: getAllPermissions(), // Every permission
  },
  CONTENT_MANAGER: {
    id: 'content-manager',
    name: 'Content Manager',
    description: 'Manage content including items, categories, and tags',
    permissions: [
      ...getPermissionsForResource('items'),
      ...getPermissionsForResource('categories'),
      ...getPermissionsForResource('tags'),
    ],
  },
} as const;
```

## Grupy uprawnień

Grupy organizują uprawnienia do wyświetlania interfejsu użytkownika za pomocą ikon i opisów:

```typescript
export interface PermissionGroup {
  id: string;
  name: string;
  description: string;
  icon: string;       // Lucide icon name
  permissions: Permission[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'content',
    name: 'Content Management',
    description: 'Manage items, categories, and tags',
    icon: 'FileText',
    permissions: [...items, ...categories, ...tags],
  },
  {
    id: 'users',
    name: 'User Management',
    description: 'Manage users and their roles',
    icon: 'Users',
    permissions: [...users, ...roles],
  },
  {
    id: 'system',
    name: 'System & Analytics',
    description: 'System settings and analytics access',
    icon: 'Settings',
    permissions: [...analytics, ...system],
  },
];
```

### Funkcje zapytań grupowych

```typescript
// Find which group a permission belongs to
export function getPermissionGroup(permission: Permission): PermissionGroup | undefined;

// Get all permissions in a group by group ID
export function getPermissionsByGroup(groupId: string): Permission[];
```

### Formatowanie wyświetlania uprawnień

```typescript
// Format for display: "items:approve" -> "Approve Items"
export function formatPermissionName(permission: Permission): string;

// Generate description: "items:approve" -> "Approve submissions items and submissions"
export function formatPermissionDescription(permission: Permission): string;
```

Narzędzie do formatowania opisu używa tabel przeglądowych zarówno dla akcji, jak i zasobów:

|Akcja|Opis Prefiks|
|--------|-------------------|
|`read`|Zobacz i uzyskaj dostęp|
|`create`|Utwórz nowe|
|`update`|Edytuj istniejące|
|`delete`|Usuń|
|`review`|Przejrzyj i moderuj|
|`approve`|Zatwierdź zgłoszenia|
|`reject`|Odrzuć zgłoszenia|
|`assignRoles`|Assign roles to|
|`export`|Eksportuj dane z|
|`settings`|Zarządzaj ustawieniami dla|

## Zarządzanie stanem uprawnień

Moduł narzędzi udostępnia funkcje zarządzania stanem uprawnień w interfejsie użytkownika:

### Tworzenie stanu z uprawnień

```typescript
export function createPermissionState(currentPermissions: Permission[]): PermissionState;
// Returns: { 'items:read': true, 'items:create': true, ... }
```

### Wyodrębnianie wybranych uprawnień

```typescript
export function getSelectedPermissions(permissionState: PermissionState): Permission[];
// Filters the state object to return only permissions where value is `true`
```

### Wykrywanie zmian

```typescript
export function calculatePermissionChanges(
  originalPermissions: Permission[],
  newPermissions: Permission[]
): PermissionChanges;
// Returns: { added: Permission[], removed: Permission[] }
```

### Kontrola równości

```typescript
export function arePermissionsEqual(
  permissions1: Permission[],
  permissions2: Permission[]
): boolean;
// Uses Set-based comparison for order-independent equality
```

### Filtrowanie wyszukiwania

```typescript
export function filterPermissions(
  permissions: Permission[],
  searchTerm: string
): Permission[];
// Matches against permission string and space-separated format
// e.g., "assign" matches "users:assignRoles" and "users assignRoles"
```

## Przykład użycia

```typescript
import { PERMISSIONS, getAllPermissions } from '@/lib/permissions/definitions';
import { PERMISSION_GROUPS, formatPermissionName } from '@/lib/permissions/groups';
import { createPermissionState, calculatePermissionChanges } from '@/lib/permissions/utils';

// Check a specific permission
if (userPermissions.includes(PERMISSIONS.items.approve)) {
  // User can approve items
}

// Build a permission editor UI
const state = createPermissionState(user.permissions);

// After user toggles permissions
const changes = calculatePermissionChanges(user.permissions, newPermissions);
console.log(`Added: ${changes.added.length}, Removed: ${changes.removed.length}`);
```
