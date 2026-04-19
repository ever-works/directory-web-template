---
id: sponsor-queries-deep-dive
title: שאילתות דיווח וניהול Deep Dive
sidebar_label: שאילתות דיווח וניהול Deep Dive
sidebar_position: 69
---

# שאילתות דיווח וניהול Deep Dive

התייחסות מקיפה לכל פונקציות דיווח התוכן וניהול השאילתות במסד הנתונים, כולל דוח CRUD, מעקב אחר היסטוריית ניהול, ניהול סטטוס משתמש (אזהרה, השעיה, איסור) וסטטיסטיקות דיווח.

## סקירה כללית

שכבת השאילתה של הדוח וההתנהלות מאורגנת בשני מודולים משלימים:

- **`report.queries.ts`** -- דוח תוכן CRUD, רישום מעומד עם חיפוש ומסננים, דיווח סטטיסטיקות לפי סטטוס/סוג/סיבה ומניעת כפילויות של דוחות
- **`moderation.queries.ts`** -- רישום היסטוריית ניהול, פעולות ניהול משתמשים (אזהרה, השעיה, חסום, ביטול השעיה, בטל חסימה) ועוזרים לסטטוס משתמש

דוחות מוגשים על ידי משתמשי לקוחות כנגד תוכן (פריטים או הערות). מנהלי מערכת בודקים דוחות ומבצעים פעולות ניהול, אשר עוקבים אחריהם בטבלת היסטוריית ניהול נפרדת למטרות ביקורת.

## קבצי מקור

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

מקבל דוח לפי תעודת זהות עם מידע על כתב וסוקר. מבצע שתי שאילתות: אחת עבור הדו"ח עם הכתב JOIN, ושנייה עבור המבקר אם קיים.

```typescript
async function getReportById(
  id: string
): Promise<ReportWithReporter | null>
```

**דפוס SQL:**

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

**הערת עיצוב:** בדיקת הבודקים היא שאילתה נפרדת כדי להימנע מהצטרפות שנייה משמאל, מכיוון שהבודקים הם משתמשי אדמין מהטבלה `users` בעוד שהכתבים הם מ-`client_profiles`.

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

מעדכן את סטטוס הדוח, ההחלטה, הערת הביקורת והבודק. מנהל באופן אוטומטי שדות חותמת זמן על סמך שינוי הסטטוס.

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

**פרמטרים:**

|פרמטר|הקלד|חובה|תיאור|
|--------------|----------------------------|----------|--------------------------------|
|`id`|`string`|כן|מזהה דיווח|
|`status`|`ReportStatusValues`|לא|סטטוס חדש|
|`resolution`|`ReportResolutionValues`|לא|סוג רזולוציה|
|`reviewNote`|`string`|לא|הערת המבקר|
|`reviewedBy`|`string`|לא|מזהה משתמש מנהל של המבקר|

**התנהגות חותמת זמן אוטומטית:**
- `updatedAt` מוגדר תמיד לשעה הנוכחית
- `reviewedAt` מוגדר כאשר המצב משתנה מ-`PENDING`, או כאשר מסופק `reviewedBy`
- `resolvedAt` מוגדר כאשר המצב הופך ל-`RESOLVED` או `DISMISSED`

**דפוס SQL:**

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

בודק אם משתמש כבר דיווח על תוכן ספציפי. משמש למניעת כפולות של דוחות.

```typescript
async function hasUserReportedContent(
  reportedBy: string,
  contentType: ReportContentTypeValues,
  contentId: string
): Promise<boolean>
```

**פרמטרים:**

|פרמטר|הקלד|חובה|תיאור|
|---------------|----------------------------|----------|---------------------------|
|`reportedBy`|`string`|כן|מזהה פרופיל לקוח|
|`contentType`|`ReportContentTypeValues`|כן|סוג תוכן|
|`contentId`|`string`|כן|מזהה תוכן|

**החזרות:** `true` אם המשתמש כבר דיווח על תוכן זה

**דפוס SQL:**

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

מקבל את היסטוריית הניהול עבור משתמש ספציפי, עם פרטי משתמש ופרטי מבצעים.

```typescript
async function getModerationHistoryByUser(
  userId: string,
  limit: number = 50
): Promise<ModerationHistoryWithDetails[]>
```

**פרמטרים:**

|פרמטר|הקלד|חובה|ברירת מחדל|תיאור|
|-----------|----------|----------|---------|---------------------------|
|`userId`|`string`|כן| --      |מזהה פרופיל לקוח|
|`limit`|`number`|לא| `50`    |מקסימום רשומות להחזר|

