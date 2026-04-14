---
id: collection-queries-deep-dive
title: Raccolta (Azienda) Query Approfondimento
sidebar_label: Approfondimento delle query sulla raccolta
sidebar_position: 65
---

# Raccolta (Azienda) Query Approfondimento

Riferimento completo per tutte le operazioni CRUD azienda/collezione, associazioni articolo-azienda, funzioni di ricerca, impaginazione e query statistiche.

## Panoramica

Il livello di query della raccolta gestisce le aziende e le loro associazioni con gli elementi:

- **`company.queries.ts`** -- CRUD aziendale completo, ricerca con impaginazione, collegamento articolo-azienda (rapporto 1:1), statistiche ed elenco articoli per azienda

Le aziende in questo sistema rappresentano le organizzazioni dietro gli elementi elencati. Ogni articolo può appartenere al massimo a una società (imposto da un vincolo univoco su `itemSlug`).

## File di origine

```
lib/db/queries/company.queries.ts
```

---

## Function Reference

### Company CRUD

#### `createCompany`

Creates a new company with normalized domain and slug fields.

```typescript
async function createCompany(data: {
  name: string;
  website?: string;
  domain?: string;
  slug?: string;
  status?: 'active' | 'inactive';
}): Promise<Company>
```

**Parameters:**

| Parameter | Type                         | Required | Default    | Description         |
|-----------|------------------------------|----------|------------|---------------------|
| `name`    | `string`                     | Yes      | --         | Company name        |
| `website` | `string`                     | No       | --         | Company website URL |
| `domain`  | `string`                     | No       | --         | Company domain      |
| `slug`    | `string`                     | No       | --         | URL-safe identifier |
| `status`  | `'active'` \| `'inactive'`   | No       | `'active'` | Company status      |

**Normalization:** `domain` and `slug` are automatically lowercased and trimmed. `name` is trimmed.

---

#### `getCompanyById`

```typescript
async function getCompanyById(id: string): Promise<Company | null>
```

---

#### `getCompanyBySlug`

Gets a company by slug using case-insensitive matching.

```typescript
async function getCompanyBySlug(slug: string): Promise<Company | null>
```

**SQL Pattern:**

```sql
SELECT * FROM companies WHERE lower(slug) = ? LIMIT 1;
```

---

#### `getCompanyByDomain`

Ottiene un'azienda in base al dominio utilizzando la corrispondenza senza distinzione tra maiuscole e minuscole.

```typescript
async function getCompanyByDomain(domain: string): Promise<Company | null>
```

---

#### `getCompanyByName`

Gets a company by exact name (case-insensitive).

```typescript
async function getCompanyByName(name: string): Promise<Company | null>
```

---

#### `updateCompany`

Aggiorna i campi aziendali. Normalizza `domain` e `slug` se fornito.

```typescript
async function updateCompany(
  id: string,
  data: Partial<Omit<NewCompany, 'id'>>
): Promise<Company | null>
```

**Nota:** rimuove i valori `undefined` dal payload dell'aggiornamento per evitare di sovrascrivere i campi con null.

---

#### `deleteCompany`

Permanently deletes a company.

```typescript
async function deleteCompany(id: string): Promise<boolean>
```

**Returns:** `true` if a record was deleted, `false` if company not found.

---

### Elenco e ricerca delle aziende

#### `listCompanies`

Elenca le aziende con impaginazione, ricerca, filtraggio e ordinamento.

```typescript
async function listCompanies(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive';
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}): Promise<{
  companies: Company[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  activeCount: number;
  inactiveCount: number;
}>
```

**Comportamento di ricerca:** Utilizza `ILIKE` su entrambi i campi `name` e `domain` con escape corretto.

**Dati aggiuntivi:** Restituisce `activeCount` e `inactiveCount` globali indipendentemente dai filtri applicati.

---

#### `getCompaniesStats`

Gets company count statistics by status.

```typescript
async function getCompaniesStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
}>
```

---

#### `getCompaniesWithItemCount`

Elenca le aziende con il conteggio degli articoli associati a ciascuna, supportando l'ordinamento in base al conteggio degli articoli.

```typescript
async function getCompaniesWithItemCount(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive';
  sortBy?: 'name' | 'createdAt' | 'itemCount';
  sortOrder?: 'asc' | 'desc';
}): Promise<{
  companies: (Company & { itemCount: number })[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}>
```

**Modello SQL:**

```sql
SELECT companies.*, count(items_companies.item_slug) as item_count
FROM companies
LEFT JOIN items_companies ON companies.id = items_companies.company_id
WHERE ...
GROUP BY companies.id
ORDER BY item_count DESC
LIMIT ? OFFSET ?;
```

---

### Item-Company Association

#### `linkItemToCompany`

