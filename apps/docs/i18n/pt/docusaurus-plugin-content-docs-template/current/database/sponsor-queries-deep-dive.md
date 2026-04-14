---
id: sponsor-queries-deep-dive
title: Aprofundamento nas consultas de relatórios e moderação
sidebar_label: Aprofundamento nas consultas de relatórios e moderação
sidebar_position: 69
---

# Aprofundamento nas consultas de relatórios e moderação

Referência abrangente para todos os relatórios de conteúdo e funções de consulta de banco de dados de moderação de usuários, incluindo relatório CRUD, rastreamento de histórico de moderação, gerenciamento de status de usuário (avisar, suspender, banir) e estatísticas de relatórios.

## Visão geral

A camada de consulta de relatório e moderação está organizada em dois módulos complementares:

- **`report.queries.ts`** -- Relatório de conteúdo CRUD, listagem paginada com pesquisa e filtros, estatísticas de relatório por status/tipo/motivo e prevenção de relatórios duplicados
- **`moderation.queries.ts`** -- Registro do histórico de moderação, ações de moderação do usuário (avisar, suspender, banir, cancelar a suspensão, cancelar o banimento) e auxiliares de status do usuário

Os relatórios são enviados por usuários clientes em relação ao conteúdo (itens ou comentários). Os administradores analisam relatórios e realizam ações de moderação, que são rastreadas em uma tabela separada de histórico de moderação para fins de auditoria.

## Arquivos de origem

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

Obtém um relatório por ID com informações do repórter e do revisor. Executa duas consultas: uma para o relatório com o repórter JOIN e uma segunda para o revisor, se presente.

```typescript
async function getReportById(
  id: string
): Promise<ReportWithReporter | null>
```

**Padrão SQL:**

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

**Nota de design:** A pesquisa do revisor é uma consulta separada para evitar um segundo LEFT JOIN, uma vez que os revisores são usuários administradores da tabela `users` enquanto os repórteres são de `client_profiles`.

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

Atualiza o status do relatório, a resolução, a nota de revisão e o revisor. Gerencia automaticamente campos de carimbo de data/hora com base na alteração de status.

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

**Parâmetros:**

|Parâmetro|Tipo|Obrigatório|Descrição|
|--------------|----------------------------|----------|--------------------------------|
|`id`|`string`|Sim|ID do relatório|
|`status`|`ReportStatusValues`|Não|Novo status|
|`resolution`|`ReportResolutionValues`|Não|Tipo de resolução|
|`reviewNote`|`string`|Não|Nota do revisor|
|`reviewedBy`|`string`|Não|ID do usuário administrador do revisor|

**Comportamento automático do carimbo de data/hora:**
- `updatedAt` está sempre definido para a hora atual
- `reviewedAt` é definido quando o status muda de `PENDING` ou quando `reviewedBy` é fornecido
- `resolvedAt` é definido quando o status se torna `RESOLVED` ou `DISMISSED`

**Padrão SQL:**

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

Verifica se um usuário já denunciou conteúdo específico. Usado para evitar relatórios duplicados.

```typescript
async function hasUserReportedContent(
  reportedBy: string,
  contentType: ReportContentTypeValues,
  contentId: string
): Promise<boolean>
```

**Parâmetros:**

|Parâmetro|Tipo|Obrigatório|Descrição|
|---------------|----------------------------|----------|---------------------------|
|`reportedBy`|`string`|Sim|ID do perfil do cliente|
|`contentType`|`ReportContentTypeValues`|Sim|Tipo de conteúdo|
|`contentId`|`string`|Sim|ID do conteúdo|

**Retorna:** `true` se o usuário já denunciou este conteúdo

**Padrão SQL:**

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

Obtém o histórico de moderação de um usuário específico, com detalhes do usuário e informações do artista.

```typescript
async function getModerationHistoryByUser(
  userId: string,
  limit: number = 50
): Promise<ModerationHistoryWithDetails[]>
```

**Parâmetros:**

