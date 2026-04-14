---
id: items-engagement-endpoints
title: "Справочник за API за ангажиране на елементи"
sidebar_label: "Ангажиране на елементи"
sidebar_position: 54
---

# Справочник за API за ангажиране на елементи

## Преглед

Крайните точки за ангажиране на артикули осигуряват достъп до показатели за ангажираност и резултати за популярност за елементи от директория. Те включват брой гледания, гласове, оценки, любими и коментари. Крайната точка на рейтинга на популярността допълнително изчислява претеглено класиране, което взема предвид показателите за ангажираност, представеното състояние и актуалността на съдържанието.

## Крайни точки

### GET /api/items/engagement

Извлича показатели за ангажираност за множество елементи по техните охлузи в една пакетна заявка.

**Заявка**

|Параметър|Тип|в|Описание|
|-----------|--------|-------|-------------|
|охлюви|низ|заявка|Разделен със запетаи списък с охлузи на елементи (задължително, максимум 200)|

**Отговор**
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

### ВЗЕМЕТЕ /api/items/popularity-scores

Крайна точка за отстраняване на грешки, която връща елементи, сортирани по изчислен резултат за популярност с подробна разбивка на факторите за оценяване. Полезно за разбиране как алгоритъмът за сортиране класира елементите.

**Заявка**

|Параметър|Тип|в|Описание|
|-----------|--------|-------|-------------|
|лимит|номер|заявка|Брой елементи за връщане (по подразбиране: 20, максимум: 100)|
|локал|низ|заявка|Езиков код за елементи (по подразбиране: "en")|

**Отговор**
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

## Удостоверяване

И двете крайни точки са **публични** -- не се изисква удостоверяване. Те са маркирани като `force-dynamic`, за да се осигурят свежи данни при всяка заявка.

## Отговори за грешки

|Статус|Описание|
|--------|-------------|
| 400 |Липсва задължителен параметър `slugs` или са предоставени повече от 200 охлузвания (крайна точка на ангажираност)|
| 500 |Вътрешна грешка в сървъра -- неуспешна заявка в базата данни|

## Ограничаване на скоростта

Няма изрично ограничаване на скоростта. Крайната точка на ангажиране ограничава размера на партидата до 200 охлюва на заявка, за да се предотврати злоупотреба. И двете крайни точки заобикалят кеширането на Next.js чрез `export const dynamic = 'force-dynamic'`.

## Свързани крайни точки

- [Конфигуриране на крайни точки на функции](./config-feature-endpoints) -- Проверете дали функциите за оценки/любими/коментари са активирани
