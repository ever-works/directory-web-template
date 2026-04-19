---
id: sponsor-queries-deep-dive
title: "Отчеты и запросы модерации: подробное описание"
sidebar_label: "Отчеты и запросы модерации: подробное описание"
sidebar_position: 69
---

# Отчеты и запросы модерации: подробное описание

Комплексный справочник по всем функциям отчетов по контенту и запросам к базе данных модерации пользователей, включая отчет CRUD, отслеживание истории модерации, управление статусом пользователя (предупреждение, приостановка, запрет) и отчетность по статистике.

## Обзор

Уровень запросов отчетов и модерации организован в два взаимодополняющих модуля:

- **`report.queries.ts`** — отчет о содержании CRUD, постраничный список с поиском и фильтрами, статистика отчета по статусу/типу/причине и предотвращение дублирования отчетов.
- **`moderation.queries.ts`** — ведение журнала истории модерации, действия по модерации пользователей (предупреждение, приостановка, запрет, возобновление приостановки, разблокировка) и помощники по статусу пользователя.

Отчеты отправляются пользователями клиента по контенту (элементам или комментариям). Администраторы просматривают отчеты и принимают меры по модерации, которые отслеживаются в отдельной таблице истории модерации в целях аудита.

## Исходные файлы

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

Получает отчет по идентификатору с информацией о репортере и рецензенте. Выполняет два запроса: один для отчета с репортером JOIN, а второй для рецензента, если он присутствует.

```typescript
async function getReportById(
  id: string
): Promise<ReportWithReporter | null>
```

**Шаблон SQL:**

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

**Примечание разработчика:** Поиск рецензента представляет собой отдельный запрос, чтобы избежать второго LEFT JOIN, поскольку рецензенты являются администраторами из таблицы `users`, а репортеры — из `client_profiles`.

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

Обновляет статус отчета, разрешение, примечание к обзору и рецензента. Автоматически управляет полями временных меток в зависимости от изменения статуса.

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

**Параметры:**

|Параметр|Тип|Требуется|Описание|
|--------------|----------------------------|----------|--------------------------------|
|`id`|`string`|Да|Идентификатор отчета|
|`status`|`ReportStatusValues`|Нет|Новый статус|
|`resolution`|`ReportResolutionValues`|Нет|Тип разрешения|
|`reviewNote`|`string`|Нет|Примечание рецензента|
|`reviewedBy`|`string`|Нет|Идентификатор администратора рецензента|

**Поведение автоматической отметки времени:**
- `updatedAt` всегда установлено на текущее время.
- `reviewedAt` устанавливается при изменении статуса с `PENDING` или когда предоставляется `reviewedBy`
- `resolvedAt` устанавливается, когда статус становится `RESOLVED` или `DISMISSED`

**Шаблон SQL:**

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

Проверяет, сообщил ли пользователь уже об определенном контенте. Используется для предотвращения дублирования отчетов.

```typescript
async function hasUserReportedContent(
  reportedBy: string,
  contentType: ReportContentTypeValues,
  contentId: string
): Promise<boolean>
```

**Параметры:**

|Параметр|Тип|Требуется|Описание|
|---------------|----------------------------|----------|---------------------------|
|`reportedBy`|`string`|Да|Идентификатор профиля клиента|
|`contentType`|`ReportContentTypeValues`|Да|Тип контента|
|`contentId`|`string`|Да|Идентификатор контента|

**Возврат:** `true`, если пользователь уже сообщил об этом контенте.

**Шаблон SQL:**

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

Получает историю модерации для конкретного пользователя со сведениями о пользователе и информацией об исполнителе.

```typescript
async function getModerationHistoryByUser(
  userId: string,
  limit: number = 50
): Promise<ModerationHistoryWithDetails[]>
```

**Параметры:**

|Параметр|Тип|Требуется|По умолчанию|Описание|
|-----------|----------|----------|---------|---------------------------|
|`userId`|`string`|Да| --      |Идентификатор профиля клиента|
|`limit`|`number`|Нет| `50`    |Максимальное количество возвращаемых записей|

