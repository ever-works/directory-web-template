---
id: request-validation
title: "אימות בקשת API"
sidebar_label: "בקש אימות"
sidebar_position: 8
---

# אימות בקשת API

התבנית מאמתת בקשות API בשכבות מרובות: סכימות Zod לאימות גוף/שאילתה, פונקציות שירות לעימוד ומגבלות גודל גוף, ושמירה על סוגים מוטבעים עבור פרמטרים של enum. דף זה מתעד כל מנגנון אימות וכיצד הם משמשים במטפלי נתיב API.

## ארכיטקטורת אימות

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

## סכימות אימות Zod

### סכימת מיקום (`lib/validations/item.ts`)

כל השדות הם אופציונליים; ההקפדה נשלטת על ידי הגדרות ברמת הטופס:

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

### סכימות פריטי לקוח (`lib/validations/client-item.ts`)

#### צור פריט

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

#### עדכן פריט

משתמש באותן הגדרות שדות עם כל השדות אופציונליים:

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

#### רשימת פרמטרי שאילתה

פרמטרי שאילתה משתמשים ב-`.transform()` כדי להמיר קלט מחרוזת לערכים מוקלדים:

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

### סכימת סיסמאות (`lib/validations/auth.ts`)

```typescript
export const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[a-z]/, "Must contain at least one lowercase letter")
  .regex(/[0-9]/, "Must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Must contain at least one special character");
```

### סכימות חברה (`lib/validations/company.ts`)

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

### סוגים משוערים

כל הסכימות מייצאות סוגים שהוסקו מה-Zod לצד הסכימה:

```typescript
export type ClientUpdateItemInput = z.infer<typeof clientUpdateItemSchema>;
export type ClientCreateItemInput = z.infer<typeof clientCreateItemSchema>;
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
```

## אימות עידוד (`lib/utils/pagination-validation.ts`)

כלי שירות משותף לאימות פרמטרי שאילתה `page` ו-`limit`:

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

השימוש במטפלים במסלולים פועל לפי דפוס איגוד מופלה:

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

## בקש מגבלות גודל גוף (`lib/utils/request-body.ts`)

### `readBodyWithLimit`

קורא את גוף הבקשה באמצעות `ReadableStream` עם בדיקת גודל מצטבר:

```typescript
export async function readBodyWithLimit<T = unknown>(
  request: NextRequest,
  options: ReadBodyOptions
): Promise<ReadBodyResult<T>>
```

תכונות:
- נתיב מהיר: בודק תחילה את הכותרת `Content-Length`
- מצטבר: קורא נתחי זרם ובודק גודל עם הגעת בתים
- ביטול: מתקשרים `reader.cancel()` כאשר חריגה מהמגבלה
- ניתוח JSON: אופציונלי, מטפל בחן `SyntaxError`

```typescript
// Usage
const { data } = await readBodyWithLimit(request, { maxSize: 1024 });
```

### `validateContentLength`

דחייה מוקדמת מבלי לקרוא את הגוף:

```typescript
export function validateContentLength(request: NextRequest, maxSize: number): boolean
```

זורק `BodySizeLimitError` אם הכותרת `Content-Length` חורגת מהמגבלה.

### `BodySizeLimitError`

מחלקת שגיאה מותאמת אישית עם מאפיינים `maxSize` ו-`actualSize`:

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

## אימות פרמטר מוטבע

עבור פרמטרים של enum שאינם מכוסים על ידי סכימות Zod, מטפלי מסלולים משתמשים בשומרים מסוג מוטבע:

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

דפוס זה חוזר על הפרמטרים `sortBy` ו-`sortOrder`.

## חיטוי קלט חיפוש

פרמטרי חיפוש טקסט נחתכים ומנורמלים:

```typescript
const searchRaw = searchParams.get('search');
const search = searchRaw?.trim() ? searchRaw.trim() : undefined;
```

פרמטרי CSV מנותחים ומנורמלים:

```typescript
const parseCsv = (value: string | null): string[] | undefined => {
  if (!value) return undefined;
  const arr = value.split(',').map(v => v.trim()).filter(Boolean);
  return arr.length ? arr : undefined;
};
```

## כלי עזר לעידון (`lib/paginate.ts`)

עוזרי עימוד פשוטים לעימוד ברמת התבנית:

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

## סיכום שכבת אימות

|שכבה|מיקום|מנגנון|מטרה|
|-------|----------|-----------|---------|
|Auth|מטפל במסלול|`session?.user?.isAdmin`|גישה מבוססת תפקידים|
|גודל גוף|`lib/utils/request-body.ts`|קורא זרמים|מניעת מטענים גדולים מדי|
|עימוד|`lib/utils/pagination-validation.ts`|ניתוח URLSearchParams|אימות עמוד/מגבלה|
|Enum params|מטפל במסלול מוטבע|סוג פונקציות שמירה|אימות סטטוס, מיון לפי וכו'.|
|סכימת גוף|`lib/validations/*.ts`|סכימות זוד|אימות קלט מובנה|
|חפש|מטפל במסלול מוטבע|חיתוך + ניתוח CSV|חיטוי קלט|
