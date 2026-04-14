---
id: items-queries-deep-dive
title: Aprofundamento nas consultas de itens
sidebar_label: Aprofundamento nas consultas de itens
sidebar_position: 60
---

# Aprofundamento nas consultas de itens

Referência abrangente para todas as funções de consulta de banco de dados relacionadas a itens, incluindo identificação de itens, normalização de slug, rastreamento de visualização e agregação de visualização.

## Visão geral

A camada de consulta de item é dividida em dois módulos:

- **`item.queries.ts`** -- Identificação de item e utilitários de normalização de slug
- **`item-view.queries.ts`** -- Acompanhamento de visualização de itens com desduplicação e agregação diárias

Os itens no modelo Ever Works são armazenados como arquivos YAML em um repositório CMS baseado em Git. O banco de dados armazena **dados de engajamento** (votos, comentários, visualizações, favoritos) codificados por slugs de item, não pelo conteúdo do item em si.

## Arquivos de origem

```
lib/db/queries/item.queries.ts
lib/db/queries/item-view.queries.ts
```

---

## Function Reference: item.queries.ts

### `normalizeItemSlug`

Normalizes an item slug to ensure consistency across the system.

```typescript
function normalizeItemSlug(slug: string): string
```

**Parameters:**

| Parameter | Type     | Required | Description          |
|-----------|----------|----------|----------------------|
| `slug`    | `string` | Yes      | Raw slug input       |

**Returns:** `string` -- Normalized slug (lowercase, trimmed)

**Throws:**
- `Error` if slug is falsy, not a string, empty after trimming, or contains invalid characters

**Validation Rules:**
- Must be a non-empty string
- After normalization: lowercase and trimmed
- Must match regex `/^[a-zA-Z0-9_-]+$/` (alphanumeric, hyphens, underscores only)

**Usage Example:**

```typescript
import { normalizeItemSlug } from '@/lib/db/queries';

const slug = normalizeItemSlug('My-Cool-Tool');
// Returns: 'my-cool-tool'

normalizeItemSlug(''); // Throws Error
normalizeItemSlug('invalid slug!'); // Throws Error
```

---

### `getItemIdFromSlug`

Mapeia um slug de item para um itemId para operações de banco de dados. Neste sistema, o itemId É o slug normalizado.

```typescript
function getItemIdFromSlug(slug: string): string
```

**Parâmetros:**

|Parâmetro|Tipo|Obrigatório|Descrição|
|-----------|----------|----------|-------------|
|`slug`|`string`|Sim|Lesma de item|

**Retorna:** `string` -- Slug normalizado como o itemId

**Padrão SQL:** Nenhuma consulta ao banco de dados – delega para `normalizeItemSlug`.

---

### `validateItemExists`

Validates if a slug exists in the content system. Currently a placeholder that validates slug format only.

```typescript
async function validateItemExists(slug: string): Promise<boolean>
```

**Parameters:**

| Parameter | Type     | Required | Description            |
|-----------|----------|----------|------------------------|
| `slug`    | `string` | Yes      | Item slug to validate  |

**Returns:** `Promise<boolean>` -- `true` if slug format is valid, `false` otherwise

**Note:** This function currently only validates format. It does not check against the actual Git-based content system.

---

## Referência de função: item-view.queries.ts

### `recordItemView`

Registra uma visualização de item com desduplicação diária. Usa `ON CONFLICT DO NOTHING` para ignorar silenciosamente visualizações duplicadas para o mesmo item, visualizador e data UTC.

```typescript
async function recordItemView(
  view: Pick<NewItemView, 'itemId' | 'viewerId' | 'viewedDateUtc'>
): Promise<boolean>
```

**Parâmetros:**

|Parâmetro|Tipo|Obrigatório|Descrição|
|---------------------|----------|----------|------------------------------------|
|`view.itemId`|`string`|Sim|Lesma de item|
|`view.viewerId`|`string`|Sim|Identificador do visualizador (usuário/anônimo)|
|`view.viewedDateUtc`|`string`|Sim|Sequência de data UTC (AAAA-MM-DD)|

**Retorna:** `Promise<boolean>` -- `true` se uma nova visualização foi gravada, `false` se for uma duplicata

**Padrão SQL:**

```sql
INSERT INTO item_views (item_id, viewer_id, viewed_date_utc)
VALUES (?, ?, ?)
ON CONFLICT DO NOTHING
RETURNING id;
```

**Notas de desempenho:**
- Usa `ON CONFLICT DO NOTHING` para inserções idempotentes
- Restrição exclusiva em `(itemId, viewerId, viewedDateUtc)` garante desduplicação diária
- Nenhuma viagem de ida e volta necessária para verificar duplicatas

---

### `getTotalViewsCount`

Gets the total view count for a set of items.