**Возвраты:** Массив записей истории модерации с данными пользователя и исполнителя.

**Шаблон SQL:**

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

**Примечание.** Информация об исполнителе пополняется для каждой записи через `Promise.all`, что приводит к N+1 запросам. Исполнителем является администратор `user`, а целью — `client_profile`.

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

### Управление статусом пользователя

#### `incrementWarningCount`

Атомарно увеличивает количество предупреждений в профиле клиента.

```typescript
async function incrementWarningCount(
  userId: string
): Promise<ClientProfile>
```

**Шаблон SQL:**

```sql
UPDATE client_profiles
SET warning_count = COALESCE(warning_count, 0) + 1,
    updated_at = NOW()
WHERE id = ?
RETURNING *;
```

**Примечание:** `COALESCE` используется для нулевого приращения и обработки случаев, когда `warningCount` никогда не устанавливался.

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

Восстанавливает заблокированного пользователя в активное состояние.

```typescript
async function unsuspendUser(userId: string): Promise<ClientProfile>
```

**Шаблон SQL:**

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

Возвращает заблокированному пользователю активный статус.

```typescript
async function unbanUser(userId: string): Promise<ClientProfile>
```

**Шаблон SQL:**

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

Получает профиль клиента по идентификатору пользователя проверки подлинности.

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

Возвращает сообщение пользователю, объясняющее, почему учетная запись ограничена.

```typescript
function getBlockReasonMessage(status: string | null): string
```

**Возвраты:**
- `'suspended'` -- «Ваша учетная запись в настоящее время заблокирована. Вы не можете выполнить это действие».
- `'banned'` -- "Ваша учетная запись заблокирована. Вы не можете выполнить это действие."
- Другое — «Ваша учетная запись ограничена. Вы не можете выполнить это действие».

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

## Примечания по производительности

1. **Экранирование поиска** — `getReports` правильно экранирует подстановочные знаки SQL (`%`, `_`, `\`) в условиях поиска перед их использованием в шаблонах `ILIKE`.

2. **Отдельный поиск рецензента** – `getReportById` выполняет второй запрос информации о рецензенте только при наличии `reviewedBy`, избегая ненужных СОЕДИНЕНИЙ между двумя разными пользовательскими таблицами.

3. **Оптимизация списков** – `getReports` опускает данные рецензентов в результатах списка (`reviewer: null`), чтобы избежать запросов N+1 при отображении списков отчетов.

4. **N+1 для сведений об исполнителе** -- `getModerationHistoryByUser` и `getModerationHistoryByReport` обогащают сведения об исполнителе для каждой записи через `Promise.all`. Для журналов модерации большого объема рассмотрите возможность пакетного поиска исполнителей.

5. **Атомарное приращение** – `incrementWarningCount` использует `COALESCE` для нулевого приращения SQL, гарантируя корректность даже для профилей, о которых никогда не было предупреждений.

6. **Симметрия статуса** – операции приостановки/запрета устанавливают как `status`, так и соответствующую временную метку. Отмените приостановку/разблокировку, восстановите статус `'active'` и очистите временную метку `null`.

## Примеры использования

### Отправка отчета о содержании

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

### Просмотр и решение отчета

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

### Принятие мер по модерации

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

### Проверка возможности пользователя выполнять действия

```typescript
import { getClientProfileById, isUserBlocked, getBlockReasonMessage } from '@/lib/db/queries';

const profile = await getClientProfileById(clientProfileId);

if (profile && isUserBlocked(profile.status)) {
  const message = getBlockReasonMessage(profile.status);
  throw new Error(message);
}
```

### Просмотр статистики панели модерации

```typescript
import { getReportStats } from '@/lib/db/queries';

const stats = await getReportStats();

console.log(`Total reports: ${stats.total}`);
console.log(`Pending: ${stats.pendingCount}`);
console.log(`Resolved: ${stats.resolvedCount}`);
console.log(`Spam reports: ${stats.byReason.spam}`);
```
