---
id: api-client-layer
title: API客户端层
sidebar_label: API客户端层
sidebar_position: 30
---

# API客户端层

该模板包括双 API 客户端架构：基于 Axios 构建的浏览器端 `ApiClient` 和基于原生 `fetch` API 构建的服务器端 `ServerClient`。两者共享用于发出 HTTP 请求的一致接口，但都针对其运行时环境进行了优化。

## 架构概述

```
lib/api/
  api-client.ts          # Browser-side convenience exports and singleton access
  api-client-class.ts    # ApiClient class (Axios-based, for React components)
  server-api-client.ts   # ServerClient class (fetch-based, for SSR / API routes)
  singleton.ts           # Singleton manager for the browser ApiClient
  types.ts               # Shared TypeScript types for both clients
  constants.ts           # API constants (headers, status codes, query config)
  error-handler.ts       # Standardized API error responses for Next.js routes
```

## 浏览器端客户端 (`ApiClient`)

浏览器端客户端包装了 Axios，设计用于在 React 组件和钩子中使用。它作为单例进行管理，因此每个浏览器会话仅存在一个实例。

### 单例模式

`ApiClientSingleton` 类阻止创建多个 Axios 实例：

```ts
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

### 使用浏览器客户端

从 `api-client.ts` 导入预配置的单例：

```ts
import { apiClient, fetcherGet, fetcherPaginated } from '@/lib/api/api-client';

// Simple GET request
const user = await fetcherGet<User>('/api/users/me');

// Paginated GET request
const items = await fetcherPaginated<Item>('/api/items', {
  page: 1,
  limit: 10,
  search: 'react',
  sortBy: 'name',
  sortOrder: 'asc',
});

// Direct client usage for POST/PUT/PATCH/DELETE
const created = await apiClient.post<Item>('/api/items', { name: 'New Item' });
const updated = await apiClient.put<Item>('/api/items/123', { name: 'Updated' });
const patched = await apiClient.patch<Item>('/api/items/123', { status: 'active' });
await apiClient.delete('/api/items/123');
```

### ApiClient 类详细信息

`ApiClient` 类通过以下方式配置 Axios：

- **默认标头**：`Content-Type: application/json`、`Accept: application/json`
- **凭证**：`withCredentials: true` 用于基于 cookie 的身份验证
- **令牌拦截器**：自动附加`Authorization: Bearer`标头
- **响应拦截器**：重定向到 401 响应的登录页面（仅限浏览器）
- **错误格式化**：将Axios错误转换为结构化的`ApiError`对象

```ts
// All methods unwrap the ApiResponse envelope and return data directly
public async get<T>(endpoint: string, params?: QueryParams): Promise<T>
public async post<T>(endpoint: string, data?: RequestBody): Promise<T>
public async put<T>(endpoint: string, data?: RequestBody): Promise<T>
public async patch<T>(endpoint: string, data?: RequestBody): Promise<T>
public async delete<T>(endpoint: string): Promise<T>
public async getPaginated<T>(endpoint: string, params?: PaginationParams): Promise<PaginatedResponse<T>>
```

## 服务器端客户端 (`ServerClient`)

服务器端客户端使用本机 `fetch` API，旨在在 Next.js API 路由、服务器组件和服务器操作中使用。它提供了对于服务器到服务器通信至关重要的功能。

### 主要特点

|特点|描述|
|---------|-------------|
|**自动重试**|网络错误重试（可配置，默认 3）|
|**超时**|在可配置的持续时间（默认 30 秒）后中止请求|
|**LRU 缓存**|用于 GET 请求的内存缓存（100 个条目，5 分钟 TTL）|
|**网址解析**|解析针对`PLATFORM_API_URL`的平台调用的相对路径|
|**内部API修复**|自动将相对 URL 转换为绝对 URL 以进行 SSR 调用|
|**表单数据支持**|删除 `FormData` 上传的 `Content-Type` 标头|

### 创建和使用服务器客户端

```ts
import { serverClient, createApiClient, externalClient } from '@/lib/api/server-api-client';

// Default server client
const result = await serverClient.get<User>('/api/users/me');
if (result.success) {
  console.log(result.data);
}

// Custom client for a specific service
const paymentClient = createApiClient('https://api.stripe.com/v1', {
  timeout: 15000,
  token: process.env.STRIPE_SECRET_KEY,
});

// File upload
const uploadResult = await serverClient.upload<UploadResponse>(
  '/api/upload',
  myFile
);

