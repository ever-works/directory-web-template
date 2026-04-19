---
id: sponsor-queries-deep-dive
title: Analyse approfondie des requêtes de rapport et de modération
sidebar_label: Analyse approfondie des requêtes de rapport et de modération
sidebar_position: 69
---

# Analyse approfondie des requêtes de rapport et de modération

Référence complète pour toutes les fonctions de requête de base de données de reporting de contenu et de modération des utilisateurs, y compris le rapport CRUD, le suivi de l'historique de modération, la gestion du statut des utilisateurs (avertissement, suspension, bannissement) et les statistiques de reporting.

## Aperçu

La couche de requêtes de reporting et de modération est organisée en deux modules complémentaires :

- **`report.queries.ts`** -- Rapport de contenu CRUD, liste paginée avec recherche et filtres, rapports statistiques par statut/type/raison et prévention des rapports en double.
- **`moderation.queries.ts`** -- Journalisation de l'historique de modération, actions de modération des utilisateurs (avertir, suspendre, bannir, reprendre la suspension, débannir) et aides au statut des utilisateurs

Les rapports sont soumis par les utilisateurs clients sur le contenu (éléments ou commentaires). Les administrateurs examinent les rapports et prennent des mesures de modération, qui sont suivies dans un tableau d'historique de modération distinct à des fins d'audit.

## Fichiers sources

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

Obtient un rapport par ID avec des informations sur le journaliste et le réviseur. Effectue deux requêtes : une pour le rapport avec le journaliste JOIN et une seconde pour le réviseur s'il est présent.

```typescript
async function getReportById(
  id: string
): Promise<ReportWithReporter | null>
```

**Modèle SQL :**

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

**Note de conception :** La recherche de réviseur est une requête distincte pour éviter une deuxième LEFT JOIN, car les réviseurs sont des utilisateurs administrateurs de la table `users` tandis que les rapporteurs proviennent de `client_profiles`.

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

Met à jour l’état du rapport, la résolution, la note de révision et le réviseur. Gère automatiquement les champs d'horodatage en fonction du changement de statut.

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

**Paramètres :**

|Paramètre|Tapez|Obligatoire|Descriptif|
|--------------|----------------------------|----------|--------------------------------|
|`id`|`string`|Oui|ID du rapport|
|`status`|`ReportStatusValues`|Non|Nouveau statut|
|`resolution`|`ReportResolutionValues`|Non|Type de résolution|
|`reviewNote`|`string`|Non|Note du critique|
|`reviewedBy`|`string`|Non|ID utilisateur administrateur du réviseur|

**Comportement d'horodatage automatique :**
- `updatedAt` est toujours réglé sur l'heure actuelle
- `reviewedAt` est défini lorsque l'état passe de `PENDING` ou lorsque `reviewedBy` est fourni.
- `resolvedAt` est défini lorsque le statut devient `RESOLVED` ou `DISMISSED`

**Modèle SQL :**

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

Vérifie si un utilisateur a déjà signalé un contenu spécifique. Utilisé pour éviter les rapports en double.

```typescript
async function hasUserReportedContent(
  reportedBy: string,
  contentType: ReportContentTypeValues,
  contentId: string
): Promise<boolean>
```

**Paramètres :**

|Paramètre|Tapez|Obligatoire|Descriptif|
|---------------|----------------------------|----------|---------------------------|
|`reportedBy`|`string`|Oui|Identifiant du profil client|
|`contentType`|`ReportContentTypeValues`|Oui|Type de contenu|
|`contentId`|`string`|Oui|ID de contenu|

**Renvoie :** `true` si l'utilisateur a déjà signalé ce contenu

**Modèle SQL :**

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

Obtient l'historique de modération pour un utilisateur spécifique, avec les détails de l'utilisateur et les informations sur l'interprète.

```typescript
async function getModerationHistoryByUser(
  userId: string,
  limit: number = 50
): Promise<ModerationHistoryWithDetails[]>
```

**Paramètres :**

|Paramètre|Tapez|Obligatoire|Par défaut|Descriptif|
|-----------|----------|----------|---------|---------------------------|
|`userId`|`string`|Oui| --      |Identifiant du profil client|
|`limit`|`number`|Non| `50`    |Nombre maximum d'enregistrements à renvoyer|

