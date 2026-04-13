---
id: admin-tags-endpoints
title: 管理标签 API 端点
sidebar_label: 管理员标签
sidebar_position: 34
---

# 管理标签 API 端点

管理标签 API 提供了用于管理内容标签的完整 CRUD 操作。标签用于对目录中的项目进行分类和过滤。该 API 支持分页列表、活动/非活动状态创建、更新、删除以及从内容缓存中进行区域设置感知检索。所有写入操作都会使内容缓存失效，以实现即时可见性。

## 路线概要

|方法|路径|授权|描述|
|--------|------|------|-------------|
|`GET`|`/api/admin/tags`|管理员|列表标签（分页）|
|`POST`|`/api/admin/tags`|管理员|创建一个新标签|
|`GET`|`/api/admin/tags/all`|管理员|获取所有标签（从内容缓存）|
|`GET`|`/api/admin/tags/{id}`|管理员|通过ID获取单个标签|
|`PUT`|`/api/admin/tags/{id}`|管理员|更新标签|
|`DELETE`|`/api/admin/tags/{id}`|管理员|永久删除标签|

## 认证

所有标签管理端点都需要管理员权限：

```typescript
const session = await auth();
if (!session?.user?.isAdmin) {
  return NextResponse.json(
    { success: false, error: 'Unauthorized' },
    { status: 401 }
  );
}
```

## 端点

### 获取`/api/admin/tags`

返回系统中所有标签的分页列表。分页参数使用共享`validatePaginationParams`实用程序进行验证。

**查询参数：**

|参数|类型|默认|描述|
|-----------|------|---------|-------------|
|`page`|整数| `1` |页码（最少：1）|
|`limit`|整数| `10` |每页项目 (1--100)|

**回复 (200)：**

