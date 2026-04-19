---
id: response-patterns
title: "أنماط استجابة واجهة برمجة التطبيقات"
sidebar_label: "أنماط الاستجابة"
sidebar_position: 9
---

# أنماط استجابة واجهة برمجة التطبيقات

تتبع جميع مسارات واجهة برمجة التطبيقات اصطلاحات استجابة متسقة: أنواع الاتحادات التمييزية للنجاح/الخطأ، ورسائل الخطأ المرتبطة بالبيئة، ورموز حالة HTTP القياسية، ووثائق Swagger/JSDoc. تغطي هذه الصفحة كل نمط.

## نظام نوع الاستجابة

### الاتحاد التمييزي (`lib/api/types.ts`)

تستخدم استجابات API `success` قيمة منطقية كعنصر تمييز:

```typescript
export type ApiResponse<T = unknown> =
  | { success: true; data: T; total?: number; page?: number; limit?: number; totalPages?: number }
  | { success: false; error: string };
```

يتيح ذلك للمتصلين تضييق نطاق الكتابة بأمان:

```typescript
const response: ApiResponse<User[]> = await fetchUsers();
if (response.success) {
  // TypeScript knows: response.data is User[]
  console.log(response.data);
} else {
  // TypeScript knows: response.error is string
  console.error(response.error);
}
```

### الرد المرقّم

تستخدم نقاط نهاية القائمة غلافًا مرقّمًا مخصصًا:

```typescript
export type PaginatedResponse<T> =
  | {
      success: true;
      data: T[];
      meta: {
        page: number;
        totalPages: number;
        total: number;
        limit: number;
      };
    }
  | { success: false; error: string };
```

### أنواع الأخطاء

```typescript
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
}
```

## أشكال الاستجابة القياسية

### ردود النجاح

#### مورد واحد

```typescript
return NextResponse.json({
  success: true,
  item,
  message: "Item created successfully",
}, { status: 201 });
```

#### قائمة مع ترقيم الصفحات

```typescript
return NextResponse.json({
  success: true,
  items: result.items,
  total: result.total,
  page: result.page,
  limit: result.limit,
  totalPages: result.totalPages,
});
```

#### تأكيد الإجراء

```typescript
return NextResponse.json({
  success: true,
  message: "Profile updated successfully",
});
```

### ردود الأخطاء

تتضمن جميع استجابات الأخطاء `success: false` وسلسلة `error`:

```typescript
// Unauthorized
return NextResponse.json(
  { success: false, error: "Unauthorized. Admin access required." },
  { status: 401 }
);

// Validation error
return NextResponse.json(
  { success: false, error: "Invalid page parameter. Must be a positive integer." },
  { status: 400 }
);

// Conflict
return NextResponse.json(
  { success: false, error: `Item with slug '${slug}' already exists` },
  { status: 409 }
);
```

## اتفاقيات رمز حالة HTTP

|الحالة|الاستخدام|مثال|
|--------|-------|---------|
| `200` |تم الحصول على النجاح، ووضع، والتصحيح، والحذف|قائمة العناصر، تحديث الملف الشخصي|
| `201` |مشاركة ناجحة (تم إنشاء المورد)|إنشاء عنصر، إنشاء تعليق|
| `400` |معلمات أو نص غير صالح|ترقيم الصفحات غير صحيح، الحقول المطلوبة مفقودة|
| `401` |المصادقة مطلوبة أو فشلت|جلسة مفقودة، مستخدم غير إداري|
| `404` |لم يتم العثور على المورد|لم يتم العثور على العنصر، لم يتم العثور على الملف الشخصي|
| `409` |الصراع (مورد مكرر)|معرف العنصر المكرر أو سبيكة|
| `413` |نص الطلب كبير جدًا|يتجاوز الجسم `readBodyWithLimit` الحد الأقصى|
| `500` |خطأ داخلي في الخادم|الاستثناءات غير المعالجة|

## الاستجابة الآمنة للخطأ (`lib/utils/api-error.ts`)

### `safeErrorResponse`

يمنع تسرب المعلومات من خلال إظهار الرسائل العامة في الإنتاج والرسائل التفصيلية في التطوير:

```typescript
export function safeErrorResponse(
  error: unknown,
  fallbackMessage: string,
  status: number = 500
): NextResponse {
  const detail = error instanceof Error ? error.message : String(error);

  // Always log full details server-side
  console.error(`[API Error] ${fallbackMessage}:`, detail);

  const message = process.env.NODE_ENV === "development" ? detail : fallbackMessage;

  return NextResponse.json({ success: false, error: message }, { status });
}
```

الاستخدام في معالجات الطريق:

