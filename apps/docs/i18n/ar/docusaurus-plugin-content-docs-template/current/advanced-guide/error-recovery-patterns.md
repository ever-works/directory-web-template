---
id: error-recovery-patterns
title: أنماط استرداد الأخطاء
sidebar_label: استرداد الخطأ
sidebar_position: 2
---

# أنماط استرداد الأخطاء

يغطي هذا الدليل بنية معالجة الأخطاء المستخدمة في القالب، بما في ذلك حدود الأخطاء ومنطق إعادة المحاولة وأنماط واجهة المستخدم الاحتياطية والإبلاغ المركزي عن الأخطاء.

## نظرة عامة على الهندسة المعمارية

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

## أنواع الأخطاء المركزية

تحدد الوحدة `lib/utils/error-handler.ts` نظام الخطأ المكتوب:

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

### إنشاء الأخطاء المكتوبة

```typescript
import { createAppError, ErrorType } from '@/lib/utils/error-handler';

const error = createAppError(
  'Missing required environment variables: DATABASE_URL',
  ErrorType.CONFIG,
  'ENV_MISSING'
);
```

### تسجيل الأخطاء المنظمة

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

## معالجة أخطاء واجهة برمجة التطبيقات

### استجابات أخطاء واجهة برمجة التطبيقات الموحدة

توفر الوحدة `lib/api/error-handler.ts` تنسيقًا متسقًا لخطأ HTTP:

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

### استخدام `handleApiError` في معالجات المسار

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

### تصنيف الأخطاء تلقائيًا

تقوم الوظيفة `handleApiError` بتعيين رسائل الخطأ تلقائيًا إلى رموز حالة HTTP:

```
Error Message Contains     ->  HTTP Status
"authentication"           ->  401 Unauthorized
"unauthorized"             ->  401 Unauthorized
"validation" / "invalid"   ->  422 Unprocessable Entity
"not found" / "missing"    ->  404 Not Found
(default)                  ->  500 Internal Server Error
```

### تعقيم خطأ الإنتاج

في الإنتاج، يتم تجريد تفاصيل الخطأ الداخلي من 500 رد:

```typescript
if (process.env.NODE_ENV === 'production' && status === HttpStatus.INTERNAL_SERVER_ERROR) {
  message = 'An unexpected error occurred';
}
```

## معالجة أخطاء واجهة برمجة التطبيقات من جانب العميل

توفر الفئة 0 في 1 معالجة الأخطاء تلقائيًا:

```typescript
// Automatic 401 redirect
private handleResponseError = async (error) => {
  if (responseError.response?.status === 401) {
    window.location.href = env.AUTH_ENDPOINT_LOGIN;
  }
  throw this.formatError(error);
};
```

### أخطاء العميل المنسقة

تتم تسوية كافة أخطاء واجهة برمجة التطبيقات (API) على الواجهة `ApiError` :

```typescript
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}
```

## منطق إعادة محاولة عميل خادم API

يتضمن "0" في "1" منطق إعادة المحاولة المدمج:

```typescript
// Default retry configuration
const DEFAULT_CONFIG = {
  timeout: 30000,     // 30 second timeout
  retries: 3,         // 3 retry attempts
  retryDelay: 1000,   // 1 second between retries
};
```

### إعادة محاولة منطق القرار

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

تؤدي حالات الفشل على مستوى الشبكة فقط إلى إعادة المحاولة. أخطاء HTTP (4xx، 5xx) لا تعيد المحاولة.

### التعامل مع المهلة

```typescript
// AbortController-based timeout
const timeoutController = new AbortController();
const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

// Timeout produces a specific error type
const err = new Error(`Request timeout after ${timeout}ms`);
err.name = 'TimeoutError';
err.code = 'ETIMEDOUT';
```

## التحقق من صحة متغير البيئة

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

## استعادة خطأ المهمة في الخلفية

تستخدم وظائف الخلفية نمط معالجة الأخطاء `LocalJobManager` :

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

تستمر جدولة المهام التي تفشل على فترات زمنية منتظمة، مما يوفر سلوك إعادة المحاولة التلقائي.

## استرداد خطأ إبطال ذاكرة التخزين المؤقت

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

## اعتبارات الأداء

1. **تأخيرات إعادة المحاولة**: تأخير إعادة المحاولة لمدة ثانية واحدة يمنع تأثيرات القطيع المدوية ولكنه يضيف زمن الوصول. بالنسبة للطلبات التي يواجهها المستخدم، فكر في تقليلها إلى 500 مللي ثانية.
2. **قيم المهلة**: القيمة الافتراضية البالغة 30 ثانية تعتبر كبيرة. بالنسبة لاستدعاءات واجهة برمجة التطبيقات الداخلية، عادةً ما تكون 10 ثوانٍ كافية.
3. **تسجيل الأخطاء**: أثناء الإنتاج، تجنب تسجيل تتبعات المكدس الكاملة للأخطاء المتوقعة (404، 422) لتقليل تشويش السجل.

## استكشاف الأخطاء وإصلاحها

### تقوم واجهة برمجة التطبيقات (API) بإرجاع 500 مع رسالة عامة في الإنتاج

وهذا حسب التصميم. تحقق من سجلات الخادم للحصول على تفاصيل الخطأ الفعلي. تقوم الوظيفة 0 بتطهير 500 خطأ في الإنتاج.

### إعادة المحاولة لا تعمل مع مكالمات API

تنطبق عمليات إعادة المحاولة فقط على حالات الفشل على مستوى الشبكة (رفض الاتصال، أخطاء DNS). لا تؤدي استجابات HTTP 500 إلى إعادة المحاولة. إذا كنت بحاجة إلى إعادة المحاولة على مستوى HTTP، فقم بتوسيع المنطق "1".

### مهمة الخلفية عالقة في حالة "قيد التشغيل".

يتخطى الزر 2 التنفيذ إذا كانت المهمة قيد التشغيل بالفعل. إذا تم تعليق المهمة، فإنها تمنع عمليات الإعدام المستقبلية. فكر في إضافة غلاف المهلة حول المهام طويلة الأمد.

## الوثائق ذات الصلة

- [بنية عميل API](./api-client-architecture.md)
- [هندسة الويب هوك](./webhook-architecture.md)
- [بنية تحديد المعدل](./rate-limiting-architecture.md)
