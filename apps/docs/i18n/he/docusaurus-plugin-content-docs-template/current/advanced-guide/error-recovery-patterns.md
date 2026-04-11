---
id: error-recovery-patterns
title: דפוסי שחזור שגיאות
sidebar_label: שחזור שגיאות
sidebar_position: 2
---

# דפוסי שחזור שגיאות

מדריך זה מכסה את ארכיטקטורת הטיפול בשגיאות המשמשת בכל התבנית, כולל גבולות שגיאה, לוגיקה של ניסיון חוזר, דפוסי ממשק משתמש חוזרים ודיווח שגיאות מרכזי.

## סקירה כללית של אדריכלות

```
Error Handling Layers
======================

  Component Layer        Service Layer         API Layer
  +--------------+       +--------------+      +--------------+
  | Error        |       | Try/Catch    |      | handleApi    |
  | Boundaries   |       | + Retry      |      | Error()      |
  | (React)      |       | + Fallback   |      | + Logging    |
  +--------------+       +--------------+      +--------------+
       |                      |                      |
       v                      v                      v
  +---------------------------------------------------+
  |           Centralized Error Handler                |
  |   lib/utils/error-handler.ts                       |
  |   - ErrorType enum                                 |
  |   - createAppError()                               |
  |   - logError()                                     |
  +---------------------------------------------------+
```

## סוגי שגיאה מרכזיים

המודול `lib/utils/error-handler.ts` מגדיר מערכת שגיאות הקלדה:

```typescript
// lib/utils/error-handler.ts
export enum ErrorType {
  AUTH = 'auth',
  CONFIG = 'config',
  DATABASE = 'database',
  NETWORK = 'network',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown'
}

export interface AppError {
  message: string;
  type: ErrorType;
  code?: string;
  originalError?: unknown;
}
```

### יצירת שגיאות הקלדה

```typescript
import { createAppError, ErrorType } from '@/lib/utils/error-handler';

const error = createAppError(
  'Missing required environment variables: DATABASE_URL',
  ErrorType.CONFIG,
  'ENV_MISSING'
);
```

### רישום שגיאות מובנה

```typescript
import { logError } from '@/lib/utils/error-handler';

// AppError - logs type, code, and original error
logError(appError, 'PaymentService');
// Output: [CONFIG] [PaymentService]: Missing required environment variables

// Standard Error - logs message and stack trace
logError(new Error('Connection refused'), 'Database');
// Output: [ERROR] [Database]: Connection refused

// Unknown error - logs raw value
logError('something went wrong', 'Unknown');
// Output: [UNKNOWN ERROR] [Unknown]: something went wrong
```

## טיפול בשגיאות API

### תגובות שגיאה סטנדרטיות של API

מודול `lib/api/error-handler.ts` מספק עיצוב שגיאת HTTP עקבי:

```typescript
// lib/api/error-handler.ts
export enum HttpStatus {
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}
```

### שימוש ב- `handleApiError` במטפלי מסלולים

```typescript
import { handleApiError, withErrorHandling } from '@/lib/api/error-handler';

// Pattern 1: Manual try/catch
export async function GET(request: Request) {
  try {
    const data = await fetchData();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, 'GET /api/items');
  }
}

// Pattern 2: Wrapped handler (recommended)
export async function POST(request: Request) {
  return withErrorHandling(async () => {
    const body = await request.json();
    const result = await createItem(body);
    return NextResponse.json({ success: true, data: result });
  }, 'POST /api/items');
}
```

### סיווג שגיאות אוטומטי

הפונקציה `handleApiError` ממפה אוטומטית הודעות שגיאה לקודי מצב HTTP:

```
Error Message Contains     ->  HTTP Status
"authentication"           ->  401 Unauthorized
"unauthorized"             ->  401 Unauthorized
"validation" / "invalid"   ->  422 Unprocessable Entity
"not found" / "missing"    ->  404 Not Found
(default)                  ->  500 Internal Server Error
```

### חיטוי שגיאות ייצור

בהפקה, פרטי שגיאה פנימיים נמחקים מ-500 תגובות:

```typescript
if (process.env.NODE_ENV === 'production' && status === HttpStatus.INTERNAL_SERVER_ERROR) {
  message = 'An unexpected error occurred';
}
```

## טיפול בשגיאות API בצד הלקוח

המחלקה `ApiClient` ב- `lib/api/api-client-class.ts` מספקת טיפול אוטומטי בשגיאות:

```typescript
// Automatic 401 redirect
private handleResponseError = async (error) => {
  if (responseError.response?.status === 401) {
    window.location.href = env.AUTH_ENDPOINT_LOGIN;
  }
  throw this.formatError(error);
};
```

### שגיאות לקוח מעוצבות

כל שגיאות ה-API מנורמלות לממשק `ApiError` :

```typescript
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}
```

## לוגיקה ניסיון חוזר של לקוח API של שרת

