---
id: featured-items
title: 特色项目系统
sidebar_label: 特色商品
sidebar_position: 2
---

# 特色物品系统

特色项目系统允许管理员通过自定义排序、到期日期和激活控制来突出显示网站上的特定项目。

## 数据模型

```typescript
interface FeaturedItem {
  id: string;
  itemSlug: string;
  itemName: string;
  itemIconUrl?: string;
  itemCategory?: string;
  itemDescription?: string;
  featuredOrder: number;        // Display position
  featuredUntil?: string;       // Expiration date (ISO string)
  isActive: boolean;
  featuredBy: string;           // Admin user ID
  featuredAt: string;           // When it was featured
  createdAt: string;
  updatedAt: string;
}
```

## 管理员管理

### useAdminFeaturedItems 挂钩

```typescript
import { useAdminFeaturedItems } from '@/hooks/use-admin-featured-items';

const {
  // Data
  featuredItems,        // FeaturedItem[]
  allItems,             // ItemData[] (for picker)
  filteredItems,        // FeaturedItem[] (after local search/filter)

  // State
  isLoading, isSubmitting,
  currentPage, totalPages, totalItems,
  searchTerm, showActiveOnly,

  // Actions
  setSearchTerm,        // (term: string) => void
  setShowActiveOnly,    // (active: boolean) => void
  addFeaturedItem,      // (data) => Promise<boolean>
  updateFeaturedItem,   // (id, data) => Promise<boolean>
  removeFeaturedItem,   // (id) => Promise<boolean>
  reorderItems,         // (orderedIds: string[]) => Promise<boolean>
  refetch, refreshData,
} = useAdminFeaturedItems({ page: 1, limit: 20 });
```

### API 响应

特色项目 API 返回带有导航元数据的分页结果：

```typescript
interface FeaturedItemsResponse {
  success: boolean;
  data: FeaturedItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

## 订购

特色项目支持通过 0 函数进行拖放重新排序，该函数接受按所需显示顺序排列的 ID 数组：

```typescript
await reorderItems(['item-3', 'item-1', 'item-2']);
```

0字段决定前端的显示位置。

## 过期时间

商品可以带有可选的到期日期 (1)。设置时：
- 该商品在过期日期后将自动从显示中排除
- 管理员可以通过切换 2 过滤器查看过期项目
- 还支持通过3手动删除

## 客户端显示

### useFeaturedItemsClient 挂钩

面向公众的钩子获取活动的特色项目以进行显示：

```typescript
import { useFeaturedItemsClient } from '@/hooks/use-featured-items-client';

const { featuredItems, isLoading } = useFeaturedItemsClient();
```

### useFeatureItemsSection 挂钩

提供节级显示逻辑的高级挂钩：

```typescript
import { useFeatureItemsSection } from '@/hooks/use-feature-items-section';

const {
  items,
  isLoading,
  showSection,     // boolean -- whether to render the section
} = useFeatureItemsSection();
```

## 功能标志

特色项目遵循 0´ 功能标志：

```typescript
const flags = getFeatureFlags();
if (flags.featuredItems) {
  // Render featured items section
}
```

如果未配置0，该功能将自动禁用。

## API 端点

|方法|端点 |描述 |
|--------|----------|-------------|
|获取 | 1 |列出特色项目（分页）|
|发布 | 2 |添加特色项目 |
|放置| 3 |更新特色项目设置 |
|删除 | 4 |从精选中删除 |
|放置| 5 |重新订购特色商品 |
|获取 | 6 |公开：获取活跃特色项目|
