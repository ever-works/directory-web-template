---
id: favorites-api-endpoints
title: 收藏夹 API 端点
sidebar_label: 收藏夹API
sidebar_position: 62
---

# 收藏夹 API 端点

收藏夹 API 允许经过身份验证的用户管理他们收藏的项目。用户可以从他们的个人收藏夹列表中列出、添加和删除项目。收藏夹记录存储项目元数据（名称、图标、类别）以便快速显示，而无需加入项目表。

**源码目录：** `template/app/api/favorites/`

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

## 列出用户收藏夹

返回经过身份验证的用户收藏的所有项目。

|财产|价值|
|----------|-------|
|**方法**|`GET`|
|**路径**|`/api/favorites`|
|**授权**|会话（用户）|
|**来源**|`favorites/route.ts`|

### 回应

**状态 200**

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

|领域|类型|描述|
|-------|------|-------------|
|`favorites[].id`|`string`|收藏夹记录 ID|
|`favorites[].userId`|`string`|收藏该商品的用户|
|`favorites[].itemSlug`|`string`|物品块标识符|
|`favorites[].itemName`|`string`|项目显示名称|
|`favorites[].itemIconUrl`|`字符串\|空`|项目图标 URL|
|`favorites[].itemCategory`|`字符串\|空`|项目类别|
|`favorites[].createdAt`|`string` (ISO 8601)|当该项目被收藏时|
|`favorites[].updatedAt`|`字符串\|空`|最后更新时间戳|

收藏夹按 `createdAt` 排序（最旧的在前）。

### 卷曲示例

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

## 删除收藏夹

从经过身份验证的用户的收藏夹列表中删除特定项目。

|财产|价值|
|----------|-------|
|**方法**|`DELETE`|
|**路径**|`/api/favorites/{itemSlug}`|
|**授权**|会话（用户）|
|**来源**|`favorites/[itemSlug]/route.ts`|

### 路径参数

|参数|类型|描述|
|-----------|------|-------------|
|`itemSlug`|`string`|要从收藏夹中删除的项目 slug 标识符|

### 回应

**状态 200** -- 已成功删除收藏夹。

```json
{
  "success": true,
  "message": "Favorite removed successfully"
}
```

**状态 404** -- 未找到收藏夹。

```json
{
  "success": false,
  "error": "Favorite not found"
}
```

### 卷曲示例

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
