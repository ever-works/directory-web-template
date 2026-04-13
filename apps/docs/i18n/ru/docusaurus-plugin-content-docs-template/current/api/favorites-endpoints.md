---
id: favorites-endpoints
title: "Избранные конечные точки API"
sidebar_label: "Избранное"
sidebar_position: 13
---

# Избранные конечные точки API

API избранного позволяет прошедшим проверку подлинности пользователям управлять своим личным списком избранных элементов. В каждом избранном хранятся метаданные элемента (имя, значок, категория) для быстрого отображения без необходимости присоединения к слою контента.

**Исходные файлы:**
- `template/app/api/favorites/route.ts`
- `template/app/api/favorites/[itemSlug]/route.ts`

## Сводка конечных точек

|Метод|Путь|Авторизация|Описание|
|--------|------|------|-------------|
|ПОЛУЧИТЬ|`/api/favorites`|Сессия|Список всех избранных для текущего пользователя|
|ПОСТ|`/api/favorites`|Сессия|Добавить товар в избранное|
|УДАЛИТЬ|`/api/favorites/{itemSlug}`|Сессия|Удалить элемент из избранного|

Для всех конечных точек требуется аутентифицированный сеанс пользователя и работающее соединение с базой данных (проверяется через `checkDatabaseAvailability`).

---

## GET `/api/favorites`

Returns all items favorited by the authenticated user, ordered by creation date (oldest first).

### Request

No query parameters or body required. Authentication is provided via session cookie.

### Response Shape

#### 200 -- Success

```json
{
  "success": true,
  "favorites": [
    {
      "id": "fav_123abc",
      "userId": "user_456def",
      "itemSlug": "awesome-productivity-tool",
      "itemName": "Awesome Productivity Tool",
      "itemIconUrl": "https://example.com/icons/tool.png",
      "itemCategory": "productivity",
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z"
    }
  ]
}
```

#### 401 -- Unauthorized

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

#### 500 -- Server Error

```json
{
  "success": false,
  "error": "Failed to fetch favorites"
}
```

---

## ПОСТ `/api/favorites`

Добавляет элемент в избранное аутентифицированного пользователя. Включает проверку дубликатов, чтобы предотвратить добавление одного и того же элемента дважды.

### Тело запроса

|Поле|Тип|Требуется|Описание|
|-------|------|----------|-------------|
|`itemSlug`|строка|**Да**|Уникальный идентификатор фрагмента элемента|
|`itemName`|строка|**Да**|Отображаемое имя элемента|
|`itemIconUrl`|строка|Нет|URL-адрес значка элемента|
|`itemCategory`|строка|Нет|Название категории для товара|

Тело запроса проверяется с использованием схемы Zod:

```ts
const addFavoriteSchema = z.object({
  itemSlug: z.string().min(1),
  itemName: z.string().min(1),
  itemIconUrl: z.string().optional(),
  itemCategory: z.string().optional(),
});
```

### Пример запроса

```json
{
  "itemSlug": "awesome-productivity-tool",
  "itemName": "Awesome Productivity Tool",
  "itemIconUrl": "https://example.com/icons/tool.png",
  "itemCategory": "productivity"
}
```

### Форма ответа

#### 201 -- Создано

```json
{
  "success": true,
  "favorite": {
    "id": "fav_123abc",
    "userId": "user_456def",
    "itemSlug": "awesome-productivity-tool",
    "itemName": "Awesome Productivity Tool",
    "itemIconUrl": "https://example.com/icons/tool.png",
    "itemCategory": "productivity",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T10:30:00.000Z"
  }
}
```

#### 400 — Ошибка проверки.

```json
{
  "success": false,
  "error": "Invalid request data",
  "details": "itemSlug is required and must be a non-empty string"
}
```

#### 401 -- Несанкционированный

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

#### 409 -- Конфликт (Дубликат)

```json
{
  "success": false,
  "error": "Item is already in favorites"
}
```

### Обнаружение дубликатов

Перед вставкой обработчик проверяет наличие существующего избранного с тем же пользователем и слагом элемента:

```ts
const existingFavorite = await db
  .select()
  .from(favorites)
  .where(
    and(
      eq(favorites.userId, session.user.id),
      eq(favorites.itemSlug, validatedData.itemSlug)
    )
  )
  .limit(1);

if (existingFavorite.length > 0) {
  return NextResponse.json(
    { success: false, error: "Item is already in favorites" },
    { status: 409 }
  );
}
```

---

## DELETE `/api/favorites/{itemSlug}`

Removes a specific item from the authenticated user's favorites list.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `itemSlug` | string | **Yes** | The slug of the item to remove |

### Response Shape

#### 200 -- Successfully Removed

```json
{
  "success": true,
  "message": "Favorite removed successfully"
}
```

#### 401 -- Unauthorized

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

#### 404 -- Not Found

Returned when the favorite does not exist or does not belong to the current user:

```json
{
  "success": false,
  "error": "Favorite not found"
}
```

### How It Works

The handler verifies ownership before deleting. It first queries for a matching favorite owned by the current user, then deletes only if found:

```ts
const existingFavorite = await db
  .select()
  .from(favorites)
  .where(
    and(
      eq(favorites.userId, session.user.id),
      eq(favorites.itemSlug, itemSlug)
    )
  )
  .limit(1);

if (existingFavorite.length === 0) {
  return NextResponse.json(
    { success: false, error: "Favorite not found" },
    { status: 404 }
  );
}

await db
  .delete(favorites)
  .where(
    and(
      eq(favorites.userId, session.user.id),
      eq(favorites.itemSlug, itemSlug)
    )
  );
```

---

## Пример использования (полный рабочий процесс)

```ts
// 1. List current favorites
const listRes = await fetch('/api/favorites');
const { favorites } = await listRes.json();

// 2. Add a new favorite
const addRes = await fetch('/api/favorites', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    itemSlug: 'new-tool',
    itemName: 'New Tool',
    itemCategory: 'utilities'
  })
});
const { favorite } = await addRes.json();

// 3. Remove a favorite
const deleteRes = await fetch('/api/favorites/new-tool', {
  method: 'DELETE'
});
const { message } = await deleteRes.json();
```

## Требования к базе данных

- Требуется, чтобы таблица `favorites` существовала в схеме базы данных.
- `checkDatabaseAvailability()` вызывается в начале каждого обработчика.
- В ответах об ошибках используется `safeErrorResponse`, чтобы избежать утечки внутренних данных.

## Связанные исходные файлы

|Файл|Цель|
|------|---------|
|`template/app/api/favorites/route.ts`|Обработчики GET (список) и POST (добавление)|
|`template/app/api/favorites/[itemSlug]/route.ts`|УДАЛИТЬ обработчик|
|`template/lib/db/schema.ts`|`favorites` определение таблицы|
|`template/lib/utils/database-check.ts`|Проверка доступности базы данных|
|`template/lib/utils/api-error.ts`|Утилита безопасного реагирования на ошибки|
