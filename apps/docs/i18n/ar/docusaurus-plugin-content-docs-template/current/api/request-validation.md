---
id: request-validation
title: "التحقق من صحة طلب API"
sidebar_label: "طلب التحقق من الصحة"
sidebar_position: 8
---

# التحقق من صحة طلب API

يتحقق القالب من صحة طلبات واجهة برمجة التطبيقات (API) في طبقات متعددة: مخططات Zod للتحقق من صحة النص/الاستعلام، ووظائف الأداة المساعدة لترقيم الصفحات وحدود حجم النص، وحرس النوع المضمّن لمعلمات التعداد. توثق هذه الصفحة كل آلية للتحقق وكيفية استخدامها في معالجات توجيه واجهة برمجة التطبيقات (API).

## هندسة التحقق من الصحة

```mermaid
flowchart TD
    A[Incoming Request] --> B{Auth Check}
    B -->|Unauthorized| C[401 Response]
    B -->|Authorized| D{Content-Length Check}
    D -->|Too large| E[413 Response]
    D -->|OK| F{Pagination Validation}
    F -->|Invalid| G[400 Response]
    F -->|Valid| H{Parameter Validation}
    H -->|Invalid enum| I[400 Response]
    H -->|Valid| J{Body Validation}
    J -->|Zod error| K[400 Response]
    J -->|Valid| L[Service / Repository]
    L -->|Error| M[safeErrorResponse]
    L -->|Success| N[200/201 Response]
```

## مخططات التحقق من Zod

### مخطط الموقع (`lib/validations/item.ts`)

جميع الحقول اختيارية؛ يتم التحكم في الصرامة من خلال إعدادات مستوى النموذج:

```typescript
export const locationSchema = z.object({
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postal_code: z.string().optional(),
  latitude: z.number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90')
    .optional(),
  longitude: z.number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
    .optional(),
  service_area: z.enum(['local', 'regional', 'national', 'global']).optional(),
  is_remote: z.boolean().optional(),
  geocoded_by: z.enum(['mapbox', 'google']).optional(),
}).optional();
```

### مخططات عناصر العميل (`lib/validations/client-item.ts`)

#### إنشاء عنصر

```typescript
export const clientCreateItemSchema = z.object({
  name: z.string()
    .min(ITEM_VALIDATION.NAME_MIN_LENGTH)
    .max(ITEM_VALIDATION.NAME_MAX_LENGTH),
  description: z.string()
    .min(ITEM_VALIDATION.DESCRIPTION_MIN_LENGTH)
    .max(ITEM_VALIDATION.DESCRIPTION_MAX_LENGTH),
  source_url: z.string().url('Invalid URL format'),
  category: z.union([
    z.string().min(1, 'Category is required'),
    z.array(z.string().min(1)).min(1),
  ]).optional().nullable(),
  tags: z.array(z.string().min(1)).optional().default([]),
  icon_url: z.string().url().optional().or(z.literal('')),
  location: locationSchema,
});
```

#### تحديث العنصر

يستخدم نفس تعريفات الحقول مع جميع الحقول اختيارية:

```typescript
export const clientUpdateItemSchema = z.object({
  name: z.string().min(...).max(...).optional(),
  description: z.string().min(...).max(...).optional(),
  source_url: z.string().url().optional(),
  category: z.union([z.string(), z.array(z.string())]).optional(),
  tags: z.array(z.string()).optional(),
  icon_url: z.string().url().optional().or(z.literal('')),
  location: locationSchema,
});
```

#### قائمة معلمات الاستعلام

تستخدم معلمات الاستعلام `.transform()` لتحويل مدخلات السلسلة إلى قيم مكتوبة:

```typescript
export const clientItemsListQuerySchema = z.object({
  page: z.string().optional()
    .transform(val => (val ? parseInt(val, 10) : 1))
    .refine(val => !Number.isNaN(val))
    .refine(val => val >= 1),
  limit: z.string().optional()
    .transform(val => (val ? parseInt(val, 10) : 10))
    .refine(val => !Number.isNaN(val))
    .refine(val => val >= 1 && val <= 100),
  status: z.enum(['all', 'pending', 'approved', 'rejected']).optional().default('all'),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['name', 'updated_at', 'status', 'submitted_at']).optional().default('updated_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  deleted: z.string().optional().transform(val => val === 'true'),
});
```

### مخطط كلمة المرور (`lib/validations/auth.ts`)

```typescript
export const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[a-z]/, "Must contain at least one lowercase letter")
  .regex(/[0-9]/, "Must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Must contain at least one special character");
```

### مخططات الشركة (`lib/validations/company.ts`)

```typescript
export const createCompanySchema = z.object({
  name: z.string().min(1).max(255),
  website: z.string().url().optional().or(z.literal("")),
  domain: z.string().max(255).optional()
    .transform(val => val?.toLowerCase().trim() || undefined),
  slug: z.string().max(255).optional()
    .transform(val => val?.toLowerCase().trim() || undefined)
    .refine(val => !val || /^[a-z0-9-]+$/.test(val)),
  status: z.enum(["active", "inactive"]).default("active"),
});
```

### الأنواع المستنبطة

تقوم جميع المخططات بتصدير الأنواع المستنتجة من Zod إلى جانب المخطط:

```typescript
export type ClientUpdateItemInput = z.infer<typeof clientUpdateItemSchema>;
export type ClientCreateItemInput = z.infer<typeof clientCreateItemSchema>;
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
```

