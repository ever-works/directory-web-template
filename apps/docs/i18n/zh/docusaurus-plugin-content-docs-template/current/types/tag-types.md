---
id: tag-types
title: 标签类型定义
sidebar_label: 标签类型
sidebar_position: 20
---

# 标签类型定义

**来源：** `lib/types/tag.ts`

标签为物品提供平面标签系统。它们通过管理界面进行管理并存储在基于文件的内容系统中。

## 接口

### `TagData`

基本标签数据结构。

```typescript
interface TagData {
  id: string;         // Unique tag identifier
  name: string;       // Display name
  isActive: boolean;  // Whether the tag is publicly visible
}
```

|领域|类型|描述|
|-------|------|-------------|
|`id`|`string`|项目 YAML 文件中使用的稳定标识符|
|`name`|`string`|UI 中显示的人类可读标签，2-50 个字符|
|`isActive`|`boolean`|非活动标签对公共过滤器隐藏，但保留在数据中|

### `TagWithCount`

通过使用统计数据扩展标签数据。

```typescript
interface TagWithCount extends TagData {
  count?: number;  // Number of items using this tag
}
```

### `CreateTagRequest`

用于创建新标签的有效负载。

```typescript
interface CreateTagRequest {
  id: string;
  name: string;
  isActive: boolean;
}
```

### `UpdateTagRequest`

用于更新标签的有效负载。 `id` 无法更改。

```typescript
type UpdateTagRequest = Partial<Omit<CreateTagRequest, 'id'>>;
```

### `TagListOptions`

列表标签的查询参数。

```typescript
interface TagListOptions {
  includeInactive?: boolean;           // Default: false
  sortBy?: 'name' | 'id';             // Default: 'name'
  sortOrder?: 'asc' | 'desc';         // Default: 'asc'
  page?: number;                       // Default: 1
  limit?: number;                      // Default: 20
}
```

## 响应类型

### `TagListResponse`

分页标签列表响应。

```typescript
interface TagListResponse {
  tags: TagWithCount[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### `TagResponse`

单标签操作结果。

```typescript
interface TagResponse {
  success: boolean;
  tag?: TagData;
  error?: string;
}
```

## 验证规则

```typescript
const TAG_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
} as const;
```

|领域|规则|
|-------|------|
|`name`|2-50 个字符|
|`id`|在所有标签中必须是唯一的|

## 内容系统中的标签

标签通过项目 YAML 文件中的 ID 引用：

```yaml
# .content/items/my-tool.yml
name: My Tool
tags:
  - open-source
  - productivity
  - saas
```

标签存储库从内容存储库读取标签定义并将其提供给管理 UI 和过滤器组件。

## 过滤器集成

标签通过以下组件与客户端过滤系统集成：

- `components/filters/components/tags/` -- 标签过滤器 UI
- `components/filters/hooks/use-tag-visibility.ts` -- 控制显示哪些标签
- `components/filters/utils/tag-utils.ts` -- 用于标签过滤的辅助函数

## 使用示例

```typescript
import type {
  TagData,
  CreateTagRequest,
  TagListOptions,
} from '@/lib/types/tag';

// Create a new tag
const newTag: CreateTagRequest = {
  id: 'ai-powered',
  name: 'AI Powered',
  isActive: true,
};

// List active tags sorted by name
const options: TagListOptions = {
  includeInactive: false,
  sortBy: 'name',
  sortOrder: 'asc',
  page: 1,
  limit: 50,
};
```

## 相关类型

- [集合类型](./collection-types.md) -- 集合作为替代分组模型
- [项目类型](./item-types.md) -- 引用标签的项目
- [权限类型](./permission-types.md) -- `tags:read`、`tags:create` 等
