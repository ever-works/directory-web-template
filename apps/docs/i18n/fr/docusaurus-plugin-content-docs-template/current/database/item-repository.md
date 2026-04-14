---
id: item-repository
title: Référentiel d'articles
sidebar_label: Référentiel d'articles
sidebar_position: 16
---

# Référentiel d'articles

La classe `ItemRepository` fournit la couche principale d'accès aux données pour gérer les éléments (listes/soumissions) dans le modèle. Il délègue le stockage à un service soutenu par Git et ajoute en plus la validation, le filtrage, la pagination, la journalisation d'audit et la suppression logicielle.

**Fichier source :** `template/lib/repositories/item.repository.ts`

---

## Architecture Overview

```
API Route / Server Action
        |
  ItemRepository          <-- validation, filtering, audit
        |
  ItemGitService          <-- Git read/write via GitHub API
        |
  GitHub Repository       <-- .content/data/*.yml files
```

The repository lazily initializes an `ItemGitService` instance by parsing the `DATA_REPOSITORY` environment variable for the GitHub owner/repo pair and authenticating with `GH_TOKEN`.

---

## Définition de classe

```ts
export class ItemRepository {
  private gitService: ItemGitService | null = null;
}
```

### Dépendances

|Importer|Objectif|
|--------|---------|
|`ItemData`, `CreateItemRequest`, `UpdateItemRequest`, `ReviewRequest`, `ItemListOptions`|Tapez les définitions de `@/lib/types/item`|
|`createItemGitService` / `ItemGitService`|Service de stockage basé sur Git|
|`getContentPath`|Résout le répertoire de contenu local par rapport à Vercel|
|`coreConfig`|Service de configuration centralisé|
|`itemAuditService` / `AuditUser`|Journalisation de la piste d'audit|

---

## Private Methods

### `getGitService(): Promise<ItemGitService>`

Lazily creates and caches the Git service singleton. Reads `coreConfig.content.dataRepository` and `coreConfig.content.ghToken`, parses the GitHub URL to extract `owner` and `repo`, and calls `createItemGitService` with a configuration object containing branch, data directory, and items directory paths.

Throws an `Error` if `DATA_REPOSITORY` or `GH_TOKEN` is missing or the URL format is invalid.

---

## Méthodes de requête

### `findAll(options?: ItemListOptions): Promise<ItemData[]>`

Renvoie tous les éléments correspondant aux filtres fournis. Applique la chaîne de filtres suivante dans l'ordre :

1. **statut** -- correspondance exacte sur `item.status`
2. **catégories** -- Logique OU ; l'article doit contenir au moins une des catégories demandées
3. **balises** -- Logique OU ; l'article doit contenir au moins une des balises demandées
4. **submitBy** -- correspondance exacte sur `item.submitted_by`
5. **recherche** -- correspondance de sous-chaîne insensible à la casse sur `item.name` ou `item.description`

```ts
async findAll(options: ItemListOptions = {}): Promise<ItemData[]>
```

|Paramètre|Tapez|Par défaut|Descriptif|
|-----------|------|---------|-------------|
|`options.status`|`string`| -- |Filtrer par statut d'article|
|`options.categories`|`string[]`| -- |Filtrer par catégorie limaces (OR)|
|`options.tags`|`string[]`| -- |Filtrer par noms de balises (OR)|
|`options.submittedBy`|`string`| -- |Filtrer par ID utilisateur de l'expéditeur|
|`options.search`|`string`| -- |Recherche en texte libre|
|`options.includeDeleted`|`boolean`|`false`|Inclure les éléments supprimés de manière réversible|

---

### `findAllPaginated(page?, limit?, options?): Promise<PaginatedResult>`

Server-side paginated query that delegates to `gitService.getItemsPaginated`. Supports the same filter options as `findAll` plus `sortBy` and `sortOrder`.

```ts
async findAllPaginated(
  page: number = 1,
  limit: number = 10,
  options: ItemListOptions = {}
): Promise<{
  items: ItemData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}>
```

---

### `findById(id, includeDeleted?): Promise<ItemData | null>`

Recherche un seul élément par son identifiant unique.

```ts
async findById(id: string, includeDeleted: boolean = false): Promise<ItemData | null>
```

---

### `findBySlug(slug, includeDeleted?): Promise<ItemData | null>`

Looks up a single item by its URL slug.

```ts
async findBySlug(slug: string, includeDeleted: boolean = false): Promise<ItemData | null>
```

---

### `findManyBySlugs(slugs, includeDeleted?): Promise<ItemData[]>`

Recherche par lots de plusieurs éléments par leurs slugs. Renvoie un tableau vide si l'entrée est vide.

