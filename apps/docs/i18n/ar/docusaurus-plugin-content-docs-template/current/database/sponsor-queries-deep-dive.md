---
id: sponsor-queries-deep-dive
title: الاستعلامات عن التقارير والإشراف، نظرة عميقة
sidebar_label: الاستعلامات عن التقارير والإشراف، نظرة عميقة
sidebar_position: 69
---

# الاستعلامات عن التقارير والإشراف، نظرة عميقة

مرجع شامل لجميع وظائف الاستعلام عن تقارير المحتوى وقاعدة بيانات الإشراف على المستخدم، بما في ذلك تقرير CRUD وتتبع سجل الإشراف وإدارة حالة المستخدم (التحذير والتعليق والحظر) وإحصائيات التقارير.

## نظرة عامة

يتم تنظيم طبقة استعلام التقرير والإشراف في وحدتين متكاملتين:

- **`report.queries.ts`** - تقرير المحتوى CRUD، وقائمة مرقّمة مع البحث والمرشحات، وإحصائيات التقارير حسب الحالة/النوع/السبب، ومنع التقارير المكررة
- **`moderation.queries.ts`** - تسجيل سجل الإشراف، وإجراءات الإشراف على المستخدم (التحذير، والتعليق، والحظر، وإلغاء التعليق، وإلغاء الحظر)، ومساعدي حالة المستخدم

يتم تقديم التقارير من قبل المستخدمين العملاء ضد المحتوى (العناصر أو التعليقات). يقوم المسؤولون بمراجعة التقارير واتخاذ إجراءات الإشراف، والتي يتم تعقبها في جدول منفصل لسجل الإشراف لأغراض التدقيق.

## ملفات المصدر

```
lib/db/queries/report.queries.ts
lib/db/queries/moderation.queries.ts
```

---

## Function Reference: report.queries.ts

### Types

```typescript
type ReportWithReporter = Report & {
  reporter: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  } | null;
  reviewer: {
    id: string;
    email: string | null;
  } | null;
};
```

### `createReport`

Creates a new content report. Automatically sets status to `PENDING`.

```typescript
async function createReport(data: {
  contentType: ReportContentTypeValues;
  contentId: string;
  reason: ReportReasonValues;
  details?: string;
  reportedBy: string;
}): Promise<Report>
```

**Parameters:**

| Parameter     | Type                       | Required | Description                                  |
|---------------|----------------------------|----------|----------------------------------------------|
| `contentType` | `ReportContentTypeValues`  | Yes      | Type of content (`'item'` or `'comment'`)    |
| `contentId`   | `string`                   | Yes      | ID of the reported content                   |
| `reason`      | `ReportReasonValues`       | Yes      | Reason for reporting (`'spam'`, `'harassment'`, `'inappropriate'`, `'other'`) |
| `details`     | `string`                   | No       | Additional details from the reporter         |
| `reportedBy`  | `string`                   | Yes      | Client profile ID of the reporter            |

**Returns:** The created report record

**SQL Pattern:**

```sql
INSERT INTO reports (content_type, content_id, reason, details, reported_by, status)
VALUES (?, ?, ?, ?, ?, 'pending')
RETURNING *;
```

---

### `getReportById`

يحصل على تقرير حسب الهوية مع معلومات المراسل والمراجع. يقوم بتنفيذ استعلامين: أحدهما للتقرير مع المراسل JOIN، والثاني للمراجع إذا كان موجودًا.

```typescript
async function getReportById(
  id: string
): Promise<ReportWithReporter | null>
```

** نمط SQL: **

```sql
-- Report with reporter info
SELECT reports.*, client_profiles.id, name, email, avatar
FROM reports
LEFT JOIN client_profiles ON reports.reported_by = client_profiles.id
WHERE reports.id = ?
LIMIT 1;

-- Reviewer info (separate query, only if reviewedBy exists)
SELECT id, email FROM users WHERE id = ? LIMIT 1;
```

**ملاحظة التصميم:** البحث عن المراجع هو استعلام منفصل لتجنب الانضمام الأيسر الثاني، نظرًا لأن المراجعين هم مستخدمون إداريون من الجدول `users` بينما يكون المراسلون من `client_profiles`.

---

### `getReports`

Gets all reports with pagination, search, and filtering. Returns reports with reporter information.

