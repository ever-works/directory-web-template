---
id: role-types
title: Definizioni del tipo di sistema di ruolo
sidebar_label: Tipi di ruolo
sidebar_position: 19
---

# Definizioni del tipo di sistema di ruolo

**Fonte:** `lib/types/role.ts`, `lib/permissions/definitions.ts`, `lib/db/schema.ts`

I ruoli raggruppano insieme le autorizzazioni e vengono assegnati agli utenti. Il sistema supporta ruoli personalizzati con matrici di autorizzazioni granulari.

## Interfacce

### `RoleData`

La struttura dati del ruolo primario restituita dall'API.

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

|Campo|Descrizione|
|-------|-------------|
|`id`|Slug minuscolo, 3-50 caratteri, modello: `^[a-z0-9-]+$`|
|`name`|Nome leggibile dall'uomo, da 3 a 100 caratteri|
|`isAdmin`|Quando `true`, il ruolo garantisce l'accesso completo al sistema indipendentemente dalle autorizzazioni individuali|
|`permissions`|Matrice di stringhe `resource:action` dal registro delle autorizzazioni|

### `RoleWithCount`

Dati del ruolo estesi con il conteggio delle assegnazioni degli utenti.

```typescript
interface RoleWithCount extends RoleData {
  userCount?: number;  // Number of users with this role
}
```

### `CreateRoleRequest`

Payload per la creazione di un nuovo ruolo.

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

Payload per l'aggiornamento di un ruolo. È richiesto solo `id`; tutti gli altri campi sono facoltativi.

```typescript
interface UpdateRoleRequest extends Partial<Omit<CreateRoleRequest, 'id'>> {
  id: string;
}
```

### `RoleListOptions`

Parametri di query per elencare i ruoli.

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

Risposta dell'elenco dei ruoli impaginati.

```typescript
interface RoleListResponse {
  roles: RoleData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

## Tipi di assegnazione

### `RoleAssignment`

Carico utile di assegnazione minimo.

```typescript
interface RoleAssignment {
  roleId: string;
}
```

### `UserRoleAssignment`

Assegna un ruolo a un utente specifico.

```typescript
interface UserRoleAssignment extends RoleAssignment {
  userId: string;
}
```

### `PermissionAssignment`

Aggiorna le autorizzazioni su un ruolo.

```typescript
interface PermissionAssignment extends RoleAssignment {
  permissions: Permission[];
}
```

### Digitare Alias

```typescript
type RolePermissionUpdate = PermissionAssignment;
type UserRoleUpdate = UserRoleAssignment;
```

## Tipo di stato

```typescript
const ROLE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

type RoleStatus = 'active' | 'inactive';
```

## Regole di convalida

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

|Campo|Regola|
|-------|------|
|`id`|Da 3 a 50 caratteri, solo caratteri alfanumerici minuscoli e trattini|
|`name`|3-100 caratteri|
|`description`|Massimo 500 caratteri|

## Ruoli predefiniti

Il modello viene fornito con due ruoli integrati definiti in `lib/permissions/definitions.ts`:

|Ruolo|ID|Ammin|Autorizzazioni|
|------|----|-------|-------------|
|Super amministratore|`super-admin`|Sì|Tutte le autorizzazioni|
|Gestore dei contenuti|`content-manager`|No|Tutte le autorizzazioni `items`, `categories` e `tags`|

## Schema della banca dati

### `roles` tabella

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

### `user_roles` tabella

Tabella di giunzione che collega gli utenti ai ruoli.

```typescript
{
  userId: text,   // FK -> users.id
  roleId: text,   // FK -> roles.id
  createdAt: timestamp,
}
// Composite primary key: (userId, roleId)
```

## Esempio di utilizzo

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

## Tipi correlati

- [Tipi di autorizzazione](./permission-types.md) -- definizioni e gruppi di autorizzazione
- [Tipi di autenticazione](./auth-types.md): sessioni utente con flag di amministratore
- [Tipi utente](./user-types.md) -- strutture dati utente
