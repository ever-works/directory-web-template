---
id: sponsor-queries-deep-dive
title: Approfondimento sulle domande di report e moderazione
sidebar_label: Approfondimento sulle domande di report e moderazione
sidebar_position: 69
---

# Approfondimento sulle domande di report e moderazione

Riferimento completo per tutte le funzioni di reporting dei contenuti e di query del database di moderazione degli utenti, inclusi report CRUD, monitoraggio della cronologia di moderazione, gestione dello stato degli utenti (avviso, sospensione, esclusione) e statistiche di reporting.

## Panoramica

Il livello di query di report e moderazione è organizzato in due moduli complementari:

- **`report.queries.ts`** -- Report CRUD sui contenuti, elenco impaginato con ricerca e filtri, statistiche dei report per stato/tipo/motivo e prevenzione dei report duplicati
- **`moderation.queries.ts`** -- Registrazione della cronologia della moderazione, azioni di moderazione dell'utente (avviso, sospensione, esclusione, annullamento della sospensione, annullamento dell'esclusione) e assistenti per lo stato dell'utente

I report vengono inviati dagli utenti client rispetto al contenuto (elementi o commenti). Gli amministratori esaminano i rapporti e intraprendono azioni di moderazione, che vengono tracciate in una tabella della cronologia di moderazione separata a fini di controllo.

## File di origine

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

Ottiene un report per ID con informazioni sul reporter e sul revisore. Esegue due query: una per il report con il reporter JOIN e una seconda per il revisore se presente.

```typescript
async function getReportById(
  id: string
): Promise<ReportWithReporter | null>
```

**Modello SQL:**

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

**Nota di progettazione:** la ricerca del revisore è una query separata per evitare un secondo LEFT JOIN, poiché i revisori sono utenti amministratori della tabella `users` mentre i reporter provengono da `client_profiles`.

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

Aggiorna lo stato del report, la risoluzione, la nota di revisione e il revisore. Gestisce automaticamente i campi timestamp in base al cambiamento di stato.

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

**Parametri:**

|Parametro|Digitare|Obbligatorio|Descrizione|
|--------------|----------------------------|----------|--------------------------------|
|`id`|`string`|Sì|Identificativo del rapporto|
|`status`|`ReportStatusValues`|No|Nuovo stato|
|`resolution`|`ReportResolutionValues`|No|Tipo di risoluzione|
|`reviewNote`|`string`|No|Nota del revisore|
|`reviewedBy`|`string`|No|ID utente amministratore del revisore|

**Comportamento del timestamp automatico:**
- `updatedAt` è sempre impostato sull'ora corrente
- `reviewedAt` viene impostato quando lo stato cambia da `PENDING` o quando viene fornito `reviewedBy`
- `resolvedAt` viene impostato quando lo stato diventa `RESOLVED` o `DISMISSED`

**Modello SQL:**

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

Controlla se un utente ha già segnalato contenuti specifici. Utilizzato per evitare report duplicati.

```typescript
async function hasUserReportedContent(
  reportedBy: string,
  contentType: ReportContentTypeValues,
  contentId: string
): Promise<boolean>
```

**Parametri:**

|Parametro|Digitare|Obbligatorio|Descrizione|
|---------------|----------------------------|----------|---------------------------|
|`reportedBy`|`string`|Sì|ID del profilo cliente|
|`contentType`|`ReportContentTypeValues`|Sì|Tipo di contenuto|
|`contentId`|`string`|Sì|Identificazione contenuto|

**Restituisce:** `true` se l'utente ha già segnalato questo contenuto

**Modello SQL:**

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

Ottiene la cronologia della moderazione per un utente specifico, con i dettagli dell'utente e le informazioni sull'esecutore.

```typescript
async function getModerationHistoryByUser(
  userId: string,
  limit: number = 50
): Promise<ModerationHistoryWithDetails[]>
```

**Parametri:**

|Parametro|Digitare|Obbligatorio|Predefinito|Descrizione|
|-----------|----------|----------|---------|---------------------------|
|`userId`|`string`|Sì| --      |ID del profilo cliente|
|`limit`|`number`|No| `50`    |Numero massimo di record da restituire|

