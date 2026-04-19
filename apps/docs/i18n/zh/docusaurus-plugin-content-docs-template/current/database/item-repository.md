---
id: item-repository
title: 项目存储库
sidebar_label: 项目存储库
sidebar_position: 16
---

# 项目存储库

`ItemRepository` 类提供了用于管理模板中的项目（列表/提交）的主要数据访问层。它将存储委托给 Git 支持的服务，并在顶部添加验证、过滤、分页、审核日志记录和软删除支持。

**源文件：** `template/lib/repositories/item.repository.ts`

---

## Architecture Overview

```
API Route / Server Action
        |
  ItemRepository          <-- validation, filtering, audit
        |
  ItemGitService          <-- Git read/write via GitHub API
        |
  GitHub Repository       <-- .content/data/*.yml files
```

The repository lazily initializes an `ItemGitService` instance by parsing the `DATA_REPOSITORY` environment variable for the GitHub owner/repo pair and authenticating with `GH_TOKEN`.

---

## 类定义

```ts
export class ItemRepository {
  private gitService: ItemGitService | null = null;
}
```

### 依赖关系

|进口|目的|
|--------|---------|
|`ItemData`、`CreateItemRequest`、`UpdateItemRequest`、`ReviewRequest`、`ItemListOptions`|来自 `@/lib/types/item` 的类型定义|
|`createItemGitService` / `ItemGitService`|Git 支持的存储服务|
|`getContentPath`|解决本地与 Vercel 内容目录的问题|
|`coreConfig`|集中配置服务|
|`itemAuditService` / `AuditUser`|审计跟踪记录|

---

## Private Methods

### `getGitService(): Promise<ItemGitService>`

Lazily creates and caches the Git service singleton. Reads `coreConfig.content.dataRepository` and `coreConfig.content.ghToken`, parses the GitHub URL to extract `owner` and `repo`, and calls `createItemGitService` with a configuration object containing branch, data directory, and items directory paths.

Throws an `Error` if `DATA_REPOSITORY` or `GH_TOKEN` is missing or the URL format is invalid.

---

## 查询方式

### `findAll(options?: ItemListOptions): Promise<ItemData[]>`

返回与提供的过滤器匹配的所有项目。按顺序应用以下过滤器链：

1. **状态** -- 与 `item.status` 完全匹配
2. **类别** -- OR 逻辑；项目必须至少包含所请求的类别之一
3. **标签** -- OR 逻辑；商品必须至少包含一个所请求的标签
4. **提交者** -- 与 `item.submitted_by` 完全匹配
5. **搜索** -- `item.name` 或 `item.description` 上不区分大小写的子字符串匹配

```ts
async findAll(options: ItemListOptions = {}): Promise<ItemData[]>
```

|参数|类型|默认|描述|
|-----------|------|---------|-------------|
|`options.status`|`string`| -- |按项目状态过滤|
|`options.categories`|`string[]`| -- |按类别筛选 (OR)|
|`options.tags`|`string[]`| -- |按标签名称过滤（OR）|
|`options.submittedBy`|`string`| -- |按提交者用户 ID 过滤|
|`options.search`|`string`| -- |自由文本搜索|
|`options.includeDeleted`|`boolean`|`false`|包括软删除项目|

---

### `findAllPaginated(page?, limit?, options?): Promise<PaginatedResult>`

Server-side paginated query that delegates to `gitService.getItemsPaginated`. Supports the same filter options as `findAll` plus `sortBy` and `sortOrder`.

```ts
async findAllPaginated(
  page: number = 1,
  limit: number = 10,
  options: ItemListOptions = {}
): Promise<{
  items: ItemData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}>
```

---

### `findById(id, includeDeleted?): Promise<ItemData | null>`

通过其唯一 ID 查找单个项目。

```ts
async findById(id: string, includeDeleted: boolean = false): Promise<ItemData | null>
```

---

### `findBySlug(slug, includeDeleted?): Promise<ItemData | null>`

Looks up a single item by its URL slug.

```ts
async findBySlug(slug: string, includeDeleted: boolean = false): Promise<ItemData | null>
```

---

### `findManyBySlugs(slugs, includeDeleted?): Promise<ItemData[]>`

通过其 slugs 批量查找多个项目。如果输入为空，则返回空数组。

```ts
async findManyBySlugs(slugs: string[], includeDeleted: boolean = false): Promise<ItemData[]>
```

---

## Mutation Methods