**החזרות:** מערך רשומות היסטוריית ניהול עם פרטי משתמש ומבצע

**דפוס SQL:**

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

**הערה:** מידע המבצע מועשר לכל רשומה באמצעות `Promise.all`, וכתוצאה מכך N+1 שאילתות. המבצע הוא מנהל `user`, בעוד שהיעד הוא `client_profile`.

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

### ניהול סטטוס משתמש

#### `incrementWarningCount`

מגדיל באופן אטומי את ספירת האזהרות בפרופיל לקוח.

```typescript
async function incrementWarningCount(
  userId: string
): Promise<ClientProfile>
```

**דפוס SQL:**

```sql
UPDATE client_profiles
SET warning_count = COALESCE(warning_count, 0) + 1,
    updated_at = NOW()
WHERE id = ?
RETURNING *;
```

**הערה:** משתמש ב-`COALESCE` להגדלה בטוחה לאפס, טיפול במקרים שבהם `warningCount` מעולם לא הוגדר.

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

משחזר משתמש מושעה למצב פעיל.

```typescript
async function unsuspendUser(userId: string): Promise<ClientProfile>
```

**דפוס SQL:**

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

משחזר משתמש חסום למצב פעיל.

```typescript
async function unbanUser(userId: string): Promise<ClientProfile>
```

**דפוס SQL:**

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

מקבל פרופיל לקוח לפי מזהה משתמש האימות.

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

מחזירה הודעה הפונה למשתמש המסבירה מדוע החשבון מוגבל.

```typescript
function getBlockReasonMessage(status: string | null): string
```

**מחזירה:**
- `'suspended'` -- "החשבון שלך מושעה כרגע. אינך יכול לבצע פעולה זו."
- `'banned'` -- "החשבון שלך נאסר. אינך יכול לבצע פעולה זו."
- אחר -- "החשבון שלך מוגבל. אינך יכול לבצע פעולה זו."

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

## הערות ביצועים

1. **חיפוש בריחה** -- `getReports` בורח כראוי תווים כלליים של SQL (`%`, `_`, `\`) במונחי חיפוש לפני השימוש בהם בתבניות `ILIKE`.

2. **בדיקת בודקים נפרדת** -- `getReportById` מבצע שאילתה שנייה לקבלת מידע מבקר רק כאשר קיים `reviewedBy`, תוך הימנעות מחיבורים מיותרים על פני שתי טבלאות משתמש שונות.

3. **אופטימיזציה של רשימה** -- `getReports` משמיט את נתוני הבודקים בתוצאות הרשימה (`reviewer: null`) כדי להימנע משאילתות N+1 בעת הצגת רשימות דוחות.

4. **N+1 לפרטי מבצע** -- `getModerationHistoryByUser` ו-`getModerationHistoryByReport` מעשירים את פרטי המבצע לכל תקליט באמצעות `Promise.all`. עבור יומני ניהול בנפח גבוה, שקול חיפושי ביצועים באצווה.

5. **עלייה אטומית** -- `incrementWarningCount` משתמש ב-`COALESCE` עבור תוספת SQL בטוחה ב-Null, מה שמבטיח נכונות גם עבור פרופילים שמעולם לא הוזהרו.

6. **סימטריית סטטוס** -- פעולות השעיה/איסור קובעות גם `status` וגם חותמת זמן מתאימה. בטל את ההשעיה/בטל החסימה של שחזור ל-`'active'` ונקה את חותמת הזמן ל-`null`.

## דוגמאות לשימוש

### הגשת דוח תוכן

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

### סקירה ופתרון דוח

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

### נוקט בפעולות מתינות

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

### בודק אם משתמש יכול לבצע פעולות

```typescript
import { getClientProfileById, isUserBlocked, getBlockReasonMessage } from '@/lib/db/queries';

const profile = await getClientProfileById(clientProfileId);

if (profile && isUserBlocked(profile.status)) {
  const message = getBlockReasonMessage(profile.status);
  throw new Error(message);
}
```

### הצגת נתונים סטטיסטיים של לוח המחוונים לניהול

```typescript
import { getReportStats } from '@/lib/db/queries';

const stats = await getReportStats();

console.log(`Total reports: ${stats.total}`);
console.log(`Pending: ${stats.pendingCount}`);
console.log(`Resolved: ${stats.resolvedCount}`);
console.log(`Spam reports: ${stats.byReason.spam}`);
```
