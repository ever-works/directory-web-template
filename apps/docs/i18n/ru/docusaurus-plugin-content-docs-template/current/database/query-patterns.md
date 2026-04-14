---
id: query-patterns
title: "Система шаблонов запросов"
sidebar_label: "Шаблоны запросов"
sidebar_position: 7
---

# Система шаблонов запросов

Шаблон объединяет все запросы к базе данных в модули, специфичные для предметной области, под `lib/db/queries/`. Каждый модуль следует принципу единой ответственности (SRP), группируя связанные операции вместе. Экспорт бочки в `index.ts` обеспечивает единую точку входа для всех функций запроса.

## Обзор архитектуры

```mermaid
graph TD
    A[API Route Handlers] --> B[Repositories / Services]
    B --> C[lib/db/queries/index.ts]
    C --> D[activity.queries.ts]
    C --> E[auth.queries.ts]
    C --> F[client.queries.ts]
    C --> G[comment.queries.ts]
    C --> H[engagement.queries.ts]
    C --> I[payment.queries.ts]
    C --> J[subscription.queries.ts]
    C --> K[vote.queries.ts]
    C --> L[report.queries.ts]
    C --> M[dashboard.queries.ts]
    C --> N[user.queries.ts]
    C --> O[item-view.queries.ts]
    C --> P[survey.queries.ts]
    D & E & F & G & H & I & J & K & L & M & N & O & P --> Q[lib/db/drizzle.ts]
    Q --> R[(PostgreSQL)]
```

## Модули запросов

|Модуль|Файл|Цель|
|--------|------|---------|
|Деятельность|`activity.queries.ts`|Ведение журнала активности и контрольный журнал|
|Авторизация|`auth.queries.ts`|Токены сброса пароля, токены проверки|
|Клиент|`client.queries.ts`|Профиль клиента CRUD, поиск, статистика|
|Комментарий|`comment.queries.ts`|Комментируйте CRUD с присоединением пользователей|
|Компания|`company.queries.ts`|Управление компанией и связь между товаром и компанией|
|Панель управления|`dashboard.queries.ts`|Статистика информационной панели и диаграммы вовлеченности|
|Помолвка|`engagement.queries.ts`|Агрегированные показатели вовлеченности (просмотры, голоса, избранное, комментарии)|
|Картирование интеграции|`integration-mapping.queries.ts`|Сопоставления интеграции CRM|
|Товар|`item.queries.ts`|Нормализация и проверка фрагментов элементов|
|Аудит товара|`item-audit.queries.ts`|История изменения товара|
|Просмотр элемента|`item-view.queries.ts`|Просмотр отслеживания с дедупликацией|
|Индекс местоположения|`location-index.queries.ts`|Индексация геопространственных элементов|
|Модерация|`moderation.queries.ts`|Действия по модерации контента|
|Информационный бюллетень|`newsletter.queries.ts`|Управление подписчиками на рассылку новостей|
|Оплата|`payment.queries.ts`|Поставщик платежей и управление счетами|
|Отчет|`report.queries.ts`|Отчеты по контенту с фильтрацией|
|Подписка|`subscription.queries.ts`|Управление жизненным циклом подписки|
|Опрос|`survey.queries.ts`|Ответы на опросы и аналитика|
|Пользователь|`user.queries.ts`|Основные пользовательские CRUD и проверки администратора|
|Голосовать|`vote.queries.ts`|Голосование CRUD и расчет чистого балла|

## Общие шаблоны

### 1. Шаблон нумерации страниц

Все запросы к спискам следуют единообразному шаблону нумерации страниц с использованием `limit` и `offset`:

```typescript
export async function getClientProfiles(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}): Promise<{
  profiles: ClientProfileWithAuth[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}> {
  const { page = 1, limit = 10, search, status } = params;
  const offset = (page - 1) * limit;

  // 1. Build WHERE conditions dynamically
  const whereConditions: SQL[] = [];
  if (search) { /* add ILIKE condition */ }
  if (status) { whereConditions.push(eq(clientProfiles.status, status)); }
  const whereClause = whereConditions.length > 0
    ? and(...whereConditions)
    : undefined;

  // 2. Count query for total
  const countResult = await db
    .select({ count: sql<number>`count(distinct ${clientProfiles.id})` })
    .from(clientProfiles)
    .where(whereClause);
  const total = Number(countResult[0]?.count || 0);

  // 3. Data query with limit/offset
  const profiles = await db
    .select({ /* fields */ })
    .from(clientProfiles)
    .where(whereClause)
    .orderBy(desc(clientProfiles.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    profiles,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    limit,
  };
}
```

### 2. Шаблон динамической фильтрации

Фильтры накапливаются в виде массива условий SQL и состоят из `and()`:

```typescript
const whereConditions: SQL[] = [];

if (search) {
  const escapedSearch = search
    .replace(/\\/g, '\\\\')
    .replace(/[%_]/g, '\\$&');
  whereConditions.push(
    sql`(${clientProfiles.name} ILIKE ${`%${escapedSearch}%`} OR
         ${clientProfiles.email} ILIKE ${`%${escapedSearch}%`})`
  );
}

if (status) {
  whereConditions.push(eq(clientProfiles.status, status));
}

if (provider) {
  whereConditions.push(
    sql`exists (
      select 1 from ${accounts}
      where ${accounts.userId} = ${clientProfiles.userId}
        and ${accounts.provider} = ${provider}
    )`
  );
}

const whereClause = whereConditions.length > 0
  ? and(...whereConditions)
  : undefined;
```

