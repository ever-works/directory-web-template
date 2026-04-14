---
id: permissions-system
title: "Machtigingensysteem"
sidebar_label: "Machtigingensysteem"
sidebar_position: 18
---

# Machtigingensysteem

De sjabloon implementeert een gedetailleerd, op bronnen gebaseerd machtigingssysteem met typeveilige machtigingsdefinities, logische groeperingen voor de UI-organisatie en hulpprogrammafuncties voor statusbeheer en wijzigingsdetectie.

## Architectuuroverzicht

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

## Bronbestanden

|Bestand|Doel|
|------|---------|
|`lib/permissions/definitions.ts`|Toestemmingsconstanten, type-extractie, standaardrollen|
|`lib/permissions/groups.ts`|UI-georiënteerde machtigingsgroeperingen met metagegevens|
|`lib/permissions/utils.ts`|Statusbeheer, diff-berekening en filtering|

## Toestemmingsdefinities

Machtigingen volgen de naamgevingsconventie `resource:action`. Het `PERMISSIONS` object organiseert ze op resource:

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

### Volledige machtigingslijst

|Bron|Acties|
|----------|---------|
|`items`|`read`, `create`, `update`, `delete`, `review`, `approve`, `reject`|
|`categories`|`read`, `create`, `update`, `delete`|
|`tags`|`read`, `create`, `update`, `delete`|
|`roles`|`read`, `create`, `update`, `delete`|
|`users`|`read`, `create`, `update`, `delete`, `assignRoles`|
|`analytics`|`read`, `export`|
|`system`|`settings`|

## Type-veilig toestemmingstype

Het `Permission` type wordt geëxtraheerd uit de `PERMISSIONS` constante met behulp van recursieve voorwaardelijke typen:

```typescript
type PermissionValues<T> = T extends Record<string, infer U>
  ? U extends Record<string, infer V>
    ? V extends string ? V : never
    : never
  : never;

export type Permission = PermissionValues<typeof PERMISSIONS>;
// Resolves to: 'items:read' | 'items:create' | ... | 'system:settings'
```

Dit garandeert de veiligheid tijdens het compileren: elke toestemmingsreeks die niet bestaat in de constante `PERMISSIONS` zal een TypeScript-fout veroorzaken.

## Queryfuncties

```typescript
// Get all permissions as a flat array
export function getAllPermissions(): Permission[];

// Get permissions for a specific resource
export function getPermissionsForResource(resource: keyof typeof PERMISSIONS): Permission[];

// Validate whether a string is a valid permission
export function isValidPermission(permission: string): permission is Permission;
```

## Standaardrollen

Twee ingebouwde roldefinities bieden uitgangspunten:

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

## Toestemmingsgroepen

Groepen organiseren machtigingen voor UI-weergave met pictogrammen en beschrijvingen:

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

### Groepsqueryfuncties

```typescript
// Find which group a permission belongs to
export function getPermissionGroup(permission: Permission): PermissionGroup | undefined;

// Get all permissions in a group by group ID
export function getPermissionsByGroup(groupId: string): Permission[];
```

### Opmaak van toestemmingsweergave

```typescript
// Format for display: "items:approve" -> "Approve Items"
export function formatPermissionName(permission: Permission): string;

// Generate description: "items:approve" -> "Approve submissions items and submissions"
export function formatPermissionDescription(permission: Permission): string;
```

De beschrijvingsformatter gebruikt opzoektabellen voor zowel acties als bronnen:

|Actie|Beschrijving Voorvoegsel|
|--------|-------------------|
|`read`|Bekijk en toegang|
|`create`|Maak nieuw|
|`update`|Bestaande bewerken|
|`delete`|Verwijderen|
|`review`|Beoordelen en modereren|
|`approve`|Inzendingen goedkeuren|
|`reject`|Inzendingen weigeren|
|`assignRoles`|Wijs rollen toe aan|
|`export`|Gegevens exporteren van|
|`settings`|Beheer instellingen voor|

## Toestemmingsstatusbeheer

De module voor hulpprogramma's biedt functies voor het beheren van de toestemmingsstatus in de gebruikersinterface:

### Status creëren op basis van machtigingen

```typescript
export function createPermissionState(currentPermissions: Permission[]): PermissionState;
// Returns: { 'items:read': true, 'items:create': true, ... }
```

### Geselecteerde machtigingen extraheren

```typescript
export function getSelectedPermissions(permissionState: PermissionState): Permission[];
// Filters the state object to return only permissions where value is `true`
```

### Wijzigingsdetectie

```typescript
export function calculatePermissionChanges(
  originalPermissions: Permission[],
  newPermissions: Permission[]
): PermissionChanges;
// Returns: { added: Permission[], removed: Permission[] }
```

### Gelijkheidscontrole

```typescript
export function arePermissionsEqual(
  permissions1: Permission[],
  permissions2: Permission[]
): boolean;
// Uses Set-based comparison for order-independent equality
```

### Zoekfiltering

```typescript
export function filterPermissions(
  permissions: Permission[],
  searchTerm: string
): Permission[];
// Matches against permission string and space-separated format
// e.g., "assign" matches "users:assignRoles" and "users assignRoles"
```

## Gebruiksvoorbeeld

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