```typescript
async function getReports(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: ReportStatusValues;
  contentType?: ReportContentTypeValues;
  reason?: ReportReasonValues;
}): Promise<{
  reports: ReportWithReporter[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}>
```

**Parameters:**

| Parameter     | Type                       | Required | Default | Description                                    |
|---------------|----------------------------|----------|---------|------------------------------------------------|
| `page`        | `number`                   | No       | `1`     | Page number                                    |
| `limit`       | `number`                   | No       | `10`    | Results per page                               |
| `search`      | `string`                   | No       | --      | Search in content ID, details, reporter name/email |
| `status`      | `ReportStatusValues`       | No       | --      | Filter by status                               |
| `contentType` | `ReportContentTypeValues`  | No       | --      | Filter by content type                         |
| `reason`      | `ReportReasonValues`       | No       | --      | Filter by reason                               |

**Returns:** Paginated reports list with metadata

**SQL Pattern:**

```sql
-- Count query
SELECT count(*) FROM reports
LEFT JOIN client_profiles ON reports.reported_by = client_profiles.id
WHERE ...;

-- Data query
SELECT reports.*, client_profiles.id, name, email, avatar
FROM reports
LEFT JOIN client_profiles ON reports.reported_by = client_profiles.id
WHERE (content_id ILIKE ? OR details ILIKE ? OR name ILIKE ? OR email ILIKE ?)
  AND status = ?
  AND content_type = ?
  AND reason = ?
ORDER BY reports.created_at DESC
LIMIT ? OFFSET ?;
```

**Search behavior:** Uses `ILIKE` on four fields (`contentId`, `details`, reporter `name`, reporter `email`) with proper SQL wildcard escaping for `%`, `_`, and `\` characters.

**Performance Note:** Reviewer information is not included in list results (`reviewer: null`) to avoid N+1 queries for the listing view.

---

### `updateReport`

تحديثات حالة التقرير والحل ومذكرة المراجعة والمراجع. يدير حقول الطابع الزمني تلقائيًا بناءً على تغيير الحالة.

```typescript
async function updateReport(
  id: string,
  data: {
    status?: ReportStatusValues;
    resolution?: ReportResolutionValues;
    reviewNote?: string;
    reviewedBy?: string;
  }
): Promise<Report | null>
```

**المعلمات:**

|المعلمة|اكتب|مطلوب|الوصف|
|--------------|----------------------------|----------|--------------------------------|
|`id`|`string`|نعم|معرف التقرير|
|`status`|`ReportStatusValues`|لا|الوضع الجديد|
|`resolution`|`ReportResolutionValues`|لا|نوع القرار|
|`reviewNote`|`string`|لا|ملاحظة المراجع|
|`reviewedBy`|`string`|لا|معرف المستخدم المسؤول للمراجع|

** سلوك الطابع الزمني التلقائي: **
- `updatedAt` يتم ضبطه دائمًا على الوقت الحالي
- `reviewedAt` يتم تعيينه عند تغيير الحالة من `PENDING`، أو عند توفير `reviewedBy`
- `resolvedAt` يتم تعيينه عندما تصبح الحالة `RESOLVED` أو `DISMISSED`

** نمط SQL: **

```sql
UPDATE reports
SET status = ?, resolution = ?, review_note = ?,
    reviewed_by = ?, reviewed_at = ?, resolved_at = ?, updated_at = NOW()
WHERE id = ?
RETURNING *;
```

---

### `getReportStats`

Gets comprehensive report statistics grouped by status, content type, and reason.

```typescript
async function getReportStats(): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byContentType: Record<string, number>;
  byReason: Record<string, number>;
  pendingCount: number;
  resolvedCount: number;
}>
```

**Returns:**
- `total` -- Total number of reports
- `byStatus` -- Counts for each status (`pending`, `reviewed`, `resolved`, `dismissed`)
- `byContentType` -- Counts for each content type (`item`, `comment`)
- `byReason` -- Counts for each reason (`spam`, `harassment`, `inappropriate`, `other`)
- `pendingCount` -- Shortcut for pending reports count
- `resolvedCount` -- Combined count of `resolved` + `dismissed` reports

**SQL Pattern:**

```sql
-- Total count
SELECT count(*) FROM reports;

-- By status
SELECT status, count(*) FROM reports GROUP BY status;

