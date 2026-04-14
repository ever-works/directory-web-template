---
id: sponsor-queries-deep-dive
title: Запитвания за докладване и модериране. Задълбочено гмуркане
sidebar_label: Запитвания за докладване и модериране. Задълбочено гмуркане
sidebar_position: 69
---

# Запитвания за докладване и модериране. Задълбочено гмуркане

Изчерпателна справка за всички функции за заявки в базата данни за отчитане на съдържанието и модериране на потребители, включително отчет CRUD, проследяване на историята на модерирането, управление на потребителския статус (предупреждение, спиране, забрана) и статистика за отчитане.

## Преглед

Слоят на заявката за отчет и модериране е организиран в два допълващи се модула:

- **`report.queries.ts`** -- Доклад за съдържанието CRUD, списък с страници с търсене и филтри, статистика на отчета по състояние/тип/причина и предотвратяване на дублиране на отчети
- **`moderation.queries.ts`** -- Регистриране на хронология на модерирането, действия за модериране на потребителите (предупреждение, спиране, забрана, отмяна на спирането, отмяна на забрана) и помощни средства за потребителски статус

Докладите се подават от потребители на клиенти срещу съдържание (артикули или коментари). Администраторите преглеждат отчетите и предприемат действия за модериране, които се проследяват в отделна таблица с хронология на модерирането за целите на одита.

## Изходни файлове

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

Получава отчет по ID с информация за репортера и рецензента. Извършва две заявки: една за доклада с репортер JOIN и втора за рецензента, ако присъства.

```typescript
async function getReportById(
  id: string
): Promise<ReportWithReporter | null>
```

**SQL модел:**

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

**Бележка за дизайна:** Търсенето на рецензент е отделна заявка, за да се избегне второ LEFT JOIN, тъй като рецензентите са администраторски потребители от таблицата `users`, докато репортерите са от `client_profiles`.

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

Актуализира състоянието на отчета, резолюцията, бележката за преглед и рецензент. Автоматично управлява полетата за клеймо за време въз основа на промяната на състоянието.

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

**Параметри:**

|Параметър|Тип|Задължително|Описание|
|--------------|----------------------------|----------|--------------------------------|
|`id`|`string`|да|ID на отчета|
|`status`|`ReportStatusValues`|не|Нов статус|
|`resolution`|`ReportResolutionValues`|не|Тип резолюция|
|`reviewNote`|`string`|не|Бележка на рецензента|
|`reviewedBy`|`string`|не|Администраторско потребителско име на рецензента|

**Поведение на автоматично времево клеймо:**
- `updatedAt` винаги е настроен на текущия час
- `reviewedAt` се задава, когато статусът се промени от `PENDING` или когато е предоставен `reviewedBy`
- `resolvedAt` се задава, когато статусът стане `RESOLVED` или `DISMISSED`

**SQL модел:**

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

Проверява дали даден потребител вече е съобщил за конкретно съдържание. Използва се за предотвратяване на дублиращи се отчети.

```typescript
async function hasUserReportedContent(
  reportedBy: string,
  contentType: ReportContentTypeValues,
  contentId: string
): Promise<boolean>
```

**Параметри:**

|Параметър|Тип|Задължително|Описание|
|---------------|----------------------------|----------|---------------------------|
|`reportedBy`|`string`|да|ID на клиентския профил|
|`contentType`|`ReportContentTypeValues`|да|Тип съдържание|
|`contentId`|`string`|да|Content ID|

**Връща:** `true`, ако потребителят вече е съобщил за това съдържание

**SQL модел:**

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

Получава хронологията на модерирането за конкретен потребител, с подробности за потребителя и информация за изпълнителя.

```typescript
async function getModerationHistoryByUser(
  userId: string,
  limit: number = 50
): Promise<ModerationHistoryWithDetails[]>
```

**Параметри:**

|Параметър|Тип|Задължително|По подразбиране|Описание|
|-----------|----------|----------|---------|---------------------------|
|`userId`|`string`|да| --      |ID на клиентския профил|
|`limit`|`number`|не| `50`    |Максимален брой записи за връщане|

