---
id: item-types
title: 项目类型定义
sidebar_label: 物品类型
sidebar_position: 1
---

# 项目类型定义

**来源：** `lib/types/item.ts`

项目是模板中的核心内容实体。该模块定义了用于创建、读取、更新和列出项目的数据结构，以及验证常量和状态管理类型。

## 接口

### `ItemLocationData`

可进行地理编码的项目的位置数据。存储在 YAML 中并在`item_location_index` 中建立索引以进行快速地理查询。

```typescript
import type { MapProvider } from './location';

interface ItemLocationData {
  address?: string;       // Full address string for geocoding
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  latitude?: number;      // Pre-geocoded latitude
  longitude?: number;     // Pre-geocoded longitude
  service_area?: string;  // e.g., "Nationwide", "New York Metro"
  is_remote?: boolean;    // Whether this item operates remotely
  geocoded_by?: MapProvider; // Which geocoding provider was used
}
```

### `ItemData`

读取操作返回的主要项目数据结构。

```typescript
interface ItemData {
  id: string;
  name: string;
  slug: string;
  description: string;
  source_url: string;
  category: string | string[];
  tags: string[];
  collections?: string[];
  featured?: boolean;
  icon_url?: string;
  updated_at: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  submitted_by?: string;
  submitted_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  deleted_at?: string;        // ISO timestamp for soft delete
  action?: 'visit-website' | 'start-survey' | 'buy';
  showSurveys?: boolean;      // Whether to show surveys section
  publisher?: string;         // Publisher name for display
  location?: ItemLocationData;
}
```

**关键细节：**
- `category` 支持单个字符串和数组用于多类别项目
- `status` 使用四种状态的批准流程：草稿、待定、批准、拒绝
- `deleted_at` 启用软删除而不删除数据
- `action` 定义商品详细信息页面上的 CTA 按钮类型

### `CreateItemRequest`

用于创建新项目的输入负载（POST 端点）。

```typescript
interface CreateItemRequest {
  id: string;
  name: string;
  slug: string;
  description: string;
  source_url: string;
  category: string | string[];
  tags: string[];
  collections?: string[];
  brand?: string;
  featured?: boolean;
  icon_url?: string;
  status?: 'draft' | 'pending' | 'approved' | 'rejected';
  submitted_by?: string;
  location?: ItemLocationData;
}
```

### `UpdateItemRequest`

用于更新现有项目的输入有效负载。扩展`Partial<CreateItemRequest>`，因此除`id` 之外的所有字段都是可选的。

```typescript
interface UpdateItemRequest extends Partial<CreateItemRequest> {
  id: string;
  status?: 'draft' | 'pending' | 'approved' | 'rejected';
  review_notes?: string;
  deleted_at?: string; // For soft delete operations
}
```

### `ItemListOptions`

用于过滤和分页项目列表的查询参数。

```typescript
interface ItemListOptions {
  status?: 'draft' | 'pending' | 'approved' | 'rejected';
  categories?: string[];     // Multi-category filtering
  tags?: string[];           // Multi-tag filtering
  page?: number;
  limit?: number;
  sortBy?: SortField;
  sortOrder?: SortOrder;
  includeDeleted?: boolean;  // Include soft-deleted items (default: false)
  submittedBy?: string;      // Filter by submitting user
  search?: string;           // Search by name or description
  city?: string;             // Filter by city
  country?: string;          // Filter by country
  includeRemote?: boolean;   // Include remote items in location queries
}
```

### `ItemListResponse`

项目列表查询的分页响应。

```typescript
interface ItemListResponse {
  items: ItemData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### `ItemResponse`

单项操作的响应包络。

```typescript
interface ItemResponse {
  success: boolean;
  item?: ItemData;
  error?: string;
  message?: string;
}
```

### `ReviewRequest`

在审核过程中批准或拒绝项目的有效负载。

```typescript
interface ReviewRequest {
  status: 'approved' | 'rejected';
  review_notes?: string;
}
```

## 类型别名

### `SortField`

用于对项目列表进行排序的有效字段：

```typescript
type SortField = 'name' | 'updated_at' | 'status' | 'submitted_at';
```

### `SortOrder`

排序方向：

```typescript
type SortOrder = 'asc' | 'desc';
```

### `ItemStatus`

从 `ITEM_STATUSES` 派生的联合类型：

```typescript
type ItemStatus = (typeof ITEM_STATUSES)[keyof typeof ITEM_STATUSES];
// Resolves to: 'draft' | 'pending' | 'approved' | 'rejected'
```

## 常数

### `ITEM_VALIDATION`

项目字段的验证约束：

```typescript
const ITEM_VALIDATION = {
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MIN_LENGTH: 10,
  DESCRIPTION_MAX_LENGTH: 500,
  SLUG_MIN_LENGTH: 3,
  SLUG_MAX_LENGTH: 50,
} as const;
```

### `ITEM_STATUSES`

项目审批工作流程的规范状态值：

```typescript
const ITEM_STATUSES = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;
```

### `ITEM_STATUS_LABELS`

每个状态的人类可读标签：

```typescript
const ITEM_STATUS_LABELS = {
  draft: 'Draft',
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
} as const;
```

### `ITEM_STATUS_COLORS`

每个状态的 UI 颜色映射：

```typescript
const ITEM_STATUS_COLORS = {
  draft: 'gray',
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
} as const;
```

## 使用示例

### 创建项目

```typescript
import type { CreateItemRequest } from '@/lib/types/item';
import { ITEM_VALIDATION } from '@/lib/types/item';

function validateItemName(name: string): boolean {
  return (
    name.length >= ITEM_VALIDATION.NAME_MIN_LENGTH &&
    name.length <= ITEM_VALIDATION.NAME_MAX_LENGTH
  );
}

const newItem: CreateItemRequest = {
  id: 'unique-id-123',
  name: 'My Tool',
  slug: 'my-tool',
  description: 'A description of my tool that is at least 10 characters.',
  source_url: 'https://example.com',
  category: ['productivity', 'developer-tools'],
  tags: ['open-source', 'free'],
  status: 'pending',
};
```

### 过滤项目

```typescript
import type { ItemListOptions } from '@/lib/types/item';

const options: ItemListOptions = {
  status: 'approved',
  categories: ['productivity'],
  tags: ['open-source'],
  page: 1,
  limit: 20,
  sortBy: 'updated_at',
  sortOrder: 'desc',
  includeRemote: true,
};
```

### 渲染状态徽章

```typescript
import { ITEM_STATUS_LABELS, ITEM_STATUS_COLORS } from '@/lib/types/item';
import type { ItemStatus } from '@/lib/types/item';

function getStatusBadge(status: ItemStatus) {
  return {
    label: ITEM_STATUS_LABELS[status],
    color: ITEM_STATUS_COLORS[status],
  };
}

// getStatusBadge('pending')
// => { label: 'Pending Review', color: 'yellow' }
```

## 相关类型

- [`ItemLocationData`](./location-types.md) 从位置模块引用 `MapProvider`
- `client-item.ts` 中的 [`ClientSubmissionData`](./item-types.md) 通过参与度指标扩展了 `ItemData`
- [`CategoryData`](./category-types.md) 定义 `ItemData.category` 中引用的类别值
- [`TagData`](./category-types.md) 定义 `ItemData.tags` 中引用的标签值
