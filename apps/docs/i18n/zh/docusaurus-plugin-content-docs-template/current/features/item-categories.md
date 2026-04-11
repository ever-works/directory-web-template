---
id: item-categories
title: 项目类别
sidebar_label: 项目类别
sidebar_position: 24
---

# 项目类别

类别提供了一种分层方式来组织目录中的项目。该模板包括一个完整的类别管理系统，具有管理 CRUD 操作、面向公众的类别导航栏和过滤集成。

## 架构概述

```
components/
  items-categories.tsx              -- Public category navigation bar
  categories-grid.tsx               -- Grid layout for category cards
  admin/categories/                 -- Admin CRUD components
  filters/components/categories/    -- Filter integration components

hooks/
  use-admin-categories.ts           -- Admin CRUD hook (React Query)
  use-categories-enabled.ts         -- Feature flag check
  use-categories-exists.ts          -- Data availability check

app/api/admin/categories/           -- API routes for category management
```

## 类别数据模型

类别由内容层的以下接口表示：

```tsx
interface Category {
  id: string;
  name: string;
  icon_url?: string;
  count?: number;
}
```

管理界面使用扩展类型：

```tsx
// lib/types/category.ts
interface CategoryData {
  id: string;
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface CategoryWithCount extends CategoryData {
  itemCount: number;
}
```

## 公共分类导航

10 组件呈现水平可滚动类别栏，具有可选的粘性行为：

```tsx
// components/items-categories.tsx
export function ItemsCategories(props: {
  categories: Category[];
  basePath?: string;
  resetPath?: string;
  enableSticky?: boolean;
  maxVisibleTags?: number;
}) {
  const { categoriesEnabled } = useCategoriesEnabled();
  const [showAllCategories, setShowAllCategories] = useState(false);
  const pathname = usePathname();

  if (!categoriesEnabled) return null;
  if (!props.categories?.length) return null;

  const MAX_VISIBLE = props.maxVisibleTags || 8;
  const hasMore = props.categories.length > MAX_VISIBLE;

  // Render logic...
}
```

### 主要特点

- **功能标志门控**：如果类别被禁用，组件会检查0并返回1
- **响应式溢出**：在单行模式下，类别以隐藏滚动条样式水平滚动
- **展开/折叠**：切换按钮在单行滚动和包装多行布局之间切换
- **活动状态检测**：将当前路径名与类别 URL 进行比较以突出显示活动过滤器
- **“所有类别”按钮**：始终首先呈现，充当总计数的重置过滤器
- **粘性标题**：当 2 为 true 时，滚动条在滚动超过 250 像素后会变得粘性，添加模糊背景

### 使用示例

```tsx
<ItemsCategories
  categories={categories}
  basePath="/categories"
  resetPath="/"
  enableSticky={true}
  maxVisibleTags={10}
/>
```

## Admin 类别管理

### useAdminCategories 挂钩

0 钩子提供完整的 CRUD 操作：

```tsx
// hooks/use-admin-categories.ts
export function useAdminCategories(options = {}) {
  const { params = {}, enabled = true } = options;

  const { data, isLoading, refetch } = useQuery({
    queryKey: QUERY_KEYS.categoriesList(params),
    queryFn: () => fetchCategories(params),
    staleTime: 5 * 60 * 1000,
  });

  const createCategoryMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      toast.success('Category created successfully');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
    },
  });

  return {
    categories: data?.categories || [],
    total: data?.total || 0,
    page: data?.page || 1,
    totalPages: data?.totalPages || 1,
    isLoading,
    isSubmitting: createMutation.isPending || updateMutation.isPending,
    createCategory: handleCreateCategory,
    updateCategory: handleUpdateCategory,
    deleteCategory: handleDeleteCategory,
    refetch,
    refreshData,
  };
}
```

### 查询密钥工厂

类别使用结构化查询键层次结构来实现精确的缓存失效：

```tsx
const QUERY_KEYS = {
  categories: ['admin', 'categories'] as const,
  categoriesList: (params) =>
    [...QUERY_KEYS.categories, 'list', params] as const,
  allCategories: () =>
    [...QUERY_KEYS.categories, 'all'] as const,
  category: (id: string) =>
    [...QUERY_KEYS.categories, 'detail', id] as const,
};
```

### 单类别挂钩

```tsx
export function useCategory({ id, enabled = true }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.category(id),
    queryFn: () => fetchCategory(id),
    enabled: enabled && !!id,
  });

  return { category: data || null, isLoading, error, refetch };
}
```

### 仅突变钩子

对于只需要写操作而不需要列表查询的组件：

```tsx
export function useCategoryMutations() {
  return {
    createCategory: handleCreate,
    updateCategory: handleUpdate,
    deleteCategory: handleDelete,
    isSubmitting: anyMutationPending,
  };
}
```

## 类别列表选项

管理列表端点支持过滤和分页：

```tsx
interface CategoryListOptions {
  includeInactive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

## API 端点

|方法|端点 |目的|
|--------|----------|---------|
|获取 | 0 |列出带有分页的类别 |
|获取 | 1 |获取所有类别，无需分页 |
|获取 | 2 |获取单个类别 |
|发布 | 3 |创建一个新类别 |
|放置| 4 |更新现有类别 |
|删除 | 5 |软删除类别 |
|删除 | 6 |永久删除类别 |

## 过滤器集成

类别通过 7 模块与过滤系统集成：

```tsx
// components/filters/index.ts
export { Categories } from './components/categories/categories-section';
export { CategoriesList, CategoryItem } from './components/categories';
```

过滤器上下文跟踪选定的类别并将其自动应用于项目查询。

## 功能标志

可以通过 0 钩子全局启用或禁用类别，该钩子从功能标志系统中读取：

```tsx
const { categoriesEnabled } = useCategoriesEnabled();
```

禁用时，导航栏和过滤器组件均返回0。

## 文件参考

|文件|目的|
|------|---------|
| 1 |公共类别导航栏|
| 2 |类别显示的网格布局 |
| 3 |管理 CRUD 组件 |
| 4 |过滤器集成 |
| 5 |带有 React Query 的管理 CRUD 挂钩 |
| 6 |功能标志检查 |
| 7 |数据可用性检查 |
| 8 |后端 API 路由 |
