---
id: favorites-api-endpoints
title: Любими крайни точки на API
sidebar_label: API за любими
sidebar_position: 62
---

# Любими крайни точки на API

API за любими позволява на удостоверените потребители да управляват любимите си елементи. Потребителите могат да изброяват, добавят и премахват елементи от личния си списък с любими. Любимите записи съхраняват метаданни за елементи (име, икона, категория) за бързо показване, без да се присъединяват към таблицата с елементи.

**Директория източник:** `template/app/api/favorites/`

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

## Списък с предпочитани потребители

Връща всички елементи, предпочитани от удостоверения потребител.

|Собственост|Стойност|
|----------|-------|
|**Метод**|`GET`|
|**Пътека**|`/api/favorites`|
|**Удостоверяване**|Сесия (потребител)|
|**Източник**|`favorites/route.ts`|

### Отговор

**Състояние 200**

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
|`favorites[].id`|`string`|ID на любим запис|
|`favorites[].userId`|`string`|Потребител, който е означил артикула като любим|
|`favorites[].itemSlug`|`string`|Идентификатор на елемента|
|`favorites[].itemName`|`string`|Екранно име на артикул|
|`favorites[].itemIconUrl`|`низ \|нула`|URL адрес на икона на артикул|
|`favorites[].itemCategory`|`низ \|нула`|Категория артикул|
|`favorites[].createdAt`|`string` (ISO 8601)|Когато артикулът е избран като любим|
|`favorites[].updatedAt`|`низ \|нула`|Дата на последна актуализация|

Любимите са подредени по `createdAt` (първо най-старите).

### къдря Пример

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

## Премахване на любимите

Премахва конкретен елемент от списъка с любими на удостоверения потребител.

|Собственост|Стойност|
|----------|-------|
|**Метод**|`DELETE`|
|**Пътека**|`/api/favorites/{itemSlug}`|
|**Удостоверяване**|Сесия (потребител)|
|**Източник**|`favorites/[itemSlug]/route.ts`|

### Параметри на пътя

|Параметър|Тип|Описание|
|-----------|------|-------------|
|`itemSlug`|`string`|Идентификатор на елемент за премахване от любими|

### Отговори

**Статус 200** -- Любимият е премахнат успешно.

```json
{
  "success": true,
  "message": "Favorite removed successfully"
}
```

**Състояние 404** -- Любимото не е намерено.

```json
{
  "success": false,
  "error": "Favorite not found"
}
```

### къдря Пример

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
