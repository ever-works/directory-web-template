---
id: sponsor-queries-deep-dive
title: Zapytania dotyczące raportów i moderacji Głębokie nurkowanie
sidebar_label: Zapytania dotyczące raportów i moderacji Głębokie nurkowanie
sidebar_position: 69
---

# Zapytania dotyczące raportów i moderacji Głębokie nurkowanie

Kompleksowe źródło informacji na temat wszystkich funkcji raportowania treści i zapytań do bazy danych dotyczących moderacji użytkowników, w tym raportów CRUD, śledzenia historii moderacji, zarządzania statusem użytkownika (ostrzeganie, zawieszanie, blokowanie) i statystyk raportowania.

## Przegląd

Warstwa zapytań raportów i moderacji jest podzielona na dwa uzupełniające się moduły:

- **`report.queries.ts`** — Raport dotyczący treści CRUD, lista stronicowana z wyszukiwaniem i filtrami, raportowanie statystyk według stanu/typu/przyczyny oraz zapobieganie duplikacjom raportów
- **`moderation.queries.ts`** — Rejestrowanie historii moderacji, działania moderacji użytkownika (ostrzeganie, zawieszanie, blokowanie, cofanie zawieszenia, odblokowywanie) i pomoce dotyczące statusu użytkownika

Użytkownicy klienta przesyłają raporty dotyczące treści (elementów lub komentarzy). Administratorzy przeglądają raporty i podejmują działania moderacyjne, które są śledzone w osobnej tabeli historii moderacji na potrzeby audytu.

## Pliki źródłowe

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

Pobiera raport według identyfikatora z informacjami o reporterze i recenzencie. Wykonuje dwa zapytania: jedno do raportu z reporterem JOIN i drugie do recenzenta, jeśli jest obecny.

```typescript
async function getReportById(
  id: string
): Promise<ReportWithReporter | null>
```

**Wzorzec SQL:**

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

**Uwaga do projektu:** Wyszukiwanie recenzenta jest osobnym zapytaniem, aby uniknąć drugiego LEFT JOIN, ponieważ recenzenci są administratorami tabeli `users`, a reporterzy są z `client_profiles`.

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

Aktualizuje status raportu, rozdzielczość, notatkę z recenzji i recenzenta. Automatycznie zarządza polami znaczników czasu na podstawie zmiany statusu.

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

**Parametry:**

|Parametr|Wpisz|Wymagane|Opis|
|--------------|----------------------------|----------|--------------------------------|
|`id`|`string`|Tak|Identyfikator raportu|
|`status`|`ReportStatusValues`|Nie|Nowy status|
|`resolution`|`ReportResolutionValues`|Nie|Typ rozdzielczości|
|`reviewNote`|`string`|Nie|Notatka recenzenta|
|`reviewedBy`|`string`|Nie|Identyfikator administratora recenzenta|

**Automatyczne zachowanie znacznika czasu:**
- `updatedAt` jest zawsze ustawione na bieżący czas
- `reviewedAt` jest ustawiane, gdy status zmienia się z `PENDING` lub gdy podano `reviewedBy`
- `resolvedAt` jest ustawiane, gdy status zmienia się na `RESOLVED` lub `DISMISSED`

**Wzorzec SQL:**

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

Sprawdza, czy użytkownik nie zgłosił już określonej treści. Służy do zapobiegania duplikowaniu raportów.

```typescript
async function hasUserReportedContent(
  reportedBy: string,
  contentType: ReportContentTypeValues,
  contentId: string
): Promise<boolean>
```

**Parametry:**

|Parametr|Wpisz|Wymagane|Opis|
|---------------|----------------------------|----------|---------------------------|
|`reportedBy`|`string`|Tak|Identyfikator profilu klienta|
|`contentType`|`ReportContentTypeValues`|Tak|Typ treści|
|`contentId`|`string`|Tak|Identyfikator treści|

**Zwroty:** `true` jeśli użytkownik zgłosił już tę treść

**Wzorzec SQL:**

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

Pobiera historię moderacji dla określonego użytkownika, zawierającą szczegółowe informacje o użytkowniku i wykonawcy.

```typescript
async function getModerationHistoryByUser(
  userId: string,
  limit: number = 50
): Promise<ModerationHistoryWithDetails[]>
```

**Parametry:**

|Parametr|Wpisz|Wymagane|Domyślne|Opis|
|-----------|----------|----------|---------|---------------------------|
|`userId`|`string`|Tak| --      |Identyfikator profilu klienta|
|`limit`|`number`|Nie| `50`    |Maksymalna liczba rekordów do zwrócenia|

