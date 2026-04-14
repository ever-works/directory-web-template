---
id: sponsor-queries-deep-dive
title: Consultas de informes y moderación Análisis profundo
sidebar_label: Consultas de informes y moderación Análisis profundo
sidebar_position: 69
---

# Consultas de informes y moderación Análisis profundo

Referencia completa para todas las funciones de consulta de la base de datos de moderación de usuarios e informes de contenido, incluido el informe CRUD, seguimiento del historial de moderación, gestión del estado del usuario (advertir, suspender, prohibir) y estadísticas de informes.

## Descripción general

La capa de consulta de informes y moderación está organizada en dos módulos complementarios:

- **`report.queries.ts`** -- Informe de contenido CRUD, listado paginado con búsqueda y filtros, estadísticas de informes por estado/tipo/motivo y prevención de informes duplicados
- **`moderation.queries.ts`** -- Registro del historial de moderación, acciones de moderación del usuario (advertir, suspender, prohibir, reactivar, desbancar) y ayudantes de estado del usuario

Los usuarios del cliente envían informes sobre el contenido (elementos o comentarios). Los administradores revisan los informes y toman medidas de moderación, que se rastrean en una tabla de historial de moderación separada para fines de auditoría.

## Archivos fuente

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

Obtiene un informe por ID con información del reportero y del revisor. Realiza dos consultas: una para el informe con el reportero JOIN y una segunda para el revisor si está presente.

```typescript
async function getReportById(
  id: string
): Promise<ReportWithReporter | null>
```

**Patrón SQL:**

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

**Nota de diseño:** La búsqueda de revisores es una consulta separada para evitar una segunda UNIÓN IZQUIERDA, ya que los revisores son usuarios administradores de la tabla `users`, mientras que los reporteros son de `client_profiles`.

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

Actualiza el estado del informe, la resolución, la nota de revisión y el revisor. Gestiona automáticamente los campos de marca de tiempo según el cambio de estado.

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

**Parámetros:**

|Parámetro|Tipo|Requerido|Descripción|
|--------------|----------------------------|----------|--------------------------------|
|`id`|`string`|si|ID de informe|
|`status`|`ReportStatusValues`|No|Nuevo estado|
|`resolution`|`ReportResolutionValues`|No|Tipo de resolución|
|`reviewNote`|`string`|No|nota del revisor|
|`reviewedBy`|`string`|No|ID de usuario administrador del revisor|

**Comportamiento automático de marca de tiempo:**
- `updatedAt` siempre está configurado en la hora actual
- `reviewedAt` se establece cuando el estado cambia de `PENDING`, o cuando se proporciona `reviewedBy`
- `resolvedAt` se establece cuando el estado pasa a ser `RESOLVED` o `DISMISSED`

**Patrón SQL:**

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

Comprueba si un usuario ya ha informado sobre contenido específico. Se utiliza para evitar informes duplicados.

```typescript
async function hasUserReportedContent(
  reportedBy: string,
  contentType: ReportContentTypeValues,
  contentId: string
): Promise<boolean>
```

**Parámetros:**

|Parámetro|Tipo|Requerido|Descripción|
|---------------|----------------------------|----------|---------------------------|
|`reportedBy`|`string`|si|ID del perfil del cliente|
|`contentType`|`ReportContentTypeValues`|si|tipo de contenido|
|`contentId`|`string`|si|Identificación de contenido|

**Devoluciones:** `true` si el usuario ya ha reportado este contenido

**Patrón SQL:**

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

Obtiene el historial de moderación de un usuario específico, con detalles del usuario e información del artista.

```typescript
async function getModerationHistoryByUser(
  userId: string,
  limit: number = 50
): Promise<ModerationHistoryWithDetails[]>
```

**Parámetros:**

|Parámetro|Tipo|Requerido|Predeterminado|Descripción|
|-----------|----------|----------|---------|---------------------------|
|`userId`|`string`|si| --      |ID del perfil del cliente|
|`limit`|`number`|No| `50`    |Registros máximos para devolver|

