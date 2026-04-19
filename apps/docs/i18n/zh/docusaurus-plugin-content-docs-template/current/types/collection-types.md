---
id: collection-types
title: 集合类型定义
sidebar_label: 集合类型
sidebar_position: 15
---

# 集合类型定义

**来源：** `types/collection.ts`

收藏品是按主题组织的精选项目组。它们允许管理员创建精心挑选的列表，例如“热门精选”、“本周新内容”或“最适合企业”。

## 接口

### `Collection`

主要集合数据结构。

```typescript
interface Collection {
  id: string;              // Unique identifier (slug-friendly)
  slug: string;            // URL-safe slug
  name: string;            // Display name
  description: string;     // Collection description
  icon_url?: string;       // Optional icon/image URL
  item_count: number;      // Number of items in collection
  items?: string[];        // Array of item IDs assigned to this collection
  isActive: boolean;       // Whether the collection is publicly visible
  created_at?: string;     // ISO 8601 creation timestamp
  updated_at?: string;     // ISO 8601 last update timestamp
}
```

|领域|类型|描述|
|-------|------|-------------|
|`id`|`string`|唯一标识符，3-50 个字符|
|`slug`|`string`|名称的 URL 安全版本|
|`name`|`string`|显示名称，2-100 个字符|
|`description`|`string`|纯文本描述，最多 500 个字符|
|`icon_url`|`string?`|图标或封面图像的 URL|
|`item_count`|`number`|已分配项目的计算计数|
|`items`|`string[]?`|物品 ID；仅在请求时填充|
|`isActive`|`boolean`|控制公众可见度|

### `CreateCollectionRequest`

用于创建新集合的有效负载。

```typescript
interface CreateCollectionRequest {
  id: string;
  name: string;
  slug?: string;         // Auto-generated from name if omitted
  description?: string;
  icon_url?: string;
  isActive?: boolean;    // Defaults to true
}
```

### `UpdateCollectionRequest`

用于更新现有集合的有效负载。除 `id` 之外的所有字段都是可选的。

```typescript
interface UpdateCollectionRequest extends Partial<CreateCollectionRequest> {
  id: string;
  item_count?: number;
  items?: string[];
}
```

### `AssignCollectionItemsRequest`

用于将项目分配给集合的有效负载。

```typescript
interface AssignCollectionItemsRequest {
  itemIds: string[];  // Array of item IDs to assign
}
```

### `CollectionListOptions`

列出集合的查询参数。

```typescript
interface CollectionListOptions {
  includeInactive?: boolean;                          // Default: false
  search?: string;                                     // Filter by name
  sortBy?: 'name' | 'item_count' | 'created_at';     // Default: 'name'
  sortOrder?: 'asc' | 'desc';                         // Default: 'asc'
  page?: number;                                       // Default: 1
  limit?: number;                                      // Default: 20
}
```

## 响应类型

### `CollectionsResponse`

列出多个集合时返回。

```typescript
interface CollectionsResponse {
  collections: Collection[];
  total: number;            // Total matching collections
}
```

### `CollectionDetailResponse`

获取单个集合及其项目时返回。

```typescript
interface CollectionDetailResponse {
  collection: Collection;
  items: any[];             // Item objects matching collection.items
  total: number;            // Total items in collection
}
```

## 验证规则

```typescript
const COLLECTION_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  ID_MIN_LENGTH: 3,
  ID_MAX_LENGTH: 50,
} as const;
```

|领域|规则|
|-------|------|
|`id`|3-50 个字符，必须唯一|
|`name`|2-100 个字符|
|`description`|最多 500 个字符|

## 使用示例

```typescript
import type {
  Collection,
  CreateCollectionRequest,
  CollectionListOptions,
} from '@/types/collection';

// Create a collection
const newCollection: CreateCollectionRequest = {
  id: 'top-picks-2025',
  name: 'Top Picks 2025',
  description: 'Our favourite tools this year.',
  isActive: true,
};

// List with filtering
const options: CollectionListOptions = {
  search: 'top',
  sortBy: 'item_count',
  sortOrder: 'desc',
  page: 1,
  limit: 10,
};
```

## 相关类型

- [项目类型](./item-types.md) -- 属于集合的项目
- [标签类型](./tag-types.md) -- 标签作为替代组织模型