```ts
async findManyBySlugs(slugs: string[], includeDeleted: boolean = false): Promise<ItemData[]>
```

---

## Mutation Methods

### `create(data, auditUser?): Promise<ItemData>`

Creates a new item after running `validateCreateData`. Logs the creation via `itemAuditService.logCreation` (best-effort -- failures are warned but not thrown).

```ts
async create(data: CreateItemRequest, auditUser?: AuditUser): Promise<ItemData>
```

**Validation rules** enforced by `validateCreateData`:
- `id`, `name`, `slug`, `description`, `source_url` are all required and non-empty
- `slug` must match `/^[a-z0-9-]+$/`
- `source_url` must be a valid URL (parsed via `new URL()`)

---

### `update(id, data, auditUser?): Promise<ItemData>`

Met à jour un élément existant. Capture l’état précédent pour la journalisation des différences d’audit.

```ts
async update(id: string, data: UpdateItemRequest, auditUser?: AuditUser): Promise<ItemData>
```

---

### `batchUpdate(updates, auditUser?): Promise<ItemData[]>`

Applies multiple updates in a single Git commit for atomicity. Pre-validates all entries before writing any. After committing, logs each change to the audit trail.

```ts
async batchUpdate(
  updates: Array<{ id: string; data: UpdateItemRequest }>,
  auditUser?: AuditUser
): Promise<ItemData[]>
```

Uses `gitService.updateItemWithoutCommit` for each item, then calls `gitService.commitAndPushBatch` once.

---

### `review(id, reviewData, auditUser?): Promise<ItemData>`

Examine un élément (approuve ou rejette). Valide que `reviewData.status` est soit `"approved"`, soit `"rejected"`.

```ts
async review(id: string, reviewData: ReviewRequest, auditUser?: AuditUser): Promise<ItemData>
```

---

### `delete(id, auditUser?): Promise<void>`

Hard-deletes an item permanently from the Git repository.

```ts
async delete(id: string, auditUser?: AuditUser): Promise<void>
```

---

### `softDelete(id, auditUser?): Promise<ItemData>`

Marque un élément comme supprimé (définit `deleted_at`) sans supprimer le fichier.

```ts
async softDelete(id: string, auditUser?: AuditUser): Promise<ItemData>
```

---

### `restore(id, auditUser?): Promise<ItemData>`

Restores a previously soft-deleted item by clearing the `deleted_at` timestamp.

```ts
async restore(id: string, auditUser?: AuditUser): Promise<ItemData>
```

---

## Méthodes utilitaires

### `checkDuplicateId(id): Promise<boolean>`

Renvoie `true` si un élément (y compris supprimé) partage l'ID donné.

### `checkDuplicateSlug(slug): Promise<boolean>`

Renvoie `true` si un élément (y compris supprimé) partage le slug donné.

### `getStats(options?): Promise<StatsObject>`

Renvoie le nombre d’états filtrés par les contraintes facultatives `submittedBy`, `search`, `categories` et `tags`.

```ts
async getStats(options?: {
  submittedBy?: string;
  search?: string;
  categories?: string[];
  tags?: string[];
}): Promise<{
  total: number;
  draft: number;
  pending: number;
  approved: number;
  rejected: number;
  deleted: number;
}>
```

Les éléments avec un horodatage `deleted_at` sont comptés séparément des éléments actifs.

---

## Audit Trail Integration

Every mutation method accepts an optional `AuditUser` parameter. When provided, the repository logs the action via `itemAuditService`:

| Method | Audit Call |
|--------|-----------|
| `create` | `logCreation(item, auditUser)` |
| `update` | `logUpdate(previousItem, updatedItem, auditUser)` |
| `batchUpdate` | `logUpdate(...)` for each changed item |
| `review` | `logReview(item, previousStatus, notes, auditUser)` |
| `delete` | `logDeletion(item, auditUser, false)` |
| `softDelete` | `logDeletion(item, auditUser, true)` |
| `restore` | `logRestoration(item, auditUser)` |

All audit calls are wrapped in try/catch and log warnings on failure -- they never cause the parent operation to fail.

---

## Exemple d'utilisation

```ts
import { ItemRepository } from '@/lib/repositories/item.repository';

const repo = new ItemRepository();

// List approved items in a category
const items = await repo.findAll({
  status: 'approved',
  categories: ['developer-tools'],
});

// Paginated query
const page = await repo.findAllPaginated(1, 20, { search: 'timer' });

// Create with audit
const newItem = await repo.create(
  { id: 'my-tool', name: 'My Tool', slug: 'my-tool', description: '...', source_url: 'https://...' },
  { id: 'user-123', email: 'admin@example.com' }
);
```
