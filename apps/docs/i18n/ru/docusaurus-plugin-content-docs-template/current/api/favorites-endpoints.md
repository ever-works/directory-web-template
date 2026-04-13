---
id: favorites-endpoints
title: "收藏夹 API 端点"
sidebar_label: "收藏夹"
sidebar_position: 13
---

# 收藏夹 API 端点

收藏夹 API 允许经过身份验证的用户管理其个人收藏夹项目列表。每个收藏夹都存储项目元数据（名称、图标、类别）以便快速显示，而无需加入内容层。

**源文件：**
- `template/app/api/favorites/route.ts`
- `template/app/api/favorites/[itemSlug]/route.ts`

## 端点摘要

|方法|路径|授权|描述|
|--------|------|------|-------------|
|获取|`/api/favorites`|会议|列出当前用户的所有收藏夹|
|后处理|`/api/favorites`|会议|将项目添加到收藏夹|
|删除|`/api/favorites/{itemSlug}`|会议|从收藏夹中删除项目|

所有端点都需要经过身份验证的用户会话和工作数据库连接（通过`checkDatabaseAvailability`检查）。

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

## 发布 `/api/favorites`

将项目添加到经过身份验证的用户的收藏夹中。包括重复检查以防止两次添加相同的项目。

### 请求正文

|领域|类型|必填|描述|
|-------|------|----------|-------------|
|`itemSlug`|字符串|**是**|唯一的物品标识符|
|`itemName`|字符串|**是**|项目显示名称|
|`itemIconUrl`|字符串|否|项目图标的 URL|
|`itemCategory`|字符串|否|项目的类别名称|

使用 Zod 模式验证请求正文：

```ts
const addFavoriteSchema = z.object({
  itemSlug: z.string().min(1),
  itemName: z.string().min(1),
  itemIconUrl: z.string().optional(),
  itemCategory: z.string().optional(),
});
```

### 请求示例

```json
{
  "itemSlug": "awesome-productivity-tool",
  "itemName": "Awesome Productivity Tool",
  "itemIconUrl": "https://example.com/icons/tool.png",
  "itemCategory": "productivity"
}
```

### 响应形状

#### 201 -- 创建

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

#### 400 -- 验证错误

```json
{
  "success": false,
  "error": "Invalid request data",
  "details": "itemSlug is required and must be a non-empty string"
}
```

#### 401 -- 未经授权

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

#### 409 -- 冲突（重复）

```json
{
  "success": false,
  "error": "Item is already in favorites"
}
```

### 重复检测

在插入之前，处理程序会检查是否存在具有相同用户和项目 slug 的现有收藏夹：

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

## 使用示例（完整工作流程）

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

## 数据库要求

- 要求`favorites` 表存在于数据库模式中。
- `checkDatabaseAvailability()` 在每个处理程序开始时调用。
- 错误响应使用 `safeErrorResponse` 以避免泄露内部详细信息。

## 相关源文件

|文件|目的|
|------|---------|
|`template/app/api/favorites/route.ts`|GET（列表）和 POST（添加）处理程序|
|`template/app/api/favorites/[itemSlug]/route.ts`|删除处理程序|
|`template/lib/db/schema.ts`|`favorites` 表定义|
|`template/lib/utils/database-check.ts`|数据库可用性检查|
|`template/lib/utils/api-error.ts`|安全错误响应实用程序|
