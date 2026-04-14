---
id: survey-queries-deep-dive
title: استعلامات الاستطلاع، الغوص العميق
sidebar_label: استعلامات الاستطلاع، الغوص العميق
sidebar_position: 68
---

# استعلامات الاستطلاع، الغوص العميق

مرجع شامل لجميع وظائف استعلام قاعدة البيانات ذات الصلة بالاستطلاع، بما في ذلك CRUD للاستطلاع وإدارة الاستجابة وترقيم الصفحات والتصفية وإحصاء الردود.

## نظرة عامة

تقوم طبقة استعلام الاستطلاع بإدارة الاستطلاعات واستجاباتها:

- **`survey.queries.ts`** - استبيان كامل CRUD مع الحذف البسيط، وقائمة مرقّمة مع عوامل التصفية، وعدد الردود وحالة الإكمال JOINs، واستجابة الاستبيان CRUD مع تصفية النطاق الزمني، وعدد الردود

تدعم الاستطلاعات نوعين: `global` (على مستوى الموقع) و`item` (مرتبط بعنصر معين). يتم ربط الإجابات بكل من الاستطلاع وبعنصر اختياريًا، مما يتيح جمع التعليقات لكل عنصر.

## ملف المصدر

```
lib/db/queries/survey.queries.ts
```

---

## Function Reference

### Survey CRUD

#### `getSurveys`

Gets surveys with filters, pagination, and optional response count / completion status enrichment.

```typescript
async function getSurveys(filters?: {
  type?: 'global' | 'item';
  itemId?: string;
  status?: 'draft' | 'published' | 'closed';
  page?: number;
  limit?: number;
  userId?: string;
  withResponseCount?: boolean;
  withCompletionStatus?: boolean;
}): Promise<{
  surveys: (Survey & { responseCount?: number; isCompletedByUser?: boolean })[];
  total: number;
  totalPages: number;
}>
```

**Parameters:**

| Parameter              | Type                                | Required | Default | Description                                      |
|------------------------|-------------------------------------|----------|---------|--------------------------------------------------|
| `type`                 | `'global'` \| `'item'`             | No       | --      | Filter by survey type                            |
| `itemId`               | `string`                            | No       | --      | Filter by associated item                        |
| `status`               | `'draft'` \| `'published'` \| `'closed'` | No | --      | Filter by survey status                          |
| `page`                 | `number`                            | No       | `1`     | Page number                                      |
| `limit`                | `number`                            | No       | `10`    | Results per page                                 |
| `userId`               | `string`                            | No       | --      | User ID for completion status check              |
| `withResponseCount`    | `boolean`                           | No       | --      | Include response count per survey                |
| `withCompletionStatus` | `boolean`                           | No       | --      | Include whether the user has completed the survey |

**Returns:** Paginated survey list with optional `responseCount` and `isCompletedByUser` fields

**SQL Pattern (with JOINs):**

When `withResponseCount` or `withCompletionStatus` is enabled, the query uses a `LEFT JOIN` with `GROUP BY`:

```sql
SELECT surveys.*,
  COUNT(survey_responses.id) as response_count,
  COUNT(CASE WHEN survey_responses.user_id = ? THEN 1 END) as is_completed
FROM surveys
LEFT JOIN survey_responses ON surveys.id = survey_responses.survey_id
WHERE surveys.deleted_at IS NULL AND ...
GROUP BY surveys.id
ORDER BY surveys.created_at DESC
LIMIT ? OFFSET ?;
```

**SQL Pattern (simple):**

When no JOINs are needed, runs data and count queries in parallel via `Promise.all`:

```sql
-- Data query
SELECT * FROM surveys
WHERE deleted_at IS NULL AND ...
ORDER BY created_at DESC
LIMIT ? OFFSET ?;

-- Count query
SELECT count(*) FROM surveys
WHERE deleted_at IS NULL AND ...;
```

**Design Notes:**
- All queries exclude soft-deleted surveys (`deleted_at IS NULL`)
- The simple path (no JOINs) is used when neither `withResponseCount` nor `withCompletionStatus` is requested, avoiding unnecessary JOIN overhead
- Completion status requires both `withCompletionStatus` and `userId` to be provided

