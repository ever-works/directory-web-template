---
id: favorites-system
title: 收藏夹系统
sidebar_label: 收藏夹
sidebar_position: 33
---

# 收藏夹系统

收藏夹功能允许经过身份验证的用户为目录项添加书签以便快速访问。它包括专用的收藏夹页面、乐观的 UI 更新、由 PostgreSQL 支持的完整 REST API，以及与条件渲染功能标志的集成。

## 架构概述

```
hooks/
  use-favorites.ts           # React Query hook with optimistic mutations

components/favorites/
  favorites-client.tsx       # Full favorites page with grid, sorting, pagination

app/api/favorites/
  route.ts                   # GET (list) and POST (add) endpoints
  [itemSlug]/route.ts        # DELETE endpoint for removing a favorite

lib/db/schema.ts             # favorites table definition
```

## 数据库架构

0 表存储用户和项目之间的书签关系：

```ts
export const favorites = pgTable('favorites', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  itemSlug: text('item_slug').notNull(),
  itemName: text('item_name').notNull(),
  itemIconUrl: text('item_icon_url'),
  itemCategory: text('item_category'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
}, (table) => ({
  userItemIndex: uniqueIndex('user_item_favorite_unique_idx').on(table.userId, table.itemSlug),
  userIdIndex: index('favorites_user_id_idx').on(table.userId),
  itemSlugIndex: index('favorites_item_slug_idx').on(table.itemSlug),
  createdAtIndex: index('favorites_created_at_idx').on(table.createdAt),
}));
```

### 设计决策

- **非规范化元数据** -- 0、1和2 与 slug 一起存储，以便在不加入项目表的情况下呈现收藏夹列表。
- **复合唯一约束** -- 3 索引可防止数据库级别出现重复的收藏夹。
- **索引查找** -- 4、5和6 上的单独索引优化了列出、计数和时间顺序的常见查询模式。

## 使用收藏夹挂钩

具有完全乐观更新支持的主要客户端 API：

```ts
interface Favorite {
  id: string;
  userId: string;
  itemSlug: string;
  itemName: string;
  itemIconUrl?: string;
  itemCategory?: string;
  createdAt: string;
  updatedAt: string;
}

interface AddFavoriteRequest {
  itemSlug: string;
  itemName: string;
  itemIconUrl?: string;
  itemCategory?: string;
}
```

### 返回值

|物业 |类型 |描述 |
|----------|------|-------------|
| 0 | 1 |当前用户最爱列表 |
| 2 | 3 |初始获取期间为 True |
| 4 | 5 |获取错误（如果有）|
| 6 | 7 |手动重新获取收藏夹 |
| 8 | 9 |检查某个项目是否已添加书签 |
| 10 | 11 |根据当前状态添加或删除 |
| 12 | 13 |明确添加收藏 |
| 14 | 15 |明确删除收藏夹 |
| 16 | 17 |当添加突变正在发生时确实如此 |
| 18 | 19 |确实如此，而删除突变正在发生|

### 乐观更新流程

添加和删除突变都遵循 React Query 乐观更新模式：

1. **20** -- 取消正在进行的查询，快照以前的状态，立即应用乐观的更改。添加突变会创建一个带有 21 前缀 ID 的临时收藏夹。
2. **22×** -- 如果 API 调用失败则回滚到快照，显示错误消息。
3. **23×** -- 用服务器确认的数据替换乐观条目。添加突变通过匹配 24 智能地替换临时条目，从而防止重复。

有意省略 25 失效以避免不必要的重新获取。乐观更新加上 26 缓存更新提供了足够的一致性。

### 功能标志集成

仅当满足两个条件时才启用查询：

```ts
enabled: !!user?.id && features.favorites,
staleTime: 5 * 60 * 1000, // 5 minutes
```

当 0 功能标志被禁用或用户未经过身份验证时，挂钩将返回一个空数组，而不发出任何网络请求。

＃＃＃ 用法

```tsx
import { useFavorites } from '@/hooks/use-favorites';

function ItemCard({ item }) {
  const { isFavorited, toggleFavorite, isAdding, isRemoving } = useFavorites();

  return (
    <button
      onClick={() => toggleFavorite({
        itemSlug: item.slug,
        itemName: item.name,
        itemIconUrl: item.icon,
        itemCategory: item.category,
      })}
      disabled={isAdding || isRemoving}
    >
      {isFavorited(item.slug) ? 'Unfavorite' : 'Favorite'}
    </button>
  );
}
```

## API 端点

### 获取/api/收藏夹

返回经过身份验证的用户的所有收藏夹，按创建日期排序。

### POST /api/收藏夹

将项目添加到收藏夹。使用 Zod 进行验证并检查重复项（冲突时返回 409）。

|领域 |必填|描述 |
|--------|----------|-------------|
| 0 |是的 |唯一的项目标识符 |
| 1 |是的 |收藏夹列表的显示名称 |
| 2 |没有 |用于渲染的图标 URL |
| 3 |没有 |类别标签 |

### 删除 /api/favorites/[itemSlug]

通过 slug 从用户的收藏夹中删除特定项目。如果没有找到则返回 404。

## 收藏夹页面

4 组件呈现完整的收藏夹页面：

1. **身份验证门** -- 未经身份验证的用户登录提示。
2. **加载骨架** -- 初始获取期间的 8 卡网格占位符。
3. **错误状态** -- 带有重试按钮的错误消息。
4. **空状态** -- 带有“热门项目”后备部分的消息。
5. **收藏夹网格** -- 显示排序、分页和布局切换的项目。

### 排序选项

|价值|标签|
|--------|--------|
| 5 |人气|
| 6 |名称 A-Z |
| 7 |名称 Z-A |
| 8 |最古老的|

### 布局集成

该页面与9集成，用于网格/列表/卡片视图切换。项目上方会显示 10 和 11。客户端分页将收藏夹分为 12 页，每页更改 12 页。

## 跨设备同步

收藏夹存储在 PostgreSQL 的服务器端，因此当用户通过身份验证时，它们会自动跨设备同步。具有 5 分钟陈旧时间的 React Query 缓存平衡了新鲜度和性能。可通过 13 功能进行手动同步。

## 辅助功能

- 最喜欢的切换按钮在未决突变期间禁用，以防止双重操作。
- Toast 通知提供成功和失败操作的反馈。
- 收藏夹页面网格使用与主列表相同的可访问卡片组件。
- 空和错误状态包括键盘导航的可操作元素。

## 相关文档

- [功能标志](/docs/template/configuration/feature-config) -- 启用/禁用收藏夹功能
- [共享卡组件](/docs/template/components/shared-card-components) -- 收藏夹网格中的卡片渲染
- [Context Providers](/docs/template/components/context-providers) -- 布局主题集成
- [仪表板组件](/docs/template/components/dashboard-components) -- 分析中最喜欢的计数
