---
id: permission-definitions
title: Definizioni dei permessi
sidebar_label: Definizioni dei permessi
sidebar_position: 32
---

# Definizioni dei permessi

Il modello include un sistema di autorizzazioni capillare organizzato in definizioni basate sulle risorse, gruppi di facile utilizzo dell'interfaccia utente e utilità di gestione dello stato. Questo sistema controlla l'accesso alle funzionalità di amministrazione, alla gestione dei contenuti e all'analisi.

## Struttura dei file

```
lib/permissions/
  definitions.ts    # Permission constants, types, default roles
  groups.ts         # UI-oriented permission groups, formatting helpers
  utils.ts          # State management utilities for permission UIs
```

## Definizioni delle autorizzazioni (`definitions.ts`)

Tutte le autorizzazioni seguono una convenzione di denominazione `resource:action`. L'oggetto `PERMISSIONS` è l'unica fonte di verità:

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

### Tipo di autorizzazione

Il tipo `Permission` viene derivato automaticamente dall'oggetto `PERMISSIONS`, garantendo la sicurezza del tipo senza duplicazione manuale:

```ts
type PermissionValues<T> = T extends Record<string, infer U>
  ? U extends Record<string, infer V>
    ? V extends string ? V : never
    : never
  : never;

export type Permission = PermissionValues<typeof PERMISSIONS>;
// Results in: 'items:read' | 'items:create' | ... | 'system:settings'
```

### Funzioni di utilità

```ts
// Get all permissions as a flat array
getAllPermissions(): Permission[]

// Get permissions for a specific resource
getPermissionsForResource(resource: keyof typeof PERMISSIONS): Permission[]

// Type guard to validate a string is a valid permission
isValidPermission(permission: string): permission is Permission
```

Esempio di utilizzo:

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

### Ruoli predefiniti

Due definizioni di ruolo integrate forniscono impostazioni predefinite sensate:

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

## Gruppi di autorizzazione (`groups.ts`)

I gruppi di autorizzazioni organizzano le autorizzazioni per la visualizzazione nei componenti dell'interfaccia utente di amministrazione come gli editor di ruoli:

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

### Funzioni di utilità del gruppo

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

Esempio di utilizzo:

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

## Utilità statali di autorizzazione (`utils.ts`)

Queste funzioni gestiscono lo stato di attivazione/disattivazione delle autorizzazioni nelle interfacce utente di amministrazione (come la creazione di ruoli o la modifica di moduli):

### Creazione dello stato di autorizzazione

Converti un array di permessi in una mappa booleana per interfacce utente basate su caselle di controllo:

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

### Calcolo delle modifiche

Determina cosa è stato aggiunto e rimosso durante il confronto dei set di autorizzazioni:

```ts
import { calculatePermissionChanges } from '@/lib/permissions/utils';

const original = ['items:read', 'items:create'];
const updated = ['items:read', 'items:update'];

const changes = calculatePermissionChanges(original, updated);
// => { added: ['items:update'], removed: ['items:create'] }
```

### Confronto dei permessi

Controlla se due array di permessi contengono gli stessi permessi indipendentemente dall'ordine:

```ts
import { arePermissionsEqual } from '@/lib/permissions/utils';

arePermissionsEqual(['items:read', 'items:create'], ['items:create', 'items:read']);
// => true
```

### Autorizzazioni di filtraggio

Cerca tra i permessi per parola chiave:

```ts
import { filterPermissions } from '@/lib/permissions/utils';

const allPerms = getAllPermissions();
const results = filterPermissions(allPerms, 'delete');
// => ['items:delete', 'categories:delete', 'tags:delete', ...]
```

## Modelli comuni

### Controllo delle autorizzazioni in un componente

```ts
import { PERMISSIONS } from '@/lib/permissions/definitions';

function canUserApprove(userPermissions: string[]): boolean {
  return userPermissions.includes(PERMISSIONS.items.approve);
}
```

### Creazione di un editor di ruoli

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

## File correlati

- `lib/permissions/definitions.ts` - Costanti di autorizzazione, tipi e ruoli predefiniti
- `lib/permissions/groups.ts` - Gruppi dell'interfaccia utente e assistenti per la formattazione
- `lib/permissions/utils.ts` - Utilità di gestione statale
- `lib/guards/` - Protezioni del percorso e dei componenti che consumano autorizzazioni
