---
id: permission-definitions
title: Définitions des autorisations
sidebar_label: Définitions des autorisations
sidebar_position: 32
---

# Définitions des autorisations

Le modèle comprend un système d'autorisations précis organisé en définitions basées sur les ressources, en groupes conviviaux pour l'interface utilisateur et en utilitaires de gestion d'état. Ce système contrôle l'accès aux fonctionnalités d'administration, à la gestion de contenu et aux analyses.

## Structure du fichier

```
lib/permissions/
  definitions.ts    # Permission constants, types, default roles
  groups.ts         # UI-oriented permission groups, formatting helpers
  utils.ts          # State management utilities for permission UIs
```

## Définitions des autorisations (`definitions.ts`)

Toutes les autorisations suivent une convention de dénomination `resource:action`. L'objet `PERMISSIONS` est la source unique de vérité :

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

### Type d'autorisation

Le type `Permission` est automatiquement dérivé de l'objet `PERMISSIONS`, garantissant la sécurité du type sans duplication manuelle :

```ts
type PermissionValues<T> = T extends Record<string, infer U>
  ? U extends Record<string, infer V>
    ? V extends string ? V : never
    : never
  : never;

export type Permission = PermissionValues<typeof PERMISSIONS>;
// Results in: 'items:read' | 'items:create' | ... | 'system:settings'
```

### Fonctions utilitaires

```ts
// Get all permissions as a flat array
getAllPermissions(): Permission[]

// Get permissions for a specific resource
getPermissionsForResource(resource: keyof typeof PERMISSIONS): Permission[]

// Type guard to validate a string is a valid permission
isValidPermission(permission: string): permission is Permission
```

Exemple d'utilisation :

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

### Rôles par défaut

Deux définitions de rôles intégrées fournissent des valeurs par défaut raisonnables :

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

## Groupes d'autorisations (`groups.ts`)

Les groupes d'autorisations organisent les autorisations à afficher dans les composants de l'interface utilisateur d'administration tels que les éditeurs de rôles :

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

### Fonctions utilitaires de groupe

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

Exemple d'utilisation :

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

## Utilitaires d’état d’autorisation (`utils.ts`)

Ces fonctions gèrent l'état de basculement des autorisations dans les interfaces utilisateur d'administration (telles que la création de rôles ou la modification de formulaires) :

### Création d'un état d'autorisation

Convertissez un tableau d'autorisations en une carte booléenne pour les interfaces utilisateur basées sur des cases à cocher :

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

### Calcul des modifications

Déterminez ce qui a été ajouté et supprimé lors de la comparaison des ensembles d'autorisations :

```ts
import { calculatePermissionChanges } from '@/lib/permissions/utils';

const original = ['items:read', 'items:create'];
const updated = ['items:read', 'items:update'];

const changes = calculatePermissionChanges(original, updated);
// => { added: ['items:update'], removed: ['items:create'] }
```

### Comparaison des autorisations

Vérifiez si deux tableaux d'autorisations contiennent les mêmes autorisations, quel que soit l'ordre :

```ts
import { arePermissionsEqual } from '@/lib/permissions/utils';

arePermissionsEqual(['items:read', 'items:create'], ['items:create', 'items:read']);
// => true
```

### Filtrage des autorisations

Recherchez les autorisations par mot-clé :

```ts
import { filterPermissions } from '@/lib/permissions/utils';

const allPerms = getAllPermissions();
const results = filterPermissions(allPerms, 'delete');
// => ['items:delete', 'categories:delete', 'tags:delete', ...]
```

## Modèles courants

### Vérification des autorisations dans un composant

```ts
import { PERMISSIONS } from '@/lib/permissions/definitions';

function canUserApprove(userPermissions: string[]): boolean {
  return userPermissions.includes(PERMISSIONS.items.approve);
}
```

### Construire un éditeur de rôle

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

## Fichiers associés

- `lib/permissions/definitions.ts` - Constantes d'autorisation, types et rôles par défaut
- `lib/permissions/groups.ts` - Groupes d'interface utilisateur et aides au formatage
- `lib/permissions/utils.ts` - Utilitaires de gestion d'état
- `lib/guards/` - Gardes de routes et de composants qui consomment des autorisations
