---
id: api-client-layer
title: طبقة عميل API
sidebar_label: طبقة عميل API
sidebar_position: 30
---

# طبقة عميل API

يتضمن القالب بنية عميل API مزدوجة: جانب المتصفح `ApiClient` مبني على Axios وجانب الخادم `ServerClient` مبني على `fetch` API الأصلي. يشترك كلاهما في واجهة متسقة لتقديم طلبات HTTP، ولكن تم تحسين كل منهما ليناسب بيئة التشغيل الخاصة به.

## نظرة عامة على الهندسة المعمارية

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

## عميل من جانب المتصفح (`ApiClient`)

يغلف العميل من جانب المتصفح Axios وهو مصمم للاستخدام داخل مكونات React والخطافات. تتم إدارته كوحدة مفردة، لذا يوجد مثيل واحد فقط لكل جلسة متصفح.

### نمط سينجلتون

تمنع فئة `ApiClientSingleton` إنشاء مثيلات Axios متعددة:

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

### استخدام عميل المتصفح

قم باستيراد المفردة المكونة مسبقًا من `api-client.ts`:

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

### تفاصيل فئة ApiClient

تقوم فئة `ApiClient` بتكوين Axios مع:

- **العناوين الافتراضية**: `Content-Type: application/json`، `Accept: application/json`
- **بيانات الاعتماد**: `withCredentials: true` للمصادقة المستندة إلى ملفات تعريف الارتباط
- **معترض الرمز المميز**: يقوم تلقائيًا بإرفاق رأس `Authorization: Bearer`
- **معترض الاستجابة**: يعيد التوجيه إلى صفحة تسجيل الدخول على ردود 401 (المتصفح فقط)
- ** خطأ في التنسيق **: تحويل أخطاء Axios إلى كائن `ApiError` منظم

```ts
// All methods unwrap the ApiResponse envelope and return data directly
public async get<T>(endpoint: string, params?: QueryParams): Promise<T>
public async post<T>(endpoint: string, data?: RequestBody): Promise<T>
public async put<T>(endpoint: string, data?: RequestBody): Promise<T>
public async patch<T>(endpoint: string, data?: RequestBody): Promise<T>
public async delete<T>(endpoint: string): Promise<T>
public async getPaginated<T>(endpoint: string, params?: PaginationParams): Promise<PaginatedResponse<T>>
```

## عميل من جانب الخادم (`ServerClient`)

يستخدم العميل من جانب الخادم واجهة برمجة التطبيقات الأصلية `fetch` وهو مخصص للاستخدام داخل مسارات واجهة برمجة تطبيقات Next.js ومكونات الخادم وإجراءات الخادم. فهو يوفر ميزات مهمة للاتصال من خادم إلى خادم.

### الميزات الرئيسية

|ميزة|الوصف|
|---------|-------------|
|**إعادة المحاولة التلقائية**|إعادة المحاولة عند حدوث أخطاء في الشبكة (قابل للتكوين، الافتراضي 3)|
|**مهلة**|إحباط الطلبات بعد مدة قابلة للتكوين (الافتراضي 30 ثانية)|
|** ذاكرة التخزين المؤقت LRU **|ذاكرة التخزين المؤقت في الذاكرة لطلبات GET (100 إدخال، TTL لمدة 5 دقائق)|
|**دقة عنوان URL**|يحل المسارات النسبية مقابل `PLATFORM_API_URL` لاستدعاءات النظام الأساسي|
|**إصلاح واجهة برمجة التطبيقات الداخلية**|يقوم تلقائيًا بتحويل عناوين URL النسبية إلى مطلقة لمكالمات SSR|
|** دعم بيانات النموذج **|شرائط `Content-Type` رأس `FormData` للتحميلات|

### إنشاء واستخدام عميل الخادم

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

### العملاء الذين تم تكوينهم مسبقًا

تقوم الوحدة بتصدير العديد من مثيلات العميل الجاهزة للاستخدام:

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

### المرافق API

يوفر الكائن `apiUtils` وظائف مساعدة شائعة:

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

## الأنواع المشتركة

يتشارك كلا العميلين في مجموعة مشتركة من الأنواع المحددة في `lib/api/types.ts`:

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

## معالجة أخطاء API للطرق

توفر الوحدة `error-handler.ts` استجابات موحدة للأخطاء لمعالجات مسار واجهة برمجة تطبيقات Next.js:

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

يوفر التعداد `HttpStatus` رموز حالة HTTP القياسية:

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

## ثوابت API

يحدد الملف `constants.ts` التكوين المشترك الذي يستخدمه كلا العميلين:

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

## متى تستخدم أي عميل

|السيناريو|العميل|لماذا|
|----------|--------|-----|
|رد فعل جلب بيانات المكون|`apiClient` (المتصفح)|Singleton، إدارة الرمز المميز، إعادة التوجيه على 401|
|وظائف جلب الاستعلام React|`fetcherGet` / `fetcherPaginated`|أغلفة مريحة لوظائف الاستعلام|
|تحميل بيانات مكون الخادم|`serverClient` (الخادم)|تحليل URL التلقائي، والتخزين المؤقت، وإعادة المحاولة|
|مسار API يستدعي الخدمات الخارجية|`externalClient`|مهلة أطول، لا يوجد افتراض لعنوان URL الأساسي|
|معالجة أخطاء مسار API|`handleApiError` / `withErrorHandling`|استجابات الخطأ الموحدة|

## الملفات ذات الصلة

- `lib/api/api-client.ts` - تصدير فردي لعميل المتصفح ومناسب
- `lib/api/api-client-class.ts` - التنفيذ الكامل للفصل `ApiClient`
- `lib/api/server-api-client.ts` - فئة `ServerClient` من جانب الخادم
- `lib/api/singleton.ts` - مدير نمط Singleton
- `lib/api/types.ts` - تعريفات أنواع TypeScript المشتركة
- `lib/api/constants.ts` - ثوابت API والإعدادات الافتراضية لـ React Query
- `lib/api/error-handler.ts` - الأدوات المساعدة في معالجة أخطاء توجيه واجهة برمجة تطبيقات Next.js
