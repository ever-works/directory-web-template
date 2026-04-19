---
id: type-definitions
title: Présentation du système de saisie
sidebar_label: Définitions des types
sidebar_position: 41
---

# Présentation du système de saisie

Le modèle centralise ses définitions de types TypeScript dans `template/lib/types/`. Ce répertoire contient des interfaces, des alias de type, des schémas de validation Zod et des DTO de requête/réponse utilisés dans les référentiels, les services et les routes API.

**Répertoire source :** `template/lib/types/`

---

## Directory Listing

| File | Purpose |
|------|---------|
| `item.ts` | Item data model, create/update/review requests, list options, status types |
| `user.ts` | Authentication user data, create/update requests, Zod validation schemas, list options |
| `role.ts` | Role data model, create/update requests, list options, role-with-count type |
| `tag.ts` | Tag data model, create/update requests, paginated list response |
| `category.ts` | Category data model with count, create/update requests, validation constants, list options |
| `comment.ts` | Comment data structures |
| `vote.ts` | Vote data structures |
| `client.ts` | Client profile types |
| `client-item.ts` | Client-facing item types |
| `profile.ts` | User profile types |
| `survey.ts` | Survey data structures |
| `location.ts` | Location/geography types |
| `sponsor-ad.ts` | Sponsor and advertisement types |
| `twenty-crm-config.types.ts` | Twenty CRM integration configuration types |
| `twenty-crm-entities.types.ts` | Twenty CRM entity model types |
| `twenty-crm-errors.types.ts` | Twenty CRM error handling types |
| `twenty-crm-sync.types.ts` | Twenty CRM synchronization types |

---

## Types de domaines principaux

### Types d'éléments (`item.ts`)

Le système de types d'éléments est le plus complet, couvrant le cycle de vie complet d'une liste d'annuaire.

**Types de clés :**

- **`ItemData`** -- le modèle de données d'élément principal avec des champs pour `id`, `name`, `slug`, `description`, `source_url`, `status`, `category`, `tags`, `collections`, `submitted_by`, `submitted_at`, `deleted_at`, et plus
- **`CreateItemRequest`** -- DTO pour la création d'éléments ; nécessite `id`, `name`, `slug`, `description`, `source_url`
- **`UpdateItemRequest`** -- DTO partiel pour les mises à jour d'éléments ; tous les champs sont facultatifs
- **`ReviewRequest`** -- contient `status` (`'approved'` ou `'rejected'`) et facultatif `review_notes`
- **`ItemListOptions`** -- options de filtrage et de pagination : `status`, `categories`, `tags`, `submittedBy`, `search`, `includeDeleted`, `sortBy`, `sortOrder`

### Types d'utilisateurs (`user.ts`)

Types d'utilisateurs au niveau de l'authentification avec schémas de validation Zod.

**Types de clés :**

- **`AuthUserData`** -- représente un enregistrement d'utilisateur authentifié (id, email, create_at, etc.)
- **`CreateUserRequest`** -- email et mot de passe pour la création d'utilisateur
- **`UpdateUserRequest`** -- champs de mise à jour partielle
- **`UserListOptions`** -- options de pagination et de filtrage
- **`AuthUserListResponse`** -- réponse paginée avec `users`, `total`, `page`, `limit`, `totalPages`
- **`userValidationSchema`** -- Schéma Zod pour la validation complète de la création d'utilisateur
- **`updateUserValidationSchema`** -- Schéma Zod pour la validation partielle des mises à jour utilisateur

### Types de rôles (`role.ts`)

Types de données de rôle pour le système RBAC.

**Types de clés :**

- **`RoleData`** -- enregistrement de rôle avec `id`, `name`, `description`, `permissions`, `isDefault`, `status`, horodatages
- **`CreateRoleRequest`** -- champs nécessaires pour créer un nouveau rôle
- **`UpdateRoleRequest`** -- mise à jour partielle du rôle
- **`RoleListOptions`** -- options de filtrage, notamment `status`, recherche et pagination
- **`RoleWithCount`** -- étend `RoleData` avec `userCount` pour l'affichage administrateur

### Types de balises (`tag.ts`)

Types de données de balise pour le système d’étiquetage/marquage.

**Types de clés :**

