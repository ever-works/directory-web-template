---
id: query-client-system
title: "查询客户端系统"
sidebar_label: "查询客户端系统"
sidebar_position: 43
---

# 查询客户端系统

## 概述

查询客户端系统为应用程序提供集中式 TanStack React 查询配置。它由两个模块组成：一个处理服务器/客户端单例管理的通用查询客户端工厂 (`lib/query-client.ts`)，以及一个具有查询密钥工厂、预取策略和缓存失效实用程序的计费优化配置 (`lib/react-query-config.ts`)。

## 建筑

该系统有两个入口点，服务于不同的问题：

- **`lib/query-client.ts`** -- 跨应用程序使用的主要查询客户端。它为服务器和客户端环境创建单独的实例，确保服务器端渲染在浏览器重用单个实例时不会在请求之间共享状态。
- **`lib/react-query-config.ts`** -- 配置用于计费和订阅管理的专用查询客户端。它添加了针对支付相关数据定制的查询密钥工厂、预取策略和缓存失效实用程序。

```
query-client.ts
  |-- createQueryClientInstance()   (Factory function)
  |-- getQueryClient()              (Server/client singleton)

react-query-config.ts
  |-- queryClient                   (Billing-optimized instance)
  |-- queryKeys                     (Key factory)
  |-- prefetchStrategies            (Prefetch helpers)
  |-- cacheUtils                    (Invalidation utilities)
```

## API参考

### 从 `lib/query-client.ts` 导出

#### `createQueryClientInstance(): QueryClient`

使用以下默认值创建新`QueryClient` 的工厂函数：

|选项|价值|目的|
|--------|-------|---------|
|`staleTime`|5分钟|数据被认为是新鲜的|
|`gcTime`|10分钟|上次使用后的缓存保留|
|`refetchOnWindowFocus`|`false`|防止过度重新获取|
|`refetchOnMount`|`false`|如果数据是新鲜的，则跳过重新获取|
|`refetchOnReconnect`|`true`|网络恢复时重新获取|
|`retry`|最多尝试 2 次|对所有错误进行简单重试|
|`retryDelay`|指数退避，最长 30 秒|`1000 * 2^attempt`|
|突变`retry`| 1 |重试突变一次|
|突变`onError`|Toast + console.error|全局错误通知|

#### `getQueryClient(): QueryClient`

返回适当的 `QueryClient` 实例。在服务器上，它每次调用都会创建一个新实例（无共享状态）。在客户端，它返回一个单例实例（创建一次并重复使用）。

### 从 `lib/react-query-config.ts` 导出

#### `queryClient: QueryClient`

针对计费操作进行优化的预配置 `QueryClient` 实例。与一般客户的主要区别：

- `refetchOnWindowFocus: true` -- 确保订阅状态始终是最新的
- `refetchOnMount: true` -- 重新获取组件挂载上的过时数据
- 重试会跳过 4xx 和 401 错误（不重试客户端/身份验证错误）
- 指数退避包括抖动（基本延迟的 85-115%）
- `notifyOnChangeProps` 设置为 `['data', 'error', 'isLoading', 'isFetching']` 以优化重新渲染

#### `queryKeys`

用于一致缓存管理的分层查询密钥工厂：

```typescript
const queryKeys = {
  billing: {
    all: ['billing'],
    subscription: () => ['billing', 'subscription'],
    payments: () => ['billing', 'payments'],
    user: (userId: string) => ['billing', 'user', userId],
  },
  user: {
    all: ['user'],
    profile: () => ['user', 'profile'],
    settings: () => ['user', 'settings'],
  },
  admin: {
    all: ['admin'],
    users: () => ['admin', 'users'],
    subscriptions: () => ['admin', 'subscriptions'],
    payments: () => ['admin', 'payments'],
  },
};
```

#### `prefetchStrategies`

针对常见导航模式的预构建预取函数：

- `prefetchStrategies.billing()` -- 预取订阅和支付数据
- `prefetchStrategies.userProfile()` -- 预取用户配置文件数据

#### `cacheUtils`

缓存管理实用程序：

- `cacheUtils.invalidateBilling()` -- 使所有计费查询无效
- `cacheUtils.invalidateSubscription()` -- 使订阅查询无效
- `cacheUtils.invalidatePayments()` -- 使付款查询无效
- `cacheUtils.removeBilling()` -- 从缓存中删除所有计费数据
- `cacheUtils.resetCache()` -- 清除整个查询缓存

## 实施细节

**服务器/客户端拆分**：`getQueryClient()` 使用 TanStack 的 `isServer` 标志来确定环境。服务器实例是短暂的（每个请求都是新的），以防止用户之间的数据泄漏。浏览器单例存储在模块级变量中。

**错误处理策略**：一般客户端使用Sonner的`toast.error()`来处理突变错误，提供即时的用户反馈。计费客户端会跳过 4xx 错误的重试，因为它们表明重试无法解决客户端问题。

**带抖动重试**：计费客户端将随机抖动（基本延迟的 85-115%）添加到指数退避中，以防止在服务中断后许多客户端同时重试时出现惊群问题。

## 配置

不需要额外的配置文件。两个客户端都是完全用代码配置的。要调整默认值，请修改相应工厂函数中的`defaultOptions`。

## 使用示例

```typescript
// General usage -- getting the query client
import { getQueryClient } from '@/lib/query-client';

// In a React Server Component or provider
const queryClient = getQueryClient();

// In a client component with React Query
import { useQuery } from '@tanstack/react-query';

function ItemsList() {
  const { data, isLoading } = useQuery({
    queryKey: ['items'],
    queryFn: fetchItems,
  });
  // ...
}

// Billing usage -- using query key factories
import { queryKeys, cacheUtils } from '@/lib/react-query-config';

function useSubscription() {
  return useQuery({
    queryKey: queryKeys.billing.subscription(),
    queryFn: fetchSubscription,
  });
}

// After a successful payment
async function onPaymentSuccess() {
  cacheUtils.invalidateBilling();
}

// Prefetch on navigation
import { prefetchStrategies } from '@/lib/react-query-config';

function SettingsLink() {
  return (
    <Link
      href="/settings/billing"
      onMouseEnter={() => prefetchStrategies.billing()}
    >
      Billing Settings
    </Link>
  );
}
```

## 最佳实践

- 使用`lib/query-client.ts` 中的`getQueryClient()` 进行所有常规数据获取；仅将特定于计费的客户端用于与支付相关的功能。
- 始终使用 `queryKeys` 工厂来保证缓存键的一致性；永远不要对查询键数组进行硬编码。
- 在任何更改订阅或支付状态的突变后，请致电`cacheUtils.invalidateBilling()`。
- 在悬停或路线预加载时使用 `prefetchStrategies` 以提高感知性能。
- 除非绝对必要，否则请避免在生产中调用`cacheUtils.resetCache()`，因为它会丢弃所有缓存的数据。

## 相关模块

- [API 客户端层](/template/architecture/api-client-layer) -- 使查询函数使用 API 调用
- [Guards System](./guards-system-deep-dive) -- 可能依赖于订阅数据的基于计划的访问控制
