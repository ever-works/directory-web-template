---
id: rbac
title: Contrôle d'accès basé sur les rôles (RBAC)
sidebar_label: RBAC
sidebar_position: 5
---

# Contrôle d'accès basé sur les rôles (RBAC)

Le modèle implémente un système RBAC complet avec quatre tables de base de données, une couche de définitions de permissions typées et des fonctions utilitaires pour l'organisation de l'interface et la gestion des états. Les permissions suivent une convention de nommage `ressource:action` et sont organisées en groupes logiques pour l'interface d'administration.

## Schéma de base de données

### Table des rôles

```typescript
export const roles = pgTable('roles', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  isAdmin: boolean('is_admin').notNull().default(false),
  status: text('status'),        // 'active' | 'inactive'
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),  // Suppression douce
});
```

### Table des permissions

```typescript
export const permissions = pgTable('permissions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  key: text('key').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

Le champ `key` stocke l'identifiant de permission au format `ressource:action` (ex : `items:create`).

## Format des permissions

Les permissions suivent la convention `ressource:action` :

| Permission       | Description                       |
| ---------------- | --------------------------------- |
| `items:create`   | Créer de nouveaux éléments        |
| `items:update`   | Modifier les éléments existants   |
| `items:delete`   | Supprimer des éléments            |
| `users:manage`   | Gérer les utilisateurs            |
| `admin:access`   | Accéder au tableau de bord admin  |

## Vérification des permissions

### Dans les composants serveur

```typescript
import { checkPermission } from '@/lib/auth/permissions';

// Vérifier si l'utilisateur a la permission
const canCreate = await checkPermission(session, 'items:create');
if (!canCreate) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

### Dans les composants React

```typescript
import { useRolePermissions } from '@/hooks/use-role-permissions';

function AdminPanel() {
  const { hasPermission } = useRolePermissions();
  
  return (
    <div>
      {hasPermission('items:create') && (
        <button>Créer un élément</button>
      )}
    </div>
  );
}
```

## Rôles intégrés

| Rôle          | Description                                    |
| ------------- | ---------------------------------------------- |
| `admin`       | Accès complet à toutes les fonctionnalités      |
| `moderator`   | Peut modérer le contenu et les utilisateurs    |
| `client`      | Accès aux fonctionnalités du tableau de bord client |
| `viewer`      | Accès en lecture seule                          |

## Assigner des rôles

```typescript
// Assigner un rôle à un utilisateur
await assignRole(userId, roleId);

// Supprimer un rôle d'un utilisateur
await removeRole(userId, roleId);

// Obtenir les permissions d'un utilisateur
const permissions = await getUserPermissions(userId);
```
