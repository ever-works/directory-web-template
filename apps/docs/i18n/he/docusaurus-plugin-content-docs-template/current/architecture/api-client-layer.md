---
id: api-client-layer
title: שכבת לקוח API
sidebar_label: שכבת לקוח API
sidebar_position: 30
---

# שכבת לקוח API

התבנית כוללת ארכיטקטורת לקוח API כפולה: צד דפדפן `ApiClient` בנוי על Axios וצד שרת `ServerClient` בנוי על ה-API המקורי `fetch`. שניהם חולקים ממשק עקבי לביצוע בקשות HTTP, אך כל אחת מהן מותאמת לסביבת זמן הריצה שלה.

## סקירה כללית של אדריכלות

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

## לקוח בצד הדפדפן (`ApiClient`)

הלקוח בצד הדפדפן עוטף את Axios ומיועד לשימוש בתוך רכיבי React והוקס. הוא מנוהל כיחיד כך שרק מופע אחד קיים בכל הפעלת דפדפן.

### תבנית סינגלטון

המחלקה `ApiClientSingleton` מונעת יצירת מופעי Axios מרובים:

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

### שימוש בלקוח הדפדפן

ייבא את הסינגלטון המוגדר מראש מ-`api-client.ts`:

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

### פרטי מחלקה של ApiClient

המחלקה `ApiClient` מגדירה את Axios עם:

- **כותרות ברירת מחדל**: `Content-Type: application/json`, `Accept: application/json`
- **אישורים**: `withCredentials: true` עבור אימות מבוסס קובצי Cookie
- **מיירט אסימון**: מצרף אוטומטית את הכותרת `Authorization: Bearer`
- **מיירט תגובה**: מפנה לדף ההתחברות בתגובות 401 (דפדפן בלבד)
- **עיצוב שגיאה**: ממירה שגיאות Axios לאובייקט `ApiError` מובנה

```ts
// All methods unwrap the ApiResponse envelope and return data directly
public async get<T>(endpoint: string, params?: QueryParams): Promise<T>
public async post<T>(endpoint: string, data?: RequestBody): Promise<T>
public async put<T>(endpoint: string, data?: RequestBody): Promise<T>
public async patch<T>(endpoint: string, data?: RequestBody): Promise<T>
public async delete<T>(endpoint: string): Promise<T>
public async getPaginated<T>(endpoint: string, params?: PaginationParams): Promise<PaginatedResponse<T>>
```

## לקוח בצד השרת (`ServerClient`)

הלקוח בצד השרת משתמש בממשק ה-API המקורי `fetch` ומיועד לשימוש בתוך מסלולי API של Next.js, רכיבי שרת ופעולות שרת. הוא מספק תכונות קריטיות לתקשורת שרת לשרת.

### תכונות מפתח

|תכונה|תיאור|
|---------|-------------|
|**נסיונות חוזרים אוטומטיים**|ניסיון חוזר על שגיאות רשת (ניתן להגדרה, ברירת מחדל 3)|
|**פסק זמן**|מבטל בקשות לאחר משך שניתן להגדרה (ברירת מחדל 30 שניות)|
|**מטמון LRU**|מטמון בזיכרון עבור בקשות GET (100 כניסות, 5 דקות TTL)|
|**רזולוציית כתובת האתר**|פותר נתיבים יחסיים נגד `PLATFORM_API_URL` עבור שיחות פלטפורמה|
|**תיקון API פנימי**|ממיר באופן אוטומטי כתובות URL יחסיות לאבסולוטיות עבור קריאות SSR|
|**תמיכה ב-FormData**|מסיר את הכותרת `Content-Type` עבור העלאות `FormData`|

### יצירה ושימוש בלקוח השרת

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

### לקוחות מוגדרים מראש

המודול מייצא מספר מופעי לקוח מוכנים לשימוש:

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

### תוכניות שירות API

האובייקט `apiUtils` מספק פונקציות עוזר נפוצות:

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

## סוגים משותפים

שני הלקוחות חולקים קבוצה משותפת של סוגים המוגדרים ב-`lib/api/types.ts`:

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

## טיפול בשגיאות API עבור מסלולים

המודול `error-handler.ts` מספק תגובות שגיאה סטנדרטיות עבור מטפלי מסלול של Next.js API:

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

ה-`HttpStatus` enum מספק קודי מצב HTTP סטנדרטיים:

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

## קבועי API

הקובץ `constants.ts` מגדיר תצורה משותפת המשמשת את שני הלקוחות:

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

## מתי להשתמש באיזה לקוח

|תרחיש|לקוח|למה|
|----------|--------|-----|
|איסוף נתוני רכיב תגובה|`apiClient` (דפדפן)|סינגלטון, ניהול אסימונים, הפניה מחדש ב-401|
|פונקציות משלף שאילתות תגובה|`fetcherGet` / `fetcherPaginated`|עטיפות נוחות עבור פונקציות שאילתה|
|טעינת נתוני רכיבי שרת|`serverClient` (שרת)|רזולוציית כתובת URL אוטומטית, שמירה במטמון, ניסיונות חוזרים|
|נתיב API קורא לשירותים חיצוניים|`externalClient`|פסק זמן ארוך יותר, אין הנחת כתובת אתר בסיסית|
|טיפול בשגיאות בנתיב API|`handleApiError` / `withErrorHandling`|תגובות שגיאה סטנדרטיות|

## קבצים קשורים

- `lib/api/api-client.ts` - יחידת לקוח דפדפן ויצוא נוחות
- `lib/api/api-client-class.ts` - יישום מלא של `ApiClient` בכיתה
- `lib/api/server-api-client.ts` - מחלקה בצד השרת `ServerClient`
- `lib/api/singleton.ts` - מנהל דפוס יחיד
- `lib/api/types.ts` - הגדרות סוג TypeScript משותפות
- `lib/api/constants.ts` - קבועי API וברירות מחדל של React Query
- `lib/api/error-handler.ts` - כלי עזר לטיפול בשגיאות בנתיב API של Next.js
