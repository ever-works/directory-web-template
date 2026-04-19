---
id: state-management
title: "状态管理"
sidebar_label: "状态管理"
sidebar_position: 26
---

# 状态管理

该模板使用分层状态管理方法：**React Query** (TanStack Query) 用于服务器状态，**React Context** 用于全局 UI 设置，**本地组件状态** 用于临时 UI 问题。本页面涵盖了每个层、查询客户端配置以及整个代码库中使用的模式。

## 州类别

|类别|工具|示例|
|----------|------|----------|
|服务器状态|反应查询|用户数据、项目、类别、管理统计|
|全局 UI 状态|反应上下文|主题、布局、分页类型、容器宽度|
|本地用户界面状态|`useState` / `useReducer`|模态打开/关闭、表单输入、下拉可见性|
|持续的偏好|`localStorage` 通过上下文|主题键、布局键、每页项目|

## 反应查询配置

查询客户端是使用处理服务器和浏览器环境的工厂函数在 `lib/query-client.ts` 中创建的：

```tsx
// lib/query-client.ts
import { isServer, QueryClient } from '@tanstack/react-query';

export function createQueryClientInstance(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,      // 5 minutes
        gcTime: 10 * 60 * 1000,         // 10 minutes
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: true,
        retry: (failureCount) => failureCount < 2,
        retryDelay: (attemptIndex) =>
          Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        retry: 1,
        onError: (error) => {
          toast.error(`Mutation Error: ${error.message}`);
        },
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export const getQueryClient = () => {
  if (isServer) {
    return createQueryClientInstance();
  } else {
    if (!browserQueryClient) browserQueryClient = createQueryClientInstance();
    return browserQueryClient;
  }
};
```

关键设计决策：
- **服务器隔离**：每个服务器请求都会创建一个新的`QueryClient`，以防止用户之间的数据泄露
- **浏览器单例**：在浏览器会话中重复使用单个实例
- **保守重新获取**：默认情况下禁用 `refetchOnWindowFocus` 和 `refetchOnMount` 以最大程度地减少网络流量
- **指数退避**：每次尝试重试延迟加倍，上限为 30 秒

## 查询密钥工厂

专用`react-query-config.ts` 文件定义查询密钥工厂以实现一致的缓存管理：

```tsx
// lib/react-query-config.ts
export const queryKeys = {
  billing: {
    all: ['billing'] as const,
    subscription: () => [...queryKeys.billing.all, 'subscription'] as const,
    payments: () => [...queryKeys.billing.all, 'payments'] as const,
    user: (userId: string) => [...queryKeys.billing.all, 'user', userId] as const,
  },
  user: {
    all: ['user'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
    settings: () => [...queryKeys.user.all, 'settings'] as const,
  },
  admin: {
    all: ['admin'] as const,
    users: () => [...queryKeys.admin.all, 'users'] as const,
    subscriptions: () => [...queryKeys.admin.all, 'subscriptions'] as const,
  },
};
```

此工厂模式支持有针对性的缓存失效。例如，`invalidateQueries({ queryKey: queryKeys.billing.all })` 会立即清除所有与计费相关的查询。

## 缓存失效实用程序

```tsx
// lib/react-query-config.ts
export const cacheUtils = {
  invalidateBilling: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.billing.all });
  },
  invalidateSubscription: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.billing.subscription() });
  },
  resetCache: () => {
    queryClient.clear();
  },
};
```

## 预取策略

```tsx
export const prefetchStrategies = {
  billing: () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.billing.subscription(),
      queryFn: async () => { /* API call */ },
      staleTime: 5 * 60 * 1000,
    });
  },
  userProfile: () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.user.profile(),
      queryFn: async () => { /* API call */ },
      staleTime: 10 * 60 * 1000,
    });
  },
};
```

当用户导航到需要此数据的页面时，会主动调用这些数据。

## 钩子模式：useCurrentUser

`hooks/use-current-user.ts` 钩子演示了标准的数据获取钩子模式：

```tsx
// hooks/use-current-user.ts
export const CURRENT_USER_QUERY_KEY = ['auth-session'] as const;

export function useCurrentUser() {
  const queryClient = useQueryClient();

  const { data: user, isLoading, isError, error, refetch } =
    useQuery<User, UseCurrentUserError>({
      queryKey: CURRENT_USER_QUERY_KEY,
      queryFn: fetchCurrentUser,
      staleTime: 10 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: (failureCount, error) => {
        if (error.status === 401 || error.status === 403) return false;
        return failureCount < 2;
      },
    });

  const invalidateUserCache = () => {
    queryClient.removeQueries({ queryKey: CURRENT_USER_QUERY_KEY });
  };

  return { user, isLoading, isError, error, refetch, invalidateUserCache };
}
```

