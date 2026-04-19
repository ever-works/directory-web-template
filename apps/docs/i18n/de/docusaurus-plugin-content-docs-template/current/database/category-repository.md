---
id: category-repository
title: Kategorie-Repository
sidebar_label: Kategorie-Repository
sidebar_position: 21
---

# Kategorie-Repository

Der `CategoryRepository` verwaltet den Lebenszyklus von Artikelkategorien. Kategorien werden als YAML-Daten im Git-gestützten Inhalts-Repository gespeichert und stellen die primäre organisatorische Taxonomie für Elemente bereit.

**Quelldatei:** `template/lib/repositories/category.repository.ts`

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

## Klassendefinition

```ts
export class CategoryRepository {
  private gitService: any = null;
}
```

### Abhängigkeiten

|Importieren|Zweck|
|--------|---------|
|`CategoryData`, `CategoryWithCount`|Basis- und erweiterte Kategorietypen|
|`CreateCategoryRequest`, `UpdateCategoryRequest`|Mutations-DTOs|
|`CategoryListOptions`|Filter-, Sortier- und Paginierungsoptionen|
|`CATEGORY_VALIDATION`|Konstanten für Validierungseinschränkungen|
|`createCategoryGitService`|Factory für den Git-Speicherdienst|
|`coreConfig`|Zentralisierte Konfiguration|

---

## Git Service Initialization

The private `getGitService()` method lazily initializes the Git service by:

1. Reading `coreConfig.content.dataRepository` for the GitHub repository URL
2. Parsing the URL to extract `owner` and `repo`
3. Using `coreConfig.content.ghToken` for authentication
4. Using `coreConfig.content.githubBranch` (default: `"main"`) for the target branch

Throws descriptive errors if configuration is missing or malformed.

---

## Abfragemethoden

### `findAll(options?): Promise<CategoryWithCount[]>`

Gibt alle Kategorien mit optionaler Sortierung zurück.

```ts
async findAll(options: CategoryListOptions = {}): Promise<CategoryWithCount[]>
```

**Verhalten:**
- Alle Kategorien werden als aktiv behandelt (das Feld `isActive` wurde entfernt)
- Die Option `includeInactive` wird aus Gründen der Abwärtskompatibilität akzeptiert, hat jedoch keine Filterwirkung
- Wendet die Sortierung nach der privaten Methode `sortCategories` an

**Sortieroptionen:**

|`sortBy`|`sortOrder`|Verhalten|
|----------|-------------|----------|
|`'name'` (Standard)|`'asc'` (Standard)|Alphabetisch von A bis Z|
|`'name'`|`'desc'`|Alphabetisch Z-A|

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

Ruft eine einzelne Kategorie anhand ihrer eindeutigen ID ab.

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

## Mutationsmethoden

### `create(data): Promise<CategoryData>`

Erstellt nach der Validierung und der Überprüfung doppelter Namen eine neue Kategorie.

```ts
async create(data: CreateCategoryRequest): Promise<CategoryData>
```

**Verarbeitungsschritte:**

1. Validiert die Eingabe über `validateCategoryData`
2. Prüft auf doppelte Namen über `checkDuplicateName`
3. Erstellt über `gitService.createCategory`

**Validierungsregeln:**
- `name` muss zwischen den Zeichen `CATEGORY_VALIDATION.NAME_MIN_LENGTH` und `NAME_MAX_LENGTH` liegen
- `id` muss zwischen 3 und 50 Zeichen lang sein
- `id` muss mit `/^[a-z0-9-]+$/` übereinstimmen (nur Kleinbuchstaben, Zahlen, Bindestriche)

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

Führt ein endgültiges Löschen einer Kategorie aus dem Git-Repository durch.

```ts
async delete(id: string): Promise<void>
```

Delegierte an `hardDelete(id)`.

---

### `hardDelete(id): Promise<void>`

Permanently removes a category from the Git repository.

```ts
async hardDelete(id: string): Promise<void>
```

---

### `reorder(categoryIds): Promise<void>`

Ordnet Kategorien basierend auf dem bereitgestellten ID-Array neu an.

```ts
async reorder(categoryIds: string[]): Promise<void>
```

**Verarbeitungsschritte:**

1. Liest alle aktuellen Kategorien
2. Ordnet sie neu an, damit sie mit der angegebenen ID-Sequenz übereinstimmen
3. Fügt alle Kategorien hinzu, die nicht in der Nachbestellungsliste enthalten sind
4. Schreibt die neu geordnete Liste über `gitService.writeCategories` zurück

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

## Singleton-Export

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

## Verwandte Dateien

|Datei|Beziehung|
|------|-------------|
|`lib/services/category-git.service.ts`|Git-Speicher-Backend|
|`lib/types/category.ts`|Typdefinitionen und Validierungskonstanten|
|`lib/config/config-service.ts`|Konfiguration für Repository-URL und Token|
|`lib/repositories/item.repository.ts`|Referenzkategorien für Artikel|