**Zwroty:** Zestaw wpisów historii moderacji ze szczegółami użytkownika i wykonawcy

**Wzorzec SQL:**

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

**Uwaga:** Informacje o wykonawcach są wzbogacane o każdy rekord za pośrednictwem `Promise.all`, co skutkuje liczbą zapytań N+1. Wykonawca jest administratorem `user`, a celem jest `client_profile`.

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

### Zarządzanie statusem użytkownika

#### `incrementWarningCount`

Niepodzielnie zwiększa liczbę ostrzeżeń w profilu klienta.

```typescript
async function incrementWarningCount(
  userId: string
): Promise<ClientProfile>
```

**Wzorzec SQL:**

```sql
UPDATE client_profiles
SET warning_count = COALESCE(warning_count, 0) + 1,
    updated_at = NOW()
WHERE id = ?
RETURNING *;
```

**Uwaga:** Używa `COALESCE` do przyrostu bezpiecznego zerowego, obsługującego przypadki, w których `warningCount` nigdy nie zostało ustawione.

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

Przywraca zawieszonego użytkownika do stanu aktywnego.

```typescript
async function unsuspendUser(userId: string): Promise<ClientProfile>
```

**Wzorzec SQL:**

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

Przywraca zbanowanego użytkownika do stanu aktywnego.

```typescript
async function unbanUser(userId: string): Promise<ClientProfile>
```

**Wzorzec SQL:**

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

Pobiera profil klienta według identyfikatora użytkownika uwierzytelniającego.

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

Zwraca wiadomość skierowaną do użytkownika wyjaśniającą, dlaczego konto jest ograniczone.

```typescript
function getBlockReasonMessage(status: string | null): string
```

**Zwroty:**
- `'suspended'` -- "Twoje konto jest obecnie zawieszone. Nie możesz wykonać tej akcji."
- `'banned'` -- "Twoje konto zostało zablokowane. Nie możesz wykonać tej akcji."
- Inne – „Twoje konto jest ograniczone. Nie możesz wykonać tej akcji.”

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

## Uwagi dotyczące wydajności

1. **Wyszukiwanie z ucieczką** -- `getReports` prawidłowo powoduje ucieczkę od symboli wieloznacznych SQL (`%`, `_`, `\`) w wyszukiwanych hasłach przed użyciem ich we wzorcach `ILIKE`.

2. **Oddzielne wyszukiwanie recenzenta** -- `getReportById` wykonuje drugie zapytanie o informacje recenzenta tylko wtedy, gdy obecny jest `reviewedBy`, unikając niepotrzebnych JOINów w dwóch różnych tabelach użytkowników.

3. **Optymalizacja listy** -- `getReports` pomija dane recenzenta w wynikach list (`reviewer: null`), aby uniknąć zapytań N+1 podczas wyświetlania list raportów.

4. **N+1 dla szczegółów wykonawcy** -- `getModerationHistoryByUser` i `getModerationHistoryByReport` wzbogacają szczegóły wykonawcy w każdym nagraniu poprzez `Promise.all`. W przypadku dzienników moderacji o dużej objętości należy rozważyć wsadowe wyszukiwanie wykonawców.

5. **Przyrost atomowy** -- `incrementWarningCount` używa `COALESCE` do przyrostu kodu SQL zerowego bezpieczeństwa, zapewniając poprawność nawet dla profili, które nigdy nie były ostrzegane.

6. **Symetria stanu** — Operacje zawieszania/blokowania ustawiają zarówno `status`, jak i odpowiadający im znacznik czasu. Cofnij zawieszenie/odblokuj status przywracania do `'active'` i wyczyść znacznik czasu do `null`.

## Przykłady użycia

### Przesyłanie raportu dotyczącego treści

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

### Przeglądanie i rozwiązywanie raportu

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

### Podejmowanie działań moderacyjnych

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

### Sprawdzanie, czy użytkownik może wykonywać akcje

```typescript
import { getClientProfileById, isUserBlocked, getBlockReasonMessage } from '@/lib/db/queries';

const profile = await getClientProfileById(clientProfileId);

if (profile && isUserBlocked(profile.status)) {
  const message = getBlockReasonMessage(profile.status);
  throw new Error(message);
}
```

### Wyświetlanie statystyk panelu moderacji

```typescript
import { getReportStats } from '@/lib/db/queries';

const stats = await getReportStats();

console.log(`Total reports: ${stats.total}`);
console.log(`Pending: ${stats.pendingCount}`);
console.log(`Resolved: ${stats.resolvedCount}`);
console.log(`Spam reports: ${stats.byReason.spam}`);
```
