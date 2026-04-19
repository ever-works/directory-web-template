---
id: sponsor-queries-deep-dive
title: Rapport- en moderatievragen Deep Dive
sidebar_label: Rapport- en moderatievragen Deep Dive
sidebar_position: 69
---

# Rapport- en moderatievragen Deep Dive

Uitgebreide referentie voor alle functies voor inhoudsrapportage en databasequery's voor gebruikersmoderatie, inclusief CRUD-rapporten, het bijhouden van moderatiegeschiedenis, beheer van gebruikersstatus (waarschuwen, opschorten, verbannen) en rapportagestatistieken.

## Overzicht

De rapport- en moderatiequerylaag is georganiseerd in twee complementaire modules:

- **`report.queries.ts`** -- Inhoudsrapport CRUD, gepagineerde lijst met zoeken en filters, rapportstatistieken op status/type/reden, en preventie van dubbele rapporten
- **`moderation.queries.ts`** -- Registratie van de moderatiegeschiedenis, acties voor gebruikersmoderatie (waarschuwen, opschorten, verbannen, opschorten opheffen, de ban opheffen) en helpers voor de gebruikersstatus

Rapporten worden door klantgebruikers ingediend op basis van de inhoud (items of opmerkingen). Beheerders beoordelen rapporten en ondernemen moderatieacties, die voor auditdoeleinden worden bijgehouden in een aparte moderatiegeschiedenistabel.

## Bronbestanden

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

Krijgt een rapport per ID met informatie over de verslaggever en de revisor. Voert twee query's uit: één voor het rapport met reporter JOIN, en een tweede voor de reviewer, indien aanwezig.

```typescript
async function getReportById(
  id: string
): Promise<ReportWithReporter | null>
```

**SQL-patroon:**

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

**Ontwerpopmerking:** Het opzoeken van de revisor is een afzonderlijke query om een tweede LEFT JOIN te voorkomen, aangezien revisoren beheerders zijn van de tabel `users`, terwijl verslaggevers afkomstig zijn van `client_profiles`.

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

Werkt de rapportstatus, resolutie, beoordelingsnotitie en revisor bij. Beheert automatisch tijdstempelvelden op basis van de statuswijziging.

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

**Parameters:**

|Parameter|Typ|Vereist|Beschrijving|
|--------------|----------------------------|----------|--------------------------------|
|`id`|`string`|Ja|Rapport-ID|
|`status`|`ReportStatusValues`|Nee|Nieuwe status|
|`resolution`|`ReportResolutionValues`|Nee|Resolutietype|
|`reviewNote`|`string`|Nee|Opmerking van de recensent|
|`reviewedBy`|`string`|Nee|Beheerdersgebruikers-ID van de revisor|

**Automatisch tijdstempelgedrag:**
- `updatedAt` is altijd ingesteld op de huidige tijd
- `reviewedAt` wordt ingesteld wanneer de status verandert van `PENDING`, of wanneer `reviewedBy` wordt opgegeven
- `resolvedAt` wordt ingesteld wanneer de status `RESOLVED` of `DISMISSED` wordt

**SQL-patroon:**

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

Controleert of een gebruiker al specifieke inhoud heeft gerapporteerd. Wordt gebruikt om dubbele rapporten te voorkomen.

```typescript
async function hasUserReportedContent(
  reportedBy: string,
  contentType: ReportContentTypeValues,
  contentId: string
): Promise<boolean>
```

**Parameters:**

|Parameter|Typ|Vereist|Beschrijving|
|---------------|----------------------------|----------|---------------------------|
|`reportedBy`|`string`|Ja|Klantprofiel-ID|
|`contentType`|`ReportContentTypeValues`|Ja|Inhoudstype|
|`contentId`|`string`|Ja|Inhouds-ID|

**Retourneert:** `true` als de gebruiker deze inhoud al heeft gerapporteerd

**SQL-patroon:**

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

Krijgt de moderatiegeschiedenis voor een specifieke gebruiker, met gebruikersgegevens en informatie over de artiest.

```typescript
async function getModerationHistoryByUser(
  userId: string,
  limit: number = 50
): Promise<ModerationHistoryWithDetails[]>
```

**Parameters:**

|Parameter|Typ|Vereist|Standaard|Beschrijving|
|-----------|----------|----------|---------|---------------------------|
|`userId`|`string`|Ja| --      |Klantprofiel-ID|
|`limit`|`number`|Nee| `50`    |Maximaal aantal records dat moet worden geretourneerd|