- **`TagData`** -- enregistrer l'étiquette avec `id`, `name` et des métadonnées facultatives
- **`CreateTagRequest`** -- nécessite `id` et `name`
- **`UpdateTagRequest`** -- mise à jour partielle des balises
- **`TagListResponse`** -- liste de balises paginées avec `tags`, `total`, `page`, `limit`, `totalPages`

### Types de catégories (`category.ts`)

Types de données de catégorie pour la taxonomie organisationnelle.

**Types de clés :**

- **`CategoryData`** -- enregistrement de catégorie avec `id`, `name`, `description` et métadonnées
- **`CategoryWithCount`** -- étend `CategoryData` avec un nombre d'éléments
- **`CreateCategoryRequest`** -- nécessite `id`, `name`, facultatif `description`
- **`UpdateCategoryRequest`** -- mise à jour partielle de la catégorie (nécessite `id`)
- **`CategoryListOptions`** -- options de filtrage, de tri et de pagination
- **`CATEGORY_VALIDATION`** -- constantes pour la validation de la longueur du champ (nom min/max, description max, contraintes d'ID)

---

## Integration Types

### Twenty CRM Types

Four files define the type system for the Twenty CRM integration:

| File | Contents |
|------|----------|
| `twenty-crm-config.types.ts` | Configuration types for CRM connection settings |
| `twenty-crm-entities.types.ts` | Entity models mapping to CRM objects |
| `twenty-crm-errors.types.ts` | Error types for CRM API error handling |
| `twenty-crm-sync.types.ts` | Synchronization state and operation types |

---

## Conventions de modèle de type

### DTO de requête/réponse

La base de code suit un modèle cohérent pour les objets de transfert de données :

- **`Create[Entity]Request`** -- contient tous les champs obligatoires pour la création
- **`Update[Entity]Request`** -- type partiel où la plupart des champs sont facultatifs ; nécessite généralement `id`
- **`[Entity]ListOptions`** -- paramètres de filtrage, de tri et de pagination
- **`[Entity]ListResponse`** -- réponse paginée avec `items`, `total`, `page`, `limit`, `totalPages`

### Schémas de validation

Les schémas Zod sont colocalisés avec leurs types correspondants :

```ts
// In user.ts
export const userValidationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  // ...
});
```

Les référentiels utilisent `.parse()` ou `.pick()` sur ces schémas avant d'exécuter les mutations.

### Constantes de validation

Pour les entités basées sur Git (catégories, collections), les constantes de validation sont exportées sous forme d'objets simples :

```ts
export const CATEGORY_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  // ...
};
```

Ceux-ci sont référencés dans les méthodes de validation du référentiel.

---

## Type Relationships

```
ItemData
  ├── references CategoryData (via category field)
  ├── references TagData (via tags field)
  ├── references Collection (via collections field)
  └── referenced by ClientDashboardRepository

AuthUserData
  ├── references RoleData (via role assignments)
  └── referenced by UserRepository

RoleData
  ├── contains Permission[] (from permissions/definitions)
  └── referenced by RoleRepository

CategoryData
  └── referenced by items (category field)

TagData
  └── referenced by items (tags field)
```

---

## Directives d'utilisation

1. **Importez toujours les types depuis `@/lib/types/`** plutôt que de les re-déclarer dans les composants ou les routes API
2. **Utilisez les DTO de requête** pour la validation des entrées du gestionnaire d'API, et non pour le modèle de données complet.
3. **Utilisez les schémas Zod** lorsqu'ils sont disponibles (types d'utilisateurs) pour la validation d'exécution
4. **Utilisez des constantes de validation** (catégories, collections) pour des contraintes de champ cohérentes sur le frontend et le backend
5. **Étendez les types localement** uniquement lorsque vous avez besoin de types dérivés spécifiques à un composant qui n'appartiennent pas à la couche partagée

---

## Related Files

| File | Relationship |
|------|-------------|
| `lib/repositories/*.ts` | Consumers of these types for data access |
| `lib/services/*.ts` | Business logic that transforms between these types |
| `lib/permissions/definitions.ts` | Permission type definitions (separate from this directory) |
| `lib/guards/plan-features.guard.ts` | Feature type definitions (in guards, not types directory) |
| `app/api/**` | API routes that accept request DTOs and return response types |