|Parâmetro|Tipo|Obrigatório|Padrão|Descrição|
|-----------|----------|----------|---------|---------------------------|
|`userId`|`string`|Sim| --      |ID do perfil do cliente|
|`limit`|`number`|Não| `50`    |Máximo de registros a serem retornados|

**Retornos:** Conjunto de entradas do histórico de moderação com detalhes do usuário e do artista

**Padrão SQL:**

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

**Observação:** As informações do artista são enriquecidas por registro via `Promise.all`, resultando em consultas N+1. O executor é um administrador `user`, enquanto o alvo é um `client_profile`.

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

### Gerenciamento de status do usuário

#### `incrementWarningCount`

Incrementa atomicamente a contagem de avisos em um perfil de cliente.

```typescript
async function incrementWarningCount(
  userId: string
): Promise<ClientProfile>
```

**Padrão SQL:**

```sql
UPDATE client_profiles
SET warning_count = COALESCE(warning_count, 0) + 1,
    updated_at = NOW()
WHERE id = ?
RETURNING *;
```

**Observação:** Usa `COALESCE` para incremento seguro para nulos, lidando com casos em que `warningCount` nunca foi definido.

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

Restaura um usuário suspenso ao status ativo.

```typescript
async function unsuspendUser(userId: string): Promise<ClientProfile>
```

**Padrão SQL:**

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

Restaura um usuário banido ao status ativo.

```typescript
async function unbanUser(userId: string): Promise<ClientProfile>
```

**Padrão SQL:**

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

Obtém um perfil de cliente pelo ID do usuário de autenticação.

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

Retorna uma mensagem voltada ao usuário explicando por que a conta está restrita.

```typescript
function getBlockReasonMessage(status: string | null): string
```

**Retornos:**
- `'suspended'` -- "Sua conta está atualmente suspensa. Você não pode realizar esta ação."
- `'banned'` -- "Sua conta foi banida. Você não pode realizar esta ação."
- Outros -- "Sua conta está restrita. Você não pode realizar esta ação."

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

## Notas de Desempenho

1. **Escape de pesquisa** -- `getReports` escapa corretamente dos curingas SQL (`%`, `_`, `\`) em termos de pesquisa antes de usá-los em padrões `ILIKE`.

2. **Pesquisa separada do revisor** -- `getReportById` executa uma segunda consulta para informações do revisor somente quando `reviewedBy` está presente, evitando JOINs desnecessários em duas tabelas de usuários diferentes.

3. **Otimização de lista** -- `getReports` omite os dados do revisor nos resultados da lista (`reviewer: null`) para evitar consultas N+1 ao exibir listas de relatórios.

4. **N+1 para detalhes do artista** -- `getModerationHistoryByUser` e `getModerationHistoryByReport` enriquecem os detalhes do artista por registro via `Promise.all`. Para logs de moderação de alto volume, considere agrupar pesquisas de executores em lote.

5. **Incremento atômico** -- `incrementWarningCount` usa `COALESCE` para incremento SQL seguro para nulos, garantindo correção mesmo para perfis que nunca foram avisados.

6. **Simetria de status** – As operações de suspensão/banimento definem `status` e um carimbo de data/hora correspondente. Cancele a suspensão/remoção do status de restauração para `'active'` e limpe o carimbo de data/hora para `null`.

## Exemplos de uso

### Enviando um relatório de conteúdo

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

### Revisando e resolvendo um relatório

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

### Tomando medidas de moderação

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

### Verificando se um usuário pode executar ações

```typescript
import { getClientProfileById, isUserBlocked, getBlockReasonMessage } from '@/lib/db/queries';

const profile = await getClientProfileById(clientProfileId);

if (profile && isUserBlocked(profile.status)) {
  const message = getBlockReasonMessage(profile.status);
  throw new Error(message);
}
```

### Visualizando estatísticas do painel de moderação

```typescript
import { getReportStats } from '@/lib/db/queries';

const stats = await getReportStats();

console.log(`Total reports: ${stats.total}`);
console.log(`Pending: ${stats.pendingCount}`);
console.log(`Resolved: ${stats.resolvedCount}`);
console.log(`Spam reports: ${stats.byReason.spam}`);
```
