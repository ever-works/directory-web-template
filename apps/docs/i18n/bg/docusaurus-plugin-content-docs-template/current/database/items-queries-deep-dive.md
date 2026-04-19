---
id: items-queries-deep-dive
title: Заявки за артикули Задълбочено гмуркане
sidebar_label: Заявки за артикули Задълбочено гмуркане
sidebar_position: 60
---

# Заявки за артикули Задълбочено гмуркане

Изчерпателна справка за всички функции за заявки към бази данни, свързани с елементи, включително идентификация на елементи, нормализиране на охлюв, проследяване на изгледи и агрегиране на изгледи.

## Преглед

Слоят за заявка на елемент е разделен на два модула:

- **`item.queries.ts`** -- Помощни програми за идентификация на артикул и нормализиране на охлюви
- **`item-view.queries.ts`** -- Проследяване на изглед на артикул с ежедневно премахване на дублиране и агрегиране

Елементите в шаблона Ever Works се съхраняват като YAML файлове в базирано на Git CMS хранилище. Базата данни съхранява **данни за ангажираност** (гласове, коментари, изгледи, любими), въведени от охлузи на артикул, а не самото съдържание на артикула.

## Изходни файлове

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

Съпоставя елемент на елемент към itemId за операции с база данни. В тази система itemId Е нормализираният охлюв.

```typescript
function getItemIdFromSlug(slug: string): string
```

**Параметри:**

|Параметър|Тип|Задължително|Описание|
|-----------|----------|----------|-------------|
|`slug`|`string`|да|елемент плужек|

**Връща:** `string` -- Нормализиран охлюв като itemId

**SQL шаблон:** Няма заявка към базата данни -- делегира на `normalizeItemSlug`.

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

## Препратка към функция: item-view.queries.ts

### `recordItemView`

Записва изглед на елемент с ежедневно дедупликация. Използва `ON CONFLICT DO NOTHING`, за да игнорира тихо дублиращи се изгледи за един и същи елемент, зрител и UTC дата.

```typescript
async function recordItemView(
  view: Pick<NewItemView, 'itemId' | 'viewerId' | 'viewedDateUtc'>
): Promise<boolean>
```

**Параметри:**

|Параметър|Тип|Задължително|Описание|
|---------------------|----------|----------|------------------------------------|
|`view.itemId`|`string`|да|елемент плужек|
|`view.viewerId`|`string`|да|Идентификатор на зрителя (потребител/анонимен)|
|`view.viewedDateUtc`|`string`|да|UTC низ от дати (ГГГГ-ММ-ДД)|

**Връща:** `Promise<boolean>` -- `true` ако е записан нов изглед, `false` ако е дубликат

**SQL модел:**

```sql
INSERT INTO item_views (item_id, viewer_id, viewed_date_utc)
VALUES (?, ?, ?)
ON CONFLICT DO NOTHING
RETURNING id;
```

**Бележки за ефективността:**
- Използва `ON CONFLICT DO NOTHING` за идемпотентни вмъквания
- Уникалното ограничение на `(itemId, viewerId, viewedDateUtc)` гарантира ежедневно премахване на дублиране
- Не е необходимо двупосочно пътуване за проверка за дубликати

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

Получава брой показвания за елементи през последните N дни.

```typescript
async function getRecentViewsCount(
  itemSlugs: string[],
  days: number = 7
): Promise<number>
```

**Параметри:**

|Параметър|Тип|Задължително|По подразбиране|Описание|
|-------------|------------|----------|---------|--------------------------|
|`itemSlugs`|`string[]`|да| --      |Масив от охлюви за артикули|
|`days`|`number`|не| `7`     |Брой дни за поглед назад|

**Връща:** `Promise<number>` -- Брой прегледи за периода

**SQL модел:**

```sql
SELECT count(*) FROM item_views
WHERE item_id IN (...) AND viewed_date_utc >= ?;
```

**Бележки за ефективността:**
- Използва UTC низове за дата за филтриране, независимо от часовата зона
- Ефективно, когато колоната `viewedDateUtc` е индексирана

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

Получава брой показвания на елемент за показване на най-добрите елементи.

```typescript
async function getViewsPerItem(
  itemSlugs: string[]
): Promise<Map<string, number>>
```

**Параметри:**

|Параметър|Тип|Задължително|Описание|
|-------------|------------|----------|----------------------|
|`itemSlugs`|`string[]`|да|Масив от охлюви за артикули|

**Връща:** `Promise<Map<string, number>>` -- Карта на охлюв на артикул за брой прегледи

**SQL модел:**

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

## Бележки за ефективността

1. **Предпазване на празен масив** -- Всички функции за агрегиране се връщат незабавно с нулеви/празни резултати, когато се подаде празен масив `itemSlugs`, като се избягват ненужни заявки към базата данни.

2. **Ежедневна дедупликация** -- `recordItemView` използва уникално ограничение и `ON CONFLICT DO NOTHING` за ефективна дедупликация без заключване без предварителна проверка.

3. **Базирани на UTC дати** -- Филтрирането на изглед на дата използва UTC датни низове (`YYYY-MM-DD`), като гарантира последователно поведение в часовите зони на сървъра.

4. **Slug normalization** -- `getItemIdFromSlug` се извиква в целия слой на ангажираност (гласове, коментари), за да се осигури последователна идентификация на елемента.

## Примери за използване

### Записване на преглед на страница

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

### Изграждане на диаграма с изгледи на таблото

```typescript
import { getDailyViewsData, getViewsPerItem } from '@/lib/db/queries';

const itemSlugs = ['clockify', 'toggl', 'harvest'];

// Daily trend data
const dailyViews = await getDailyViewsData(itemSlugs, 14);

// Per-item breakdown
const perItemViews = await getViewsPerItem(itemSlugs);
```