## التحقق من صحة الصفحات (`lib/utils/pagination-validation.ts`)

أداة مساعدة مشتركة للتحقق من صحة معلمات الاستعلام `page` و`limit`:

```typescript
export function validatePaginationParams(
  searchParams: URLSearchParams
): PaginationParams | PaginationError {
  const page = pageParam ? parseInt(pageParam, 10) : 1;
  const limit = limitParam ? parseInt(limitParam, 10) : 10;

  if (isNaN(page) || page < 1) {
    return { error: 'Invalid page parameter. Must be a positive integer.', status: 400 };
  }
  if (isNaN(limit) || limit < 1 || limit > 100) {
    return { error: 'Invalid limit parameter. Must be between 1 and 100.', status: 400 };
  }
  return { page, limit };
}
```

يتبع الاستخدام في معالجات المسار نمطًا موحدًا مميزًا:

```typescript
const paginationResult = validatePaginationParams(searchParams);
if ('error' in paginationResult) {
  return NextResponse.json(
    { success: false, error: paginationResult.error },
    { status: paginationResult.status }
  );
}
const { page, limit } = paginationResult;
```

## طلب حدود حجم الجسم (`lib/utils/request-body.ts`)

### `readBodyWithLimit`

يقرأ نص الطلب عبر `ReadableStream` مع التحقق من الحجم المتزايد:

```typescript
export async function readBodyWithLimit<T = unknown>(
  request: NextRequest,
  options: ReadBodyOptions
): Promise<ReadBodyResult<T>>
```

الميزات:
- المسار السريع: يتحقق من العنوان `Content-Length` أولاً
- تزايدي: يقرأ أجزاء الدفق ويتحقق من الحجم عند وصول البايتات
- الإلغاء: المكالمات `reader.cancel()` عند تجاوز الحد
- تحليل JSON: اختياري، يعالج بأمان `SyntaxError`

```typescript
// Usage
const { data } = await readBodyWithLimit(request, { maxSize: 1024 });
```

### `validateContentLength`

الرفض المبكر دون قراءة الجسد:

```typescript
export function validateContentLength(request: NextRequest, maxSize: number): boolean
```

يرمي `BodySizeLimitError` إذا تجاوز رأس `Content-Length` الحد الأقصى.

### `BodySizeLimitError`

فئة خطأ مخصصة مع `maxSize` و`actualSize` الخصائص:

```typescript
export class BodySizeLimitError extends Error {
  constructor(
    public readonly maxSize: number,
    public readonly actualSize: number
  ) {
    super(`Request body too large. Maximum size is ${maxSize} bytes, received ${actualSize} bytes.`);
  }
}
```

## التحقق من صحة المعلمة المضمنة

بالنسبة لمعلمات التعداد التي لا تغطيها مخططات Zod، تستخدم معالجات المسار حراس النوع المضمن:

```typescript
// Type-safe status validation
const validStatuses = ['draft', 'pending', 'approved', 'rejected'] as const;
type ItemStatus = (typeof validStatuses)[number];
const isItemStatus = (s: string): s is ItemStatus =>
  (validStatuses as readonly string[]).includes(s);

if (statusParam && !isItemStatus(statusParam)) {
  return NextResponse.json(
    { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
    { status: 400 }
  );
}
```

يتكرر هذا النمط لمعلمات `sortBy` و`sortOrder`.

## بحث تعقيم الإدخال

يتم قطع معلمات البحث عن النص وتطبيعها:

```typescript
const searchRaw = searchParams.get('search');
const search = searchRaw?.trim() ? searchRaw.trim() : undefined;
```

يتم تحليل معلمات CSV وتطبيعها:

```typescript
const parseCsv = (value: string | null): string[] | undefined => {
  if (!value) return undefined;
  const arr = value.split(',').map(v => v.trim()).filter(Boolean);
  return arr.length ? arr : undefined;
};
```

## الأدوات المساعدة لترقيم الصفحات (`lib/paginate.ts`)

مساعدات ترقيم الصفحات البسيطة لترقيم الصفحات على مستوى القالب:

```typescript
export const PER_PAGE = 12;

export function totalPages(size: number, perPage: number = PER_PAGE) {
  return Math.ceil(size / perPage);
}

export function paginateMeta(rawPage: number | string = 1, perPage: number = PER_PAGE) {
  const page = typeof rawPage === 'string' ? parseInt(rawPage) : rawPage;
  const start = (page - 1) * perPage;
  return { page, start };
}
```

## ملخص طبقة التحقق من الصحة

|طبقة|الموقع|آلية|الغرض|
|-------|----------|-----------|---------|
|مصادقة|معالج الطريق|`session?.user?.isAdmin`|الوصول على أساس الدور|
|حجم الجسم|`lib/utils/request-body.ts`|قارئ الدفق|منع الحمولات كبيرة الحجم|
|ترقيم الصفحات|`lib/utils/pagination-validation.ts`|تحليل URLSearchParams|التحقق من صحة الصفحة/الحد|
|تعداد المعلمات|معالج الطريق مضمن|نوع وظائف الحراسة|التحقق من الحالة، والفرز حسب، وما إلى ذلك.|
|مخطط الجسم|`lib/validations/*.ts`|مخططات زود|التحقق من صحة المدخلات المنظمة|
|بحث|معالج الطريق مضمن|تحليل القطع + CSV|تعقيم المدخلات|
