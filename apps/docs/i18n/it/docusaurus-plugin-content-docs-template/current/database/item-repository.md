---
id: item-repository
title: Archivio articoli
sidebar_label: Archivio articoli
sidebar_position: 16
---

# Archivio articoli

La classe `ItemRepository` fornisce il livello di accesso ai dati primario per la gestione degli elementi (elenchi/invii) nel modello. Delega l'archiviazione a un servizio supportato da Git e aggiunge in più il supporto di convalida, filtraggio, impaginazione, registrazione di controllo e eliminazione temporanea.

**File sorgente:** `template/lib/repositories/item.repository.ts`

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

## Definizione di classe

```ts
export class ItemRepository {
  private gitService: ItemGitService | null = null;
}
```

### Dipendenze

|Importa|Scopo|
|--------|---------|
|`ItemData`, `CreateItemRequest`, `UpdateItemRequest`, `ReviewRequest`, `ItemListOptions`|Definizioni di tipo da `@/lib/types/item`|
|`createItemGitService` / `ItemGitService`|Servizio di archiviazione supportato da Git|
|`getContentPath`|Risolve la directory dei contenuti locale e Vercel|
|`coreConfig`|Servizio di configurazione centralizzata|
|`itemAuditService` / `AuditUser`|Registrazione della traccia di controllo|

---

## Private Methods

### `getGitService(): Promise<ItemGitService>`

Lazily creates and caches the Git service singleton. Reads `coreConfig.content.dataRepository` and `coreConfig.content.ghToken`, parses the GitHub URL to extract `owner` and `repo`, and calls `createItemGitService` with a configuration object containing branch, data directory, and items directory paths.

Throws an `Error` if `DATA_REPOSITORY` or `GH_TOKEN` is missing or the URL format is invalid.

---

## Metodi di interrogazione

### `findAll(options?: ItemListOptions): Promise<ItemData[]>`

Restituisce tutti gli elementi che corrispondono ai filtri forniti. Applica la seguente catena di filtri in ordine:

1. **stato** -- corrispondenza esatta su `item.status`
2. **categorie** -- Logica OR; l'articolo deve contenere almeno una delle categorie richieste
3. **tag** -- Logica OR; l'elemento deve contenere almeno uno dei tag richiesti
4. **inviato da** -- corrispondenza esatta su `item.submitted_by`
5. **ricerca** -- corrispondenza della sottostringa senza distinzione tra maiuscole e minuscole su `item.name` o `item.description`

```ts
async findAll(options: ItemListOptions = {}): Promise<ItemData[]>
```

|Parametro|Digitare|Predefinito|Descrizione|
|-----------|------|---------|-------------|
|`options.status`|`string`| -- |Filtra per stato dell'articolo|
|`options.categories`|`string[]`| -- |Filtra per categoria lumache (OR)|
|`options.tags`|`string[]`| -- |Filtra per nomi di tag (OR)|
|`options.submittedBy`|`string`| -- |Filtra per ID utente mittente|
|`options.search`|`string`| -- |Ricerca a testo libero|
|`options.includeDeleted`|`boolean`|`false`|Includi elementi eliminati temporaneamente|

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

Cerca un singolo elemento in base al suo ID univoco.

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

Ricerca batch di più elementi in base ai relativi slug. Restituisce un array vuoto se l'input è vuoto.

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

Aggiorna un elemento esistente. Cattura lo stato precedente per la registrazione delle differenze di controllo.

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

Esamina un elemento (approvarlo o rifiutarlo). Convalida che `reviewData.status` è `"approved"` o `"rejected"`.

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

Contrassegna un elemento come eliminato (imposta `deleted_at`) senza rimuovere il file.

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

## Metodi di utilità

### `checkDuplicateId(id): Promise<boolean>`

Restituisce `true` se qualsiasi elemento (incluso quello eliminato) condivide l'ID specificato.

### `checkDuplicateSlug(slug): Promise<boolean>`

Restituisce `true` se qualsiasi elemento (incluso quello eliminato) condivide lo slug specificato.

### `getStats(options?): Promise<StatsObject>`

Restituisce i conteggi dello stato filtrati in base ai vincoli opzionali `submittedBy`, `search`, `categories` e `tags`.

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

Gli elementi con un timestamp `deleted_at` vengono conteggiati separatamente dagli elementi attivi.

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

## Esempio di utilizzo

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
