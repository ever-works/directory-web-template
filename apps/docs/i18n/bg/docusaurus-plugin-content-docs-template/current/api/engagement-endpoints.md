---
id: engagement-endpoints
title: "Крайни точки на API за ангажираност"
sidebar_label: "Годеж"
sidebar_position: 12
---

# Крайни точки на API за ангажираност

API за ангажираност предоставя крайни точки за извличане на показатели за ангажираност (гледания, гласове, оценки, любими, коментари) и изчисляване на резултати за популярност за елементи. Тези крайни точки захранват функциите за сортиране, класиране и анализ на шаблона.

**Изходни файлове:**
- `template/app/api/items/engagement/route.ts`
- `template/app/api/items/popularity-scores/route.ts`

## Крайна точка Резюме

|Метод|Пътека|авт|Описание|
|--------|------|------|-------------|
|ВЗЕМЕТЕ|`/api/items/engagement`|Няма|Извличане на показатели за ангажираност за множество елементи|
|ВЗЕМЕТЕ|`/api/items/popularity-scores`|Няма|Вземете артикули, сортирани по изчислен резултат за популярност|

И двете крайни точки използват `dynamic = 'force-dynamic'`, за да осигурят свежи данни при всяка заявка.

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

## ВЗЕМЕТЕ `/api/items/popularity-scores`

Крайна точка за отстраняване на грешки/анализ, която връща елементи, сортирани по техния изчислен рейтинг за популярност. Алгоритъмът за оценяване използва логаритмично мащабиране и взема предвид множество сигнали за ангажираност плюс актуалност.

### Параметри на заявката

|Параметър|Тип|Задължително|По подразбиране|Описание|
|-----------|------|----------|---------|-------------|
|`limit`|цяло число|не| `20` |Брой артикули за връщане (макс. 100)|
|`locale`|низ|не|`"en"`|Локал за извличане на данни за артикул|

### Алгоритъм за точкуване

Резултатът за популярност се изчислява като сбор от претеглени компоненти:

|Компонент|Тегло|Формула|
|-----------|--------|---------|
|Представен тласък| +10,000 |Плосък бонус за представени артикули|
|Изгледи|1000x|`log10(views + 1) * 1000`|
|Гласове|1200x|`log10(max(votes, 0) + 1) * 1200`|
|Средна оценка|500x|`avgRating * 500`|
|Любими|1100x|`log10(favorites + 1) * 1100`|
|Коментари|1000x|`log10(comments + 1) * 1000`|
|Актуалност (под 30 дни)|до +1000|Линеен разпад за 30 дни|
|Актуалност (30-90 дни)|до +500|Линеен спад през следващите 60 дни|
|Скорост (90-180 дни)|до +250|Линеен спад през следващите 90 дни|

Елементите без данни за ангажираност получават евристичен резервен резултат въз основа на броя на етикетите, дължината на името, наличието на икона и наличието на промоционален код.

### Форма на отговора

#### 200 -- Извлечени резултати

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

### Пример за използване

```ts
// Fetch top 10 most popular items
const res = await fetch('/api/items/popularity-scores?limit=10&locale=en');
const { items, totalItems } = await res.json();

items.forEach(item => {
  console.log(`#${item.rank} ${item.name} - Score: ${item.score}`);
});
```

### Бележки

- Алгоритъмът за точкуване съответства на логиката за сортиране на производството в `sort-utils.ts`.
- Логаритмичното мащабиране не позволява елементи с изключително голям брой показвания да доминират в класирането.
- Бонусът за актуалност гарантира, че новодобавените елементи получават временно увеличение на видимостта.
- Елементите са сортирани по низходящ резултат; връзките се прекъсват по азбучен ред по име.

### Свързани изходни файлове

|Файл|Цел|
|------|---------|
|`template/app/api/items/engagement/route.ts`|Крайна точка на показателите за ангажираност|
|`template/app/api/items/popularity-scores/route.ts`|Крайна точка за оценка на популярността|
|`template/lib/db/queries/engagement.queries.ts`|Заявки към база данни за данни за ангажираност|
|`template/lib/content.ts`|`getCachedItems` за данни за артикул|