**Retours :** Tableau d'entrées de l'historique de modération avec les détails de l'utilisateur et de l'interprète

**Modèle SQL :**

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

**Remarque :** Les informations sur l'interprète sont enrichies par enregistrement via `Promise.all`, ce qui entraîne N+1 requêtes. L'interprète est un administrateur `user`, tandis que la cible est un `client_profile`.

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

### Gestion du statut des utilisateurs

#### `incrementWarningCount`

Incrémente atomiquement le nombre d’avertissements sur un profil client.

```typescript
async function incrementWarningCount(
  userId: string
): Promise<ClientProfile>
```

**Modèle SQL :**

```sql
UPDATE client_profiles
SET warning_count = COALESCE(warning_count, 0) + 1,
    updated_at = NOW()
WHERE id = ?
RETURNING *;
```

**Remarque :** Utilise `COALESCE` pour un incrément de sécurité Null, en gérant les cas où `warningCount` n'a jamais été défini.

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

Restaure un utilisateur suspendu au statut actif.

```typescript
async function unsuspendUser(userId: string): Promise<ClientProfile>
```

**Modèle SQL :**

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

Restaure un utilisateur banni au statut actif.

```typescript
async function unbanUser(userId: string): Promise<ClientProfile>
```

**Modèle SQL :**

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

Obtient un profil client par l'ID utilisateur d'authentification.

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

Renvoie un message destiné à l'utilisateur expliquant pourquoi le compte est restreint.

```typescript
function getBlockReasonMessage(status: string | null): string
```

**Retours :**
- `'suspended'` -- "Votre compte est actuellement suspendu. Vous ne pouvez pas effectuer cette action."
- `'banned'` -- "Votre compte a été banni. Vous ne pouvez pas effectuer cette action."
- Autre -- "Votre compte est restreint. Vous ne pouvez pas effectuer cette action."

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

## Notes de performances

1. **Recherche d'échappement** -- `getReports` échappe correctement les caractères génériques SQL (`%`, `_`, `\`) dans les termes de recherche avant de les utiliser dans les modèles `ILIKE`.

2. **Recherche de réviseur séparée** -- `getReportById` effectue une deuxième requête pour les informations du réviseur uniquement lorsque `reviewedBy` est présent, évitant ainsi les JOIN inutiles dans deux tables utilisateur différentes.

3. **Optimisation de liste** -- `getReports` omet les données des réviseurs dans les résultats de la liste (`reviewer: null`) pour éviter les requêtes N+1 lors de l'affichage des listes de rapports.

4. **N+1 pour les détails de l'interprète** -- `getModerationHistoryByUser` et `getModerationHistoryByReport` enrichissent les détails de l'interprète par enregistrement via `Promise.all`. Pour les journaux de modération à volume élevé, envisagez de regrouper les recherches d’intervenants.

5. **Incrément atomique** -- `incrementWarningCount` utilise `COALESCE` pour un incrément SQL sans danger, garantissant l'exactitude même pour les profils qui n'ont jamais été avertis.

6. **Symétrie du statut** -- Les opérations de suspension/interdiction définissent à la fois `status` et un horodatage correspondant. Annulez la suspension/le bannissement de l'état de restauration sur `'active'` et effacez l'horodatage sur `null`.

## Exemples d'utilisation

### Soumettre un rapport de contenu

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

### Révision et résolution d'un rapport

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

### Prendre des mesures de modération

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

### Vérifier si un utilisateur peut effectuer des actions

```typescript
import { getClientProfileById, isUserBlocked, getBlockReasonMessage } from '@/lib/db/queries';

const profile = await getClientProfileById(clientProfileId);

if (profile && isUserBlocked(profile.status)) {
  const message = getBlockReasonMessage(profile.status);
  throw new Error(message);
}
```

### Affichage des statistiques du tableau de bord de modération

```typescript
import { getReportStats } from '@/lib/db/queries';

const stats = await getReportStats();

console.log(`Total reports: ${stats.total}`);
console.log(`Pending: ${stats.pendingCount}`);
console.log(`Resolved: ${stats.resolvedCount}`);
console.log(`Spam reports: ${stats.byReason.spam}`);
```
