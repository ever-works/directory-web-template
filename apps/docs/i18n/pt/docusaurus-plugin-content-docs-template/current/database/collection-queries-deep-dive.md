---
id: collection-queries-deep-dive
title: Aprofundamento das consultas de coleção (empresa)
sidebar_label: Aprofundamento nas consultas de coleção
sidebar_position: 65
---

# Aprofundamento das consultas de coleção (empresa)

Referência abrangente para todas as operações CRUD de empresa/coleção, associações item-empresa, pesquisa, paginação e funções de consulta estatística.

## Visão geral

A camada de consulta de coleção gerencia empresas e suas associações com itens:

- **`company.queries.ts`** -- CRUD completo da empresa, pesquisa com paginação, vinculação item-empresa (relacionamento 1:1), estatísticas e listagem de itens por empresa

As empresas neste sistema representam as organizações por trás dos itens listados. Cada item pode pertencer a no máximo uma empresa (aplicada por uma restrição única em `itemSlug`).

## Arquivo de origem

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

Obtém uma empresa por domínio usando correspondência sem distinção entre maiúsculas e minúsculas.

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

Atualiza os campos da empresa. Normaliza `domain` e `slug` se fornecido.

```typescript
async function updateCompany(
  id: string,
  data: Partial<Omit<NewCompany, 'id'>>
): Promise<Company | null>
```

**Observação:** remove valores `undefined` da carga útil de atualização para evitar a substituição de campos por nulos.

---

#### `deleteCompany`

Permanently deletes a company.

```typescript
async function deleteCompany(id: string): Promise<boolean>
```

**Returns:** `true` if a record was deleted, `false` if company not found.

---

### Listagem e pesquisa de empresas

#### `listCompanies`

Lista empresas com paginação, pesquisa, filtragem e classificação.

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

**Comportamento de pesquisa:** usa `ILIKE` nos campos `name` e `domain` com escape adequado.

**Dados adicionais:** Retorna `activeCount` e `inactiveCount` globais, independentemente dos filtros aplicados.

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

Lista empresas com a contagem de itens associados a cada uma, oferecendo suporte à classificação por contagem de itens.

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

**Padrão SQL:**

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

Alias compatível com versões anteriores para `linkItemToCompany`. Retorna apenas o objeto de associação.

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

Remove a associação item-empresa. Idempotente – desvincular um mapeamento inexistente é uma operação autônoma.

```typescript
async function unlinkItemFromCompany(
  itemSlug: string
): Promise<{ success: boolean; deleted: boolean }>
```

**Retornos:**
- `success`: Sempre `true` (idempotente)
- `deleted`: `true` se uma associação foi realmente removida

---

#### `removeCompanyFromItem`

Backward-compatible alias for `unlinkItemFromCompany`. Returns `boolean`.

```typescript
async function removeCompanyFromItem(itemSlug: string): Promise<boolean>
```

---

#### `getCompanyByItemSlug`

Obtém a empresa associada a um item.

```typescript
async function getCompanyByItemSlug(itemSlug: string): Promise<Company | null>
```

**Padrão SQL:**

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

Verifica se um item possui uma empresa atribuída.

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

Alias compatível com versões anteriores para `listItemsByCompany`.

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