```json
{
  "success": true,
  "data": {
    "tags": [
      {
        "id": "productivity",
        "name": "Productivity",
        "isActive": true,
        "itemCount": 156,
        "created_at": "2024-01-20T10:30:00.000Z",
        "updated_at": "2024-01-20T10:30:00.000Z"
      },
      {
        "id": "design",
        "name": "Design",
        "isActive": true,
        "itemCount": 89,
        "created_at": "2024-01-19T15:20:00.000Z",
        "updated_at": "2024-01-19T15:20:00.000Z"
      }
    ],
    "total": 45,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

### 发布 `/api/admin/tags`

创建具有指定 ID、名称和可选活动状态的新标签。成功后使内容缓存无效。

**请求正文：**

```json
{
  "id": "artificial-intelligence",
  "name": "Artificial Intelligence",
  "isActive": true
}
```

|领域|类型|必填|描述|
|-------|------|----------|-------------|
|`id`|字符串|是的|URL 友好的 slug 标识符|
|`name`|字符串|是的|人类可读的标签名称（2--50 个字符）|
|`isActive`|布尔值|否|标签是否处于活动状态（默认：`true`）|

**验证规则：**
- `id` 和 `name` 均为必需
- 标签名称必须介于 2 到 50 个字符之间
- 标签 ID 在所有现有标签中必须是唯一的
- 标签名称在所有现有标签中必须是唯一的

**回复（201）：**

```json
{
  "success": true,
  "tag": {
    "id": "artificial-intelligence",
    "name": "Artificial Intelligence",
    "isActive": true,
    "itemCount": 0,
    "created_at": "2024-01-20T10:30:00.000Z",
    "updated_at": "2024-01-20T10:30:00.000Z"
  }
}
```

### 获取`/api/admin/tags/all`

返回给定区域设置的内容缓存中的所有标签。该端点从缓存的内容层而不是数据库中读取，使其适合在管理 UI 中填充标签选择器。

**查询参数：**

|参数|类型|默认|描述|
|-----------|------|---------|-------------|
|`locale`|字符串|`"en"`|用于内容检索的区域设置代码|

**回复 (200)：**

```json
{
  "success": true,
  "data": [
    {
      "id": "productivity",
      "name": "Productivity",
      "isActive": true,
      "itemCount": 156
    }
  ]
}
```

### 获取`/api/admin/tags/{id}`

通过其唯一标识符检索单个标签，并提供包括使用统计信息在内的完整详细信息。

**路径参数：**

|参数|类型|描述|
|-----------|------|-------------|
|`id`|字符串|标签唯一标识符|

**回复 (200)：**

```json
{
  "success": true,
  "data": {
    "id": "productivity",
    "name": "Productivity",
    "isActive": true,
    "itemCount": 156,
    "created_at": "2024-01-20T10:30:00.000Z",
    "updated_at": "2024-01-20T10:30:00.000Z"
  }
}
```

### 把`/api/admin/tags/{id}`

更新标签的名称和/或活动状态。标签 ID 创建后无法更改。成功后使内容缓存无效。

**路径参数：**

|参数|类型|描述|
|-----------|------|-------------|
|`id`|字符串|标签唯一标识符|

**请求正文：**

```json
{
  "name": "Productivity & Efficiency",
  "isActive": true
}
```

|领域|类型|必填|描述|
|-------|------|----------|-------------|
|`name`|字符串|是的|更新了标签显示名称|
|`isActive`|布尔值|否|更新了活跃状态|

**回复 (200)：**

```json
{
  "success": true,
  "data": {
    "id": "productivity",
    "name": "Productivity & Efficiency",
    "isActive": true,
    "itemCount": 156,
    "created_at": "2024-01-20T10:30:00.000Z",
    "updated_at": "2024-01-20T16:45:00.000Z"
  },
  "message": "Tag updated successfully"
}
```

### 删除`/api/admin/tags/{id}`

从系统中永久删除标签。这也会从所有关联的项目中删除该标签。成功后使内容缓存无效。

**路径参数：**

|参数|类型|描述|
|-----------|------|-------------|
|`id`|字符串|标签唯一标识符|

**回复 (200)：**

```json
{
  "success": true,
  "message": "Tag deleted successfully"
}
```

:::注意
标签删除是永久性的且无法撤消。已删除标签的所有项目-标签关联都将被删除。如果您想保持数据完整性，请考虑停用标签（通过 PUT 将 `isActive` 设置为 `false`）。
:::

## 标签数据模型

|领域|类型|可空|描述|
|-------|------|----------|-------------|
|`id`|字符串|否|URL 友好的唯一标识符|
|`name`|字符串|否|人类可读的显示名称|
|`isActive`|布尔值|否|是否可以将标签分配给项目|
|`itemCount`|整数|否|使用此标签的商品数量|
|`created_at`|日期时间|否|创建时间戳|
|`updated_at`|日期时间|否|最后更新时间戳|

## 错误代码

|状态|错误|原因|
|--------|-------|-------|
| `400` |标签 ID 和名称为必填项|创建时缺少必填字段|
| `400` |标签名称为必填项|更新时缺少名字|
| `400` |标签名称必须介于 2 到 50 个字符之间|名称长度验证失败|
| `400` |无效的页/限制参数|分页参数超出范围|
| `401` |未经授权|缺少或非管理会话|
| `404` |未找到标签|没有具有给定 ID 的标签|
| `409` |带有 ID 的标签已存在|创建时出现重复 ID|
| `409` |名称标签已存在|创建/更新时名称重复|
| `500` |无法获取/创建/更新/删除标签|服务器或数据库错误|

## 缓存失效

所有写入操作（创建、更新、删除）都会调用 `invalidateContentCaches()` 以确保标签更改立即反映在面向公众的内容中：

```typescript
await invalidateContentCaches();
```

这会清除内存内容缓存和任何可能处于活动状态的 CDN 级缓存。

## 数据来源

标签 API 根据端点使用两个不同的数据源：

|端点|数据来源|使用案例|
|----------|------------|----------|
|`GET /api/admin/tags`|`tagRepository`（数据库）|管理员管理分页|
|`POST /api/admin/tags`|`tagRepository`（数据库）|创建新标签|
|`GET /api/admin/tags/all`|`getCachedItems()`（内容缓存）|下拉选择器，快速查找|
|`GET /api/admin/tags/{id}`|`tagRepository`（数据库）|详细标签视图|
|`PUT /api/admin/tags/{id}`|`tagRepository`（数据库）|更新标签属性|
|`DELETE /api/admin/tags/{id}`|`tagRepository`（数据库）|删除标签|

## 相关文档

- [管理端点概述](./admin-endpoints.md)
- [Admin Categories Endpoints](./admin-categories-endpoints.md) -- 类似的类别管理模式
- [响应模式](./response-patterns.md)
- [请求验证](./request-validation.md)
