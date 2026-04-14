---
id: category-repository
title: 类别存储库
sidebar_label: 类别存储库
sidebar_position: 21
---

# 类别存储库

`CategoryRepository` 管理项目类别的生命周期。类别作为 YAML 数据存储在 Git 支持的内容存储库中，并提供项目的主要组织分类法。

**源文件：** `template/lib/repositories/category.repository.ts`

---

## Architecture Overview

```
Admin Category UI
        |
  API Route / Server Action
        |
  CategoryRepository
        |
  CategoryGitService
        |
  GitHub Repository (categories.yml)
```

> **Note:** This file uses the `'server-only'` import guard to prevent accidental client-side usage.

---

## 类定义

```ts
export class CategoryRepository {
  private gitService: any = null;
}
```

### 依赖关系

|进口|目的|
|--------|---------|
|`CategoryData`、`CategoryWithCount`|基本类别和丰富类别类型|
|`CreateCategoryRequest`、`UpdateCategoryRequest`|突变 DTO|
|`CategoryListOptions`|过滤、排序和分页选项|
|`CATEGORY_VALIDATION`|验证约束常量|
|`createCategoryGitService`|Git 存储服务的工厂|
|`coreConfig`|集中配置|

---

## Git Service Initialization

The private `getGitService()` method lazily initializes the Git service by:

1. Reading `coreConfig.content.dataRepository` for the GitHub repository URL
2. Parsing the URL to extract `owner` and `repo`
3. Using `coreConfig.content.ghToken` for authentication
4. Using `coreConfig.content.githubBranch` (default: `"main"`) for the target branch

Throws descriptive errors if configuration is missing or malformed.

---

## 查询方式

### `findAll(options?): Promise<CategoryWithCount[]>`

返回具有可选排序的所有类别。

```ts
async findAll(options: CategoryListOptions = {}): Promise<CategoryWithCount[]>
```

**行为：**
- 所有类别均被视为活动类别（`isActive` 字段已被删除）
- `includeInactive` 选项被接受以实现向后兼容，但没有过滤效果
- 通过私有 `sortCategories` 方法应用排序

**排序选项：**

|`sortBy`|`sortOrder`|行为|
|----------|-------------|----------|
|`'name'`（默认）|`'asc'`（默认）|按字母顺序 A-Z|
|`'name'`|`'desc'`|按字母顺序 Z-A|

---

### `findAllPaginated(options?): Promise<PaginatedResult>`

Returns a paginated subset of categories.

```ts
async findAllPaginated(options?: CategoryListOptions): Promise<{
  categories: CategoryWithCount[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}>
```

Defaults: `page = 1`, `limit = 10`. Applies all filters and sorting from `findAll` before slicing.

---

### `findById(id): Promise<CategoryData | null>`

通过其唯一 ID 检索单个类别。

```ts
async findById(id: string): Promise<CategoryData | null>
```

---

### `findBySlug(slug): Promise<CategoryData | null>`

Retrieves a category by slug. Currently delegates to `findById` since the category ID serves as the slug.

```ts
async findBySlug(slug: string): Promise<CategoryData | null>
```

---

## 突变方法

### `create(data): Promise<CategoryData>`

在验证和重复名称检查后创建一个新类别。

```ts
async create(data: CreateCategoryRequest): Promise<CategoryData>
```

**处理步骤：**

1. 通过 `validateCategoryData` 验证输入
2. 通过`checkDuplicateName` 检查重复名称
3. 通过`gitService.createCategory`创建

**验证规则：**
- `name` 必须位于 `CATEGORY_VALIDATION.NAME_MIN_LENGTH` 和 `NAME_MAX_LENGTH` 字符之间
- `id` 必须介于 3 到 50 个字符之间
- `id` 必须匹配`/^[a-z0-9-]+$/`（仅限小写字母、数字、连字符）

---

### `update(data): Promise<CategoryData>`

Updates an existing category. The `data` object must include the `id` field.

```ts
async update(data: UpdateCategoryRequest): Promise<CategoryData>
```

**Processing steps:**

1. Validates update data (ID required, name constraints if provided)
2. If name is changing, checks for duplicate names excluding the current category
3. Updates through `gitService.updateCategory`

---

### `delete(id): Promise<void>`

从 Git 存储库中硬删除某个类别。

```ts
async delete(id: string): Promise<void>
```

代表`hardDelete(id)`。

---

### `hardDelete(id): Promise<void>`

Permanently removes a category from the Git repository.

```ts
async hardDelete(id: string): Promise<void>
```

---

### `reorder(categoryIds): Promise<void>`

根据提供的 ID 数组对类别重新排序。

```ts
async reorder(categoryIds: string[]): Promise<void>
```

**处理步骤：**

1. 读取当前所有类别
2. 对它们重新排序以匹配提供的 ID 序列
3. 附加未包含在重新排序列表中的任何类别
4. 通过 `gitService.writeCategories` 将重新排序的列表写回

---

## Private Helper Methods

### `validateCategoryData(data: CreateCategoryRequest): void`

Validates creation data:
- Name length within `CATEGORY_VALIDATION` bounds
- ID between 3 and 50 characters
- ID matches lowercase alphanumeric with hyphens pattern

### `validateUpdateData(data: UpdateCategoryRequest): void`

Validates update data:
- ID is required
- Name constraints enforced if name is provided

### `checkDuplicateName(name, excludeId?): Promise<void>`

Performs a case-insensitive duplicate check across all existing categories. Throws `Error('Category with name "..." already exists')` if a duplicate is found. Optionally excludes a specific category ID (for updates).

### `sortCategories(categories, options): CategoryData[]`

Sorts categories by the specified field and order. Currently supports sorting by `name` only.

---

## 单例导出

```ts
export const categoryRepository = new CategoryRepository();
```

---

## Usage Example

```ts
import { categoryRepository } from '@/lib/repositories/category.repository';

// List all categories sorted alphabetically
const categories = await categoryRepository.findAll({
  sortBy: 'name',
  sortOrder: 'asc',
});

// Create a new category
const newCat = await categoryRepository.create({
  id: 'developer-tools',
  name: 'Developer Tools',
  description: 'Tools for software developers',
});

// Paginated listing
const page = await categoryRepository.findAllPaginated({
  page: 1,
  limit: 20,
});

// Reorder categories
await categoryRepository.reorder([
  'developer-tools',
  'productivity',
  'design',
]);
```

---

## 相关文件

|文件|关系|
|------|-------------|
|`lib/services/category-git.service.ts`|Git存储后端|
|`lib/types/category.ts`|类型定义和验证常量|
|`lib/config/config-service.ts`|存储库 URL 和令牌的配置|
|`lib/repositories/item.repository.ts`|项目参考类别|
