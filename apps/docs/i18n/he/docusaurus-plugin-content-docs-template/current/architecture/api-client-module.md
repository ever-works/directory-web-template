---
id: api-client-module
title: מודול לקוח API
sidebar_label: מודול לקוח API
sidebar_position: 51
---

# מודול לקוח API

מודול לקוח ה-API (`template/lib/api/`) מספק שכבת לקוח HTTP מקיפה עבור תקשורת API בצד הלקוח והן בצד השרת. הוא כולל לקוח מבוסס Axios לשימוש בדפדפן, לקוח שרת מקורי `fetch` עם שמירה במטמון וניסיונות חוזרים, לקוחות תחום מיוחדים וטיפול בשגיאות סטנדרטי.

## סקירה כללית של אדריכלות

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

## קבצי מקור

|קובץ|תיאור|
|------|-------------|
|`lib/api/types.ts`|הגדרות סוגים משותפות עבור שכבת API|
|`lib/api/constants.ts`|קבועי API ותצורת שאילתה|
|`lib/api/api-client-class.ts`|`ApiClient` -- לקוח מבוסס Axios לדפדפן|
|`lib/api/singleton.ts`|`ApiClientSingleton` מנהל|
|`lib/api/api-client.ts`|מופע לקוח ועזרי מאחזר מובנים מראש|
|`lib/api/server-api-client.ts`|`ServerClient` -- לקוח שרת מבוסס אחזור|
|`lib/api/error-handler.ts`|טיפול בשגיאות API סטנדרטי|
|`lib/api/lemonsqueezy-client.ts`|לקוח תשלום LemonSqueezy|
|`lib/api/survey-api.client.ts`|לקוח סקר CRUD|

## סוג הגדרות

### סוגי ליבה

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

### סוגי תגובות (איגודים מופלים)

```typescript
type ApiResponse<T = unknown> =
  | { success: true; data: T; total?: number; page?: number; limit?: number; totalPages?: number }
  | { success: false; error: string };

type PaginatedResponse<T> =
  | { success: true; data: T[]; meta: { page: number; totalPages: number; total: number; limit: number } }
  | { success: false; error: string };
```

### תצורת לקוח

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

## צד לקוח: `ApiClient`

הכיתה `ApiClient` עוטפת את Axios עם הזרקת אסימונים אוטומטית, טיפול בשגיאות תגובה ותגובות מוקלדות.

### קונסטרוקטור

```typescript
const client = new ApiClient({
  baseURL: 'https://api.example.com',
  accessToken: 'bearer-token',
  headers: { 'X-Custom': 'value' },
});
```

### שיטות HTTP

כל השיטות פותחות את המעטפה `ApiResponse` ומחזירות ישירות את השדה `data`:

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

### סינגלטון גישה

```typescript
import { getApiClient } from '@/lib/api/singleton';

const client = getApiClient();                    // Default instance
ApiClientSingleton.resetInstance();                // Reset (for tests)
```

### ייצוא נוחות

```typescript
import { apiClient, fetcherGet, fetcherPaginated } from '@/lib/api/api-client';

// Use with React Query / SWR
const data = await fetcherGet<Item[]>('/api/items', { status: 'published' });
const page = await fetcherPaginated<Item>('/api/items', { page: 1, limit: 20 });
```

## צד שרת: `ServerClient`

המחלקה `ServerClient` משתמשת ב-`fetch` עם טיפול בזמן קצוב, ניסיונות חוזרים אוטומטיים, מטמון LRU ורזולוציית כתובת URL ספציפית לשרת.

### תכונות מפתח

- **טיפול בזמן קצוב** עם `AbortController` (ברירת מחדל: 30 שניות)
- **נסיונות חוזרים אוטומטיים** על שגיאות רשת (ברירת מחדל: 3 נסיונות חוזרים עם השהיה של 1 שניה)
- **מטמון LRU בזיכרון** עבור בקשות GET (100 כניסות, 5 דקות TTL)
- **רזולוציית כתובת URL של שרת** עבור מסלולי API פנימיים במהלך SSR
- **תמיכה ב-FormData** עם טיפול אוטומטי ב-Content-Type

### מופעים מובנים מראש

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

### שיטות HTTP

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

### בקרת מטמון

```typescript
serverClient.setCacheEnabled(false);   // Disable caching
serverClient.clearCache();             // Clear all cached responses
apiUtils.clearCache();                 // Same via utility
```

### פונקציות שירות

```typescript
import { apiUtils } from '@/lib/api/server-api-client';

apiUtils.isSuccess(response);                              // Type guard
apiUtils.getErrorMessage(response);                        // Extract error
apiUtils.createQueryString({ page: 1, limit: 20 });       // 'page=1&limit=20'
apiUtils.buildUrl('/api/items', { page: 1, limit: 20 });  // '/api/items?page=1&limit=20'
```

## טיפול בשגיאות

### `HttpStatus` Enum

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

מטפל בשגיאות נתיב API עם זיהוי קוד סטטוס אוטומטי מהודעות שגיאה:

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

פונקציה מסדר גבוה העוטפת מטפל אסינכרון עם טיפול בשגיאות:

```typescript
import { withErrorHandling } from '@/lib/api/error-handler';

export async function GET() {
  return withErrorHandling(async () => {
    const data = await fetchData();
    return NextResponse.json({ success: true, data });
  }, 'GET /api/items');
}
```

## קבועי API

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

## לקוחות דומיין

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
