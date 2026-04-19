---
id: sponsor-queries-deep-dive
title: Detaillierte Informationen zu Berichts- und Moderationsanfragen
sidebar_label: Detaillierte Informationen zu Berichts- und Moderationsanfragen
sidebar_position: 69
---

# Detaillierte Informationen zu Berichts- und Moderationsanfragen

Umfassende Referenz für alle Inhaltsberichts- und Benutzermoderationsdatenbankabfragefunktionen, einschließlich Berichts-CRUD, Nachverfolgung des Moderationsverlaufs, Benutzerstatusverwaltung (Warnung, Sperrung, Sperre) und Berichtsstatistiken.

## Übersicht

Die Berichts- und Moderationsabfrageebene ist in zwei komplementäre Module unterteilt:

- **`report.queries.ts`** – Inhaltsbericht CRUD, paginierte Auflistung mit Suche und Filtern, Berichtsstatistiken nach Status/Typ/Grund und Vermeidung doppelter Berichte
- **`moderation.queries.ts`** – Protokollierung des Moderationsverlaufs, Benutzermoderationsaktionen (Warnung, Sperrung, Sperrung, Sperrung aufheben, Sperrung aufheben) und Benutzerstatus-Helfer

Berichte werden von Kundenbenutzern zu Inhalten (Artikeln oder Kommentaren) eingereicht. Administratoren überprüfen Berichte und ergreifen Moderationsmaßnahmen, die zu Prüfzwecken in einer separaten Moderationsverlaufstabelle verfolgt werden.

## Quelldateien

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

Ruft einen Bericht nach ID mit Berichterstatter- und Prüferinformationen ab. Führt zwei Abfragen durch: eine für den Bericht mit JOIN des Reporters und eine zweite für den Prüfer, falls vorhanden.

```typescript
async function getReportById(
  id: string
): Promise<ReportWithReporter | null>
```

**SQL-Muster:**

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

**Designhinweis:** Die Prüfersuche ist eine separate Abfrage, um einen zweiten LEFT JOIN zu vermeiden, da Prüfer Administratorbenutzer aus der Tabelle `users` sind, während Reporter aus `client_profiles` stammen.

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

Aktualisiert den Berichtsstatus, die Lösung, die Prüfnotiz und den Prüfer. Verwaltet Zeitstempelfelder automatisch basierend auf der Statusänderung.

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

**Parameter:**

|Parameter|Typ|Erforderlich|Beschreibung|
|--------------|----------------------------|----------|--------------------------------|
|`id`|`string`|Ja|Berichts-ID|
|`status`|`ReportStatusValues`|Nein|Neuer Status|
|`resolution`|`ReportResolutionValues`|Nein|Auflösungstyp|
|`reviewNote`|`string`|Nein|Anmerkung des Rezensenten|
|`reviewedBy`|`string`|Nein|Admin-Benutzer-ID des Prüfers|

**Automatisches Zeitstempelverhalten:**
- `updatedAt` ist immer auf die aktuelle Uhrzeit eingestellt
- `reviewedAt` wird gesetzt, wenn sich der Status von `PENDING` ändert oder wenn `reviewedBy` bereitgestellt wird
- `resolvedAt` wird gesetzt, wenn der Status `RESOLVED` oder `DISMISSED` wird.

**SQL-Muster:**

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

Überprüft, ob ein Benutzer bestimmte Inhalte bereits gemeldet hat. Wird verwendet, um doppelte Berichte zu verhindern.

```typescript
async function hasUserReportedContent(
  reportedBy: string,
  contentType: ReportContentTypeValues,
  contentId: string
): Promise<boolean>
```

**Parameter:**

|Parameter|Typ|Erforderlich|Beschreibung|
|---------------|----------------------------|----------|---------------------------|
|`reportedBy`|`string`|Ja|Kundenprofil-ID|
|`contentType`|`ReportContentTypeValues`|Ja|Inhaltstyp|
|`contentId`|`string`|Ja|Inhalts-ID|

**Rückgabe:** `true`, wenn der Benutzer diesen Inhalt bereits gemeldet hat

**SQL-Muster:**

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

Ruft den Moderationsverlauf für einen bestimmten Benutzer mit Benutzerdetails und Darstellerinformationen ab.

```typescript
async function getModerationHistoryByUser(
  userId: string,
  limit: number = 50
): Promise<ModerationHistoryWithDetails[]>
```

**Parameter:**

|Parameter|Typ|Erforderlich|Standard|Beschreibung|
|-----------|----------|----------|---------|---------------------------|
|`userId`|`string`|Ja| --      |Kundenprofil-ID|
|`limit`|`number`|Nein| `50`    |Maximale Anzahl zurückzugebender Datensätze|