**Restituisce:** Serie di voci della cronologia di moderazione con i dettagli dell'utente e dell'esecutore

**Modello SQL:**

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

**Nota:** le informazioni sull'esecutore vengono arricchite per record tramite `Promise.all`, risultando in N+1 query. L'esecutore è un amministratore `user`, mentre il target è un `client_profile`.

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

### Gestione dello stato degli utenti

#### `incrementWarningCount`

Incrementa atomicamente il conteggio degli avvisi su un profilo client.

```typescript
async function incrementWarningCount(
  userId: string
): Promise<ClientProfile>
```

**Modello SQL:**

```sql
UPDATE client_profiles
SET warning_count = COALESCE(warning_count, 0) + 1,
    updated_at = NOW()
WHERE id = ?
RETURNING *;
```

**Nota:** Utilizza `COALESCE` per l'incremento null-safe, gestendo i casi in cui `warningCount` non è mai stato impostato.

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

Ripristina un utente sospeso allo stato attivo.

```typescript
async function unsuspendUser(userId: string): Promise<ClientProfile>
```

**Modello SQL:**

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

Ripristina un utente escluso allo stato attivo.

```typescript
async function unbanUser(userId: string): Promise<ClientProfile>
```

**Modello SQL:**

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

Ottiene un profilo client in base all'ID utente di autenticazione.

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

Restituisce un messaggio rivolto all'utente che spiega il motivo per cui l'account è limitato.

```typescript
function getBlockReasonMessage(status: string | null): string
```

**Resi:**
- `'suspended'` -- "Il tuo account è attualmente sospeso. Non puoi eseguire questa azione."
- `'banned'` -- "Il tuo account è stato bannato. Non puoi eseguire questa azione."
- Altro: "Il tuo account è limitato. Non puoi eseguire questa azione."

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

## Note sulle prestazioni

1. **Escape della ricerca** -- `getReports` esegue correttamente l'escape dei caratteri jolly SQL (`%`, `_`, `\`) nei termini di ricerca prima di utilizzarli nei pattern `ILIKE`.

2. **Ricerca separata del revisore** -- `getReportById` esegue una seconda query per le informazioni sul revisore solo quando è presente `reviewedBy`, evitando JOIN non necessari tra due diverse tabelle utente.

3. **Ottimizzazione elenco** -- `getReports` omette i dati del revisore nei risultati dell'elenco (`reviewer: null`) per evitare N+1 query durante la visualizzazione degli elenchi dei rapporti.

4. **N+1 per i dettagli dell'esecutore** -- `getModerationHistoryByUser` e `getModerationHistoryByReport` arricchiscono i dettagli dell'esecutore per record tramite `Promise.all`. Per i log di moderazione a volume elevato, prendi in considerazione la possibilità di effettuare ricerche in batch degli artisti.

5. **Incremento atomico** -- `incrementWarningCount` utilizza `COALESCE` per l'incremento SQL null-safe, garantendo la correttezza anche per i profili che non sono mai stati avvisati.

6. **Simmetria dello stato** -- Le operazioni di sospensione/esclusione impostano sia `status` che un timestamp corrispondente. Annulla la sospensione/ripristina lo stato di ripristino su `'active'` e cancella il timestamp su `null`.

## Esempi di utilizzo

### Invio di un rapporto sui contenuti

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

### Revisione e risoluzione di un report

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

### Adottare un'azione di moderazione

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

### Verifica se un utente può eseguire azioni

```typescript
import { getClientProfileById, isUserBlocked, getBlockReasonMessage } from '@/lib/db/queries';

const profile = await getClientProfileById(clientProfileId);

if (profile && isUserBlocked(profile.status)) {
  const message = getBlockReasonMessage(profile.status);
  throw new Error(message);
}
```

### Visualizzazione delle statistiche della dashboard di moderazione

```typescript
import { getReportStats } from '@/lib/db/queries';

const stats = await getReportStats();

console.log(`Total reports: ${stats.total}`);
console.log(`Pending: ${stats.pendingCount}`);
console.log(`Resolved: ${stats.resolvedCount}`);
console.log(`Spam reports: ${stats.byReason.spam}`);
```
