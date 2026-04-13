---
id: comment-endpoints
title: 评论端点
sidebar_label: 评论
sidebar_position: 24
---

# 评论端点

评论系统提供用于创建、阅读、更新和删除项目评论的端点。评论包括 1-5 星级，并支持公共访问（阅读）和经过身份验证的操作（创建/编辑/删除）。管理端点提供审核功能。

## 概述

### 公共端点

|端点|方法|授权|描述|
|---|---|---|---|
|`/api/items/[slug]/comments`|获取|公共|列出对某个项目的评论|
|`/api/items/[slug]/comments/rating`|获取|公共|获取综合评分统计数据|
|`/api/items/[slug]/comments/rating/[commentId]`|获取|公共|获取单个评论的评分|

### 经过身份验证的端点

|端点|方法|授权|描述|
|---|---|---|---|
|`/api/items/[slug]/comments`|后处理|用户|创建新评论|
|`/api/items/[slug]/comments/[commentId]`|放置|业主|更新自己的评论|
|`/api/items/[slug]/comments/[commentId]`|删除|业主|删除自己的评论|
|`/api/items/[slug]/comments/rating/[commentId]`|补丁|用户|更新评论的评级|

### 管理端点

|端点|方法|授权|描述|
|---|---|---|---|
|`/api/admin/comments`|获取|管理员|列出所有评论并分页|
|`/api/admin/comments/[id]`|获取|管理员|通过ID获取评论|
|`/api/admin/comments/[id]`|放置|管理员|更新评论内容|
|`/api/admin/comments/[id]`|删除|管理员|软删除评论|

## 公共端点

### 列出项目评论

```
GET /api/items/[slug]/comments
```

返回特定项目的所有评论，包括用户个人资料信息。无需身份验证。

**路径参数：**

|参数|类型|描述|
|---|---|---|
|`slug`|字符串|物品子弹|

**成功响应 (200)：**

```json
{
  "success": true,
  "comments": [
    {
      "id": "comment_123abc",
      "content": "This is an amazing tool!",
      "rating": 5,
      "userId": "client_456def",
      "itemId": "item_123abc",
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z",
      "deletedAt": null,
      "user": {
        "id": "client_456def",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "avatar": "https://example.com/avatars/john.jpg"
      }
    }
  ]
}
```

**来源：** `template/app/api/items/[slug]/comments/route.ts`

### 获取评级统计数据

```
GET /api/items/[slug]/comments/rating
```

返回项目的平均评分和评分总数。只计算未删除的评论。

**成功响应 (200)：**

```json
{
  "averageRating": 4.2,
  "totalRatings": 15
}
```

当不存在评级时，返回 `averageRating: 0` 和 `totalRatings: 0`。

**来源：** `template/app/api/items/[slug]/comments/rating/route.ts`

## 经过身份验证的端点

### 创建评论

```
POST /api/items/[slug]/comments
```

创建带有项目评级的新评论。需要身份验证和有效的客户端配置文件。被阻止的用户将无法发表评论。

**身份验证：** 需要

**请求正文：**

```json
{
  "content": "This is an amazing tool! Really helped boost my productivity.",
  "rating": 5
}
```

|领域|类型|必填|约束条件|
|---|---|---|---|
|`content`|字符串|是的|修剪后必须非空|
|`rating`|整数|是的|必须介于 1 到 5 之间（含 1 和 5）|

**成功响应 (200)：**

```json
{
  "success": true,
  "comment": {
    "id": "comment_123abc",
    "content": "This is an amazing tool!",
    "rating": 5,
    "userId": "client_456def",
    "itemId": "item_123abc",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "user": {
      "id": "client_456def",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "avatar": "https://example.com/avatars/john.jpg"
    }
  }
}
```

|状态|条件|
|---|---|
| 400 |内容为空或评分无效|
| 401 |未经过验证|
| 403 |用户被暂停或禁止|
| 404 |未找到客户资料|

**来源：** `template/app/api/items/[slug]/comments/route.ts`

### 更新评论

```
PUT /api/items/[slug]/comments/[commentId]
```

更新现有评论的内容和/或评级。只有评论作者可以更新自己的评论。必须至少提供`content` 或`rating` 之一。