ה- `ServerClient` ב- `lib/api/server-api-client.ts` כולל לוגיקת ניסיון חוזר מובנית:

```typescript
// Default retry configuration
const DEFAULT_CONFIG = {
  timeout: 30000,     // 30 second timeout
  retries: 3,         // 3 retry attempts
  retryDelay: 1000,   // 1 second between retries
};
```

### נסה שוב לוגיקה של החלטה

```
Retry Decision Tree
====================

  Fetch fails
       |
       v
  Is it a network error?
  (TypeError or "fetch" in message)
       |
  +----+----+
  YES       NO
  |         |
  v         v
  attempt   Throw
  < retries?  immediately
  |
  YES -> Wait retryDelay -> Retry
  NO  -> Throw error
```

רק כשלים ברמת הרשת מפעילים ניסיונות חוזרים. שגיאות HTTP (4xx, 5xx) אינן מנסים שוב.

### טיפול בפסק זמן

```typescript
// AbortController-based timeout
const timeoutController = new AbortController();
const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

// Timeout produces a specific error type
const err = new Error(`Request timeout after ${timeout}ms`);
err.name = 'TimeoutError';
err.code = 'ETIMEDOUT';
```

## אימות משתנה סביבתי

```typescript
import { validateEnvVariables, getEnvVariable } from '@/lib/utils/error-handler';

// Validate multiple variables at once
const error = validateEnvVariables(['DATABASE_URL', 'AUTH_SECRET']);
if (error) {
  logError(error, 'Startup');
  process.exit(1);
}

// Get single variable with automatic validation
const dbUrl = getEnvVariable('DATABASE_URL', true); // throws if missing
const optional = getEnvVariable('OPTIONAL_VAR', false); // returns undefined
```

## שחזור שגיאות מעבודה ברקע

עבודות רקע משתמשות בדפוס טיפול בשגיאות `LocalJobManager` :

```typescript
// lib/background-jobs/local-job-manager.ts
private async executeJob(id: string): Promise<void> {
  // Skip if already running (prevents overlap)
  if (jobStatus.status === 'running') return;

  try {
    await jobFunction();
    jobStatus.status = 'completed';
    this.metrics.successfulJobs++;
  } catch (error) {
    jobStatus.status = 'failed';
    jobStatus.error = error instanceof Error ? error.message : 'Unknown error';
    this.metrics.failedJobs++;
    // Job remains scheduled - will retry on next interval
  }
}
```

עבודות שנכשלות ממשיכות להיות מתוזמנות במרווחים הקבועים שלהן, ומספקות התנהגות אוטומטית של ניסיון חוזר.

## שחזור שגיאת אי תוקף מטמון

```typescript
// lib/cache-invalidation.ts
function safeRevalidateTag(tag: string): void {
  try {
    revalidateTag(tag, 'max');
  } catch (error) {
    if (error instanceof Error && isRenderPhaseError(error)) {
      // Expected during render - skip silently
      console.warn(`Skipping invalidation during render (tag: ${tag})`);
    } else {
      throw error; // Unexpected errors propagate
    }
  }
}
```

## שיקולי ביצועים

1. **השהיית ניסיון חוזר**: השהיית ניסיון חוזר של שנייה אחת מונעת השפעות עדר רועמות אך מוסיפה חביון. עבור בקשות הפונות למשתמש, שקול להפחית ל-500 אלפיות השנייה.
2. **ערכי פסק זמן**: ברירת המחדל של 30 שניות היא נדיבה. עבור קריאות API פנימיות, 10 שניות מספיקות בדרך כלל.
3. **רישום שגיאות**: במהלך הייצור, הימנע מרישום מעקבים מלאים עבור שגיאות צפויות (404, 422) כדי להפחית את רעש היומן.

## פתרון בעיות

### API מחזיר 500 עם הודעה גנרית בייצור

זה בתכנון. בדוק ביומני השרת את פרטי השגיאה בפועל. הפונקציה `handleApiError` מחטאת 500 שגיאות בייצור.

### ניסיונות חוזרים לא עובדים עבור קריאות API

ניסיונות חוזרים חלים רק על כשלים ברמת הרשת (החיבור נדחה, שגיאות DNS). תגובות HTTP 500 אינן מפעילות ניסיונות חוזרים. אם אתה צריך ניסיונות חוזרים ברמת HTTP, הרחב את ההיגיון `shouldRetry` .

### עבודת רקע תקועה בסטטוס "ריצה".

ה- `LocalJobManager` מדלג על ביצוע אם עבודה כבר פועלת. אם עבודה נתקעת, היא חוסמת הוצאות להורג עתידיות. שקול להוסיף מעטפת זמן קצוב סביב עבודות ארוכות טווח.

## תיעוד קשור

- [API Client Architecture](./api-client-architecture.md)
- [Webhook Architecture](./webhook-architecture.md)
- [Rate Limiting Architecture](./rate-limiting-architecture.md)