Links an item to a company. Idempotent -- returns existing association if unchanged, updates if company changed, or creates new.

```typescript
async function linkItemToCompany(
  itemSlug: string,
  companyId: string
): Promise<{
  association: ItemCompany;
  created: boolean;
  updated: boolean;
}>
```

**Parameters:**

| Parameter   | Type     | Required | Description |
|-------------|----------|----------|-------------|
| `itemSlug`  | `string` | Yes      | Item slug (normalized to lowercase) |
| `companyId` | `string` | Yes      | Company ID  |

**Behavior:**
1. Validates company exists (throws if not)
2. Checks for existing association
3. If same company: returns existing (no-op), `created: false`, `updated: false`
4. If different company: updates association, `created: false`, `updated: true`
5. If no association: creates new, `created: true`, `updated: false`

**Error Handling:**
- Throws with friendly message if company does not exist
- Handles unique constraint violations gracefully
- Handles foreign key constraint errors

---

#### `assignCompanyToItem`

Alias compatibile con le versioni precedenti per `linkItemToCompany`. Restituisce solo l'oggetto dell'associazione.

```typescript
async function assignCompanyToItem(
  itemSlug: string,
  companyId: string
): Promise<ItemCompany>
```

---

#### `updateItemCompany`

Updates an existing item-company association to point to a different company.

```typescript
async function updateItemCompany(
  itemSlug: string,
  companyId: string
): Promise<ItemCompany | null>
```

---

#### `unlinkItemFromCompany`

Rimuove l'associazione articolo-azienda. Idempotente: scollegare una mappatura inesistente non è un'operazione.

```typescript
async function unlinkItemFromCompany(
  itemSlug: string
): Promise<{ success: boolean; deleted: boolean }>
```

**Resi:**
- `success`: Sempre `true` (idempotente)
- `deleted`: `true` se un'associazione è stata effettivamente rimossa

---

#### `removeCompanyFromItem`

Backward-compatible alias for `unlinkItemFromCompany`. Returns `boolean`.

```typescript
async function removeCompanyFromItem(itemSlug: string): Promise<boolean>
```

---

#### `getCompanyByItemSlug`

Ottiene la società associata a un articolo.

```typescript
async function getCompanyByItemSlug(itemSlug: string): Promise<Company | null>
```

**Modello SQL:**

```sql
SELECT companies.* FROM items_companies
INNER JOIN companies ON items_companies.company_id = companies.id
WHERE items_companies.item_slug = ?
LIMIT 1;
```

---

#### `getCompanyForItem`

Backward-compatible alias for `getCompanyByItemSlug`.

---

#### `itemHasCompany`

Controlla se a un articolo è assegnata una società.

```typescript
async function itemHasCompany(itemSlug: string): Promise<boolean>
```

---

#### `listItemsByCompany`

Lists items associated with a company, with pagination.

```typescript
async function listItemsByCompany(
  companyId: string,
  params?: { page?: number; limit?: number }
): Promise<{
  items: ItemCompany[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}>
```

**Default limit:** 50 items per page.

---

#### `getItemsForCompany`

Alias compatibile con le versioni precedenti per `listItemsByCompany`.

---

## Performance Notes

1. **Case-insensitive lookups** -- `getCompanyBySlug`, `getCompanyByDomain`, and `getCompanyByName` use `lower()` SQL function for case-insensitive matching. For high-volume lookups, consider adding a functional index on `lower(slug)`.

2. **Idempotent operations** -- `linkItemToCompany` and `unlinkItemFromCompany` are designed for safe retry behavior, returning consistent results regardless of how many times they are called.

3. **Search escaping** -- All `ILIKE` search patterns properly escape SQL wildcards (`%`, `_`, `\`).

4. **LEFT JOIN for item counts** -- `getCompaniesWithItemCount` uses `LEFT JOIN` to include companies with zero items in results.

5. **Slug normalization** -- All item slug parameters are lowercased and trimmed before database operations.

## Usage Examples

### Assigning a company to an item

```typescript
import { linkItemToCompany, getCompanyByDomain } from '@/lib/db/queries';

const company = await getCompanyByDomain('toggl.com');
if (company) {
  const result = await linkItemToCompany('toggl-track', company.id);
  if (result.created) {
    console.log('New association created');
  } else if (result.updated) {
    console.log('Company updated for this item');
  }
}
```

### Listing companies with item counts

```typescript
import { getCompaniesWithItemCount } from '@/lib/db/queries';

const result = await getCompaniesWithItemCount({
  page: 1,
  limit: 20,
  sortBy: 'itemCount',
  sortOrder: 'desc',
  status: 'active',
});

result.companies.forEach(c => {
  console.log(`${c.name}: ${c.itemCount} items`);
});
```