**身份验证：** 必填（必须是评论所有者）

**请求正文：**

```json
{
  "content": "Updated review text",
  "rating": 4
}
```

|领域|类型|必填|约束条件|
|---|---|---|---|
|`content`|字符串|否|1-1000个字符|
|`rating`|整数|否|必须介于 1 到 5 之间|

响应包括带有 `editedAt` 时间戳的更新评论。

|状态|条件|
|---|---|
| 400 |未提供字段、内容太长或评级无效|
| 401 |未经过验证|
| 404 |找不到评论或用户不是作者|

**来源：** `template/app/api/items/[slug]/comments/[commentId]/route.ts`

### 删除评论

```
DELETE /api/items/[slug]/comments/[commentId]
```

软删除评论。只有评论作者可以删除自己的评论。该评论标有 `deletedAt` 时间戳，而不是永久删除。

**身份验证：** 必填（必须是评论所有者）

**成功响应：** 204 无内容

|状态|条件|
|---|---|
| 401 |未经过验证|
| 404 |找不到评论、已删除评论或不属于用户所有|

**来源：** `template/app/api/items/[slug]/comments/[commentId]/route.ts`

### 更新评论评级

```
PATCH /api/items/[slug]/comments/rating/[commentId]
```

仅更新特定评论的评分。

**请求正文：**

```json
{
  "rating": 4
}
```

**来源：** `template/app/api/items/[slug]/comments/rating/[commentId]/route.ts`

## 管理端点

所有管理端点都要求 `session.user.isAdmin` 为 true。

### 列出所有评论

```
GET /api/admin/comments
```

返回包含用户信息的所有评论（不包括软删除的评论）的分页列表。支持跨评论内容、用户名和用户电子邮件进行搜索。

**查询参数：**

|参数|类型|默认|描述|
|---|---|---|---|
|`page`|整数| 1 |页码|
|`limit`|整数| 10 |每页结果 (1-100)|
|`search`|字符串| - |在内容、用户名或电子邮件中搜索|

**成功响应 (200)：**

```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "comment_123abc",
        "content": "Great product!",
        "rating": 5,
        "userId": "user_456def",
        "itemId": "item_789ghi",
        "createdAt": "2024-01-20T10:30:00.000Z",
        "updatedAt": "2024-01-20T10:30:00.000Z",
        "user": {
          "id": "user_456def",
          "name": "John Doe",
          "email": "john.doe@example.com",
          "image": "https://example.com/avatar.jpg"
        }
      }
    ],
    "pagination": {
      "total": 156,
      "page": 1,
      "limit": 10,
      "totalPages": 16
    }
  }
}
```

**来源：** `template/app/api/admin/comments/route.ts`

### 通过ID获取评论

```
GET /api/admin/comments/[id]
```

检索带有完整用户信息的特定评论。

**来源：** `template/app/api/admin/comments/[id]/route.ts`

### 管理员更新评论

```
PUT /api/admin/comments/[id]
```

允许管理员更新任何评论的内容，无论所有权如何。

**请求正文：**

```json
{
  "content": "This content has been moderated by an administrator."
}
```

**来源：** `template/app/api/admin/comments/[id]/route.ts`

### 管理员删除评论

```
DELETE /api/admin/comments/[id]
```

软删除任何评论。该评论必须存在且尚未被删除。

**成功响应 (200)：**

```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

|状态|条件|
|---|---|
| 403 |不是管理员|
| 404 |评论未找到或已被删除|

**来源：** `template/app/api/admin/comments/[id]/route.ts`

## 关键实施细节

- **软删除：** 所有删除设置`deletedAt`而不是删除记录。查询通过`isNull(comments.deletedAt)`过滤掉已删除的评论。
- **所有权验证：** 用户端点验证经过身份验证的用户的客户端配置文件 ID 是否与评论的 `userId` 字段相匹配。
- **阻止用户预防：** `isUserBlocked()` 检查可防止暂停或禁止的用户创建评论。
- **搜索（管理员）：** 使用 ILIKE 进行不区分大小写的搜索，并正确转义 SQL 通配符（`%` 和 `_`）。
