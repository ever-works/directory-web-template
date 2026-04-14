---
id: api-layer
title: "بنية طبقة API"
sidebar_label: "طبقة واجهة برمجة التطبيقات"
sidebar_position: 27
---

# بنية طبقة API

يوفر القالب طبقة واجهة برمجة تطبيقات منظمة مع تطبيقين متميزين للعميل: فئة `ApiClient` من جانب المتصفح مدعومة من Axios، وفئة من جانب الخادم `ServerClient` باستخدام واجهة برمجة التطبيقات `fetch` الأصلية. يشترك كلاهما في أنواع الاستجابة المتسقة ومعالجة الأخطاء واستراتيجيات التخزين المؤقت.

## بنية العميل

```
lib/api/
  api-client-class.ts   -- Browser-side Axios client
  api-client.ts          -- Singleton export for browser client
  singleton.ts           -- Singleton manager
  server-api-client.ts   -- Server-side fetch client
  error-handler.ts       -- Standardized API route error handling
  types.ts               -- Shared TypeScript types
  constants.ts           -- Configuration constants
```

## أنواع الاستجابة

تستخدم جميع اتصالات API أنواع الاستجابة الموحدة المحددة في `lib/api/types.ts`:

```tsx
// lib/api/types.ts
export type ApiResponse<T = unknown> =
  | { success: true; data: T; total?: number; page?: number }
  | { success: false; error: string };

export type PaginatedResponse<T> =
  | {
      success: true;
      data: T[];
      meta: { page: number; totalPages: number; total: number; limit: number };
    }
  | { success: false; error: string };

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

## عميل من جانب المتصفح (ApiClient)

تقوم فئة `ApiClient` في `lib/api/api-client-class.ts` بتغليف Axios باستخدام أدوات الاعتراض وإدارة الرمز المميز وإلغاء تغليف الاستجابة:

```tsx
// lib/api/api-client-class.ts
export class ApiClient {
  private readonly client: AxiosInstance;
  private accessToken?: string;

