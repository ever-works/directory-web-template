---
id: category-repository
title: Référentiel de catégories
sidebar_label: Référentiel de catégories
sidebar_position: 21
---

# Référentiel de catégories

Le `CategoryRepository` gère le cycle de vie des catégories d'articles. Les catégories sont stockées sous forme de données YAML dans le référentiel de contenu basé sur Git et fournissent la taxonomie organisationnelle principale pour les éléments.

**Fichier source :** `template/lib/repositories/category.repository.ts`

---

## Architecture Overview

```
Admin Category UI
        |
  API Route / Server Action
        |
  CategoryRepository
        |
  CategoryGitService
        |
  GitHub Repository (categories.yml)
```

> **Note:** This file uses the `'server-only'` import guard to prevent accidental client-side usage.

---

## Définition de classe

```ts
export class CategoryRepository {
  private gitService: any = null;
}
```

### Dépendances

|Importer|Objectif|
|--------|---------|
|`CategoryData`, `CategoryWithCount`|Types de catégories de base et enrichies|
|`CreateCategoryRequest`, `UpdateCategoryRequest`|DTO de mutation|
|`CategoryListOptions`|Options de filtrage, de tri et de pagination|
|`CATEGORY_VALIDATION`|Constantes de contrainte de validation|
|`createCategoryGitService`|Factory pour le service de stockage Git|
|`coreConfig`|Configuration centralisée|

---

## Git Service Initialization

The private `getGitService()` method lazily initializes the Git service by:

1. Reading `coreConfig.content.dataRepository` for the GitHub repository URL
2. Parsing the URL to extract `owner` and `repo`
3. Using `coreConfig.content.ghToken` for authentication
4. Using `coreConfig.content.githubBranch` (default: `"main"`) for the target branch

Throws descriptive errors if configuration is missing or malformed.

---

## Méthodes de requête

### `findAll(options?): Promise<CategoryWithCount[]>`

Renvoie toutes les catégories avec un tri facultatif.

```ts
async findAll(options: CategoryListOptions = {}): Promise<CategoryWithCount[]>
```

**Comportement :**
- Toutes les catégories sont traitées comme actives (le champ `isActive` a été supprimé)
- L'option `includeInactive` est acceptée pour des raisons de compatibilité ascendante mais n'a aucun effet de filtrage
- Applique le tri via la méthode privée `sortCategories`

**Options de tri :**

|`sortBy`|`sortOrder`|Comportement|
|----------|-------------|----------|
|`'name'` (par défaut)|`'asc'` (par défaut)|Alphabétique A-Z|
|`'name'`|`'desc'`|Alphabétique ZA|

---

### `findAllPaginated(options?): Promise<PaginatedResult>`

Returns a paginated subset of categories.

```ts
async findAllPaginated(options?: CategoryListOptions): Promise<{
  categories: CategoryWithCount[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}>
```

Defaults: `page = 1`, `limit = 10`. Applies all filters and sorting from `findAll` before slicing.

---

### `findById(id): Promise<CategoryData | null>`

Récupère une seule catégorie par son ID unique.

```ts
async findById(id: string): Promise<CategoryData | null>
```

---

### `findBySlug(slug): Promise<CategoryData | null>`

Retrieves a category by slug. Currently delegates to `findById` since the category ID serves as the slug.

```ts
async findBySlug(slug: string): Promise<CategoryData | null>
```

---

## Méthodes de mutation

### `create(data): Promise<CategoryData>`

Crée une nouvelle catégorie après validation et vérification des noms en double.

```ts
async create(data: CreateCategoryRequest): Promise<CategoryData>
```

**Étapes de traitement :**

1. Valide la saisie via `validateCategoryData`
2. Vérifie les noms en double via `checkDuplicateName`
3. Crée via `gitService.createCategory`

**Règles de validation :**
- `name` doit contenir entre `CATEGORY_VALIDATION.NAME_MIN_LENGTH` et `NAME_MAX_LENGTH` caractères
- `id` doit contenir entre 3 et 50 caractères
- `id` doit correspondre à `/^[a-z0-9-]+$/` (minuscules, chiffres, tirets uniquement)

---

### `update(data): Promise<CategoryData>`

Updates an existing category. The `data` object must include the `id` field.

```ts
async update(data: UpdateCategoryRequest): Promise<CategoryData>
```

**Processing steps:**

1. Validates update data (ID required, name constraints if provided)
2. If name is changing, checks for duplicate names excluding the current category
3. Updates through `gitService.updateCategory`

---

### `delete(id): Promise<void>`

Effectue une suppression définitive d'une catégorie du référentiel Git.

```ts
async delete(id: string): Promise<void>
```

Délégués à `hardDelete(id)`.

---

### `hardDelete(id): Promise<void>`

Permanently removes a category from the Git repository.

```ts
async hardDelete(id: string): Promise<void>
```

---

### `reorder(categoryIds): Promise<void>`

Réorganise les catégories en fonction du tableau d'identifiants fourni.

```ts
async reorder(categoryIds: string[]): Promise<void>
```

**Étapes de traitement :**

1. Lit toutes les catégories actuelles
2. Réorganisez-les pour qu'ils correspondent à la séquence d'identification fournie
3. Ajoute toutes les catégories non incluses dans la liste de réorganisation
4. Écrit la liste réorganisée via `gitService.writeCategories`

---

## Private Helper Methods

### `validateCategoryData(data: CreateCategoryRequest): void`

Validates creation data:
- Name length within `CATEGORY_VALIDATION` bounds
- ID between 3 and 50 characters
- ID matches lowercase alphanumeric with hyphens pattern

### `validateUpdateData(data: UpdateCategoryRequest): void`

Validates update data:
- ID is required
- Name constraints enforced if name is provided

### `checkDuplicateName(name, excludeId?): Promise<void>`

Performs a case-insensitive duplicate check across all existing categories. Throws `Error('Category with name "..." already exists')` if a duplicate is found. Optionally excludes a specific category ID (for updates).

### `sortCategories(categories, options): CategoryData[]`

Sorts categories by the specified field and order. Currently supports sorting by `name` only.

---

## Exportation singleton

```ts
export const categoryRepository = new CategoryRepository();
```

---

## Usage Example

```ts
import { categoryRepository } from '@/lib/repositories/category.repository';

// List all categories sorted alphabetically
const categories = await categoryRepository.findAll({
  sortBy: 'name',
  sortOrder: 'asc',
});

// Create a new category
const newCat = await categoryRepository.create({
  id: 'developer-tools',
  name: 'Developer Tools',
  description: 'Tools for software developers',
});

// Paginated listing
const page = await categoryRepository.findAllPaginated({
  page: 1,
  limit: 20,
});

// Reorder categories
await categoryRepository.reorder([
  'developer-tools',
  'productivity',
  'design',
]);
```

---

## Fichiers associés

|Fichier|Relation|
|------|-------------|
|`lib/services/category-git.service.ts`|Back-end de stockage Git|
|`lib/types/category.ts`|Définitions de types et constantes de validation|
|`lib/config/config-service.ts`|Configuration de l'URL du référentiel et des jetons|
|`lib/repositories/item.repository.ts`|Catégories de référence des articles|
