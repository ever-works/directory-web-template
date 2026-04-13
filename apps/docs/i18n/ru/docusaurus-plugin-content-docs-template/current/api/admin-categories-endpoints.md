---
id: admin-categories-endpoints
title: 管理类别 API 端点
sidebar_label: 管理类别
sidebar_position: 30
---

# 管理类别 API 端点

管理类别 API 提供了用于管理内容类别的完整 CRUD 操作，包括重新排序以及与远程数据存储库基于 Git 的同步。所有端点都需要通过基于会话的身份验证进行管理员身份验证。

## 路线概要

|方法|路径|授权|描述|
|--------|------|------|-------------|
|`GET`|`/api/admin/categories`|管理员|列出类别（分页）|
|`POST`|`/api/admin/categories`|管理员|创建一个新类别|
|`GET`|`/api/admin/categories/all`|管理员|获取所有类别（从内容缓存）|
|`GET`|`/api/admin/categories/{id}`|管理员|通过ID获取单个类别|
|`PUT`|`/api/admin/categories/{id}`|管理员|更新类别|
|`DELETE`|`/api/admin/categories/{id}`|管理员|软或硬删除类别|
|`PUT`|`/api/admin/categories/reorder`|管理员|按 ID 数组对类别重新排序|
|`GET`|`/api/admin/categories/git`|管理员|获取 Git 存储库状态和类别|
|`POST`|`/api/admin/categories/git`|管理员|通过 Git 提交创建类别|

## 认证

所有类别管理端点都会检查具有管理员权限的活动会话：

```typescript
const session = await auth();
if (!session?.user?.isAdmin) {
  return NextResponse.json(
    { success: false, error: "Unauthorized. Admin access required." },
    { status: 401 }
  );
}
```

## 端点

### 获取`/api/admin/categories`

返回带有可选过滤和排序的分页类别列表。

**查询参数：**

|参数|类型|默认|描述|
|-----------|------|---------|-------------|
|`page`|整数| `1` |页码（最少：1）|
|`limit`|整数| `10` |每页项目 (1--100)|
|`includeInactive`|字符串|`"false"`|包括不活跃的类别|
|`sortBy`|字符串|`"name"`|排序字段：`"name"` 或 `"id"`|
|`sortOrder`|字符串|`"asc"`|排序方向：`"asc"` 或 `"desc"`|

**回复 (200)：**

```json
{
  "success": true,
  "categories": [
    {
      "id": "productivity",
      "name": "Productivity",
      "isActive": true,
      "itemCount": 15,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

### 发布 `/api/admin/categories`

创建一个新类别。 `id` 字段是可选的，如果未提供，将根据名称自动生成。成功后使内容缓存无效。

**请求正文：**

```json
{
  "id": "productivity",
  "name": "Productivity"
}
```

|领域|类型|必填|描述|
|-------|------|----------|-------------|
|`id`|字符串|否|URL 友好的段 (`^[a-z0-9-]+$`)。如果省略则自动生成。|
|`name`|字符串|是的|显示名称（2--100 个字符）|

**回复（201）：**

```json
{
  "success": true,
  "category": {
    "id": "productivity",
    "name": "Productivity",
    "isActive": true,
    "itemCount": 0,
    "createdAt": "2024-01-20T15:30:00.000Z",
    "updatedAt": "2024-01-20T15:30:00.000Z"
  },
  "message": "Category created successfully"
}
```

### 获取`/api/admin/categories/all`

返回给定区域设置的内容缓存中的所有类别。对于管理下拉列表和选择器很有用。

**查询参数：**

|参数|类型|默认|描述|
|-----------|------|---------|-------------|
|`locale`|字符串|`"en"`|用于内容检索的区域设置代码|

**回复 (200)：**

```json
{
  "success": true,
  "data": [
    { "id": "productivity", "name": "Productivity", "isActive": true, "itemCount": 15 }
  ]
}
```

### 获取`/api/admin/categories/{id}`

通过其唯一标识符检索单个类别。

**回复 (200)：**

```json
{
  "success": true,
  "data": {
    "id": "productivity",
    "name": "Productivity",
    "isActive": true,
    "itemCount": 15,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 把`/api/admin/categories/{id}`

更新现有类别的名称。成功后使内容缓存无效。

**请求正文：**

```json
{ "name": "Productivity Tools" }
```

**回复 (200)：**

```json
{
  "success": true,
  "data": { "id": "productivity", "name": "Productivity Tools", "isActive": true },
  "message": "Category updated successfully"
}
```

### 删除`/api/admin/categories/{id}`

删除一个类别。默认情况下执行软删除（停用）。使用 `hard=true` 查询参数进行永久删除。成功后使内容缓存无效。

**查询参数：**

|参数|类型|默认|描述|
|-----------|------|---------|-------------|
|`hard`|字符串|`"false"`|设置为 `"true"` 以永久删除|

**回复 (200)：**

```json
{
  "success": true,
  "message": "Category deactivated successfully"
}
```

### 把`/api/admin/categories/reorder`

根据类别 ID 数组对类别重新排序。数组中每个 ID 的位置决定了其新的显示顺序。

**请求正文：**

```json
{ "categoryIds": ["productivity", "design", "development", "marketing"] }
```

**验证规则：**
- `categoryIds` 必须是非空数组
- 所有值必须是字符串

**回复 (200)：**

```json
{
  "success": true,
  "message": "Categories reordered successfully"
}
```

### 获取`/api/admin/categories/git`

从配置的 GitHub 数据存储库中获取 Git 存储库状态和类别。需要 `DATA_REPOSITORY` 和 `GITHUB_TOKEN` 环境变量。

**回复 (200)：**

```json
{
  "success": true,
  "status": {
    "repository": "ever-co/awesome-time-tracking-data",
    "branch": "main",
    "lastCommit": "abc123def456",
    "lastCommitDate": "2024-01-20T10:30:00.000Z",
    "isUpToDate": true
  },
  "categories": [],
  "message": "Git repository status retrieved successfully"
}
```

### 发布 `/api/admin/categories/git`

创建一个新类别并将其直接提交到 GitHub 数据存储库。需要 `DATA_REPOSITORY` 和 `GH_TOKEN` 环境变量。

**请求正文：**

```json
{ "id": "productivity", "name": "Productivity" }
```

基于 Git 的创建需要 `id` 和 `name`。

**回复 (200)：**

```json
{
  "success": true,
  "category": { "id": "productivity", "name": "Productivity" },
  "message": "Category created and committed to Git repository"
}
```

## 错误代码

|状态|错误|原因|
|--------|-------|-------|
| `400` |分页参数无效|页数 < 1 或限制在 1--100 之外|
| `400` |类别名称为必填项|创建请求中缺少 `name`|
| `400` |CategoryIds 必须是一个数组|重新排序负载无效|
| `401` |未经授权。需要管理员访问权限。|缺少或非管理会话|
| `404` |未找到类别|类别 ID 无效|
| `409` |同名的类别已存在|创建/更新时名称重复|
| `500` |DATA_REPOSITORY 未配置|缺少 Git 端点的环境变量|
| `500` |GitHub 令牌未配置|缺少 `GITHUB_TOKEN` 或 `GH_TOKEN`|

## 缓存失效

所有写入操作（创建、更新、删除、重新排序）都会调用 `invalidateContentCaches()` 以确保更改在整个应用程序中立即可见。

## 相关文档

- [管理端点概述](./admin-endpoints.md)
- [类别公共端点](./category-endpoints.md)
- [响应模式](./response-patterns.md)
- [请求验证](./request-validation.md)