### `create(data, auditUser?): Promise<ItemData>`

Creates a new item after running `validateCreateData`. Logs the creation via `itemAuditService.logCreation` (best-effort -- failures are warned but not thrown).

```ts
async create(data: CreateItemRequest, auditUser?: AuditUser): Promise<ItemData>
```

**Validation rules** enforced by `validateCreateData`:
- `id`, `name`, `slug`, `description`, `source_url` are all required and non-empty
- `slug` must match `/^[a-z0-9-]+$/`
- `source_url` must be a valid URL (parsed via `new URL()`)

---

### `update(id, data, auditUser?): Promise<ItemData>`

更新现有项目。捕获审计差异日志记录的先前状态。

```ts
async update(id: string, data: UpdateItemRequest, auditUser?: AuditUser): Promise<ItemData>
```

---

### `batchUpdate(updates, auditUser?): Promise<ItemData[]>`

Applies multiple updates in a single Git commit for atomicity. Pre-validates all entries before writing any. After committing, logs each change to the audit trail.

```ts
async batchUpdate(
  updates: Array<{ id: string; data: UpdateItemRequest }>,
  auditUser?: AuditUser
): Promise<ItemData[]>
```

Uses `gitService.updateItemWithoutCommit` for each item, then calls `gitService.commitAndPushBatch` once.

---

### `review(id, reviewData, auditUser?): Promise<ItemData>`

审查项目（批准或拒绝）。验证`reviewData.status` 是`"approved"` 或`"rejected"`。

```ts
async review(id: string, reviewData: ReviewRequest, auditUser?: AuditUser): Promise<ItemData>
```

---

### `delete(id, auditUser?): Promise<void>`

Hard-deletes an item permanently from the Git repository.

```ts
async delete(id: string, auditUser?: AuditUser): Promise<void>
```

---

### `softDelete(id, auditUser?): Promise<ItemData>`

将项目标记为已删除（设置`deleted_at`）而不删除文件。

```ts
async softDelete(id: string, auditUser?: AuditUser): Promise<ItemData>
```

---

### `restore(id, auditUser?): Promise<ItemData>`

Restores a previously soft-deleted item by clearing the `deleted_at` timestamp.

```ts
async restore(id: string, auditUser?: AuditUser): Promise<ItemData>
```

---

## 实用方法

### `checkDuplicateId(id): Promise<boolean>`

如果任何项目（包括已删除的项目）共享给定 ID，则返回`true`。

### `checkDuplicateSlug(slug): Promise<boolean>`

如果任何项目（包括已删除的项目）共享给定的 slug，则返回`true`。

### `getStats(options?): Promise<StatsObject>`

返回按可选 `submittedBy`、`search`、`categories` 和 `tags` 约束筛选的状态计数。

```ts
async getStats(options?: {
  submittedBy?: string;
  search?: string;
  categories?: string[];
  tags?: string[];
}): Promise<{
  total: number;
  draft: number;
  pending: number;
  approved: number;
  rejected: number;
  deleted: number;
}>
```

带有 `deleted_at` 时间戳的项目与活动项目分开计数。

---

## Audit Trail Integration

Every mutation method accepts an optional `AuditUser` parameter. When provided, the repository logs the action via `itemAuditService`:

| Method | Audit Call |
|--------|-----------|
| `create` | `logCreation(item, auditUser)` |
| `update` | `logUpdate(previousItem, updatedItem, auditUser)` |
| `batchUpdate` | `logUpdate(...)` for each changed item |
| `review` | `logReview(item, previousStatus, notes, auditUser)` |
| `delete` | `logDeletion(item, auditUser, false)` |
| `softDelete` | `logDeletion(item, auditUser, true)` |
| `restore` | `logRestoration(item, auditUser)` |

All audit calls are wrapped in try/catch and log warnings on failure -- they never cause the parent operation to fail.

---

## 使用示例

```ts
import { ItemRepository } from '@/lib/repositories/item.repository';

const repo = new ItemRepository();

// List approved items in a category
const items = await repo.findAll({
  status: 'approved',
  categories: ['developer-tools'],
});

// Paginated query
const page = await repo.findAllPaginated(1, 20, { search: 'timer' });

// Create with audit
const newItem = await repo.create(
  { id: 'my-tool', name: 'My Tool', slug: 'my-tool', description: '...', source_url: 'https://...' },
  { id: 'user-123', email: 'admin@example.com' }
);
```
