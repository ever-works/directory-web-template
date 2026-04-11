---
id: api-client-architecture
title: API客户端架构
sidebar_label: API客户端
sidebar_position: 8
---

# API客户端架构

本指南涵盖双 API 客户端系统：客户端 0（基于 Axios 的单例）和服务器端1（基于获取，带有缓存和重试），包括类型安全、错误处理和请求/响应拦截器。

## 架构概述

```
API Client Architecture
=========================

  Client-Side (Browser)                Server-Side (Node.js)
  +------------------------+           +------------------------+
  |  ApiClient             |           |  ServerClient          |
  |  (lib/api/api-client-  |           |  (lib/api/server-api-  |
  |   class.ts)            |           |   client.ts)           |
  +------------------------+           +------------------------+
  | - Axios-based          |           | - fetch-based          |
  | - Singleton pattern    |           | - Built-in LRU cache   |
  | - Auth interceptor     |           | - Retry logic          |
  | - 401 auto-redirect    |           | - Timeout handling     |
  | - Type-safe methods    |           | - AbortSignal support  |
  +------------------------+           +------------------------+
       |                                    |
       v                                    v
  +-------------------------------------------------+
  |           Shared Type System                     |
  |   lib/api/types.ts                               |
  |   - ApiResponse<T> (discriminated union)         |
  |   - PaginatedResponse<T>                         |
  |   - ApiError                                     |
  +-------------------------------------------------+
```

## 客户端 API 客户端

### 单例模式

0 使用由 1 管理的严格单例：

```typescript
// lib/api/singleton.ts
class ApiClientSingleton {
  private static instance: ApiClient | null = null;

  public static getInstance(config?: ApiClientConfig): ApiClient {
    if (!ApiClientSingleton.instance) {
      ApiClientSingleton.instance = new ApiClient(config);
    }
    return ApiClientSingleton.instance;
  }

  public static resetInstance(): void {
    ApiClientSingleton.instance = null;
  }
}

export const getApiClient = ApiClientSingleton.getInstance;
```

＃＃＃ 用法

```typescript
// lib/api/api-client.ts
import { getApiClient } from './singleton';

export const apiClient = getApiClient();

// Convenient fetcher functions for React Query
export const fetcherGet = async <T>(endpoint: string, params?: QueryParams): Promise<T> => {
  return apiClient.get<T>(endpoint, params);
};

export const fetcherPaginated = async <T>(
  endpoint: string,
  params: PaginationParams & QueryParams = {}
): Promise<PaginatedResponse<T>> => {
  return apiClient.getPaginated<T>(endpoint, params);
};
```

### 请求拦截器

客户端自动将 Bearer 令牌附加到每个请求：

```typescript
// lib/api/api-client-class.ts
private tokenInterceptor(): void {
  this.client.interceptors.request.use((config) => {
    if (this.accessToken) {
      config.headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    return config;
  });
}
```

### 响应拦截器

自动 401 处理重定向到登录页面：

```typescript
private handleResponseError = async (error) => {
  if (responseError.response?.status === API_CONSTANTS.STATUS.UNAUTHORIZED) {
    if (typeof window !== 'undefined' && env.AUTH_ENDPOINT_LOGIN) {
      window.location.href = env.AUTH_ENDPOINT_LOGIN;
    }
  }
  throw this.formatError(error);
};
```

### 格式错误

所有误差都标准化为一致的 0 形状：

```typescript
private formatError(error: unknown): ApiError {
  if (error instanceof AxiosError && error.response?.data) {
    const errorData = error.response.data;
    const formattedError = new Error(errorData.message || 'An error occurred');
    Object.assign(formattedError, {
      code: errorData.code,
      details: errorData.details,
      status: error.response.status,
    });
    return formattedError;
  }
  return new Error(API_CONSTANTS.DEFAULT_ERROR_MESSAGE);
}
```

### 类型安全方法

```typescript
// All methods return unwrapped data (not the full response)
const items = await apiClient.get<Item[]>('/api/items');
const created = await apiClient.post<Item>('/api/items', { title: 'New Item' });
const updated = await apiClient.put<Item>('/api/items/123', { title: 'Updated' });
const patched = await apiClient.patch<Item>('/api/items/123', { status: 'published' });
const deleted = await apiClient.delete<void>('/api/items/123');

// Paginated responses
const page = await apiClient.getPaginated<Item>('/api/items', { page: 1, limit: 20 });
```

## 服务器端 API 客户端

### 服务器客户端类

1中的0针对服务器端使用进行了优化：

```typescript
// lib/api/server-api-client.ts
export class ServerClient {
  private baseUrl: string;
  private defaultOptions: FetchOptions;
  private cacheEnabled: boolean;

  constructor(baseUrl: string = '', options: FetchOptions = {}) {
    this.baseUrl = baseUrl;
    this.defaultOptions = { ...DEFAULT_CONFIG, ...options };
    this.cacheEnabled = true;
  }
}

// Default configuration
const DEFAULT_CONFIG = {
  timeout: 30000,    // 30 seconds
  retries: 3,        // 3 retry attempts
  retryDelay: 1000,  // 1 second between retries
};
```

### 内置缓存

GET 请求会通过 LRU 驱逐自动缓存：

