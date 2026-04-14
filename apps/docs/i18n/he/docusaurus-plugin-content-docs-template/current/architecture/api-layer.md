---
id: api-layer
title: "ארכיטקטורת שכבת API"
sidebar_label: "שכבת API"
sidebar_position: 27
---

# ארכיטקטורת שכבת API

התבנית מספקת שכבת API מובנית עם שני יישומי לקוח נפרדים: מחלקה בצד הדפדפן `ApiClient` מגובה על ידי Axios, ומחלקה בצד השרת `ServerClient` המשתמשת ב-`fetch` API המקורי. שניהם חולקים סוגי תגובה עקביים, טיפול בשגיאות ואסטרטגיות שמירה במטמון.

## ארכיטקטורת לקוח

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

## סוגי תגובות

כל תקשורת API משתמשת בסוגי תגובות איגודיות מופלות המוגדרות ב-`lib/api/types.ts`:

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

## לקוח בצד הדפדפן (ApiClient)

הכיתה `ApiClient` בכתובת `lib/api/api-client-class.ts` עוטפת את Axios עם מיירטים, ניהול אסימונים ופרימת תגובה:

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

### תבנית סינגלטון

הלקוח מנוהל כיחיד באמצעות `lib/api/singleton.ts`:

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

צרכנים מייבאים מ-`lib/api/api-client.ts`:

```tsx
import { apiClient, fetcherGet, fetcherPaginated } from '@/lib/api/api-client';
```

## לקוח בצד השרת (ServerClient)

ה-`ServerClient` בכתובת `lib/api/server-api-client.ts` משתמש מקורי ב-`fetch` עם ניסיונות חוזרים אוטומטיים, טיפול בזמן קצוב ומטמון LRU בזיכרון.

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

### נסה שוב ופסק זמן

```tsx
const DEFAULT_CONFIG = {
  timeout: 30000,    // 30 seconds
  retries: 3,        // up to 3 retry attempts
  retryDelay: 1000,  // 1 second initial delay
};
```

ניסיונות חוזרים מופעלים רק על שגיאות רשת (לא שגיאות HTTP). כל ניסיון משתמש ב-`AbortController` לאכיפת זמן קצוב.

### מטמון בקשות מובנה

בקשות GET מאוחסנות באופן אוטומטי במפת LRU בזיכרון (100 ערכים, TTL של 5 דקות):

```tsx
const CACHE_SIZE = 100;
const requestCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Cache is checked before every GET request
if (this.cacheEnabled && isGetRequest) {
  const cached = cacheUtils.get(cacheKey);
  if (cached) return { success: true, data: cached };
}
```

### מופעים מוגדרים מראש

המודול מייצא מספר לקוחות מוגדרים מראש:

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

## טיפול בשגיאות מסלול API

מטפלי נתיב API משתמשים במטפל השגיאות הסטנדרטי מ-`lib/api/error-handler.ts`:

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

### ארגון נתיב API

מסלולי API חיים תחת `app/api/` ומאורגנים לפי דומיין:

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

## פונקציות שירות

האובייקט `apiUtils` מספק עוזרים לעבודה עם תגובות API:

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

## תוכנת אמצעית הרשאה

מסלולי API הדורשים הרשאות ספציפיות משתמשים בכלי השירות לבדיקת הרשאות מ-`lib/middleware/permission-check.ts`:

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

## קבועי תצורה

הגדרות ברירת המחדל של השאילתה והמטמון מרוכזות ב-`lib/api/constants.ts`:

```tsx
// lib/api/constants.ts
export const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000,   // 5 minutes
  gcTime: 24 * 60 * 60 * 1000, // 1 day
  retry: 1,
  refetchOnWindowFocus: false,
};
```

## הפניה לקובץ

|קובץ|מטרה|
|------|---------|
|`lib/api/api-client-class.ts`|לקוח Axios בצד הדפדפן עם מיירטים|
|`lib/api/api-client.ts`|סינגלטון ייצוא ומחזירי נוחות|
|`lib/api/singleton.ts`|מנהל דפוס סינגלטון|
|`lib/api/server-api-client.ts`|לקוח אחזור בצד השרת עם שמירה במטמון וניסיונות חוזרים|
|`lib/api/error-handler.ts`|תגובות שגיאה סטנדרטיות של API|
|`lib/api/types.ts`|סוגי בקשות/תגובה משותפות TypeScript|
|`lib/api/constants.ts`|קבועי תצורת ברירת מחדל|
|`lib/middleware/permission-check.ts`|אימות הרשאה עבור מסלולי API|