---

#### `getSurveyBySlug`

يحصل على استطلاع من خلال عنوان URL الثابت الخاص به، مع استبعاد اختياري لمعرف استطلاع محدد (مفيد للتحقق من صحة التفرد أثناء التحديثات).

```typescript
async function getSurveyBySlug(
  slug: string,
  ignoreId?: string
): Promise<Survey | null>
```

**المعلمات:**

|المعلمة|اكتب|مطلوب|الوصف|
|------------|----------|----------|-------------------------------------------|
|`slug`|`string`|نعم|سبيكة المسح|
|`ignoreId`|`string`|لا|معرف الاستطلاع المراد استبعاده من البحث|

**المرتجعات:** الاستطلاع أو `null` إذا لم يتم العثور عليه

** نمط SQL: **

```sql
SELECT * FROM surveys
WHERE slug = ? AND deleted_at IS NULL
  AND id != ?  -- only if ignoreId provided
LIMIT 1;
```

---

#### `getSurveyById`

Gets a survey by its ID, excluding soft-deleted records.

```typescript
async function getSurveyById(id: string): Promise<Survey | null>
```

**SQL Pattern:**

```sql
SELECT * FROM surveys
WHERE id = ? AND deleted_at IS NULL
LIMIT 1;
```

---

#### `createSurvey`

إنشاء استطلاع جديد.

```typescript
async function createSurvey(survey: NewSurvey): Promise<Survey>
```

**المرتجعات:** سجل الاستطلاع الذي تم إنشاؤه (عبر `RETURNING`)

** نمط SQL: **

```sql
INSERT INTO surveys (...) VALUES (...) RETURNING *;
```

---

#### `updateSurvey`

Updates a survey's fields. Automatically sets `updatedAt` to the current timestamp.

```typescript
async function updateSurvey(
  id: string,
  data: Partial<Survey>
): Promise<Survey>
```

**Parameters:**

| Parameter | Type              | Required | Description           |
|-----------|-------------------|----------|-----------------------|
| `id`      | `string`          | Yes      | Survey ID             |
| `data`    | `Partial<Survey>` | Yes      | Fields to update      |

**Returns:** Updated survey record

**SQL Pattern:**

```sql
UPDATE surveys
SET ..., updated_at = NOW()
WHERE id = ?
RETURNING *;
```

---

#### `deleteSurvey`

يقوم Soft بحذف الاستطلاع عن طريق تعيين `deletedAt` على الطابع الزمني الحالي.

```typescript
async function deleteSurvey(id: string): Promise<void>
```

** نمط SQL: **

```sql
UPDATE surveys SET deleted_at = NOW() WHERE id = ?;
```

**ملاحظة:** تتم تصفية جميع استعلامات القراءة على `deleted_at IS NULL`، لذلك يتم إخفاء الاستطلاعات المحذوفة بشكل فعال من جميع وظائف الاسترجاع.

---

### Survey Response Queries

#### `createSurveyResponse`

Creates a new survey response.

```typescript
async function createSurveyResponse(
  response: NewSurveyResponse
): Promise<SurveyResponse>
```

**Returns:** The created response record (via `RETURNING`)

**SQL Pattern:**

```sql
INSERT INTO survey_responses (...) VALUES (...) RETURNING *;
```

---

#### `getSurveyResponses`

يحصل على استجابات استبيان مقسمة إلى صفحات مع تصفية اختيارية حسب العنصر والمستخدم والنطاق الزمني.

```typescript
async function getSurveyResponses(
  surveyId: string,
  filters?: {
    itemId?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }
): Promise<{
  responses: SurveyResponse[];
  total: number;
  totalPages: number;
}>
```

**المعلمات:**

|المعلمة|اكتب|مطلوب|الافتراضي|الوصف|
|-------------|----------|----------|---------|-----------------------------------|
|`surveyId`|`string`|نعم| --      |معرف الاستطلاع للحصول على ردود عليه|
|`itemId`|`string`|لا| --      |التصفية حسب العنصر|
|`userId`|`string`|لا| --      |تصفية حسب المستخدم|
|`startDate`|`string`|لا| --      |تصفية الردود بعد هذا التاريخ|
|`endDate`|`string`|لا| --      |تصفية الردود قبل هذا التاريخ|
|`page`|`number`|لا| `1`     |رقم الصفحة|
|`limit`|`number`|لا| `10`    |النتائج لكل صفحة|