```typescript
async function getTotalViewsCount(itemSlugs: string[]): Promise<number>
```

**Parameters:**

| Parameter   | Type       | Required | Description               |
|-------------|------------|----------|---------------------------|
| `itemSlugs` | `string[]` | Yes      | Array of item slugs       |

**Returns:** `Promise<number>` -- Total view count across all specified items

**SQL Pattern:**

```sql
SELECT count(*) FROM item_views WHERE item_id IN (...);
```

**Edge Case:** Returns `0` if `itemSlugs` is empty (no DB query executed).

---

### `getRecentViewsCount`

Obtém a contagem de visualizações de itens nos últimos N dias.

```typescript
async function getRecentViewsCount(
  itemSlugs: string[],
  days: number = 7
): Promise<number>
```

**Parâmetros:**

|Parâmetro|Tipo|Obrigatório|Padrão|Descrição|
|-------------|------------|----------|---------|--------------------------|
|`itemSlugs`|`string[]`|Sim| --      |Matriz de slugs de itens|
|`days`|`number`|Não| `7`     |Número de dias para olhar para trás|

**Retornos:** `Promise<number>` -- Ver contagem do período

**Padrão SQL:**

```sql
SELECT count(*) FROM item_views
WHERE item_id IN (...) AND viewed_date_utc >= ?;
```

**Notas de desempenho:**
- Usa strings de data UTC para filtragem independente de fuso horário
- Eficiente quando a coluna `viewedDateUtc` é indexada

---

### `getDailyViewsData`

Returns a Map of daily view counts keyed by date string (YYYY-MM-DD) for the last N days.

```typescript
async function getDailyViewsData(
  itemSlugs: string[],
  days: number = 7
): Promise<Map<string, number>>
```

**Parameters:**

| Parameter   | Type       | Required | Default | Description              |
|-------------|------------|----------|---------|--------------------------|
| `itemSlugs` | `string[]` | Yes      | --      | Array of item slugs      |
| `days`      | `number`   | No       | `7`     | Number of days to look back |

**Returns:** `Promise<Map<string, number>>` -- Map of `YYYY-MM-DD` date string to view count

**SQL Pattern:**

```sql
SELECT viewed_date_utc, count(*)
FROM item_views
WHERE item_id IN (...) AND viewed_date_utc >= ?
GROUP BY viewed_date_utc;
```

---

### `getViewsPerItem`

Obtém contagens de visualizações por item para exibição dos itens principais.

```typescript
async function getViewsPerItem(
  itemSlugs: string[]
): Promise<Map<string, number>>
```

**Parâmetros:**

|Parâmetro|Tipo|Obrigatório|Descrição|
|-------------|------------|----------|----------------------|
|`itemSlugs`|`string[]`|Sim|Matriz de slugs de itens|

**Retornos:** `Promise<Map<string, number>>` -- Mapa do slug do item para visualizar a contagem

**Padrão SQL:**

```sql
SELECT item_id, count(*) FROM item_views
WHERE item_id IN (...)
GROUP BY item_id;
```

---

## Helper Functions (Internal)

### `getUtcDateString`

Internal helper that returns a UTC date string for N days ago. Uses UTC methods to avoid timezone-related off-by-one errors.

```typescript
function getUtcDateString(daysAgo: number = 0): string
// Returns: 'YYYY-MM-DD' format
```

---

## Notas de Desempenho

1. **Empty array guard** -- Todas as funções de agregação retornam imediatamente com resultados zero/vazios quando passam por um array `itemSlugs` vazio, evitando consultas desnecessárias ao banco de dados.

2. **Desduplicação diária** -- `recordItemView` usa uma restrição exclusiva e `ON CONFLICT DO NOTHING` para desduplicação eficiente e sem bloqueios, sem pré-verificação.

3. **Datas baseadas em UTC** – A filtragem de datas de exibição usa strings de data UTC (`YYYY-MM-DD`), garantindo um comportamento consistente em todos os fusos horários do servidor.

4. **Normalização de slug** -- `getItemIdFromSlug` é chamado em toda a camada de engajamento (votos, comentários) para garantir a identificação consistente do item.

## Exemplos de uso

### Gravando uma visualização de página

```typescript
import { recordItemView } from '@/lib/db/queries';

const isNew = await recordItemView({
  itemId: 'clockify',
  viewerId: 'user-123',
  viewedDateUtc: '2025-06-15',
});

if (isNew) {
  console.log('New unique view recorded');
}
```

### Construindo um gráfico de visualizações do painel

```typescript
import { getDailyViewsData, getViewsPerItem } from '@/lib/db/queries';

const itemSlugs = ['clockify', 'toggl', 'harvest'];

// Daily trend data
const dailyViews = await getDailyViewsData(itemSlugs, 14);

// Per-item breakdown
const perItemViews = await getViewsPerItem(itemSlugs);
```
