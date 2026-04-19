---
id: types-overview
title: 类型系统概述
sidebar_label: 概述
sidebar_position: 0
---

# 类型系统概述

该模板使用位于 `lib/types/` 中的综合 TypeScript 类型系统。这些类型定义充当跨 API 路由、服务、存储库和 UI 组件使用的数据结构的单一事实来源。

## 类型文件

`lib/types/` 目录包含以下模块：

|文件|描述|
|------|-------------|
|`item.ts`|项目数据、CRUD 请求、列表选项、验证常量和状态定义|
|`user.ts`|管理用户数据、身份验证类型、Zod 验证模式和辅助函数|
|`profile.ts`|公共用户个人资料结构，包括社交链接、技能、作品集和提交内容|
|`category.ts`|类别数据、CRUD 请求、列表选项和验证常量|
|`comment.ts`|从数据库模式推断的评论类型，包括用户丰富的评论|
|`vote.ts`|投票模式 (Zod)、响应类型、错误类型和客户端投票状态|
|`survey.ts`|调查和调查响应类型、过滤器选项和状态/类型枚举|
|`location.ts`|位置设置、地理查询类型、地图提供商类型和坐标数据|
|`sponsor-ad.ts`|赞助商广告类型，包括请求、响应、统计数据和仪表板数据|
|`client.ts`|面向客户的门户的客户配置文件类型，包括仪表板和统计信息|
|`client-item.ts`|具有参与度指标和状态过滤器的客户端项目提交类型|
|`role.ts`|RBAC系统的角色和权限类型|
|`tag.ts`|标记数据、CRUD 请求、列表选项和验证常量|
|`twenty-crm-config.types.ts`|二十种 CRM 集成配置和连接测试类型|
|`twenty-crm-entities.types.ts`|用于个人和公司记录的二十种 CRM 实体类型|
|`twenty-crm-errors.types.ts`|CRM 错误的结构化错误类型、错误代码和类型防护|
|`twenty-crm-sync.types.ts`|更新插入操作、缓存条目和同步相关类型|

## 架构模式

### 一致的 CRUD 模式

大多数实体类型都遵循一致的接口模式：

```typescript
// Core data interface
interface EntityData {
  id: string;
  name: string;
  // ... entity-specific fields
}

// Create request (input for POST endpoints)
interface CreateEntityRequest {
  // Required fields for creation
}

// Update request (input for PUT/PATCH endpoints)
interface UpdateEntityRequest extends Partial<CreateEntityRequest> {
  id: string; // ID is always required for updates
}

// List response (paginated)
interface EntityListResponse {
  entities: EntityData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Single entity response
interface EntityResponse {
  success: boolean;
  entity?: EntityData;
  error?: string;
}

// List/query options
interface EntityListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}
```

### 验证常数

每个实体模块使用 `as const` 导出验证常量对象以确保类型安全：

```typescript
export const ENTITY_VALIDATION = {
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 100,
  // ... other constraints
} as const;
```

这些常量用于服务器端验证和客户端表单验证，确保整个堆栈的规则一致。

### 受歧视工会的回应

API 响应类型使用可区分联合来进行类型安全的错误处理：

```typescript
type ApiResponse =
  | { success: true; data: SomeData; message?: string }
  | { success: false; error: string };
```

该模式由 `SponsorAdResponse`、`ClientResponse`、`ClientListResponse` 等使用。

### Zod 架构集成

多个模块使用 Zod 与 TypeScript 类型一起进行运行时验证：

```typescript
import { z } from 'zod';

export const entitySchema = z.object({
  id: z.string(),
  name: z.string().min(3).max(100),
});

// Derive TypeScript type from Zod schema
export type Entity = z.infer<typeof entitySchema>;
```

这用于`vote.ts`（用于投票模式）和`user.ts`（用于用户验证）。

### 具有关系的扩展类型

包含相关数据的类型使用 `extends` 关键字：

```typescript
// Base type
interface EntityData {
  id: string;
  name: string;
}

// Extended type with related user data
interface EntityWithUser extends EntityData {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

// Extended type with count (for statistics)
interface EntityWithCount extends EntityData {
  count?: number;
}
```

## 进口惯例

对于仅类型导入，使用 `type` 关键字导入类型：

```typescript
import type { ItemData, ItemListResponse } from '@/lib/types/item';
import type { MapProvider } from '@/lib/types/location';
```

这确保类型在编译时被删除并且不影响包大小。

## 配置与运行时类型

位置模块演示了用于配置的模式：

- **配置类型**使用`snake_case`来匹配YAML配置文件
- **运行时类型** 使用 `camelCase` 进行惯用的 TypeScript 用法
- 映射函数在两种格式之间进行转换

```typescript
// YAML config (snake_case)
interface LocationConfigSettings {
  distance_filter_enabled?: boolean;
  default_radius_km?: number;
}

// Runtime (camelCase)
interface LocationSettings {
  distanceFilterEnabled: boolean;
  defaultRadiusKm: number;
}

// Converter function
function mapLocationConfigToRuntime(
  config?: LocationConfigSettings
): LocationSettings;
```

## 状态枚举和标签

状态值被定义为具有相应标签和颜色映射的 const 对象：

```typescript
export const ITEM_STATUSES = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type ItemStatus =
  (typeof ITEM_STATUSES)[keyof typeof ITEM_STATUSES];

export const ITEM_STATUS_LABELS = {
  draft: 'Draft',
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
} as const;

export const ITEM_STATUS_COLORS = {
  draft: 'gray',
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
} as const;
```

## 数据库推断类型

有些类型是直接从 Drizzle ORM 模式推断出来的：

```typescript
import { comments } from '@/lib/db/schema';

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
```

这种方法可确保类型自动与数据库迁移保持同步。

## 相关文档

- [物品类型](./item-types.md) - 核心物品数据结构
- [用户类型](./user-types.md) - 用户身份验证和配置文件类型
- [类别类型](./category-types.md) - 类别管理类型
- [评论类型](./comment-types.md) - 评论和评论类型
- [投票类型](./vote-types.md) - 投票系统类型
- [调查类型](./survey-types.md) - 调查和回复类型
- [位置类型](./location-types.md) - 地理位置和地图类型
- [赞助商广告类型](./sponsor-ad-types.md) - 赞助和广告类型
- [CRM 类型](./crm-types.md) - 二十种 CRM 集成类型
