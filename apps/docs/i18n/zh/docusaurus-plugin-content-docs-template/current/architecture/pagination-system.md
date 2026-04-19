---
id: pagination-system
title: "分页系统"
sidebar_label: "分页系统"
sidebar_position: 45
---

# 分页系统

## 概述

分页系统提供服务器端分页计算和客户端页面导航实用程序。它由两个小型的、集中的模块组成：`lib/paginate.ts` 用于计算页面元数据（页码、偏移量）和 `utils/pagination.ts` 用于安全地固定页码并在页面更改时触发滚动到顶部行为。

## 建筑

分页系统有意做到轻量级并分为两层：

- **`lib/paginate.ts`** (服务器/共享) -- 用于分页数学的纯函数。在 API 路由、服务器组件和数据获取逻辑中使用，以计算要返回的数据片段。
- **`utils/pagination.ts`**（客户端）——一个 UI 助手，它将页码限制在有效范围内并将页面滚动到顶部。由分页组件和列表视图使用。

这两个模块都由分页 UI 组件和内容列表页面使用。 `ConfigManager` 提供输入到这些计算中的`itemsPerPage` 值。

```
lib/paginate.ts
  |-- PER_PAGE (default: 12)
  |-- totalPages(size, perPage)
  |-- paginateMeta(rawPage, perPage)

utils/pagination.ts
  |-- clampAndScrollToTop(newPage, total, setPage)
```

## API参考

### 从 `lib/paginate.ts` 导出

#### `PER_PAGE: number`

每页默认项目不变。值：`12`。

#### `totalPages(size: number, perPage?: number): number`

计算给定集合大小的总页数。使用 `Math.ceil()` 确保包含最后部分页面。

**参数：**
- `size` -- 集合中的项目总数
- `perPage` -- 每页的项目（默认为`PER_PAGE`）

**返回：** 总页数（非空集合最少为 1）

#### `paginateMeta(rawPage?: number | string, perPage?: number): { page: number; start: number }`

从原始页面参数（可能来自 URL 查询参数的字符串）计算分页元数据。

**参数：**
- `rawPage` -- 请求的页码（默认为`1`）。接受`number` 和`string`。
- `perPage` -- 每页的项目（默认为`PER_PAGE`）

**退货：**
- `page` -- 解析为整数的页码
- `start` -- 用于切片数据数组的从零开始的索引偏移量

### 从 `utils/pagination.ts` 导出

#### `clampAndScrollToTop(newPage: number, total: number, setPage: (page: number) => void): void`

通过将值限制在有效范围 `[1, total]`、更新页面状态以及以流畅的动画将窗口滚动到顶部，安全导航到新页面。

**参数：**
- `newPage` -- 请求的页码（可以超出范围）
- `total` -- 总页数
- `setPage` -- React 当前页面的状态设置函数

**行为：**
- 将 `NaN` 值固定到第 1 页
- 将低于 1 的值限制到第 1 页
- 将 `total` 以上的值钳位到 `total`
- 调用 `window.scrollTo({ top: 0, behavior: 'smooth' })`（对于 SSR 来说是安全的；检查 `typeof window`）

## 实施细节

**字符串解析**：`paginateMeta` 接受 `string | number` 作为 `rawPage` 参数，因为 URL 查询参数以字符串形式到达。它使用`parseInt()`进行转换。

**从零开始的偏移**：`paginateMeta`返回的`start`值计算为`(page - 1) * perPage`，提供适合`Array.slice()`或SQL `OFFSET`子句的从零开始的索引。

**SSR 安全**：`clampAndScrollToTop` 在调用 `window.scrollTo()` 之前检查 `typeof window !== 'undefined'`，从而可以安全地在服务器端渲染上下文中调用。

**NaN 处理**：`clampAndScrollToTop` 将输入转换为 `Number()`，如果结果是 `NaN`，则返回到第 1 页。

## 配置

默认页面大小 (`PER_PAGE = 12`) 是 `lib/paginate.ts` 中的常量。运行时页面大小可以通过 `ConfigManager` 覆盖：

```typescript
import { configManager } from '@/lib/config-manager';
const { itemsPerPage } = configManager.getPaginationConfig();
```

`ConfigManager` 支持两种分页类型：
- `'standard'` -- 传统的逐页导航
- `'infinite'` -- 无限滚动/加载更多模式

## 使用示例

```typescript
// Server-side: compute pagination for an API response
import { totalPages, paginateMeta, PER_PAGE } from '@/lib/paginate';

function getItemsPage(items: Item[], rawPage: string | number) {
  const { page, start } = paginateMeta(rawPage);
  const pageItems = items.slice(start, start + PER_PAGE);
  const total = totalPages(items.length);

  return {
    items: pageItems,
    pagination: {
      page,
      totalPages: total,
      totalItems: items.length,
      perPage: PER_PAGE,
    },
  };
}

// Client-side: handle page change in a React component
import { clampAndScrollToTop } from '@/utils/pagination';
import { totalPages } from '@/lib/paginate';

function PaginatedList({ items }: { items: Item[] }) {
  const [page, setPage] = useState(1);
  const total = totalPages(items.length);

  return (
    <>
      <ItemGrid items={getPageSlice(items, page)} />
      <PaginationControls
        currentPage={page}
        totalPages={total}
        onPageChange={(newPage) => clampAndScrollToTop(newPage, total, setPage)}
      />
    </>
  );
}

// Using custom page size from ConfigManager
import { configManager } from '@/lib/config-manager';
import { totalPages, paginateMeta } from '@/lib/paginate';

const { itemsPerPage } = configManager.getPaginationConfig();
const { page, start } = paginateMeta(rawPage, itemsPerPage);
const total = totalPages(items.length, itemsPerPage);
```

## 最佳实践

- 始终使用 `paginateMeta()` 从 URL 查询字符串解析页面参数，以安全地处理类型强制和默认值。
- 当管理员可能更改页面大小时，从 `ConfigManager` 传递 `perPage` 覆盖，而不是依赖硬编码的 `PER_PAGE` 常量。
- 在所有客户端页面导航中使用`clampAndScrollToTop()`，以防止页码超出范围并提供一致的用户体验。
- 对于无限滚动实现，请使用 `start` 与 `paginateMeta()` 的偏移量来计算要附加的下一个项目切片。
- 选择要呈现的分页 UI 组件时，请考虑分页 `type` 和 `ConfigManager`（`'standard'` 与 `'infinite'`）。

## 相关模块

- [Config Manager System](./config-manager-system) -- 提供运行时分页配置（`type`、`itemsPerPage`）
- [Content Library](/template/architecture/content-library) -- 对内容列表页面使用分页
