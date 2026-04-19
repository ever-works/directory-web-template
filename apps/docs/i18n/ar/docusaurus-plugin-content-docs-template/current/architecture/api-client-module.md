---
id: api-client-module
title: وحدة عميل API
sidebar_label: وحدة عميل API
sidebar_position: 51
---

# وحدة عميل API

توفر وحدة عميل واجهة برمجة التطبيقات (`template/lib/api/`) طبقة عميل HTTP شاملة لاتصالات واجهة برمجة التطبيقات من جانب العميل ومن جانب الخادم. وهو يشتمل على عميل يستند إلى Axios لاستخدام المتصفح، وعميل خادم أصلي يستند إلى `fetch` مع التخزين المؤقت وإعادة المحاولة، وعملاء المجال المتخصصين، ومعالجة الأخطاء القياسية.

## نظرة عامة على الهندسة المعمارية

```mermaid
graph TD
    subgraph Client Side
        A[ApiClient Class] -->|Axios| B[Browser HTTP]
        C[apiClient singleton] --> A
        D[fetcherGet / fetcherPaginated] --> C
    end

    subgraph Server Side
        E[ServerClient Class] -->|fetch| F[Node HTTP]
        G[serverClient singleton] --> E
        H[externalClient] --> E
        I[recaptchaClient] --> G
    end

    subgraph Domain Clients
        J[LemonSqueezyClient] --> G
        K[SurveyApiClient] --> C
    end

    subgraph Error Handling
        L[handleApiError] --> M[createApiErrorResponse]
        N[withErrorHandling] --> L
    end

    O[API_CONSTANTS / QUERY_CONFIG] -->|Config| A
    O -->|Config| E
```

## ملفات المصدر

|ملف|الوصف|
|------|-------------|
|`lib/api/types.ts`|تعريفات النوع المشترك لطبقة API|
|`lib/api/constants.ts`|ثوابت API وتكوين الاستعلام|
|`lib/api/api-client-class.ts`|`ApiClient` - عميل المتصفح المستند إلى Axios|
|`lib/api/singleton.ts`|`ApiClientSingleton` المدير|
|`lib/api/api-client.ts`|مثيل العميل المدمج مسبقًا ومساعدي الجلب|
|`lib/api/server-api-client.ts`|`ServerClient` - عميل الخادم القائم على الجلب|
|`lib/api/error-handler.ts`|معالجة أخطاء واجهة برمجة التطبيقات الموحدة|
|`lib/api/lemonsqueezy-client.ts`|عميل الدفع LemonSqueezy|
|`lib/api/survey-api.client.ts`|مسح العميل CRUD|

## تعريفات النوع

### الأنواع الأساسية

```typescript
type ApiEndpoint = string;
type QueryParams = Record<string, string | number | boolean | undefined>;
type RequestBody = Record<string, unknown>;

interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

### أنواع الاستجابة (النقابات التمييزية)

```typescript
type ApiResponse<T = unknown> =
  | { success: true; data: T; total?: number; page?: number; limit?: number; totalPages?: number }
  | { success: false; error: string };

type PaginatedResponse<T> =
  | { success: true; data: T[]; meta: { page: number; totalPages: number; total: number; limit: number } }
  | { success: false; error: string };
```

### تكوين العميل

```typescript
interface ApiClientConfig extends Partial<AxiosRequestConfig> {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  accessToken?: string;
  frontendUrl?: string;
}

interface ApiError {
  message: string;
  status?: number;
  code?: string;
}
```

## جانب العميل: `ApiClient`

تقوم فئة `ApiClient` بتغليف Axios من خلال الحقن التلقائي للرمز ومعالجة أخطاء الاستجابة والاستجابات المكتوبة.

### منشئ

```typescript
const client = new ApiClient({
  baseURL: 'https://api.example.com',
  accessToken: 'bearer-token',
  headers: { 'X-Custom': 'value' },
});
```

### طرق HTTP

تقوم جميع الطرق بفك غلاف `ApiResponse` وإرجاع الحقل `data` مباشرة:

```typescript
// GET with query params
const items = await client.get<Item[]>('/items', { category: 'tools', limit: 10 });

// POST with body
const created = await client.post<Item>('/items', { name: 'New Tool', url: 'https://...' });

// PUT
const updated = await client.put<Item>('/items/123', { name: 'Updated' });

// PATCH
const patched = await client.patch<Item>('/items/123', { status: 'approved' });

// DELETE
await client.delete<void>('/items/123');

// Paginated GET
const page = await client.getPaginated<Item>('/items', { page: 1, limit: 20, search: 'react' });
```

### وصول سينجلتون

```typescript
import { getApiClient } from '@/lib/api/singleton';

const client = getApiClient();                    // Default instance
ApiClientSingleton.resetInstance();                // Reset (for tests)
```

### صادرات الراحة

```typescript
import { apiClient, fetcherGet, fetcherPaginated } from '@/lib/api/api-client';