**Devoluciones:** Conjunto de entradas del historial de moderación con detalles del usuario y del artista

**Patrón SQL:**

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

**Nota:** La información del artista se enriquece por registro a través de `Promise.all`, lo que genera N+1 consultas. El ejecutante es un administrador `user`, mientras que el objetivo es un `client_profile`.

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

### Gestión del estado del usuario

#### `incrementWarningCount`

Incrementa atómicamente el recuento de advertencias en un perfil de cliente.

```typescript
async function incrementWarningCount(
  userId: string
): Promise<ClientProfile>
```

**Patrón SQL:**

```sql
UPDATE client_profiles
SET warning_count = COALESCE(warning_count, 0) + 1,
    updated_at = NOW()
WHERE id = ?
RETURNING *;
```

**Nota:** Utiliza `COALESCE` para incrementos seguros para nulos, manejando casos donde `warningCount` nunca se ha configurado.

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

Restaura un usuario suspendido al estado activo.

```typescript
async function unsuspendUser(userId: string): Promise<ClientProfile>
```

**Patrón SQL:**

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

Restaura un usuario prohibido al estado activo.

```typescript
async function unbanUser(userId: string): Promise<ClientProfile>
```

**Patrón SQL:**

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

Obtiene un perfil de cliente mediante el ID de usuario de autenticación.

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

Devuelve un mensaje dirigido al usuario que explica por qué la cuenta está restringida.

```typescript
function getBlockReasonMessage(status: string | null): string
```

**Devoluciones:**
- `'suspended'` -- "Su cuenta está actualmente suspendida. No puede realizar esta acción".
- `'banned'` -- "Su cuenta ha sido prohibida. No puede realizar esta acción".
- Otro: "Su cuenta está restringida. No puede realizar esta acción".

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

## Notas de rendimiento

1. **Escapado de búsqueda**: `getReports` escapa correctamente los comodines SQL (`%`, `_`, `\`) en los términos de búsqueda antes de usarlos en patrones `ILIKE`.

2. **Búsqueda de revisor independiente**: `getReportById` realiza una segunda consulta de información del revisor solo cuando `reviewedBy` está presente, evitando JOINs innecesarias en dos tablas de usuarios diferentes.

3. **Optimización de lista**: `getReports` omite los datos del revisor en los resultados de la lista (`reviewer: null`) para evitar consultas N+1 al mostrar listas de informes.

4. **N+1 para detalles del artista** -- `getModerationHistoryByUser` y `getModerationHistoryByReport` enriquecen los detalles del artista por registro a través de `Promise.all`. Para registros de moderación de gran volumen, considere realizar búsquedas por lotes de ejecutantes.

5. **Incremento atómico** -- `incrementWarningCount` usa `COALESCE` para un incremento de SQL seguro para nulos, lo que garantiza la corrección incluso para perfiles que nunca han sido advertidos.

6. **Simetría de estado**: las operaciones de suspensión/prohibición establecen `status` y una marca de tiempo correspondiente. Cancelar/desbancar el estado de restauración en `'active'` y borrar la marca de tiempo en `null`.

## Ejemplos de uso

### Enviar un informe de contenido

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

### Revisar y resolver un informe

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

### Tomar medidas de moderación

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

### Comprobar si un usuario puede realizar acciones

```typescript
import { getClientProfileById, isUserBlocked, getBlockReasonMessage } from '@/lib/db/queries';

const profile = await getClientProfileById(clientProfileId);

if (profile && isUserBlocked(profile.status)) {
  const message = getBlockReasonMessage(profile.status);
  throw new Error(message);
}
```

### Ver estadísticas del panel de moderación

```typescript
import { getReportStats } from '@/lib/db/queries';

const stats = await getReportStats();

console.log(`Total reports: ${stats.total}`);
console.log(`Pending: ${stats.pendingCount}`);
console.log(`Resolved: ${stats.resolvedCount}`);
console.log(`Spam reports: ${stats.byReason.spam}`);
```