-- By content type
SELECT content_type, count(*) FROM reports GROUP BY content_type;

-- By reason
SELECT reason, count(*) FROM reports GROUP BY reason;
```

**Note:** All four GROUP BY queries are run sequentially. Default zero values are set for all known enum values before populating from results.

---

### `hasUserReportedContent`

يتحقق مما إذا كان المستخدم قد أبلغ بالفعل عن محتوى محدد. يستخدم لمنع التقارير المكررة.

```typescript
async function hasUserReportedContent(
  reportedBy: string,
  contentType: ReportContentTypeValues,
  contentId: string
): Promise<boolean>
```

**المعلمات:**

|المعلمة|اكتب|مطلوب|الوصف|
|---------------|----------------------------|----------|---------------------------|
|`reportedBy`|`string`|نعم|معرف ملف تعريف العميل|
|`contentType`|`ReportContentTypeValues`|نعم|نوع المحتوى|
|`contentId`|`string`|نعم|معرف المحتوى|

**المرتجعات:** `true` إذا كان المستخدم قد أبلغ عن هذا المحتوى بالفعل

** نمط SQL: **

```sql
SELECT id FROM reports
WHERE reported_by = ? AND content_type = ? AND content_id = ?
LIMIT 1;
```

---

## Function Reference: moderation.queries.ts

### Types

```typescript
type ModerationHistoryWithDetails = ModerationHistoryRecord & {
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
  performedByUser: {
    id: string;
    email: string | null;
  } | null;
};
```

### Moderation History

#### `createModerationHistory`

Creates a new moderation history entry, recording an action taken against a user.

```typescript
async function createModerationHistory(data: {
  userId: string;
  action: ModerationActionValues;
  reason?: string;
  reportId?: string;
  performedBy?: string;
  contentType?: ReportContentTypeValues;
  contentId?: string;
  details?: Record<string, unknown>;
}): Promise<ModerationHistoryRecord>
```

**Parameters:**

| Parameter     | Type                        | Required | Description                          |
|---------------|-----------------------------|----------|--------------------------------------|
| `userId`      | `string`                    | Yes      | Client profile ID of the target user |
| `action`      | `ModerationActionValues`    | Yes      | Action taken (e.g., warn, suspend, ban) |
| `reason`      | `string`                    | No       | Reason for the action                |
| `reportId`    | `string`                    | No       | Associated report ID                 |
| `performedBy` | `string`                    | No       | Admin user ID who performed the action |
| `contentType` | `ReportContentTypeValues`   | No       | Content type related to the action   |
| `contentId`   | `string`                    | No       | Content ID related to the action     |
| `details`     | `Record<string, unknown>`   | No       | Additional structured data           |

**Returns:** The created moderation history record

**SQL Pattern:**

```sql
INSERT INTO moderation_history (user_id, action, reason, report_id, performed_by,
  content_type, content_id, details)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
RETURNING *;
```

---

#### `getModerationHistoryByUser`

الحصول على سجل الإشراف لمستخدم معين، مع تفاصيل المستخدم ومعلومات المؤدي.

```typescript
async function getModerationHistoryByUser(
  userId: string,
  limit: number = 50
): Promise<ModerationHistoryWithDetails[]>
```

**المعلمات:**

|المعلمة|اكتب|مطلوب|الافتراضي|الوصف|
|-----------|----------|----------|---------|---------------------------|
|`userId`|`string`|نعم| --      |معرف ملف تعريف العميل|
|`limit`|`number`|لا| `50`    |الحد الأقصى للسجلات للعودة|

**المرتجعات:** مجموعة من إدخالات سجل الإشراف مع تفاصيل المستخدم والمؤدي

** نمط SQL: **

```sql
SELECT moderation_history.*, client_profiles.id, name, email
FROM moderation_history
LEFT JOIN client_profiles ON moderation_history.user_id = client_profiles.id
WHERE moderation_history.user_id = ?
ORDER BY moderation_history.created_at DESC
LIMIT ?;