```typescript
// Cache configuration
const CACHE_SIZE = 100;       // Max cached responses
const DEFAULT_TTL = 300000;   // 5 minutes

// Cache is keyed by URL + body hash
const cacheKey = `${url}${options.body ? `_${JSON.stringify(options.body)}` : ''}`;

// Only GET requests without AbortSignal are cached
if (this.cacheEnabled && isGetRequest && !options.signal) {
  const cached = cacheUtils.get(cacheKey);
  if (cached) return { success: true, data: cached };
}
```

### 重试逻辑

```typescript
// Retry decision: only network errors trigger retries
const shouldRetry =
  attempt < retries &&
  error instanceof Error &&
  (error.name === 'TypeError' || error.message.includes('fetch'));

if (shouldRetry) {
  await new Promise(resolve => setTimeout(resolve, retryDelay));
  return attemptFetch(attempt + 1);
}
```

### 超时处理

每个请求都用 AbortController 包装 fetch：

```typescript
const timeoutController = new AbortController();
const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

// Composes with caller-provided signals
if (fetchOptions.signal) {
  fetchOptions.signal.addEventListener('abort', () => {
    timeoutController.abort(fetchOptions.signal?.reason);
  }, { once: true });
}
```

### 预构建客户端实例

```typescript
// Default client for internal API calls
export const serverClient = new ServerClient();

// Factory for custom clients
export const createApiClient = (baseUrl: string, options?: FetchOptions) => {
  return new ServerClient(baseUrl, options);
};

// External API client (longer timeout, fewer retries)
export const externalClient = new ServerClient('', {
  timeout: 15000,
  retries: 2,
});

// ReCAPTCHA verification client
export const recaptchaClient = {
  async verify(token: string) {
    return serverClient.post('/api/verify-recaptcha', { token });
  },
};
```

## 类型系统

### 受歧视工会的回应

```typescript
// lib/api/types.ts
export type ApiResponse<T = unknown> =
  | { success: true; data: T; total?: number; page?: number; limit?: number }
  | { success: false; error: string };

export type PaginatedResponse<T> =
  | { success: true; data: T[]; meta: { page: number; totalPages: number; total: number; limit: number } }
  | { success: false; error: string };
```

### 类型安全的响应处理

```typescript
import { apiUtils } from '@/lib/api/server-api-client';

const response = await serverClient.get<Item[]>('/api/items');

if (apiUtils.isSuccess(response)) {
  // TypeScript narrows: response.data is Item[]
  console.log(response.data.length);
} else {
  // TypeScript narrows: response.error is string
  console.error(apiUtils.getErrorMessage(response));
}
```

## React 查询集成

### 默认查询配置

```typescript
// lib/api/constants.ts
export const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000,        // 5 minutes
  gcTime: 24 * 60 * 60 * 1000,     // 24 hours
  retry: 1,
  refetchOnWindowFocus: false,
} as const;
```

### 与 React 查询一起使用

```typescript
import { useQuery } from '@tanstack/react-query';
import { fetcherGet, fetcherPaginated } from '@/lib/api/api-client';
import { QUERY_CONFIG } from '@/lib/api/constants';

function useItems(page: number) {
  return useQuery({
    queryKey: ['items', page],
    queryFn: () => fetcherPaginated<Item>('/api/items', { page, limit: 20 }),
    ...QUERY_CONFIG,
  });
}
```

## API 实用函数

```typescript
import { apiUtils } from '@/lib/api/server-api-client';

// Build URL with query parameters
const url = apiUtils.buildUrl('/api/items', { page: 1, search: 'test' });
// Result: "/api/items?page=1&search=test"

// Create query string
const qs = apiUtils.createQueryString({ status: 'published', limit: 20 });
// Result: "status=published&limit=20"

// Clear all cached responses
apiUtils.clearCache();
```

## 文件上传

```typescript
// Using ServerClient
const result = await serverClient.upload<{ url: string }>(
  '/api/upload',
  file,
  { timeout: 60000 }  // Longer timeout for uploads
);

// Using form-encoded data
const result = await serverClient.postForm<{ token: string }>(
  '/api/auth/token',
  { grant_type: 'client_credentials', client_id: 'xxx' }
);
```

## 性能考虑因素

1. **单例确保一个Axios实例**：避免创建多个客户端的连接开销。
2. **服务器端缓存**：减少冗余的API调用。对于突变较多的工作流程禁用。
3. **React Query staleTime**：5 分钟可防止在每个组件安装时重新获取。
4. **24小时的gcTime**：将数据保留在内存中以便在页面之间快速导航。
5. **重试次数为 1**：平衡弹性与面向用户的延迟。

## 故障排除

### 客户端请求失败并返回 401

1. 检查是否在 0 实例上设置了访问令牌。
2. 验证令牌拦截器是否附加了1 标头。
3. 检查令牌是否已过期。

### 服务器端缓存返回陈旧数据

1. 突变后调用2。
2. 对于需要新数据的端点，设置3。
3. 传递 4 绕过特定请求的缓存。

### 外部 API 超时错误

1. 增加客户端配置中的超时时间。
2. 使用有 15 秒超时时间的 5。
3. 检查网络连接和 DNS 解析。

### React 查询不重新获取

1. 验证 6 包含应触发重新获取的所有参数。
2. 检查7 对于您的使用情况是否设置得太高。
3. 突变后使用8。

## 相关文档

- [错误恢复模式](./error-recovery-patterns.md)
- [缓存架构深入探讨](./caching-deep-dive.md)
- [速率限制架构](./rate-limiting-architecture.md)
