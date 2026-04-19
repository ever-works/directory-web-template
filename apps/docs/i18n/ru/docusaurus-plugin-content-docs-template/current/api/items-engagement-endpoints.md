---
id: items-engagement-endpoints
title: "Справочник по API Items Engagement"
sidebar_label: "Предметы"
sidebar_position: 54
---

# Справочник по API Items Engagement

## Обзор

Конечные точки Items Engagement предоставляют доступ к показателям взаимодействия и оценкам популярности элементов каталога. К ним относятся количество просмотров, голоса, рейтинги, избранное и комментарии. Конечная точка оценки популярности дополнительно вычисляет взвешенный рейтинг, который учитывает показатели вовлеченности, статус избранных и новизну контента.

## Конечные точки

### ПОЛУЧИТЬ /api/items/engagement

Получает показатели взаимодействия для нескольких элементов по их пулам в одном пакетном запросе.

**Запрос**

|Параметр|Тип|В|Описание|
|-----------|--------|-------|-------------|
|слизни|строка|запрос|Список номеров товаров, разделенных запятыми (обязательно, максимум 200).|

**Ответ**
```typescript
{
  metrics: Record<string, {
    views: number;
    votes: number;
    avgRating: number;
    favorites: number;
    comments: number;
  }>;
}
```

**Пример**
```typescript
const response = await fetch('/api/items/engagement?slugs=item-one,item-two,item-three');
const { metrics } = await response.json();

// metrics["item-one"] = { views: 1500, votes: 42, avgRating: 4.2, favorites: 18, comments: 7 }
```

### ПОЛУЧИТЬ /api/items/popularity-scores

Конечная точка отладки, которая возвращает элементы, отсортированные по вычисленному показателю популярности с подробной разбивкой факторов оценки. Полезно для понимания того, как алгоритм сортировки ранжирует элементы.

**Запрос**

|Параметр|Тип|В|Описание|
|-----------|--------|-------|-------------|
|предел|номер|запрос|Количество возвращаемых товаров (по умолчанию: 20, максимум: 100)|
|локаль|строка|запрос|Код языка для элементов (по умолчанию: «en»)|

**Ответ**
```typescript
{
  totalItems: number;
  showing: number;
  items: Array<{
    rank: number;
    name: string;
    slug: string;
    featured: boolean;
    score: number;               // Total computed score (rounded)
    scoreBreakdown: {
      featured: number;          // 10000 if featured, 0 otherwise
      views: number;             // log10(views + 1) * 1000
      votes: number;             // log10(votes + 1) * 1200
      rating: number;            // avgRating * 500
      favorites: number;         // log10(favorites + 1) * 1100
      comments: number;          // log10(comments + 1) * 1000
      recency: number;           // Decays over 180 days
    };
    engagement: {
      views: number;
      votes: number;
      avgRating: number;
      favorites: number;
      comments: number;
    } | null;
    ageInDays: number;
  }>;
}
```

**Пример**
```typescript
const response = await fetch('/api/items/popularity-scores?limit=10&locale=en');
const { items, totalItems } = await response.json();

// items[0] = { rank: 1, name: "Top Item", score: 15234, scoreBreakdown: { ... }, ... }
```

## Аутентификация

Обе конечные точки являются **общедоступными** – аутентификация не требуется. Они помечены как `force-dynamic`, чтобы обеспечить актуальность данных при каждом запросе.

## Реакции на ошибки

|Статус|Описание|
|--------|-------------|
| 400 |Отсутствует обязательный параметр `slugs` или предоставлено более 200 пулов (конечная точка взаимодействия).|
| 500 |Внутренняя ошибка сервера — сбой запроса к базе данных.|

## Ограничение скорости

Нет явного ограничения скорости. Конечная точка взаимодействия ограничивает размер пакета 200 пулами на запрос, чтобы предотвратить злоупотребления. Обе конечные точки обходят кеширование Next.js через `export const dynamic = 'force-dynamic'`.

## Связанные конечные точки

- [Конечные точки функции конфигурации](./config-feature-endpoints) — проверьте, включены ли функции оценок/избранного/комментариев.