### 3. Шаблон соединения

База кода использует как явные `innerJoin`/`leftJoin`, так и подзапросы для обработки связанных данных:

**Внутреннее соединение для необходимых связей:**

```typescript
const result = await db
  .select({
    id: comments.id,
    content: comments.content,
    user: {
      id: clientProfiles.id,
      name: clientProfiles.name,
      email: clientProfiles.email,
      image: clientProfiles.avatar,
    },
  })
  .from(comments)
  .innerJoin(clientProfiles, eq(comments.userId, clientProfiles.id))
  .where(and(eq(comments.itemId, itemId), isNull(comments.deletedAt)))
  .orderBy(desc(comments.createdAt));
```

**Подзапрос, чтобы избежать дублирования строк из нескольких объединений:**

```typescript
const profiles = await db
  .select({
    id: clientProfiles.id,
    // ... other fields
    accountProvider: sql<string>`coalesce(
      (SELECT provider FROM ${accounts}
       WHERE ${accounts.userId} = ${clientProfiles.userId}
       LIMIT 1),
      'unknown'
    )`,
  })
  .from(clientProfiles);
```

### 4. Шаблон агрегирования

Агрегатные функции, такие как `count`, `SUM` и `AVG`, используются с `groupBy`:

```typescript
// Net vote score using conditional SUM
const voteCounts = await db
  .select({
    itemId: votes.itemId,
    netScore: sql<number>`
      SUM(CASE
        WHEN vote_type = 'upvote' THEN 1
        WHEN vote_type = 'downvote' THEN -1
        ELSE 0
      END)
    `.as('netScore'),
  })
  .from(votes)
  .where(inArray(votes.itemId, itemSlugs))
  .groupBy(votes.itemId);
```

### 5. Шаблон параллельного запроса

Если требуется несколько независимых агрегатов, запросы выполняются параллельно с `Promise.all`:

```typescript
const [viewsData, votesData, favoritesData, commentsData] =
  await Promise.all([
    db.select({ itemId: itemViews.itemId, count: count() })
      .from(itemViews)
      .where(inArray(itemViews.itemId, itemSlugs))
      .groupBy(itemViews.itemId),

    db.select({ itemId: votes.itemId, netScore: sql`...` })
      .from(votes)
      .where(inArray(votes.itemId, itemSlugs))
      .groupBy(votes.itemId),

    db.select({ itemSlug: favorites.itemSlug, count: count() })
      .from(favorites)
      .where(inArray(favorites.itemSlug, itemSlugs))
      .groupBy(favorites.itemSlug),

    db.select({ itemId: comments.itemId, count: count(), avgRating: sql`...` })
      .from(comments)
      .where(and(inArray(comments.itemId, itemSlugs), isNull(comments.deletedAt)))
      .groupBy(comments.itemId),
  ]);
```

### 6. Шаблон Upsert/Разрешение конфликтов

Используется для дедупликации, особенно при отслеживании просмотров:

```typescript
export async function recordItemView(
  view: Pick<NewItemView, 'itemId' | 'viewerId' | 'viewedDateUtc'>
): Promise<boolean> {
  const result = await db
    .insert(itemViews)
    .values(view)
    .onConflictDoNothing()
    .returning({ id: itemViews.id });

  return result.length > 0;
}
```

### 7. Шаблон мягкого удаления

Записи помечаются как удаленные, а не удаляются физически:

```typescript
export async function deleteComment(id: string) {
  const [comment] = await db
    .update(comments)
    .set({ deletedAt: new Date() })
    .where(eq(comments.id, id))
    .returning();
  return comment;
}

// Querying always filters out soft-deleted records
.where(and(eq(comments.itemId, itemId), isNull(comments.deletedAt)))
```

### 8. Шаблон нормализации результатов

Результаты запроса часто сопоставляются с помощью объектов поиска `Map` для эффективного доступа O(1):

```typescript
const viewsMap = new Map<string, number>(
  viewsData.map(v => [v.itemId, Number(v.count)])
);
const votesMap = new Map<string, number>(
  votesData.map(v => [v.itemId, Number(v.netScore ?? 0)])
);

// Combine into final metrics
for (const slug of itemSlugs) {
  metricsMap.set(slug, {
    views: viewsMap.get(slug) ?? 0,
    votes: votesMap.get(slug) ?? 0,
  });
}
```

## Общие утилиты

### `lib/db/queries/utils.ts`

Предоставляет вспомогательные функции, общие для всех модулей запросов:

- **`extractUsernameFromEmail(email)`** — извлекает и очищает имя пользователя из адреса электронной почты.
- **`ensureUniqueUsername(baseUsername)`** — генерирует уникальное имя пользователя, добавляя при необходимости числовые суффиксы.

### `lib/db/queries/types.ts`

Определяет общие типы, используемые в модулях запросов:

- **`ClientProfileWithAuth`** — профиль клиента в сочетании с данными поставщика аутентификации.
- **`ClientStatus`** / **`ClientPlan`** / **`ClientAccountType`** -- Типы перечислений для фильтрации
- **`CommentWithUser`** — данные комментариев, дополненные информацией о пользователе.

## Импортная конвенция

Все запросы импортируются через экспорт ствола:

```typescript
import {
  getClientProfiles,
  createVote,
  getEngagementMetricsPerItem,
  getUserActiveSubscription,
} from '@/lib/db/queries';
```