-- Per record: performer lookup
SELECT id, email FROM users WHERE id = ? LIMIT 1;
```

**ملاحظة:** يتم إثراء معلومات المؤدي لكل سجل عبر `Promise.all`، مما يؤدي إلى استعلامات N+1. المؤدي هو المسؤول `user`، بينما الهدف هو `client_profile`.

---

#### `getModerationHistoryByReport`

Gets all moderation history entries related to a specific report.

```typescript
async function getModerationHistoryByReport(
  reportId: string
): Promise<ModerationHistoryWithDetails[]>
```

**SQL Pattern:** Same as `getModerationHistoryByUser` but filtered by `report_id` instead of `user_id`, with no limit applied.

---

### إدارة حالة المستخدم

#### `incrementWarningCount`

يقوم تلقائيًا بزيادة عدد التحذيرات في ملف تعريف العميل.

```typescript
async function incrementWarningCount(
  userId: string
): Promise<ClientProfile>
```

** نمط SQL: **

```sql
UPDATE client_profiles
SET warning_count = COALESCE(warning_count, 0) + 1,
    updated_at = NOW()
WHERE id = ?
RETURNING *;
```

**ملاحظة:** يستخدم `COALESCE` لزيادة القيمة الخالية، ومعالجة الحالات التي لم يتم فيها تعيين `warningCount` مطلقًا.

---

#### `suspendUser`

Suspends a user by setting their status to `'suspended'` and recording the suspension timestamp.

```typescript
async function suspendUser(userId: string): Promise<ClientProfile>
```

**SQL Pattern:**

```sql
UPDATE client_profiles
SET status = 'suspended', suspended_at = NOW(), updated_at = NOW()
WHERE id = ?
RETURNING *;
```

---

#### `unsuspendUser`

استعادة مستخدم معلق إلى الحالة النشطة.

```typescript
async function unsuspendUser(userId: string): Promise<ClientProfile>
```

** نمط SQL: **

```sql
UPDATE client_profiles
SET status = 'active', suspended_at = NULL, updated_at = NOW()
WHERE id = ?
RETURNING *;
```

---

#### `banUser`

Bans a user by setting their status to `'banned'` and recording the ban timestamp.

```typescript
async function banUser(userId: string): Promise<ClientProfile>
```

**SQL Pattern:**

```sql
UPDATE client_profiles
SET status = 'banned', banned_at = NOW(), updated_at = NOW()
WHERE id = ?
RETURNING *;
```

---

#### `unbanUser`

يعيد المستخدم المحظور إلى الحالة النشطة.

```typescript
async function unbanUser(userId: string): Promise<ClientProfile>
```

** نمط SQL: **

```sql
UPDATE client_profiles
SET status = 'active', banned_at = NULL, updated_at = NOW()
WHERE id = ?
RETURNING *;
```

---

### Profile Lookups (Moderation Context)

#### `getClientProfileById`

Gets a client profile by ID. Used within the moderation flow to check current user status.

```typescript
async function getClientProfileById(
  id: string
): Promise<ClientProfile | null>
```

---

#### `getClientProfileByUserId`

يحصل على ملف تعريف العميل عن طريق معرف مستخدم المصادقة.

```typescript
async function getClientProfileByUserId(
  userId: string
): Promise<ClientProfile | null>
```

---

### User Status Helpers

#### `isUserBlocked`

Synchronous helper that checks if a user status indicates the account is blocked.

```typescript
function isUserBlocked(status: string | null): boolean
// Returns: status === 'suspended' || status === 'banned'
```

---

#### `getBlockReasonMessage`

إرجاع رسالة موجهة للمستخدم تشرح سبب تقييد الحساب.

```typescript
function getBlockReasonMessage(status: string | null): string
```

**المرتجعات:**
- `'suspended'`-- "حسابك معلق حاليًا. لا يمكنك تنفيذ هذا الإجراء."
- `'banned'`-- "تم حظر حسابك. لا يمكنك تنفيذ هذا الإجراء."
- أخرى - "حسابك مقيد. لا يمكنك تنفيذ هذا الإجراء."

---

## Enum Reference

### Report Status

| Value        | Description                             |
|--------------|-----------------------------------------|
| `PENDING`    | Newly submitted, awaiting review        |
| `REVIEWED`   | Reviewed by admin, action pending       |
| `RESOLVED`   | Resolved (action taken)                 |
| `DISMISSED`  | Dismissed (no action needed)            |

### Report Content Type

| Value      | Description            |
|------------|------------------------|
| `ITEM`     | Report against an item |
| `COMMENT`  | Report against a comment |

### Report Reason

| Value            | Description              |
|------------------|--------------------------|
| `SPAM`           | Spam content             |
| `HARASSMENT`     | Harassment               |
| `INAPPROPRIATE`  | Inappropriate content    |
| `OTHER`          | Other reason             |

---

## ملاحظات الأداء

1. **الهروب من البحث** - يفلت `getReports` بشكل صحيح من أحرف البدل SQL (`%`، `_`، `\`) في مصطلحات البحث قبل استخدامها في أنماط `ILIKE`.

2. **بحث منفصل عن المراجع** -- `getReportById` ينفذ استعلامًا ثانيًا عن معلومات المراجع فقط عند وجود `reviewedBy`، مما يؤدي إلى تجنب عمليات JOIN غير الضرورية عبر جدولي مستخدمين مختلفين.

3. **تحسين القائمة** - `getReports` يحذف بيانات المراجع في نتائج القائمة (`reviewer: null`) لتجنب استعلامات N+1 عند عرض قوائم التقارير.

4. ** N + 1 للحصول على تفاصيل المؤدي ** - `getModerationHistoryByUser` و`getModerationHistoryByReport` إثراء تفاصيل المؤدي لكل سجل عبر `Promise.all`. بالنسبة لسجلات الإشراف ذات الحجم الكبير، فكر في تجميع عمليات البحث عن الأداء.

5. **الزيادة الذرية** - يستخدم `incrementWarningCount` `COALESCE` لزيادة SQL الخالية من الأخطاء، مما يضمن الصحة حتى بالنسبة للملفات الشخصية التي لم يتم تحذيرها مطلقًا.

6. **تناظر الحالة** - تقوم عمليات التعليق/الحظر بتعيين `status` والطابع الزمني المقابل. إلغاء تعليق/إلغاء الحظر على حالة الاستعادة إلى `'active'` ومسح الطابع الزمني إلى `null`.

## أمثلة الاستخدام

### تقديم تقرير المحتوى

```typescript
import { createReport, hasUserReportedContent } from '@/lib/db/queries';