图案亮点：
- **导出的查询密钥**：允许其他钩子无效或读取此缓存
- **智能重试**：身份验证错误永远不会重试
- **缓存助手**：`invalidateUserCache`、`prefetchUser` 和 `setUserData` 公开供外部使用

## 乐观更新：useFavorites

`hooks/use-favorites.ts` 钩子演示了乐观的更新模式：

```tsx
// hooks/use-favorites.ts (simplified)
const addFavoriteMutation = useMutation({
  mutationFn: addFavorite,
  onMutate: async (newFavorite) => {
    await queryClient.cancelQueries({ queryKey: ['favorites'] });
    const previousFavorites =
      queryClient.getQueryData<Favorite[]>(['favorites']) ?? [];

    // Optimistically add the item
    queryClient.setQueryData<Favorite[]>(['favorites'], (old = []) => [
      ...old,
      { id: `temp-${Date.now()}`, ...newFavorite },
    ]);

    return { previousFavorites };
  },
  onError: (err, _newFavorite, context) => {
    // Rollback on failure
    if (context) {
      queryClient.setQueryData(['favorites'], context.previousFavorites);
    }
    toast.error(err.message || 'Failed to add to favorites');
  },
  onSuccess: (realFavorite) => {
    // Replace temp item with server response
    queryClient.setQueryData<Favorite[]>(['favorites'], (old = []) =>
      old.map((fav) =>
        fav.id.startsWith('temp-') && fav.itemSlug === realFavorite.itemSlug
          ? realFavorite
          : fav
      )
    );
  },
});
```

该模式遵循三个步骤：
1. **onMutate**：取消正在进行的查询、快照状态、应用乐观更新
2. **onError**：回滚到快照
3. **onSuccess**：用真实的服务器响应替换乐观数据

## 全局 UI 状态：LayoutThemeContext

`components/context/LayoutThemeContext.tsx` 为所有全局 UI 首选项提供了一个 React Context：

```tsx
// components/context/LayoutThemeContext.tsx
interface LayoutThemeContextType {
  layoutKey: LayoutKey;
  setLayoutKey: (key: LayoutKey) => void;
  themeKey: ThemeKey;
  setThemeKey: (key: ThemeKey) => void;
  currentTheme: ThemeConfig;
  paginationType: PaginationType;
  setPaginationType: (type: PaginationType) => void;
  itemsPerPage: number;
  setItemsPerPage: (count: number) => void;
  containerWidth: ContainerWidth;
  setContainerWidth: (width: ContainerWidth) => void;
  // ... more settings
}
```

每个设置都遵循使用专用管理器挂钩的相同内部模式：

```tsx
const useThemeManager = () => {
  const [themeKey, setThemeKeyState] = useState<ThemeKey>(DEFAULT_THEME);

  // Hydrate from localStorage after mount
  useEffect(() => {
    const saved = safeLocalStorage.getItem('themeKey');
    if (saved && isValidThemeKey(saved)) {
      setThemeKeyState(saved);
    }
  }, []);

  const setThemeKey = useCallback((key: ThemeKey) => {
    setThemeKeyState(key);
    safeLocalStorage.setItem('themeKey', key);
    applyThemeWithPalettes(key);
  }, []);

  return { themeKey, setThemeKey, currentTheme };
};
```

设计原则：
- **水合安全**：状态始终以默认值初始化； localStorage仅在挂载后在`useEffect`中读取
- **验证**：每个设置者在应用之前都会验证输入
- **持久性**：所有首选项都会自动同步到`localStorage`
- **CSS 变量同步**：主题更改会立即更新 `document.documentElement` 上的 CSS 自定义属性

## 管理挂钩中的每个挂钩查询键

每个管理 CRUD 挂钩都定义自己的查询键命名空间：

```tsx
// hooks/use-admin-categories.ts
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

突变在命名空间级别无效，以确保刷新所有相关查询：

```tsx
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
},
```

## 文件参考

|文件|目的|
|------|---------|
|`lib/query-client.ts`|查询客户端工厂（服务器与浏览器）|
|`lib/react-query-config.ts`|查询关键工厂、缓存实用程序、预取策略|
|`lib/api/constants.ts`|默认过时时间和查询配置常量|
|`components/context/LayoutThemeContext.tsx`|具有 localStorage 持久性的全局 UI 设置上下文|
|`hooks/use-current-user.ts`|具有缓存管理功能的数据获取挂钩示例|
|`hooks/use-favorites.ts`|乐观更新模式示例|
|`hooks/use-admin-categories.ts`|具有查询键命名空间的管理 CRUD 挂钩示例|