  constructor(config: ApiClientConfig = {}) {
    this.client = axios.create({
      baseURL: config.baseURL,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${config.accessToken}`,
      },
      withCredentials: true,
    });
    this.setupInterceptors();
    this.tokenInterceptor();
  }

  // Automatic redirect on 401
  private handleResponseError = async (error) => {
    if (responseError.response?.status === 401) {
      window.location.href = env.AUTH_ENDPOINT_LOGIN;
    }
    throw this.formatError(error);
  };

  // All methods unwrap the ApiResponse envelope
  public async get<T>(endpoint, params?, config?): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(endpoint, {
      params, ...config
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Request failed');
    }
    return response.data.data;
  }

  // post, put, patch, delete follow the same pattern
  // getPaginated returns the full PaginatedResponse
}
```

### نمط سينجلتون

تتم إدارة العميل كعميل فردي عبر `lib/api/singleton.ts`:

```tsx
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
```

يستورد المستهلكون من `lib/api/api-client.ts`:

```tsx
import { apiClient, fetcherGet, fetcherPaginated } from '@/lib/api/api-client';
```

## عميل من جانب الخادم (ServerClient)

يستخدم `ServerClient` في `lib/api/server-api-client.ts` `fetch` الأصلي مع عمليات إعادة المحاولة التلقائية ومعالجة المهلة وذاكرة التخزين المؤقت LRU في الذاكرة.

```tsx
// lib/api/server-api-client.ts
export class ServerClient {
  async get<T>(endpoint, options?): Promise<ApiResponse<T>> { ... }
  async post<T>(endpoint, data?, options?): Promise<ApiResponse<T>> { ... }
  async put<T>(endpoint, data?, options?): Promise<ApiResponse<T>> { ... }
  async patch<T>(endpoint, data?, options?): Promise<ApiResponse<T>> { ... }
  async delete<T>(endpoint, options?): Promise<ApiResponse<T>> { ... }
  async upload<T>(endpoint, file, options?): Promise<ApiResponse<T>> { ... }
  async postForm<T>(endpoint, data, options?): Promise<ApiResponse<T>> { ... }
}
```

### إعادة المحاولة والمهلة

```tsx
const DEFAULT_CONFIG = {
  timeout: 30000,    // 30 seconds
  retries: 3,        // up to 3 retry attempts
  retryDelay: 1000,  // 1 second initial delay
};
```

يتم تشغيل عمليات إعادة المحاولة فقط عند حدوث أخطاء في الشبكة (وليس أخطاء HTTP). تستخدم كل محاولة `AbortController` لفرض المهلة.

### المدمج في التخزين المؤقت للطلب

يتم تخزين طلبات GET مؤقتًا تلقائيًا في خريطة LRU في الذاكرة (100 إدخال، TTL لمدة 5 دقائق):

```tsx
const CACHE_SIZE = 100;
const requestCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Cache is checked before every GET request
if (this.cacheEnabled && isGetRequest) {
  const cached = cacheUtils.get(cacheKey);
  if (cached) return { success: true, data: cached };
}
```

### المثيلات التي تم تكوينها مسبقًا

تقوم الوحدة بتصدير العديد من العملاء الذين تم تكوينهم مسبقًا:

```tsx
// Default client
export const serverClient = new ServerClient();

// ReCAPTCHA verification shortcut
export const recaptchaClient = {
  async verify(token: string) {
    return serverClient.post('/api/verify-recaptcha', { token });
  },
};

// External API client (longer timeout)
export const externalClient = new ServerClient('', {
  timeout: 15000,
  retries: 2,
});
```

## معالجة أخطاء توجيه واجهة برمجة التطبيقات (API).

تستخدم معالجات مسار API معالج الأخطاء القياسي من `lib/api/error-handler.ts`:

```tsx
// lib/api/error-handler.ts
export enum HttpStatus {
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_SERVER_ERROR = 500,
}

export function handleApiError(error: unknown, context = 'API') {
  // Logs error, determines status code, sanitizes in production
  return createApiErrorResponse(message, status, code);
}

// Convenience wrapper for route handlers
export function withErrorHandling<T>(
  handler: () => Promise<T>,
  context: string = 'API'
) {
  return handler().catch((error) => handleApiError(error, context));
}
```

### منظمة طريق API

توجد مسارات واجهة برمجة التطبيقات ضمن `app/api/` ويتم تنظيمها حسب المجال:

```
app/api/
  admin/          -- Admin CRUD endpoints
  auth/           -- Authentication endpoints
  categories/     -- Category management
  favorites/      -- User favorites
  items/          -- Item CRUD and search
  payment/        -- Payment processing
  verify-recaptcha/ -- reCAPTCHA verification
  health/         -- Health check endpoint
  ...
```

## وظائف المرافق

يوفر الكائن `apiUtils` مساعدين للعمل مع استجابات API:

```tsx
export const apiUtils = {
  isSuccess: <T>(response: ApiResponse<T>): boolean => {
    return response.success && response.data !== undefined;
  },
  getErrorMessage: (response: ApiResponse): string => {
    return response.error || response.message || 'Unknown error';
  },
  createQueryString: (params: Record<string, any>): string => { ... },
  buildUrl: (baseUrl: string, params?: Record<string, any>): string => { ... },
  clearCache: (): void => { cacheUtils.clear(); },
};
```

## الوسيطة إذن

تستخدم مسارات API التي تتطلب أذونات محددة الأداة المساعدة للتحقق من الأذونات من `lib/middleware/permission-check.ts`:

```tsx
// lib/middleware/permission-check.ts
export function hasPermission(
  userPermissions: UserPermissions,
  permission: Permission
): boolean {
  return userPermissions.permissions.includes(permission);
}

export function hasAnyPermission(
  userPermissions: UserPermissions,
  permissions: Permission[]
): boolean {
  return permissions.some((p) => hasPermission(userPermissions, p));
}
```

## ثوابت التكوين

يتم مركزية إعدادات الاستعلام وذاكرة التخزين المؤقت الافتراضية في `lib/api/constants.ts`:

```tsx
// lib/api/constants.ts
export const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000,   // 5 minutes
  gcTime: 24 * 60 * 60 * 1000, // 1 day
  retry: 1,
  refetchOnWindowFocus: false,
};
```

## مرجع الملف

|ملف|الغرض|
|------|---------|
|`lib/api/api-client-class.ts`|عميل Axios من جانب المتصفح مع أجهزة اعتراضية|
|`lib/api/api-client.ts`|تصدير Singleton وجلبات الراحة|
|`lib/api/singleton.ts`|مدير نمط سينجلتون|
|`lib/api/server-api-client.ts`|عميل جلب من جانب الخادم مع التخزين المؤقت وإعادة المحاولة|
|`lib/api/error-handler.ts`|استجابات خطأ API الموحدة|
|`lib/api/types.ts`|أنواع الطلبات/الاستجابة المشتركة لـ TypeScript|
|`lib/api/constants.ts`|ثوابت التكوين الافتراضية|
|`lib/middleware/permission-check.ts`|التحقق من الإذن لمسارات API|