**Връща:** Масив от записи в историята на модерирането с подробности за потребителя и изпълнителя

**SQL модел:**

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

**Забележка:** Информацията за изпълнителя се обогатява за всеки запис чрез `Promise.all`, което води до N+1 заявки. Изпълнителят е администратор `user`, докато целта е `client_profile`.

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

### Управление на потребителския статус

#### `incrementWarningCount`

Атомно увеличава броя на предупрежденията в клиентски профил.

```typescript
async function incrementWarningCount(
  userId: string
): Promise<ClientProfile>
```

**SQL модел:**

```sql
UPDATE client_profiles
SET warning_count = COALESCE(warning_count, 0) + 1,
    updated_at = NOW()
WHERE id = ?
RETURNING *;
```

**Забележка:** Използва `COALESCE` за null-safe нарастване, обработвайки случаи, когато `warningCount` никога не е задаван.

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

Възстановява спрян потребител до активен статус.

```typescript
async function unsuspendUser(userId: string): Promise<ClientProfile>
```

**SQL модел:**

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

Възстановява активен статус на забранен потребител.

```typescript
async function unbanUser(userId: string): Promise<ClientProfile>
```

**SQL модел:**

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

Получава клиентски профил чрез потребителския идентификатор за удостоверяване.

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

Връща съобщение към потребителя, обясняващо защо акаунтът е ограничен.

```typescript
function getBlockReasonMessage(status: string | null): string
```

**Връща:**
- `'suspended'` -- "Вашият акаунт в момента е спрян. Не можете да извършите това действие."
- `'banned'` -- "Вашият акаунт е забранен. Не можете да извършите това действие."
- Друго -- "Вашият акаунт е ограничен. Не можете да извършите това действие."

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

## Бележки за ефективността

1. **Искраниране при търсене** -- `getReports` избягва правилно SQL заместващите символи (`%`, `_`, `\`) в думите за търсене, преди да ги използва в шаблони `ILIKE`.

2. **Отделно търсене на рецензент** -- `getReportById` извършва втора заявка за информация за рецензент само когато `reviewedBy` присъства, като избягва ненужни JOIN в две различни потребителски таблици.

3. **Оптимизиране на списъци** -- `getReports` пропуска данни за рецензент в резултатите от списъци (`reviewer: null`), за да избегне N+1 заявки при показване на списъци с отчети.

4. **N+1 за подробности за изпълнителя** -- `getModerationHistoryByUser` и `getModerationHistoryByReport` обогатяват подробности за изпълнителя на запис чрез `Promise.all`. За регистрационни файлове за модериране с голям обем помислете за групиране на търсения на изпълнители.

5. **Атомно нарастване** -- `incrementWarningCount` използва `COALESCE` за безопасно SQL нарастване, гарантиращо коректност дори за профили, които никога не са били предупреждавани.

6. **Симетрия на състоянието** -- Операциите за спиране/забрана задават както `status`, така и съответен времеви печат. Отменете спирането/отменете забраната за възстановяване на състоянието на `'active'` и изчистете клеймото за време на `null`.

## Примери за използване

### Изпращане на доклад за съдържанието

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

### Преглед и решаване на доклад

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

### Предприемане на модериращи действия

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

### Проверка дали даден потребител може да извършва действия

```typescript
import { getClientProfileById, isUserBlocked, getBlockReasonMessage } from '@/lib/db/queries';

const profile = await getClientProfileById(clientProfileId);

if (profile && isUserBlocked(profile.status)) {
  const message = getBlockReasonMessage(profile.status);
  throw new Error(message);
}
```

### Преглед на статистическите данни на таблото за управление на модерирането

```typescript
import { getReportStats } from '@/lib/db/queries';

const stats = await getReportStats();

console.log(`Total reports: ${stats.total}`);
console.log(`Pending: ${stats.pendingCount}`);
console.log(`Resolved: ${stats.resolvedCount}`);
console.log(`Spam reports: ${stats.byReason.spam}`);
```