// URL-encoded form data
const formResult = await serverClient.postForm<TokenResponse>(
  '/oauth/token',
  { grant_type: 'client_credentials', client_id: '...' }
);
```

### 预配置客户端

该模块导出几个即用型客户端实例：

```ts
// Default client - general purpose
export const serverClient = new ServerClient();

// External API client - longer timeout, fewer retries
export const externalClient = new ServerClient('', {
  timeout: 15000,
  retries: 2,
});

// ReCAPTCHA verification helper
export const recaptchaClient = {
  async verify(token: string) {
    return serverClient.post('/api/verify-recaptcha', { token });
  }
};
```

### API实用程序

`apiUtils` 对象提供常见的辅助函数：

```ts
import { apiUtils } from '@/lib/api/server-api-client';

// Type-safe success check
const response = await serverClient.get<Item>('/api/items/1');
if (apiUtils.isSuccess(response)) {
  console.log(response.data); // TypeScript knows data exists
}

// Build URL with query parameters
const url = apiUtils.buildUrl('/api/items', { page: 1, limit: 10 });
// => "/api/items?page=1&limit=10"

// Clear the response cache
apiUtils.clearCache();
```

## 共享类型

两个客户端共享 `lib/api/types.ts` 中定义的一组通用类型：

```ts
// Request types
type ApiEndpoint = string;
type QueryParams = Record<string, string | number | boolean | undefined>;
type RequestBody = Record<string, unknown>;

// Pagination
interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Response types (discriminated union)
type ApiResponse<T> =
  | { success: true; data: T; total?: number; page?: number }
  | { success: false; error: string };

type PaginatedResponse<T> =
  | { success: true; data: T[]; meta: { page: number; totalPages: number; total: number; limit: number } }
  | { success: false; error: string };

// Error type
interface ApiError {
  message: string;
  status?: number;
  code?: string;
}
```

## 路由的 API 错误处理

`error-handler.ts` 模块为 Next.js API 路由处理程序提供标准化错误响应：

```ts
import { handleApiError, withErrorHandling, HttpStatus } from '@/lib/api/error-handler';

// Wrap an entire handler
export async function GET() {
  return withErrorHandling(async () => {
    const data = await fetchData();
    return NextResponse.json({ success: true, data });
  }, 'GET /api/items');
}

// Or catch errors manually
export async function POST(req: Request) {
  try {
    const body = await req.json();
    // ... process
  } catch (error) {
    return handleApiError(error, 'POST /api/items');
  }
}
```

`HttpStatus` 枚举提供标准 HTTP 状态代码：

```ts
enum HttpStatus {
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}
```

## API常量

`constants.ts` 文件定义了两个客户端使用的共享配置：

```ts
export const API_CONSTANTS = {
  HEADERS: {
    CONTENT_TYPE: 'application/json',
    ACCEPT: 'application/json',
    AUTHORIZATION: 'Authorization',
  },
  STATUS: {
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    SERVER_ERROR: 500,
  },
  DEFAULT_ERROR_MESSAGE: 'An unexpected error occurred',
} as const;

export const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000,   // 5 minutes
  gcTime: 24 * 60 * 60 * 1000, // 1 day
  retry: 1,
  refetchOnWindowFocus: false,
} as const;
```

## 何时使用哪个客户端

|场景|客户|为什么|
|----------|--------|-----|
|React组件数据获取|`apiClient`（浏览器）|单例、令牌管理、401 重定向|
|React 查询获取器函数|`fetcherGet` / `fetcherPaginated`|方便的查询函数包装器|
|服务器组件数据加载|`serverClient`（服务器）|自动 URL 解析、缓存、重试|
|API路由调用外部服务|`externalClient`|更长的超时时间，无基本 URL 假设|
|API路由错误处理|`handleApiError` / `withErrorHandling`|标准化错误响应|

## 相关文件

- `lib/api/api-client.ts` - 浏览器客户端单例和便捷导出
- `lib/api/api-client-class.ts` - 完整`ApiClient` 类实现
- `lib/api/server-api-client.ts` - 服务器端`ServerClient` 类
- `lib/api/singleton.ts` - 单例模式管理器
- `lib/api/types.ts` - 共享 TypeScript 类型定义
- `lib/api/constants.ts` - API 常量和 React 查询默认值
- `lib/api/error-handler.ts` - Next.js API 路由错误处理实用程序