**Rückgabe:** Array von Moderationsverlaufseinträgen mit Benutzer- und Darstellerdetails

**SQL-Muster:**

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

**Hinweis:** Darstellerinformationen werden pro Datensatz über `Promise.all` angereichert, was zu N+1 Abfragen führt. Der Ausführende ist ein Administrator `user`, während das Ziel ein `client_profile` ist.

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

### Benutzerstatusverwaltung

#### `incrementWarningCount`

Erhöht atomar die Anzahl der Warnungen für ein Clientprofil.

```typescript
async function incrementWarningCount(
  userId: string
): Promise<ClientProfile>
```

**SQL-Muster:**

```sql
UPDATE client_profiles
SET warning_count = COALESCE(warning_count, 0) + 1,
    updated_at = NOW()
WHERE id = ?
RETURNING *;
```

**Hinweis:** Verwendet `COALESCE` für eine nullsichere Inkrementierung und behandelt Fälle, in denen `warningCount` nie festgelegt wurde.

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

Setzt einen gesperrten Benutzer wieder in den aktiven Status zurück.

```typescript
async function unsuspendUser(userId: string): Promise<ClientProfile>
```

**SQL-Muster:**

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

Stellt den aktiven Status eines gesperrten Benutzers wieder her.

```typescript
async function unbanUser(userId: string): Promise<ClientProfile>
```

**SQL-Muster:**

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

Ruft ein Clientprofil anhand der Authentifizierungsbenutzer-ID ab.

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

Gibt eine an den Benutzer gerichtete Nachricht zurück, die erklärt, warum das Konto eingeschränkt ist.

```typescript
function getBlockReasonMessage(status: string | null): string
```

**Rücksendungen:**
- `'suspended'` – „Ihr Konto ist derzeit gesperrt. Sie können diese Aktion nicht ausführen.“
- `'banned'` – „Ihr Konto wurde gesperrt. Sie können diese Aktion nicht ausführen.“
- Sonstiges – „Ihr Konto ist eingeschränkt. Sie können diese Aktion nicht ausführen.“

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

## Leistungshinweise

1. **Such-Escapezeichen** – `getReports` maskiert ordnungsgemäß SQL-Platzhalter (`%`, `_`, `\`) in Suchbegriffen, bevor sie in `ILIKE` Mustern verwendet werden.

2. **Separate Prüfersuche** – `getReportById` führt nur dann eine zweite Abfrage nach Prüferinformationen durch, wenn `reviewedBy` vorhanden ist, wodurch unnötige JOINs über zwei verschiedene Benutzertabellen hinweg vermieden werden.

3. **Listenoptimierung** – `getReports` lässt Prüferdaten in Listenergebnissen weg (`reviewer: null`), um N+1-Abfragen bei der Anzeige von Berichtslisten zu vermeiden.

4. **N+1 für Darstellerdetails** – `getModerationHistoryByUser` und `getModerationHistoryByReport` bereichern die Darstellerdetails pro Datensatz über `Promise.all`. Bei umfangreichen Moderationsprotokollen sollten Sie die Batch-Suche nach Darstellern in Betracht ziehen.

5. **Atomisches Inkrement** – `incrementWarningCount` verwendet `COALESCE` für nullsicheres SQL-Inkrement und stellt so die Korrektheit auch für Profile sicher, die nie gewarnt wurden.

6. **Statussymmetrie** – Suspendierungs-/Verbotsvorgänge setzen sowohl `status` als auch einen entsprechenden Zeitstempel. Heben Sie den Wiederherstellungsstatus auf `'active'` auf und löschen Sie den Zeitstempel auf `null`.

## Anwendungsbeispiele

### Einreichen eines Inhaltsberichts

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

### Überprüfung und Lösung eines Berichts

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

### Moderationsmaßnahmen ergreifen

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

### Überprüfen, ob ein Benutzer Aktionen ausführen kann

```typescript
import { getClientProfileById, isUserBlocked, getBlockReasonMessage } from '@/lib/db/queries';

const profile = await getClientProfileById(clientProfileId);

if (profile && isUserBlocked(profile.status)) {
  const message = getBlockReasonMessage(profile.status);
  throw new Error(message);
}
```

### Statistiken zum Moderations-Dashboard anzeigen

```typescript
import { getReportStats } from '@/lib/db/queries';

const stats = await getReportStats();

console.log(`Total reports: ${stats.total}`);
console.log(`Pending: ${stats.pendingCount}`);
console.log(`Resolved: ${stats.resolvedCount}`);
console.log(`Spam reports: ${stats.byReason.spam}`);
```
