---
id: permission-definitions
title: Definicje uprawnień
sidebar_label: Definicje uprawnień
sidebar_position: 32
---

# Definicje uprawnień

Szablon zawiera szczegółowy system uprawnień zorganizowany w definicje oparte na zasobach, grupy przyjazne dla interfejsu użytkownika i narzędzia do zarządzania stanem. System ten kontroluje dostęp do funkcji administracyjnych, zarządzania treścią i analiz.

## Struktura pliku

```
lib/permissions/
  definitions.ts    # Permission constants, types, default roles
  groups.ts         # UI-oriented permission groups, formatting helpers
  utils.ts          # State management utilities for permission UIs
```

## Definicje uprawnień (`definitions.ts`)

Wszystkie uprawnienia są zgodne z konwencją nazewnictwa `resource:action`. Obiekt `PERMISSIONS` jest jedynym źródłem prawdy:

```ts
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

### Typ zezwolenia

Typ `Permission` jest automatycznie wyprowadzany z obiektu `PERMISSIONS`, zapewniając bezpieczeństwo typu bez ręcznego powielania:

```ts
type PermissionValues<T> = T extends Record<string, infer U>
  ? U extends Record<string, infer V>
    ? V extends string ? V : never
    : never
  : never;

export type Permission = PermissionValues<typeof PERMISSIONS>;
// Results in: 'items:read' | 'items:create' | ... | 'system:settings'
```

### Funkcje użytkowe

```ts
// Get all permissions as a flat array
getAllPermissions(): Permission[]

// Get permissions for a specific resource
getPermissionsForResource(resource: keyof typeof PERMISSIONS): Permission[]

// Type guard to validate a string is a valid permission
isValidPermission(permission: string): permission is Permission
```

Przykład użycia:

```ts
import { getAllPermissions, getPermissionsForResource, isValidPermission } from '@/lib/permissions/definitions';

const allPerms = getAllPermissions();
// => ['items:read', 'items:create', ..., 'system:settings']

const itemPerms = getPermissionsForResource('items');
// => ['items:read', 'items:create', 'items:update', ...]

if (isValidPermission(userInput)) {
  // userInput is typed as Permission
}
```

### Role domyślne

Dwie wbudowane definicje ról zapewniają rozsądne wartości domyślne:

```ts
export const DEFAULT_ROLES = {
  SUPER_ADMIN: {
    id: 'super-admin',
    name: 'Super Administrator',
    description: 'Full system access with all permissions',
    permissions: getAllPermissions(),
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

## Grupy uprawnień (`groups.ts`)

Grupy uprawnień organizują uprawnienia do wyświetlania w komponentach interfejsu administratora, takich jak edytory ról:

```ts
export interface PermissionGroup {
  id: string;
  name: string;
  description: string;
  icon: string;        // Lucide icon name
  permissions: Permission[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'content',
    name: 'Content Management',
    description: 'Manage items, categories, and tags',
    icon: 'FileText',
    permissions: [
      ...getPermissionsForResource('items'),
      ...getPermissionsForResource('categories'),
      ...getPermissionsForResource('tags'),
    ],
  },
  {
    id: 'users',
    name: 'User Management',
    description: 'Manage users and their roles',
    icon: 'Users',
    permissions: [
      ...getPermissionsForResource('users'),
      ...getPermissionsForResource('roles'),
    ],
  },
  {
    id: 'system',
    name: 'System & Analytics',
    description: 'System settings and analytics access',
    icon: 'Settings',
    permissions: [
      ...getPermissionsForResource('analytics'),
      ...getPermissionsForResource('system'),
    ],
  },
];
```

### Grupowe funkcje użytkowe

```ts
// Find which group a permission belongs to
getPermissionGroup(permission: Permission): PermissionGroup | undefined

// Get all permissions in a group by ID
getPermissionsByGroup(groupId: string): Permission[]

// Format "items:read" into "Read Items"
formatPermissionName(permission: Permission): string

// Format "items:read" into "View and access items and submissions"
formatPermissionDescription(permission: Permission): string
```

Przykład użycia:

```ts
import {
  getPermissionGroup,
  formatPermissionName,
  formatPermissionDescription,
} from '@/lib/permissions/groups';

const group = getPermissionGroup('items:read');
// => { id: 'content', name: 'Content Management', ... }

formatPermissionName('items:approve');
// => "Approve Items"

formatPermissionDescription('users:assignRoles');
// => "Assign roles to users"
```

## Narzędzia stanu uprawnień (`utils.ts`)

Te funkcje zarządzają stanem przełączania uprawnień w interfejsach administratora (takich jak tworzenie ról lub edytowanie formularzy):

### Tworzenie stanu uprawnień

Konwertuj tablicę uprawnień na mapę logiczną dla interfejsów użytkownika opartych na polach wyboru:

```ts
import { createPermissionState, getSelectedPermissions } from '@/lib/permissions/utils';

const currentPerms: Permission[] = ['items:read', 'items:create'];

const state = createPermissionState(currentPerms);
// => { 'items:read': true, 'items:create': true }

// After user toggles checkboxes...
state['items:update'] = true;
state['items:read'] = false;

const selected = getSelectedPermissions(state);
// => ['items:create', 'items:update']
```

### Obliczanie zmian

Określ, co zostało dodane i usunięte podczas porównywania zestawów uprawnień:

```ts
import { calculatePermissionChanges } from '@/lib/permissions/utils';

const original = ['items:read', 'items:create'];
const updated = ['items:read', 'items:update'];

const changes = calculatePermissionChanges(original, updated);
// => { added: ['items:update'], removed: ['items:create'] }
```

### Porównywanie uprawnień

Sprawdź, czy dwie tablice uprawnień zawierają te same uprawnienia niezależnie od kolejności:

```ts
import { arePermissionsEqual } from '@/lib/permissions/utils';

arePermissionsEqual(['items:read', 'items:create'], ['items:create', 'items:read']);
// => true
```

### Filtrowanie uprawnień

Przeszukaj uprawnienia według słowa kluczowego:

```ts
import { filterPermissions } from '@/lib/permissions/utils';

const allPerms = getAllPermissions();
const results = filterPermissions(allPerms, 'delete');
// => ['items:delete', 'categories:delete', 'tags:delete', ...]
```

## Typowe wzory

### Sprawdzanie uprawnień w komponencie

```ts
import { PERMISSIONS } from '@/lib/permissions/definitions';

function canUserApprove(userPermissions: string[]): boolean {
  return userPermissions.includes(PERMISSIONS.items.approve);
}
```

### Budowanie edytora ról

```ts
import { PERMISSION_GROUPS } from '@/lib/permissions/groups';
import { createPermissionState, getSelectedPermissions } from '@/lib/permissions/utils';

function RoleEditor({ role }) {
  const [permState, setPermState] = useState(
    createPermissionState(role.permissions)
  );

  // Render groups with toggleable checkboxes
  return PERMISSION_GROUPS.map(group => (
    <PermissionGroupCard key={group.id} group={group} state={permState} />
  ));
}
```

## Powiązane pliki

- `lib/permissions/definitions.ts` - Stałe uprawnień, typy i role domyślne
- `lib/permissions/groups.ts` - grupy interfejsu użytkownika i pomocnicy formatowania
- `lib/permissions/utils.ts` - Narzędzia do zarządzania stanem
- `lib/guards/` — Strażnicy tras i komponentów zużywający uprawnienia
