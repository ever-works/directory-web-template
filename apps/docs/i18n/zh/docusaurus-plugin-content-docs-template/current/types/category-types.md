---
id: category-types
title: 类别类型定义
sidebar_label: 类别类型
sidebar_position: 3
---

# 类别类型定义

**来源：** `lib/types/category.ts`

类别用于将项目组织成逻辑组。该模板使用基于文件的系统，其中类别存储为结构化数据并由项目引用。

## 接口

### `CategoryData`

具有最少字段的核心类别数据结构。

```typescript
interface CategoryData {
  id: string;
  name: string;
}
```

- `id` - 类别的唯一标识符（通常是类似 `"developer-tools"` 的 slug）
- `name` - 人类可读的显示名称（例如，`"Developer Tools"`）

### `CategoryWithCount`

扩展类别数据，包括项目计数和活动状态，用于管理仪表板和类别列表。

```typescript
interface CategoryWithCount extends CategoryData {
  count?: number;
  isInactive?: boolean;
}
```

- `count` - 分配给该类别的项目数
- `isInactive` - 类别是否存在于配置中但没有分配的项目

### `CreateCategoryRequest`

用于创建新类别的有效负载。

```typescript
interface CreateCategoryRequest {
  id: string;
  name: string;
}
```

### `UpdateCategoryRequest`

用于更新现有类别的有效负载。扩展`Partial<CreateCategoryRequest>`，因此仅需要提供要更改的字段，但始终需要`id`。

```typescript
interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {
  id: string;
}
```

### `CategoryListResponse`

类别列表查询的分页响应。

```typescript
interface CategoryListResponse {
  categories: CategoryWithCount[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### `CategoryResponse`

单类别操作的响应信封。

```typescript
interface CategoryResponse {
  success: boolean;
  category?: CategoryData;
  error?: string;
}
```

### `CategoryListOptions`

用于过滤和分页类别列表的查询参数。

```typescript
interface CategoryListOptions {
  includeInactive?: boolean;
  sortBy?: 'name' | 'id';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
```

- `includeInactive` - 当 `true` 时，包括具有零个项目的类别
- `sortBy` - 按类别名称或 ID 排序
- 默认排序顺序是按名称升序

## 常数

### `CATEGORY_VALIDATION`

类别字段的验证约束：

```typescript
const CATEGORY_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
} as const;
```

## 使用示例

### 创建类别

```typescript
import type { CreateCategoryRequest } from '@/lib/types/category';
import { CATEGORY_VALIDATION } from '@/lib/types/category';

function validateCategoryName(name: string): boolean {
  return (
    name.length >= CATEGORY_VALIDATION.NAME_MIN_LENGTH &&
    name.length <= CATEGORY_VALIDATION.NAME_MAX_LENGTH
  );
}

const newCategory: CreateCategoryRequest = {
  id: 'developer-tools',
  name: 'Developer Tools',
};
```

### 列出带有选项的类别

```typescript
import type { CategoryListOptions } from '@/lib/types/category';

const options: CategoryListOptions = {
  includeInactive: false,
  sortBy: 'name',
  sortOrder: 'asc',
  page: 1,
  limit: 50,
};
```

### 显示带有计数的类别

```typescript
import type { CategoryWithCount } from '@/lib/types/category';

function renderCategoryList(categories: CategoryWithCount[]) {
  return categories
    .filter(cat => !cat.isInactive)
    .map(cat => ({
      label: `${cat.name} (${cat.count ?? 0})`,
      value: cat.id,
    }));
}
```

### 更新类别

```typescript
import type { UpdateCategoryRequest } from '@/lib/types/category';

const update: UpdateCategoryRequest = {
  id: 'developer-tools',
  name: 'Dev Tools & Utilities',
};
```

## 相关类型

- [`ItemData.category`](./item-types.md) 引用类别 ID（支持 `string | string[]`）
- [`TagData`](./category-types.md) 遵循类似的标签模式
- [`ItemListOptions.categories`](./item-types.md) 接受用于过滤的类别 ID 数组