**المرتجعات:** قائمة الردود المرقّمة

** نمط SQL: **

```sql
-- Data query
SELECT * FROM survey_responses
WHERE survey_id = ?
  AND item_id = ?           -- if itemId provided
  AND user_id = ?           -- if userId provided
  AND completed_at >= ?     -- if startDate provided
  AND completed_at <= ?     -- if endDate provided
ORDER BY completed_at DESC
LIMIT ? OFFSET ?;

-- Count query (same conditions)
SELECT count(*) FROM survey_responses WHERE ...;
```

**ملاحظات الأداء:** تعمل استعلامات البيانات والعدد بالتوازي عبر `Promise.all`.

---

#### `getSurveyResponseById`

Gets a single survey response by ID.

```typescript
async function getSurveyResponseById(
  id: string
): Promise<SurveyResponse | null>
```

**SQL Pattern:**

```sql
SELECT * FROM survey_responses WHERE id = ? LIMIT 1;
```

---

#### `getSurveyResponseCount`

الحصول على إجمالي عدد الاستجابات للاستطلاع.

```typescript
async function getSurveyResponseCount(
  surveyId: string
): Promise<number>
```

**المرتجعات:** يتم احتساب الردود كرقم

** نمط SQL: **

```sql
SELECT count(*) FROM survey_responses WHERE survey_id = ?;
```

---

## Performance Notes

1. **Conditional JOINs** -- `getSurveys` uses two code paths: a simple `SELECT` when no enrichment is needed, and a `LEFT JOIN` with `GROUP BY` only when `withResponseCount` or `withCompletionStatus` is requested. This avoids unnecessary JOIN overhead for basic listing.

2. **Parallel query execution** -- Both `getSurveys` (simple path) and `getSurveyResponses` run data and count queries concurrently via `Promise.all`.

3. **Soft delete consistency** -- All survey read operations consistently filter `deleted_at IS NULL`, ensuring soft-deleted surveys never appear in results.

4. **Date range filtering** -- `getSurveyResponses` converts string dates to `Date` objects before comparison, using `gte`/`lte` operators on `completedAt` for efficient range queries.

5. **Completion status via CASE** -- User completion is calculated inline using `COUNT(CASE WHEN user_id = ? THEN 1 END)`, avoiding a separate subquery or additional database round-trip.

## Usage Examples

### Listing published surveys with response counts

```typescript
import { getSurveys } from '@/lib/db/queries';

const result = await getSurveys({
  status: 'published',
  withResponseCount: true,
  page: 1,
  limit: 20,
});

result.surveys.forEach(s => {
  console.log(`${s.title}: ${s.responseCount} responses`);
});
```

### Checking if a user completed a survey

```typescript
import { getSurveys } from '@/lib/db/queries';

const result = await getSurveys({
  type: 'global',
  status: 'published',
  userId: currentUserId,
  withCompletionStatus: true,
});

const incomplete = result.surveys.filter(s => !s.isCompletedByUser);
```

### Submitting a survey response

```typescript
import { createSurveyResponse } from '@/lib/db/queries';

await createSurveyResponse({
  surveyId: survey.id,
  userId: currentUserId,
  itemId: 'clockify',  // optional, for item-specific surveys
  answers: { q1: 'Very satisfied', q2: 4 },
  completedAt: new Date(),
});
```

### Fetching responses with date filtering

```typescript
import { getSurveyResponses } from '@/lib/db/queries';

const result = await getSurveyResponses(surveyId, {
  startDate: '2025-01-01',
  endDate: '2025-03-31',
  page: 1,
  limit: 50,
});

console.log(`${result.total} responses in Q1 2025`);
```

### Validating slug uniqueness on update

```typescript
import { getSurveyBySlug } from '@/lib/db/queries';

const existing = await getSurveyBySlug('my-survey-slug', surveyBeingEdited.id);
if (existing) {
  throw new Error('Slug already in use by another survey');
}
```
