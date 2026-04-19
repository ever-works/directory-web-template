---
id: collection-repository
title: 集合存储库
sidebar_label: 集合存储库
sidebar_position: 20
---

# 集合存储库

`CollectionRepository` 管理精选的项目集合。它为存储在 Git 支持的存储库中的集合提供 CRUD 操作，并处理集合和项目之间的双向关系，包括具有回滚支持的批量项目分配。

**源文件：** `template/lib/repositories/collection.repository.ts`

---

## Architecture Overview

```
Admin Collection UI
        |
  API Route / Server Action
        |
  CollectionRepository
        |
  +-----+-----+
  |             |
CollectionGitService   ItemRepository
  (collections.yml)    (item files)
```

Collections are stored in a YAML file within the Git repository. Each collection maintains a list of item slugs. When items are assigned or removed, both the collection record and the individual item records are updated.

> **Note:** This file uses the `'server-only'` import guard to prevent accidental client-side usage.

---

## 类定义

```ts
export class CollectionRepository {
  private gitService: CollectionGitService | null = null;
  private itemRepository = new ItemRepository();
}
```

### 依赖关系

|进口|目的|
|--------|---------|
|`Collection`、`CreateCollectionRequest`、`UpdateCollectionRequest`|类型定义|
|`CollectionListOptions`、`COLLECTION_VALIDATION`|选项和验证常量|
|`createCollectionGitService` / `CollectionGitService`|Git 集合存储|
|`ItemRepository`|跨实体项目操作|
|`ItemData`、`UpdateItemRequest`|用于分配的项目类型|

---

## Query Methods

### `findAll(options?): Promise<Collection[]>`

Returns all collections with optional filtering and sorting.

```ts
async findAll(options: CollectionListOptions = {}): Promise<Collection[]>
```

**Behavior:**
- Computes `item_count` from the items array length on each collection
- Filters out inactive collections unless `options.includeInactive` is true
- Applies case-insensitive search across `name`, `slug`, and `description`
- Supports sorting by `name` (default), `item_count`, or `created_at`
- Supports `asc` (default) or `desc` sort order

---

### `findAllPaginated(options?): Promise<PaginatedResult>`

应用 `findAll` 过滤器后，使用内存中切片返回分页集合。

```ts
async findAllPaginated(options?: CollectionListOptions): Promise<{
  collections: Collection[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}>
```

默认值：`page = 1`、`limit = 10`。

---

### `findById(id): Promise<Collection | null>`

Retrieves a single collection by its unique ID, enriched with `item_count`.

```ts
async findById(id: string): Promise<Collection | null>
```

---

### `getAssignedItems(collectionId): Promise<ItemSummary[]>`

返回分配给集合的未删除项目的轻量级列表。

```ts
async getAssignedItems(
  collectionId: string
): Promise<Array<Pick<ItemData, 'id' | 'name' | 'slug'>>>
```

加载所有项目（包括已删除的项目），筛选 `collections` 数组包含给定 ID 的项目，排除软删除项目，并仅返回 `id`、`name` 和 `slug`。

---

## Mutation Methods

### `create(data): Promise<Collection>`

Creates a new collection after validation.

```ts
async create(data: CreateCollectionRequest): Promise<Collection>
```

**Validation rules** (from `COLLECTION_VALIDATION` constants):
- `id` must be between `ID_MIN_LENGTH` and `ID_MAX_LENGTH` characters
- `id` must match `/^[a-z0-9-]+$/`
- `name` must be between `NAME_MIN_LENGTH` and `NAME_MAX_LENGTH` characters
- `description` must not exceed `DESCRIPTION_MAX_LENGTH` characters

---

### `update(data): Promise<Collection>`

更新现有集合。 `data` 对象必须包含 `id` 字段。

```ts
async update(data: UpdateCollectionRequest): Promise<Collection>
```

如果提供了名称和描述长度约束，则验证这些字段。

---

### `delete(id): Promise<void>`

Deletes a collection and removes its ID from all items that reference it.

```ts
async delete(id: string): Promise<void>
```

**Processing steps:**

1. Loads all items (including deleted) from the item repository
2. For each item whose `collections` array contains this collection ID, removes the reference and saves the update
3. Deletes the collection record from Git

---

### `assignItems(collectionId, itemSlugs): Promise<AssignResult>`

最复杂的操作——使用事务式错误处理将一组项目分配给集合。

```ts
async assignItems(
  collectionId: string,
  itemSlugs: string[]
): Promise<{ collection: Collection; updatedItems: number }>
```

**处理流程：**

1. **查找集合** -- 如果没有找到则抛出异常
2. **重复数据删除**传入的数据块
3. **差异计算** - 将当前项目与新项目进行比较，以识别要添加的段和要删除的段
4. **批量加载** -- 通过`findManyBySlugs`仅加载需要更改的项目
5. **构建更新** -- 对于添加的项目，将集合 ID 附加到其 `collections` 数组；对于要移除的项目，将其拼接起来
6. **持久化集合** -- 首先写入更新的集合
7. **批量更新项目** -- 调用`itemRepository.batchUpdate`来获取所有已更改的项目
8. **失败时回滚** -- 如果项目更新失败，则尝试将集合恢复到之前的状态

返回持久化集合和实际修改的项目数。

---

## Singleton Export

```ts
export const collectionRepository = new CollectionRepository();
```

A pre-instantiated singleton is exported for convenience.

---

## 验证常数

存储库从`@/types/collection`引用`COLLECTION_VALIDATION`：

|常数|目的|
|----------|---------|
|`ID_MIN_LENGTH`|最小集合 ID 长度|
|`ID_MAX_LENGTH`|最大集合 ID 长度|
|`NAME_MIN_LENGTH`|最小集合名称长度|
|`NAME_MAX_LENGTH`|最大集合名称长度|
|`DESCRIPTION_MAX_LENGTH`|最大描述长度|

---

## Error Handling

- **Validation errors** throw immediately with descriptive messages
- **Not-found errors** throw `Error("Collection with ID ... not found")`
- **Assignment rollback** -- if `batchUpdate` fails after the collection was already saved, the repository attempts to restore the collection to its previous state; if the rollback itself fails, the error is logged

---

## 使用示例

```ts
import { collectionRepository } from '@/lib/repositories/collection.repository';

// List active collections sorted by item count
const collections = await collectionRepository.findAll({
  sortBy: 'item_count',
  sortOrder: 'desc',
});

// Assign items to a collection
const result = await collectionRepository.assignItems(
  'featured-2025',
  ['item-slug-1', 'item-slug-2', 'item-slug-3']
);
console.log(`Updated ${result.updatedItems} items`);

// Get items in a collection
const items = await collectionRepository.getAssignedItems('featured-2025');
```

---

## Related Files

| File | Relationship |
|------|-------------|
| `lib/services/collection-git.service.ts` | Git storage backend |
| `lib/repositories/item.repository.ts` | Item CRUD and batch operations |
| `@/types/collection.ts` | Type definitions and validation constants |
