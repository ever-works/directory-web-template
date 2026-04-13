---
id: favorites-endpoints
title: "Любими крайни точки на API"
sidebar_label: "Любими"
sidebar_position: 13
---

# Любими крайни точки на API

API за любими позволява на удостоверените потребители да управляват личния си списък с любими елементи. Всеки фаворит съхранява метаданни за елемент (име, икона, категория) за бързо показване, без да се изисква присъединяване към слоя със съдържание.

**Изходни файлове:**
- `template/app/api/favorites/route.ts`
- `template/app/api/favorites/[itemSlug]/route.ts`

## Крайна точка Резюме

|Метод|Пътека|авт|Описание|
|--------|------|------|-------------|
|ВЗЕМЕТЕ|`/api/favorites`|Сесия|Избройте всички любими за текущия потребител|
|ПУБЛИКУВАНЕ|`/api/favorites`|Сесия|Добавяне на артикул към любими|
|ИЗТРИВАНЕ|`/api/favorites/{itemSlug}`|Сесия|Премахване на елемент от любими|

Всички крайни точки изискват удостоверена потребителска сесия и работеща връзка с база данни (проверена чрез `checkDatabaseAvailability`).

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

## ПУБЛИКУВАНЕ `/api/favorites`

Добавя елемент към любимите на удостоверения потребител. Включва проверка за дублиране, за да се предотврати добавянето на един и същ елемент два пъти.

### Тяло на заявката

|Поле|Тип|Задължително|Описание|
|-------|------|----------|-------------|
|`itemSlug`|низ|**Да**|Уникален идентификатор на елемента|
|`itemName`|низ|**Да**|Екранно име на артикул|
|`itemIconUrl`|низ|не|URL към иконата на елемента|
|`itemCategory`|низ|не|Име на категория за артикула|

Основният текст на заявката се валидира с помощта на Zod схема:

```ts
const addFavoriteSchema = z.object({
  itemSlug: z.string().min(1),
  itemName: z.string().min(1),
  itemIconUrl: z.string().optional(),
  itemCategory: z.string().optional(),
});
```

### Пример за заявка

```json
{
  "itemSlug": "awesome-productivity-tool",
  "itemName": "Awesome Productivity Tool",
  "itemIconUrl": "https://example.com/icons/tool.png",
  "itemCategory": "productivity"
}
```

### Форма на отговора

#### 201 -- Създаден

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

#### 400 -- Грешка при валидиране

```json
{
  "success": false,
  "error": "Invalid request data",
  "details": "itemSlug is required and must be a non-empty string"
}
```

#### 401 -- Неразрешено

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

#### 409 -- Конфликт (дубликат)

```json
{
  "success": false,
  "error": "Item is already in favorites"
}
```

### Откриване на дублиране

Преди вмъкване манипулаторът проверява за съществуващ фаворит със същия потребител и елемент:

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

## Пример за използване (Пълен работен процес)

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

## Изисквания към базата данни

- Изисква таблицата `favorites` да съществува в схемата на базата данни.
- `checkDatabaseAvailability()` се извиква в началото на всеки манипулатор.
- Отговорите за грешка използват `safeErrorResponse`, за да се избегне изтичане на вътрешни подробности.

## Свързани изходни файлове

|Файл|Цел|
|------|---------|
|`template/app/api/favorites/route.ts`|GET (списък) и POST (добавяне) манипулатори|
|`template/app/api/favorites/[itemSlug]/route.ts`|Манипулатор DELETE|
|`template/lib/db/schema.ts`|`favorites` дефиниция на таблица|
|`template/lib/utils/database-check.ts`|Проверка на наличността на база данни|
|`template/lib/utils/api-error.ts`|Помощна програма за безопасно реагиране при грешка|