**Retouren:** Een reeks moderatiegeschiedenisitems met gebruikers- en artiestgegevens

**SQL-patroon:**

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

**Opmerking:** Informatie over de artiest wordt per record verrijkt via `Promise.all`, wat resulteert in N+1 queries. De uitvoerder is een beheerder `user`, terwijl het doelwit een `client_profile` is.

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

### Beheer van gebruikersstatus

#### `incrementWarningCount`

Verhoogt atomair het aantal waarschuwingen voor een klantprofiel.

```typescript
async function incrementWarningCount(
  userId: string
): Promise<ClientProfile>
```

**SQL-patroon:**

```sql
UPDATE client_profiles
SET warning_count = COALESCE(warning_count, 0) + 1,
    updated_at = NOW()
WHERE id = ?
RETURNING *;
```

**Opmerking:** Gebruikt `COALESCE` voor null-safe verhoging, waarbij gevallen worden afgehandeld waarin `warningCount` nooit is ingesteld.

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

Herstelt een geschorste gebruiker naar de actieve status.

```typescript
async function unsuspendUser(userId: string): Promise<ClientProfile>
```

**SQL-patroon:**

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

Herstelt een verbannen gebruiker naar de actieve status.

```typescript
async function unbanUser(userId: string): Promise<ClientProfile>
```

**SQL-patroon:**

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

Haalt een klantprofiel op via de authenticatie-gebruikers-ID.

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

Retourneert een gebruikersgericht bericht waarin wordt uitgelegd waarom het account is beperkt.

```typescript
function getBlockReasonMessage(status: string | null): string
```

**Retourzendingen:**
- `'suspended'` -- "Uw account is momenteel opgeschort. U kunt deze actie niet uitvoeren."
- `'banned'` -- "Uw account is verbannen. U kunt deze actie niet uitvoeren."
- Overige -- "Uw account is beperkt. U kunt deze actie niet uitvoeren."

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

## Prestatienotities

1. **Zoekopdracht wordt ontsnapt** -- `getReports` ontsnapt correct aan SQL-wildcards (`%`, `_`, `\`) in zoektermen voordat deze worden gebruikt in `ILIKE`-patronen.

2. **Afzonderlijke revisor opzoeken** -- `getReportById` voert alleen een tweede query uit voor revisorinformatie wanneer `reviewedBy` aanwezig is, waardoor onnodige JOIN's tussen twee verschillende gebruikerstabellen worden vermeden.

3. **Lijstoptimalisatie** -- `getReports` laat reviewergegevens weg in lijstresultaten (`reviewer: null`) om N+1-query's te vermijden bij het weergeven van rapportlijsten.

4. **N+1 voor details van de artiest** -- `getModerationHistoryByUser` en `getModerationHistoryByReport` verrijken de details van de artiest per record via `Promise.all`. Voor moderatielogboeken met een hoog volume kunt u batch-lookups van artiesten overwegen.

5. **Atomische toename** -- `incrementWarningCount` gebruikt `COALESCE` voor nulveilige SQL-verhoging, waardoor de juistheid wordt gegarandeerd, zelfs voor profielen die nooit zijn gewaarschuwd.

6. **Statussymmetrie** -- Opschortings-/verbodsbewerkingen stellen zowel `status` als een corresponderend tijdstempel in. Herstelstatus opheffen/uitsluiten naar `'active'` en het tijdstempel wissen naar `null`.

## Gebruiksvoorbeelden

### Het indienen van een inhoudelijk rapport

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

### Een rapport beoordelen en oplossen

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

### Matigingsactie ondernemen

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

### Controleren of een gebruiker acties kan uitvoeren

```typescript
import { getClientProfileById, isUserBlocked, getBlockReasonMessage } from '@/lib/db/queries';

const profile = await getClientProfileById(clientProfileId);

if (profile && isUserBlocked(profile.status)) {
  const message = getBlockReasonMessage(profile.status);
  throw new Error(message);
}
```

### Moderatiedashboardstatistieken bekijken

```typescript
import { getReportStats } from '@/lib/db/queries';

const stats = await getReportStats();

console.log(`Total reports: ${stats.total}`);
console.log(`Pending: ${stats.pendingCount}`);
console.log(`Resolved: ${stats.resolvedCount}`);
console.log(`Spam reports: ${stats.byReason.spam}`);
```
