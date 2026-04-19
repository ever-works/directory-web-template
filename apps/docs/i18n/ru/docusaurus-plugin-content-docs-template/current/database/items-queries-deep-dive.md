---
id: items-queries-deep-dive
title: Глубокое погружение в запросы предметов
sidebar_label: Глубокое погружение в запросы предметов
sidebar_position: 60
---

# Глубокое погружение в запросы предметов

Комплексный справочник по всем функциям запросов к базе данных, связанным с элементами, включая идентификацию элементов, нормализацию фрагментов, отслеживание представлений и агрегирование представлений.

## Обзор

Уровень запроса элемента разделен на два модуля:

- **`item.queries.ts`** -- Утилиты идентификации предметов и нормализации групповых значений.
- **`item-view.queries.ts`** – отслеживание просмотров элементов с ежедневной дедупликацией и агрегированием.

Элементы в шаблоне Ever Works хранятся в виде файлов YAML в репозитории CMS на базе Git. В базе данных хранятся **данные об активности** (голоса, комментарии, просмотры, избранное), сгруппированные по фрагментам элементов, а не само содержимое элемента.

## Исходные файлы

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

Сопоставляет фрагмент элемента с идентификатором элемента для операций с базой данных. В этой системе itemId ЯВЛЯЕТСЯ нормализованной пулей.

```typescript
function getItemIdFromSlug(slug: string): string
```

**Параметры:**

|Параметр|Тип|Требуется|Описание|
|-----------|----------|----------|-------------|
|`slug`|`string`|Да|Пуля элемента|

**Возвраты:** `string` – нормализованный фрагмент в качестве идентификатора элемента.

**Шаблон SQL:** Нет запроса к базе данных — делегирование осуществляется `normalizeItemSlug`.

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

## Ссылка на функцию: item-view.queries.ts

### `recordItemView`

Записывает просмотр элемента с ежедневной дедупликацией. Использует `ON CONFLICT DO NOTHING` для молчаливого игнорирования повторяющихся представлений для одного и того же элемента, средства просмотра и даты в формате UTC.

```typescript
async function recordItemView(
  view: Pick<NewItemView, 'itemId' | 'viewerId' | 'viewedDateUtc'>
): Promise<boolean>
```

**Параметры:**

|Параметр|Тип|Требуется|Описание|
|---------------------|----------|----------|------------------------------------|
|`view.itemId`|`string`|Да|Пуля элемента|
|`view.viewerId`|`string`|Да|Идентификатор зрителя (пользователь/анонимный)|
|`view.viewedDateUtc`|`string`|Да|Строка даты UTC (ГГГГ-ММ-ДД)|

**Возвраты:** `Promise<boolean>` -- `true`, если было записано новое представление, `false`, если оно было дубликатом.

**Шаблон SQL:**

```sql
INSERT INTO item_views (item_id, viewer_id, viewed_date_utc)
VALUES (?, ?, ?)
ON CONFLICT DO NOTHING
RETURNING id;
```

**Примечания по производительности:**
- Использует `ON CONFLICT DO NOTHING` для идемпотентных вставок.
- Уникальное ограничение `(itemId, viewerId, viewedDateUtc)` обеспечивает ежедневную дедупликацию.
- Для проверки дубликатов не требуется туда и обратно

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

Получает количество просмотров элементов за последние N дней.

```typescript
async function getRecentViewsCount(
  itemSlugs: string[],
  days: number = 7
): Promise<number>
```

**Параметры:**

|Параметр|Тип|Требуется|По умолчанию|Описание|
|-------------|------------|----------|---------|--------------------------|
|`itemSlugs`|`string[]`|Да| --      |Массив слизней элементов|
|`days`|`number`|Нет| `7`     |Количество дней, чтобы оглянуться назад|

**Возвраты:** `Promise<number>` – количество просмотров за период.

**Шаблон SQL:**

```sql
SELECT count(*) FROM item_views
WHERE item_id IN (...) AND viewed_date_utc >= ?;
```

**Примечания по производительности:**
- Использует строки даты в формате UTC для фильтрации, независимой от часового пояса.
- Эффективно, когда индексируется столбец `viewedDateUtc`.

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

Получает количество просмотров каждого элемента для отображения самых популярных элементов.

```typescript
async function getViewsPerItem(
  itemSlugs: string[]
): Promise<Map<string, number>>
```

**Параметры:**

|Параметр|Тип|Требуется|Описание|
|-------------|------------|----------|----------------------|
|`itemSlugs`|`string[]`|Да|Массив слизней элементов|

**Возвраты:** `Promise<Map<string, number>>` – Карта фрагмента элемента для просмотра количества.

**Шаблон SQL:**

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

## Примечания по производительности

1. **Защита пустого массива** – все функции агрегирования немедленно возвращаются с нулевыми/пустыми результатами при передаче пустого массива `itemSlugs`, что позволяет избежать ненужных запросов к базе данных.

2. **Ежедневная дедупликация** – `recordItemView` использует уникальное ограничение и `ON CONFLICT DO NOTHING` для эффективной дедупликации без блокировок без предварительной проверки.

3. **Даты на основе UTC** – при фильтрации даты просмотра используются строки даты в формате UTC (`YYYY-MM-DD`), что обеспечивает согласованное поведение во всех часовых поясах сервера.

4. **Нормализация сегментов** – `getItemIdFromSlug` вызывается на всем уровне взаимодействия (голосования, комментарии) для обеспечения единообразной идентификации элементов.

## Примеры использования

### Запись просмотра страницы

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

### Построение диаграммы представлений информационной панели

```typescript
import { getDailyViewsData, getViewsPerItem } from '@/lib/db/queries';

const itemSlugs = ['clockify', 'toggl', 'harvest'];

// Daily trend data
const dailyViews = await getDailyViewsData(itemSlugs, 14);

// Per-item breakdown
const perItemViews = await getViewsPerItem(itemSlugs);
```
