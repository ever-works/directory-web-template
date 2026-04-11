---
id: security-config
title: Configuration sécurité
sidebar_label: Config sécurité
sidebar_position: 5
---

# Configuration sécurité

Le template implémente une stratégie de sécurité en profondeur avec un contrôle d'accès basé sur les permissions, la validation des entrées, des réponses d'erreur sécurisées et la sanitisation des URL.

## Système de permissions

Le template utilise un modèle de permission granulaire ressource-action défini dans `lib/permissions/definitions.ts` et appliqué via `lib/middleware/permission-check.ts`.

### Format des permissions

Les permissions suivent un format `ressource:action` :

```
items:read
items:create
items:update
items:delete
items:review
items:approve
items:reject
categories:read
categories:create
users:assignRoles
analytics:read
system:settings
```

### Fonctions de vérification des permissions

```ts
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasResourcePermission,
  canManageResource,
  canReviewItems,
  canManageUsers,
  canManageRoles,
  canViewAnalytics,
  isSuperAdmin
} from '@/lib/middleware/permission-check';

// Vérifier une permission unique
hasPermission(userPermissions, 'items:create');

// Vérifier si l'utilisateur a L'UNE des permissions données
hasAnyPermission(userPermissions, ['items:review', 'items:approve']);

// Vérifier si l'utilisateur a TOUTES les permissions données
hasAllPermissions(userPermissions, ['items:read', 'items:update']);

// Vérifier une paire ressource:action (avec validation)
hasResourcePermission(userPermissions, 'items', 'delete');

// Vérifier si l'utilisateur peut gérer (créer/modifier/supprimer) une ressource
canManageResource(userPermissions, 'categories');
```

### Interface UserPermissions

```ts
interface UserPermissions {
  userId: string;
  roles: string[];
  permissions: Permission[];
}
```

### Vérifications spécifiques aux rôles

```ts
// Peut réviser les éléments (revoir, approuver, ou rejeter)
canReviewItems(userPermissions);

// Peut gérer les utilisateurs
canManageUsers(userPermissions);

// Peut gérer les rôles
canManageRoles(userPermissions);

// Peut voir les analytics
canViewAnalytics(userPermissions);

// Est super administrateur
isSuperAdmin(userPermissions);
```
