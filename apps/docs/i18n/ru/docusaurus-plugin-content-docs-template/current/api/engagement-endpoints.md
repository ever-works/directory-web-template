---
id: engagement-endpoints
title: "Конечные точки API взаимодействия"
sidebar_label: "Помолвка"
sidebar_position: 12
---

# Конечные точки API взаимодействия

API Engagement предоставляет конечные точки для получения показателей взаимодействия (просмотры, голоса, рейтинги, избранное, комментарии) и расчета оценок популярности элементов. Эти конечные точки обеспечивают функции сортировки, ранжирования и анализа шаблона.

**Исходные файлы:**
- `template/app/api/items/engagement/route.ts`
- `template/app/api/items/popularity-scores/route.ts`

## Сводка конечных точек

|Метод|Путь|Авторизация|Описание|
|--------|------|------|-------------|
|ПОЛУЧИТЬ|`/api/items/engagement`|Нет|Получение показателей взаимодействия для нескольких элементов|
|ПОЛУЧИТЬ|`/api/items/popularity-scores`|Нет|Отсортируйте элементы по вычисленному показателю популярности.|

Обе конечные точки используют `dynamic = 'force-dynamic'` для обеспечения свежих данных при каждом запросе.

---

## GET `/api/items/engagement`

Fetches engagement metrics for multiple items identified by their slugs. Returns a map of slug to metrics.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `slugs` | string | **Yes** | -- | Comma-separated list of item slugs |

### Constraints

- The `slugs` parameter is **required**. Omitting it returns a 400 error.
- Maximum of **200 slugs** per request. Exceeding this limit returns a 400 error.

### How It Works

```ts
const slugsParam = searchParams.get('slugs');
const slugs = slugsParam
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

if (slugs.length > 200) {
  return NextResponse.json(
    { error: 'Too many slugs. Maximum 200 allowed per request.' },
    { status: 400 }
  );
}

const metricsMap = await getEngagementMetricsPerItem(slugs);
```

### Response Shape

#### 200 -- Metrics Retrieved

```json
{
  "metrics": {
    "awesome-tool": {
      "views": 1250,
      "votes": 45,
      "avgRating": 4.2,
      "favorites": 89,
      "comments": 12
    },
    "another-item": {
      "views": 320,
      "votes": 8,
      "avgRating": 3.7,
      "favorites": 15,
      "comments": 3
    }
  }
}
```

#### 200 -- Empty (no slugs provided after parsing)

```json
{
  "metrics": {}
}
```

#### 400 -- Missing Slugs

```json
{
  "error": "Missing required parameter: slugs"
}
```

#### 400 -- Too Many Slugs

```json
{
  "error": "Too many slugs. Maximum 200 allowed per request."
}
```

#### 500 -- Server Error

```json
{
  "error": "Failed to fetch engagement metrics"
}
```

### Usage Example

```ts
const slugs = ['tool-a', 'tool-b', 'tool-c'].join(',');
const res = await fetch(`/api/items/engagement?slugs=${slugs}`);
const { metrics } = await res.json();

// Access individual item metrics
const toolAViews = metrics['tool-a']?.views ?? 0;
```

---

## ПОЛУЧИТЬ `/api/items/popularity-scores`

Конечная точка отладки/аналитики, которая возвращает элементы, отсортированные по вычисленному показателю популярности. Алгоритм оценки использует логарифмическое масштабирование и учитывает несколько сигналов взаимодействия плюс давность.

### Параметры запроса

|Параметр|Тип|Требуется|По умолчанию|Описание|
|-----------|------|----------|---------|-------------|
|`limit`|целое число|Нет| `20` |Количество товаров для возврата (максимум 100)|
|`locale`|строка|Нет|`"en"`|Локаль для получения данных об элементе|

### Алгоритм подсчета очков

Рейтинг популярности рассчитывается как сумма взвешенных компонентов:

|Компонент|Вес|Формула|
|-----------|--------|---------|
|Рекомендуемое повышение| +10,000 |Фиксированный бонус за рекомендуемые товары|
|Просмотры|1000x|`log10(views + 1) * 1000`|
|Голоса|1200x|`log10(max(votes, 0) + 1) * 1200`|
|Средний рейтинг|500x|`avgRating * 500`|
|Избранное|1100x|`log10(favorites + 1) * 1100`|
|Комментарии|1000x|`log10(comments + 1) * 1000`|
|Давность (менее 30 дней)|до +1000|Линейный распад в течение 30 дней|
|Срок давности (30–90 дней)|до +500|Линейный распад в течение следующих 60 дней|
|Срок давности (90–180 дней)|до +250|Линейный распад в течение следующих 90 дней|

Элементы без данных о взаимодействии получают эвристическую резервную оценку на основе количества тегов, длины имени, наличия значка и наличия промокода.

### Форма ответа

#### 200 -- Полученные результаты

```json
{
  "totalItems": 150,
  "showing": 20,
  "items": [
    {
      "rank": 1,
      "name": "Top Rated Tool",
      "slug": "top-rated-tool",
      "featured": true,
      "score": 15230,
      "scoreBreakdown": {
        "featured": 10000,
        "views": 3100,
        "votes": 1200,
        "rating": 430,
        "favorites": 200,
        "comments": 150,
        "recency": 150
      },
      "engagement": {
        "views": 1250,
        "votes": 45,
        "avgRating": 4.2,
        "favorites": 89,
        "comments": 12
      },
      "ageInDays": 15
    }
  ]
}
```

### Пример использования

```ts
// Fetch top 10 most popular items
const res = await fetch('/api/items/popularity-scores?limit=10&locale=en');
const { items, totalItems } = await res.json();

items.forEach(item => {
  console.log(`#${item.rank} ${item.name} - Score: ${item.score}`);
});
```

### Примечания

- Алгоритм оценки соответствует логике сортировки продукции в `sort-utils.ts`.
- Логарифмическое масштабирование не позволяет элементам с очень большим количеством просмотров доминировать в рейтинге.
- Бонус за новизну гарантирует, что вновь добавленные элементы получат временное повышение видимости.
- Элементы сортируются по убыванию баллов; связи разбиты в алфавитном порядке по имени.

### Связанные исходные файлы

|Файл|Цель|
|------|---------|
|`template/app/api/items/engagement/route.ts`|Конечная точка показателей взаимодействия|
|`template/app/api/items/popularity-scores/route.ts`|Конечная точка оценки популярности|
|`template/lib/db/queries/engagement.queries.ts`|Запросы к базе данных для получения данных о взаимодействии|
|`template/lib/content.ts`|`getCachedItems` для данных элемента|
