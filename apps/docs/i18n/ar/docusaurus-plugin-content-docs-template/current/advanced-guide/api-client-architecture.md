---
id: api-client-architecture
title: بنية عميل API
sidebar_label: عميل واجهة برمجة التطبيقات
sidebar_position: 8
---

# بنية عميل واجهة برمجة التطبيقات

يغطي هذا الدليل نظام عميل API المزدوج: جانب العميل `ApiClient` (مفرد قائم على Axios) وجانب الخادم `ServerClient` (معتمد على الجلب مع التخزين المؤقت وإعادة المحاولة)، بما في ذلك سلامة النوع، ومعالجة الأخطاء، واعتراضات الطلب/الاستجابة.

## نظرة عامة على الهندسة المعمارية

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

## عميل واجهة برمجة التطبيقات من جانب العميل

### نمط سينجلتون

يستخدم `ApiClient` نغمة مفردة صارمة تتم إدارتها بواسطة `ApiClientSingleton` :

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

### الاستخدام

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

### طلب اعتراضات

يقوم العميل تلقائيًا بإرفاق رمز Bearer المميز بكل طلب:

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

### اعتراضات الاستجابة

يعيد التعامل التلقائي 401 التوجيه إلى صفحة تسجيل الدخول:

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

### خطأ في التنسيق

يتم تطبيع كافة الأخطاء إلى شكل ثابت `ApiError` :

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

### الطرق الآمنة للنوع

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

## عميل واجهة برمجة التطبيقات من جانب الخادم

### فئة عميل الخادم

تم تحسين 0 في 1 للاستخدام من جانب الخادم:

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

### التخزين المؤقت المدمج

يتم تخزين طلبات GET مؤقتًا تلقائيًا مع إخلاء LRU:

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

### منطق إعادة المحاولة

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

### التعامل مع المهلة

يتم جلب كل طلب باستخدام AbortController:

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

### مثيلات العميل المعدة مسبقًا

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

## نوع النظام

### ردود النقابات التمييزية

```typescript
// lib/api/types.ts
export type ApiResponse<T = unknown> =
  | { success: true; data: T; total?: number; page?: number; limit?: number }
  | { success: false; error: string };

export type PaginatedResponse<T> =
  | { success: true; data: T[]; meta: { page: number; totalPages: number; total: number; limit: number } }
  | { success: false; error: string };
```

### التعامل مع الاستجابة الآمنة

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

## تكامل الاستعلام التفاعلي

### تكوين الاستعلام الافتراضي

```typescript
// lib/api/constants.ts
export const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000,        // 5 minutes
  gcTime: 24 * 60 * 60 * 1000,     // 24 hours
  retry: 1,
  refetchOnWindowFocus: false,
} as const;
```

### الاستخدام مع React Query

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

## وظائف الأداة المساعدة لواجهة برمجة التطبيقات

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

## تحميل الملف

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

## اعتبارات الأداء

1. **يضمن Singleton وجود مثيل Axios واحد**: يتجنب حمل الاتصال الناتج عن إنشاء عملاء متعددين.
2. **التخزين المؤقت على جانب الخادم**: يقلل من استدعاءات واجهة برمجة التطبيقات المتكررة. تعطيل لسير العمل الثقيل الطفرة.
3. **وقت استعلام الرد القديم**: 5 دقائق تمنع إعادة الجلب على كل مكون.
4. ** gcTime لمدة 24 ساعة **: يحتفظ بالبيانات في الذاكرة للتنقل السريع بين الصفحات.
5. **عدد مرات إعادة المحاولة 1**: يوازن بين المرونة وزمن الاستجابة الذي يواجهه المستخدم.

## استكشاف الأخطاء وإصلاحها

### فشل الطلبات من جانب العميل مع 401

1. تأكد من تعيين رمز الوصول على المثيل 0.
2. تأكد من أن جهاز اعتراض الرمز المميز يقوم بإرفاق الرأس "1".
3. تأكد من عدم انتهاء صلاحية الرمز المميز.

### تقوم ذاكرة التخزين المؤقت من جانب الخادم بإرجاع البيانات القديمة

1. اتصل بالرقم 2 بعد الطفرات.
2. قم بتعيين `setCacheEnabled(false)` لنقاط النهاية التي تتطلب بيانات جديدة.
3. مرر علامة "4" لتجاوز ذاكرة التخزين المؤقت لطلبات محددة.

### أخطاء المهلة على واجهات برمجة التطبيقات الخارجية

1. قم بزيادة المهلة في تكوين العميل.
2. استخدم `externalClient` الذي لديه مهلة 15 ثانية.
3. تحقق من اتصال الشبكة ودقة DNS.

### استعلام رد الفعل لا يتم إعادة جلبه

1. تحقق من أن 6 يتضمن جميع المعلمات التي يجب أن تؤدي إلى عمليات إعادة الجلب.
2. تأكد من عدم تعيين `staleTime` على مستوى مرتفع للغاية بالنسبة لحالة الاستخدام الخاصة بك.
3. استخدم `queryClient.invalidateQueries` بعد الطفرات.

## الوثائق ذات الصلة

- [أنماط استرداد الأخطاء](./error-recovery-patterns.md)
- [التعمق في بنية التخزين المؤقت](./caching-deep-dive.md)
- [بنية تحديد المعدل](./rate-limiting-architecture.md)
