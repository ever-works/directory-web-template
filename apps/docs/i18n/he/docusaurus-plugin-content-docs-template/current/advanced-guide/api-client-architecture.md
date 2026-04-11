---
id: api-client-architecture
title: ארכיטקטורת לקוח API
sidebar_label: לקוח API
sidebar_position: 8
---

# ארכיטקטורת לקוח API

מדריך זה מכסה את מערכת לקוח ה-API הכפולה: צד הלקוח `ApiClient` (סינגלטון מבוסס Axios) וצד השרת `ServerClient` (מבוסס אחזור עם מטמון וניסיונות חוזרים), כולל בטיחות סוג, טיפול בשגיאות ויירטי בקשות/תגובה.

## סקירה כללית של אדריכלות

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

## לקוח API בצד הלקוח

### דפוס יחיד

ה- `ApiClient` משתמש בסינגלטון קפדני המנוהל על ידי `ApiClientSingleton` :

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

### שימוש

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

### בקש מיירטים

הלקוח מצרף אוטומטית את אסימון הנושא לכל בקשה:

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

### מיירטי תגובה

טיפול אוטומטי בהפניות 401 לדף הכניסה:

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

### שגיאה בעיצוב

כל השגיאות מנורמלות לצורה עקבית של `ApiError` :

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

### שיטות בטוחות לפי סוג

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

## לקוח API בצד השרת

### ServerClient Class

ה- `ServerClient` ב- `lib/api/server-api-client.ts` מותאם לשימוש בצד השרת:

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

### מטמון מובנה

בקשות GET נשמרות אוטומטית במטמון עם פינוי LRU:

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

### נסה שוב לוגיקה

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

### טיפול בפסק זמן

כל בקשה עוטפת אחזור עם AbortController:

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

### מופעי לקוח מובנים מראש

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

## הקלד מערכת

### תגובות איגוד מופלות

```typescript
// lib/api/types.ts
export type ApiResponse<T = unknown> =
  | { success: true; data: T; total?: number; page?: number; limit?: number }
  | { success: false; error: string };

export type PaginatedResponse<T> =
  | { success: true; data: T[]; meta: { page: number; totalPages: number; total: number; limit: number } }
  | { success: false; error: string };
```

### טיפול בתגובות מסוג בטוח

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

## שילוב שאילתות תגובה

### תצורת שאילתה ברירת מחדל

```typescript
// lib/api/constants.ts
export const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000,        // 5 minutes
  gcTime: 24 * 60 * 60 * 1000,     // 24 hours
  retry: 1,
  refetchOnWindowFocus: false,
} as const;
```

### שימוש עם React Query

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

## פונקציות כלי השירות של API

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

## העלאת קובץ

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

## שיקולי ביצועים

1. **Singleton מבטיח מופע אחד של Axios**: מונע תקורה של חיבור מיצירת מספר לקוחות.
2. **מטמון בצד השרת**: מפחית קריאות API מיותרות. השבת עבור זרימות עבודה עתירות מוטציות.
3. **React Query staleTime**: 5 דקות מונעות שליפה חוזרת בכל הרכבה של רכיב.
4. **gcTime של 24 שעות**: שומר נתונים בזיכרון לניווט מהיר בין דפים.
5. **ספירת נסיונות חוזרת של 1**: מאזנת גמישות עם זמן אחזור מול המשתמש.

## פתרון בעיות

### בקשות בצד הלקוח נכשלות עם 401

1. בדוק שאסימון הגישה מוגדר במופע `ApiClient` .
2. ודא שהמיירט האסימון מחבר את הכותרת `Authorization` .
3. בדקו שתוקף האסימון לא פג.

### מטמון בצד השרת מחזיר נתונים מיושנים

1. התקשר ל- `serverClient.clearCache()` לאחר מוטציות.
2. הגדר את `setCacheEnabled(false)` עבור נקודות קצה הדורשות נתונים טריים.
3. העבר `AbortSignal` כדי לעקוף את המטמון עבור בקשות ספציפיות.

### שגיאות זמן קצוב בממשקי API חיצוניים

1. הגדל את הזמן הקצוב בתצורת הלקוח.
2. השתמש ב- `externalClient` בעל פסק זמן של 15 שניות.
3. בדוק קישוריות רשת ורזולוציית DNS.

### שאילתת תגובה לא מאחזרת

1. ודא שה- `queryKey` כולל את כל הפרמטרים שאמורים להפעיל אחזורים חוזרים.
2. ודא ש- `staleTime` אינו מוגדר גבוה מדי עבור מקרה השימוש שלך.
3. השתמש ב- `queryClient.invalidateQueries` לאחר מוטציות.

## תיעוד קשור

- [דפוסי שחזור שגיאות](./error-recovery-patterns.md)
- [Caching Architecture Deep Dive](./caching-deep-dive.md)
- [Rate Limiting Architecture](./rate-limiting-architecture.md)