const alreadyReported = await hasUserReportedContent(
  clientProfileId, 'comment', commentId
);

if (alreadyReported) {
  throw new Error('You have already reported this content');
}

await createReport({
  contentType: 'comment',
  contentId: commentId,
  reason: 'spam',
  details: 'This comment is promoting a scam website',
  reportedBy: clientProfileId,
});
```

### مراجعة التقرير وحله

```typescript
import { updateReport } from '@/lib/db/queries';

// Mark as reviewed
await updateReport(reportId, {
  status: 'reviewed',
  reviewedBy: adminUserId,
  reviewNote: 'Confirmed spam content',
});

// Resolve with action
await updateReport(reportId, {
  status: 'resolved',
  resolution: 'content_removed',
});
```

### اتخاذ إجراءات الاعتدال

```typescript
import {
  createModerationHistory,
  incrementWarningCount,
  suspendUser,
} from '@/lib/db/queries';

// Issue a warning
await incrementWarningCount(clientProfileId);
await createModerationHistory({
  userId: clientProfileId,
  action: 'warning',
  reason: 'Posting spam content',
  reportId: reportId,
  performedBy: adminUserId,
});

// Suspend after repeated violations
await suspendUser(clientProfileId);
await createModerationHistory({
  userId: clientProfileId,
  action: 'suspend',
  reason: 'Multiple spam violations',
  performedBy: adminUserId,
});
```

### التحقق مما إذا كان بإمكان المستخدم تنفيذ الإجراءات

```typescript
import { getClientProfileById, isUserBlocked, getBlockReasonMessage } from '@/lib/db/queries';

const profile = await getClientProfileById(clientProfileId);

if (profile && isUserBlocked(profile.status)) {
  const message = getBlockReasonMessage(profile.status);
  throw new Error(message);
}
```

### عرض إحصائيات لوحة التحكم للإشراف

```typescript
import { getReportStats } from '@/lib/db/queries';

const stats = await getReportStats();

console.log(`Total reports: ${stats.total}`);
console.log(`Pending: ${stats.pendingCount}`);
console.log(`Resolved: ${stats.resolvedCount}`);
console.log(`Spam reports: ${stats.byReason.spam}`);
```
