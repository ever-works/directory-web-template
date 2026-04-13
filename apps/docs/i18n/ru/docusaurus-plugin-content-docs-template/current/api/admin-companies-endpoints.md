---
id: admin-companies-endpoints
title: 管理公司 API 端点
sidebar_label: 管理公司
sidebar_position: 32
---

# 管理公司 API 端点

管理公司 API 提供公司记录的管理端点。公司代表与所列项目相关的组织。该 API 支持完整的 CRUD 操作，包括基于 Zod 的验证、域/slug 唯一性强制执行以及可选的 CRM 更新同步。

## 路线概要

|方法|路径|授权|描述|
|--------|------|------|-------------|
|`GET`|`/api/admin/companies`|管理员|列出公司（分页、可搜索）|
|`POST`|`/api/admin/companies`|管理员|创建一个新公司|
|`GET`|`/api/admin/companies/{id}`|管理员|通过UUID获取单个公司|
|`PUT`|`/api/admin/companies/{id}`|管理员|更新公司|
|`DELETE`|`/api/admin/companies/{id}`|管理员|永久删除公司|

## 认证

所有公司端点验证会话是否具有管理员权限：

```typescript
const session = await auth();
if (!session?.user?.isAdmin) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

## 端点

### 获取`/api/admin/companies`

返回具有搜索和状态过滤功能的公司分页列表。还返回活跃和不活跃公司的全球计数，无论应用什么过滤器。

**查询参数：**

|参数|类型|默认|描述|
|-----------|------|---------|-------------|
|`page`|整数| `1` |页码（必须 >= 1）|
|`limit`|整数| `10` |每页项目 (1--100)|
|`q`|字符串| -- |按名称或域搜索（不区分大小写）|
|`status`|字符串| -- |过滤器：`"active"` 或 `"inactive"`|

**回复 (200)：**

```json
{
  "success": true,
  "data": {
    "companies": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Acme Corporation",
        "website": "https://acme.com",
        "domain": "acme.com",
        "slug": "acme-corporation",
        "status": "active",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-20T14:45:00.000Z"
      }
    ]
  },
  "meta": {
    "page": 1,
    "totalPages": 5,
    "total": 47,
    "limit": 10,
    "activeCount": 40,
    "inactiveCount": 7
  }
}
```

`meta.activeCount` 和`meta.inactiveCount` 值反映全局总计，不受`q` 或`status` 过滤器的影响。这允许 UI 在过滤结果旁边显示选项卡计数。

### 发布 `/api/admin/companies`

创造了公司新纪录。请求数据使用 Zod 模式 (`createCompanySchema`) 进行验证。域和 slug 值标准化为小写。在插入之前，会检查`domain` 和`slug` 的唯一性。

**请求正文：**

```json
{
  "name": "Acme Corporation",
  "website": "https://acme.com",
  "domain": "acme.com",
  "slug": "acme-corporation",
  "status": "active"
}
```

|领域|类型|必填|描述|
|-------|------|----------|-------------|
|`name`|字符串|是的|公司名称（1--255 个字符）|
|`website`|字符串（URI）|否|完整网站网址|
|`domain`|字符串|否|标准化域（最多 255 个字符）|
|`slug`|字符串|否|URL 友好标识符（`^[a-z0-9-]+$`，最大 255）|
|`status`|字符串|否|`"active"` 或 `"inactive"`（默认：`"active"`）|

**验证：** 使用 Zod 架构验证。失败时，返回详细的字段级错误：

```json
{
  "error": "Validation error",
  "details": [
    { "field": "name", "message": "Company name is required" }
  ]
}
```

**回复（201）：**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corporation",
    "website": "https://acme.com",
    "domain": "acme.com",
    "slug": "acme-corporation",
    "status": "active",
    "createdAt": "2024-01-20T16:45:00.000Z",
    "updatedAt": "2024-01-20T16:45:00.000Z"
  }
}
```

### 获取`/api/admin/companies/{id}`

通过 UUID 检索单个公司。

**路径参数：**

|参数|类型|描述|
|-----------|------|-------------|
|`id`|字符串（UUID）|公司唯一标识符|

**回复 (200)：**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corporation",
    "website": "https://acme.com",
    "domain": "acme.com",
    "slug": "acme-corporation",
    "status": "active",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-20T14:45:00.000Z"
  }
}
```

### 把`/api/admin/companies/{id}`

更新现有公司。支持部分更新——仅提供的字段发生更改。已通过 `updateCompanySchema` 验证。当这些字段发生变化时，会重新验证域和 slug 的唯一性。成功更新后，公司数据可以选择同步到 CRM 系统。

**路径参数：**

|参数|类型|描述|
|-----------|------|-------------|
|`id`|字符串（UUID）|公司唯一标识符|

**请求正文：**

```json
{
  "name": "Acme Corporation Updated",
  "website": "https://acme.com",
  "status": "active"
}
```

所有字段都是可选的。只有提供的字段才会更新。

**CRM 同步：**

当`TWENTY_CRM_ENABLED` 未设置为`"false"` 时，更新的公司会自动同步到Twenty CRM 系统。此同步是非阻塞的——如果失败，API 仍会返回数据库更新成功：

```typescript
const syncService = createTwentyCrmSyncServiceFromEnv();
const companyPayload = mapCompanyToTwentyCompany(company);
await syncService.upsertCompany(companyPayload);
```

**回复 (200)：**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corporation Updated",
    "status": "active",
    "updatedAt": "2024-01-20T16:30:00.000Z"
  }
}
```

### 删除`/api/admin/companies/{id}`

永久删除公司。这是硬删除——记录从数据库中删除。关联的项目-公司链接通过 CASCADE 约束删除。

**路径参数：**

|参数|类型|描述|
|-----------|------|-------------|
|`id`|字符串（UUID）|公司唯一标识符|

**回复 (200)：**

```json
{
  "success": true,
  "message": "Company deleted successfully"
}
```

:::注意
公司删除是永久性的且无法撤消。已删除公司的所有项目关联都将通过数据库 CASCADE 规则删除。
:::

## 验证规则

公司数据使用 `lib/validations/company.ts` 中定义的 Zod 模式进行验证：

|领域|规则|
|-------|------|
|`name`|必填，1--255 个字符|
|`website`|可选，必须是有效的 URI 格式|
|`domain`|可选，最多 255 个字符，标准化为小写|
|`slug`|可选，最多 255 个字符，仅限小写字母数字和连字符|
|`status`|可选，必须是 `"active"` 或 `"inactive"`|

## 错误代码

|状态|错误|原因|
|--------|-------|-------|
| `400` |验证错误|Zod 架构验证失败（包括字段详细信息）|
| `400` |页面参数无效|页不是正整数|
| `400` |限制参数无效|限制在1--100范围之外|
| `401` |未经授权|缺少或非管理会话|
| `404` |未找到公司|没有给定 UUID 的公司|
| `409` |域名已存在的公司|域唯一性违规|
| `409` |拥有 slug 的公司已存在|违反Slug唯一性|
| `500` |创建/更新/删除公司失败|服务器或数据库错误|

## 相关文档

- [管理端点概述](./admin-endpoints.md)
- [响应模式](./response-patterns.md)
- [请求验证](./request-validation.md)
