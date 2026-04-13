---
id: admin-comments-endpoints
title: 管理员评论 API 端点
sidebar_label: 管理员评论
sidebar_position: 31
---

# 管理员评论 API 端点

管理评论 API 提供了用于管理用户评论的审核功能。管理员可以列出、查看、更新和软删除评论。所有端点都使用 Node.js 运行时并需要数据库可用性。对于非管理员用户，身份验证检查使用`403 Forbidden`。

## 路线概要

|方法|路径|授权|描述|
|--------|------|------|-------------|
|`GET`|`/api/admin/comments`|管理员|列出评论（分页，可搜索）|
|`GET`|`/api/admin/comments/{id}`|管理员|获取包含用户信息的单个评论|
|`PUT`|`/api/admin/comments/{id}`|管理员|更新评论内容|
|`DELETE`|`/api/admin/comments/{id}`|管理员|软删除评论|

## 认证

评论审核端点验证管理员状态并为非管理员用户返回`403 Forbidden`（不是`401`）：

```typescript
const session = await auth();
if (!session?.user?.isAdmin) {
  return NextResponse.json(
    { success: false, error: "Forbidden" },
    { status: 403 }
  );
}
```

## 数据库要求

评论端点在处理请求之前检查数据库可用性：

```typescript
const dbCheck = checkDatabaseAvailability();
if (dbCheck) return dbCheck;
```

如果未配置数据库，则在进行任何身份验证检查之前会返回相应的错误响应。

## 端点

### 获取`/api/admin/comments`

返回带有关联用户信息的分页评论列表。支持跨评论内容、用户名和用户电子邮件的全文搜索。仅返回未删除的评论。

**查询参数：**

|参数|类型|默认|描述|
|-----------|------|---------|-------------|
|`page`|整数| `1` |分页的页码|
|`limit`|整数| `10` |每页评论 (1--100)|
|`search`|字符串| `""` |在内容、用户名或电子邮件中搜索|

**搜索行为：**

搜索查询不区分大小写（使用 `ILIKE`）与：
- 评论内容
- 用户显示名称
- 用户电子邮件地址

特殊字符 `%`、`_` 和 `\` 会被转义以防止 SQL 模式注入。

**回复 (200)：**

```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "comment_123abc",
        "content": "This is a great product! Highly recommended.",
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

### 获取`/api/admin/comments/{id}`

通过 ID 检索特定评论以及完整的用户个人资料信息。包括到 `clientProfiles` 表的用户数据的左联接。

**路径参数：**

|参数|类型|描述|
|-----------|------|-------------|
|`id`|字符串|评论唯一标识符|

**回复 (200)：**

```json
{
  "success": true,
  "data": {
    "id": "comment_123abc",
    "content": "This is a great product! Highly recommended.",
    "rating": 5,
    "userId": "user_456def",
    "itemId": "item_789ghi",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T14:45:00.000Z",
    "user": {
      "id": "user_456def",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "image": "https://example.com/avatar.jpg"
    }
  }
}
```

**用户后备：** 如果未找到用户配置文件（已删除用户），则返回占位符对象：

```json
{
  "user": {
    "id": "",
    "name": "Unknown User",
    "email": "",
    "image": null
  }
}
```

### 把`/api/admin/comments/{id}`

更新特定评论的内容。只能修改`content` 字段。该评论必须存在且不能被软删除。

**路径参数：**

|参数|类型|描述|
|-----------|------|-------------|
|`id`|字符串|评论唯一标识符|

**请求正文：**

```json
{
  "content": "This is an updated comment with more details."
}
```

|领域|类型|必填|描述|
|-------|------|----------|-------------|
|`content`|字符串|是的|新评论文字（修剪后不能为空）|

**验证规则：**
- `content` 为必填项，且不能为空或仅包含空格
- 目标评论必须存在，并且不能有 `deletedAt` 时间戳

**回复 (200)：**

```json
{
  "success": true,
  "data": {
    "id": "comment_123abc",
    "content": "This is an updated comment with more details.",
    "rating": 5,
    "userId": "user_456def",
    "itemId": "item_789ghi",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T16:15:00.000Z",
    "user": { "id": "user_456def", "name": "John Doe", "email": "john.doe@example.com", "image": null }
  },
  "message": "Comment updated successfully"
}
```

### 删除`/api/admin/comments/{id}`

通过设置 `deletedAt` 时间戳对评论执行软删除。该评论必须存在且尚未被删除。软删除的评论被排除在所有列表查询之外。

**路径参数：**

|参数|类型|描述|
|-----------|------|-------------|
|`id`|字符串|评论唯一标识符|

**回复 (200)：**

```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

## 评论数据模型

|领域|类型|可空|描述|
|-------|------|----------|-------------|
|`id`|字符串|否|唯一评论标识符|
|`content`|字符串|否|评论文字内容|
|`rating`|整数|是的|评级值（1--5）|
|`userId`|字符串|否|作者用户 ID|
|`itemId`|字符串|否|关联项目 ID|
|`createdAt`|日期时间|是的|创建时间戳|
|`updatedAt`|日期时间|是的|最后更新时间戳|
|`deletedAt`|日期时间|是的|软删除时间戳（如果处于活动状态则为空）|

## 错误代码

|状态|错误|原因|
|--------|-------|-------|
| `400` |内容为必填项|更新时内容为空或缺失|
| `403` |禁止|非管理员用户尝试访问|
| `404` |未找到评论|ID 无效或已被软删除|
| `500` |内部服务器错误|数据库或服务器故障|

## 实施说明

- 注释使用**软删除** - 设置`deletedAt` 字段而不是删除该行。这可以保持数据完整性并允许潜在的恢复。
- 所有列表查询都使用 `isNull(comments.deletedAt)` 进行过滤，以排除已删除的评论。
- 用户数据通过 `clientProfiles` 上的 `LEFT JOIN` 获取，确保仍可检索已删除用户的评论。
- 对于这些路由（不是边缘），`runtime` 设置为 `"nodejs"`。

## 相关文档

- [管理端点概述](./admin-endpoints.md)
- [评论公共端点](./comment-endpoints.md)
- [响应模式](./response-patterns.md)
- [请求验证](./request-validation.md)