```typescript
export async function GET(request: NextRequest) {
  try {
    // ... handler logic
  } catch (error) {
    return safeErrorResponse(error, 'Failed to fetch items');
  }
}
```

### `safeErrorMessage`

استخراج سلسلة رسائل آمنة دون إنشاء `NextResponse`:

```typescript
export function safeErrorMessage(error: unknown, fallbackMessage: string): string {
  if (process.env.NODE_ENV === "development") {
    return error instanceof Error ? error.message : String(error);
  }
  return fallbackMessage;
}
```

### السلوك البيئي

|البيئة|خطأ في الإخراج|سجل الخادم|
|-------------|-------------|------------|
|التنمية|`error.message` (التفاصيل الكاملة)|تم تسجيل الخطأ الكامل|
|الإنتاج|`fallbackMessage` (عام)|تم تسجيل الخطأ الكامل|

## هيكل معالج الطريق

تتبع جميع معالجات مسار API بنية متسقة:

```mermaid
flowchart TD
    A[Request] --> B[try/catch wrapper]
    B --> C[Auth check]
    C -->|Fail| D[401 Response]
    C -->|Pass| E[Parse & validate params]
    E -->|Invalid| F[400 Response]
    E -->|Valid| G[Call service/repository]
    G -->|Not found| H[404 Response]
    G -->|Conflict| I[409 Response]
    G -->|Success| J[200/201 Response]
    B -->|Exception| K[safeErrorResponse 500]
```

### مثال معالج GET الكنسي

```typescript
export async function GET(request: NextRequest) {
  try {
    // 1. Auth check
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin access required." },
        { status: 401 }
      );
    }

    // 2. Parse and validate parameters
    const { searchParams } = new URL(request.url);
    const paginationResult = validatePaginationParams(searchParams);
    if ('error' in paginationResult) {
      return NextResponse.json(
        { success: false, error: paginationResult.error },
        { status: paginationResult.status }
      );
    }

    // 3. Call service layer
    const result = await repository.findAll(paginationResult);

    // 4. Return structured response
    return NextResponse.json({
      success: true,
      items: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });

  } catch (error) {
    return safeErrorResponse(error, 'Failed to fetch items');
  }
}
```

### مثال على معالج POST الكنسي

```typescript
export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    // 2. Parse and validate body
    const body = await request.json();
    if (!body.name || !body.description) {
      return NextResponse.json(
        { success: false, error: "Name and description are required" },
        { status: 400 }
      );
    }

    // 3. Check for conflicts
    const existing = await repository.findBySlug(body.slug);
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Resource with slug '${body.slug}' already exists` },
        { status: 409 }
      );
    }

    // 4. Create resource
    const item = await repository.create(body);

    // 5. Return created resource
    return NextResponse.json({
      success: true,
      item,
      message: "Created successfully",
    }, { status: 201 });

  } catch (error) {
    return safeErrorResponse(error, 'Failed to create resource');
  }
}
```

## وثائق Swagger / JSDoc

يتم توثيق مسارات واجهة برمجة التطبيقات (API) باستخدام التعليقات التوضيحية المضمنة لـ Swagger لوثائق واجهة برمجة التطبيقات (API) التي يتم إنشاؤها تلقائيًا:

```typescript
/**
 * @swagger
 * /api/admin/items:
 *   get:
 *     tags: ["Admin - Items"]
 *     summary: "Get paginated items list"
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: "page"
 *         in: "query"
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *     responses:
 *       200:
 *         description: "Items list retrieved successfully"
 *       400:
 *         description: "Bad request"
 *       401:
 *         description: "Unauthorized"
 *       500:
 *         description: "Internal server error"
 */
```

## أنواع واجهة برمجة التطبيقات من جانب العميل

تكوين عميل API وخيارات الجلب:

```typescript
export interface ApiClientConfig extends Partial<AxiosRequestConfig> {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  accessToken?: string;
  frontendUrl?: string;
}

export interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}
```

## ملخص الاتفاقيات

|اتفاقية|الوصف|
|------------|-------------|
|تتضمن كافة الردود `success`|الاتحاد التمييزي لسلامة النوع|
|تستخدم الأخطاء `{ success: false, error: string }`|شكل خطأ ثابت|
|`safeErrorResponse` يلتف كتل الالتقاط|إخفاء الأخطاء مع مراعاة البيئة|
|يستخدم ترقيم الصفحات `total`، `page`، `limit`، `totalPages`|البيانات الوصفية المتسقة|
|التحقق من المصادقة هو العملية الأولى|نمط الفشل السريع|
|يعود التحقق من الصحة مبكرًا عند الفشل|لا توجد شروط متداخلة|
|التعليقات التوضيحية Swagger على جميع طرق الإدارة|مستندات API التي تم إنشاؤها تلقائيًا|