// Use with React Query / SWR
const data = await fetcherGet<Item[]>('/api/items', { status: 'published' });
const page = await fetcherPaginated<Item>('/api/items', { page: 1, limit: 20 });
```

## جانب الخادم: `ServerClient`

تستخدم فئة `ServerClient` `fetch` الأصلية مع معالجة المهلة، وإعادة المحاولة التلقائية، والتخزين المؤقت لـ LRU، ودقة عنوان URL الخاص بالخادم.

### الميزات الرئيسية

- **التعامل مع المهلة** باستخدام `AbortController` (الافتراضي: 30 ثانية)
- **إعادة المحاولة التلقائية** عند حدوث أخطاء في الشبكة (الإعداد الافتراضي: 3 عمليات إعادة محاولة مع تأخير لمدة ثانية واحدة)
- **ذاكرة التخزين المؤقت LRU في الذاكرة** لطلبات GET (100 إدخال، TTL لمدة 5 دقائق)
- **تحليل عنوان URL للخادم** لمسارات واجهة برمجة التطبيقات الداخلية أثناء SSR
- **دعم FormData** مع المعالجة التلقائية لنوع المحتوى

### المثيلات المعدة مسبقًا

```typescript
import { serverClient, externalClient, createApiClient, recaptchaClient } from '@/lib/api/server-api-client';

// Default server client
const result = await serverClient.get<UserData>('/api/users/me');

// External API client (15s timeout, 2 retries)
const external = await externalClient.get<any>('https://api.third-party.com/data');

// Custom client
const customClient = createApiClient('https://api.service.com', { timeout: 10000 });

// ReCAPTCHA verification
const captcha = await recaptchaClient.verify(token);
```

### طرق HTTP

```typescript
// All methods return ApiResponse<T>
const result = await serverClient.get<T>(endpoint, options?);
const result = await serverClient.post<T>(endpoint, data?, options?);
const result = await serverClient.put<T>(endpoint, data?, options?);
const result = await serverClient.patch<T>(endpoint, data?, options?);
const result = await serverClient.delete<T>(endpoint, options?);

// File upload
const result = await serverClient.upload<T>(endpoint, fileOrFormData, options?);

// URL-encoded form data
const result = await serverClient.postForm<T>(endpoint, { key: 'value' }, options?);
```

### التحكم في ذاكرة التخزين المؤقت

```typescript
serverClient.setCacheEnabled(false);   // Disable caching
serverClient.clearCache();             // Clear all cached responses
apiUtils.clearCache();                 // Same via utility
```

### وظائف المرافق

```typescript
import { apiUtils } from '@/lib/api/server-api-client';

apiUtils.isSuccess(response);                              // Type guard
apiUtils.getErrorMessage(response);                        // Extract error
apiUtils.createQueryString({ page: 1, limit: 20 });       // 'page=1&limit=20'
apiUtils.buildUrl('/api/items', { page: 1, limit: 20 });  // '/api/items?page=1&limit=20'
```

## معالجة الأخطاء

### `HttpStatus` التعداد

```typescript
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

### `handleApiError(error, context?): NextResponse`

يعالج أخطاء توجيه واجهة برمجة التطبيقات (API) من خلال الكشف التلقائي عن رمز الحالة من رسائل الخطأ:

```typescript
import { handleApiError } from '@/lib/api/error-handler';

export async function GET() {
  try {
    const data = await fetchData();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, 'GET /api/items');
  }
}
```

### `withErrorHandling(handler, context?): Promise`

دالة ذات ترتيب أعلى تقوم بتغليف معالج غير متزامن مع معالجة الأخطاء:

```typescript
import { withErrorHandling } from '@/lib/api/error-handler';

export async function GET() {
  return withErrorHandling(async () => {
    const data = await fetchData();
    return NextResponse.json({ success: true, data });
  }, 'GET /api/items');
}
```

## ثوابت API

```typescript
const API_CONSTANTS = {
  HEADERS: { CONTENT_TYPE: 'application/json', ACCEPT: 'application/json' },
  STATUS: { UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404, SERVER_ERROR: 500 },
  DEFAULT_ERROR_MESSAGE: 'An unexpected error occurred',
};

const QUERY_CONFIG = {
  staleTime: 300_000,    // 5 minutes
  gcTime: 86_400_000,    // 1 day
  retry: 1,
  refetchOnWindowFocus: false,
};
```

## عملاء المجال

### LemonSqueezyClient

```typescript
import { lemonsqueezyClient } from '@/lib/api/lemonsqueezy-client';

const checkout = await lemonsqueezyClient.createCheckout({
  variantId: 12345,
  email: 'user@example.com',
  customPrice: 4900,
});
// Returns: { checkoutUrl, email, customPrice, variantId, metadata }

const health = await lemonsqueezyClient.healthCheck();
const validation = lemonsqueezyClient.validateCheckoutParams(params);
```

### SurveyApiClient

```typescript
import { surveyApiClient } from '@/lib/api/survey-api.client';

const surveys = await surveyApiClient.getMany({ type: 'nps', status: 'active' });
const survey = await surveyApiClient.getOne('survey-id');
const created = await surveyApiClient.create({ title: 'Feedback', type: 'nps' });
await surveyApiClient.submitResponse({ surveyId: 'id', answers: [...] });
const responses = await surveyApiClient.getResponses('survey-id', { page: 1 });
```
