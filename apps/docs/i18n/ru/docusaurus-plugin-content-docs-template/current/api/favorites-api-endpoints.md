---
id: favorites-api-endpoints
title: Избранные конечные точки API
sidebar_label: API избранного
sidebar_position: 62
---

# Избранные конечные точки API

API избранного позволяет аутентифицированным пользователям управлять своими любимыми элементами. Пользователи могут перечислять, добавлять и удалять элементы из своего личного списка избранного. Записи избранного хранят метаданные элемента (имя, значок, категория) для быстрого отображения без присоединения к таблице элементов.

**Исходный каталог:** `template/app/api/favorites/`

---

## Authentication

All favorites endpoints require session-based authentication. Unauthenticated requests receive:

**Status 401**
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

---

## Список избранного пользователя

Возвращает все элементы, избранные авторизованным пользователем.

|Недвижимость|Значение|
|----------|-------|
|**Метод**|`GET`|
|**Путь**|`/api/favorites`|
|**Аутентификация**|Сеанс (пользователь)|
|**Источник**|`favorites/route.ts`|

### Ответ

**Статус 200**

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

|Поле|Тип|Описание|
|-------|------|-------------|
|`favorites[].id`|`string`|Идентификатор избранной записи|
|`favorites[].userId`|`string`|Пользователь, который добавил элемент в избранное|
|`favorites[].itemSlug`|`string`|Идентификатор пула элемента|
|`favorites[].itemName`|`string`|Отображаемое имя элемента|
|`favorites[].itemIconUrl`|`строка \|ноль`|URL-адрес значка элемента|
|`favorites[].itemCategory`|`строка \|ноль`|Категория товара|
|`favorites[].createdAt`|`string` (ISO 8601)|Когда товар был добавлен в избранное|
|`favorites[].updatedAt`|`строка \|ноль`|Временная метка последнего обновления|

Избранное упорядочено по `createdAt` (сначала самые старые).

### Пример завитка

```bash
curl -s http://localhost:3000/api/favorites \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

## Add Favorite

Adds an item to the authenticated user's favorites list.

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/favorites` |
| **Auth** | Session (user) |
| **Source** | `favorites/route.ts` |

### Request Body

```json
{
  "itemSlug": "awesome-productivity-tool",
  "itemName": "Awesome Productivity Tool",
  "itemIconUrl": "https://example.com/icons/tool.png",
  "itemCategory": "productivity"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `itemSlug` | `string` | Yes | Unique item slug identifier (min 1 char) |
| `itemName` | `string` | Yes | Item display name (min 1 char) |
| `itemIconUrl` | `string` | No | Item icon URL |
| `itemCategory` | `string` | No | Item category |

### Responses

**Status 201** -- Favorite added successfully.

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

**Status 400** -- Invalid request data.

```json
{
  "success": false,
  "error": "Invalid request data",
  "details": "itemSlug is required and must be a non-empty string"
}
```

**Status 409** -- Item already in favorites.

```json
{
  "success": false,
  "error": "Item is already in favorites"
}
```

### curl Example

```bash
curl -s -X POST http://localhost:3000/api/favorites \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session_token>" \
  -d '{
    "itemSlug": "awesome-productivity-tool",
    "itemName": "Awesome Productivity Tool",
    "itemIconUrl": "https://example.com/icons/tool.png",
    "itemCategory": "productivity"
  }'
```

---

## Удалить избранное

Удаляет определенный элемент из списка избранного аутентифицированного пользователя.

|Недвижимость|Значение|
|----------|-------|
|**Метод**|`DELETE`|
|**Путь**|`/api/favorites/{itemSlug}`|
|**Аутентификация**|Сеанс (пользователь)|
|**Источник**|`favorites/[itemSlug]/route.ts`|

### Параметры пути

|Параметр|Тип|Описание|
|-----------|------|-------------|
|`itemSlug`|`string`|Идентификатор фрагмента элемента, который нужно удалить из избранного|

### Ответы

**Статус 200** – Избранное успешно удалено.

```json
{
  "success": true,
  "message": "Favorite removed successfully"
}
```

**Статус 404** – Избранное не найдено.

```json
{
  "success": false,
  "error": "Favorite not found"
}
```

### Пример завитка

```bash
curl -s -X DELETE http://localhost:3000/api/favorites/awesome-productivity-tool \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

## TypeScript Usage

```typescript
interface Favorite {
  id: string;
  userId: string;
  itemSlug: string;
  itemName: string;
  itemIconUrl: string | null;
  itemCategory: string | null;
  createdAt: string;
  updatedAt: string | null;
}

// List all favorites
async function getFavorites(): Promise<Favorite[]> {
  const res = await fetch('/api/favorites');
  const data = await res.json();
  return data.favorites;
}

// Add to favorites
async function addFavorite(item: {
  itemSlug: string;
  itemName: string;
  itemIconUrl?: string;
  itemCategory?: string;
}): Promise<Favorite> {
  const res = await fetch('/api/favorites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });

  if (res.status === 409) {
    throw new Error('Item is already in favorites');
  }

  const data = await res.json();
  return data.favorite;
}

// Remove from favorites
async function removeFavorite(itemSlug: string): Promise<void> {
  const res = await fetch(`/api/favorites/${itemSlug}`, {
    method: 'DELETE',
  });

  if (res.status === 404) {
    throw new Error('Favorite not found');
  }
}

// Toggle favorite
async function toggleFavorite(
  itemSlug: string,
  itemName: string,
  isFavorited: boolean
): Promise<void> {
  if (isFavorited) {
    await removeFavorite(itemSlug);
  } else {
    await addFavorite({ itemSlug, itemName });
  }
}
```

### Implementation Notes

- The favorites table uses a compound uniqueness check on `(userId, itemSlug)` to prevent duplicates.
- Item metadata (`itemName`, `itemIconUrl`, `itemCategory`) is stored in the favorites record itself, enabling fast display without additional queries.
- Deletion checks ownership -- a user can only remove favorites they own.
- Database availability is checked at the start of each request via `checkDatabaseAvailability()`.
- Validation errors return Zod error details in the `details` field.
