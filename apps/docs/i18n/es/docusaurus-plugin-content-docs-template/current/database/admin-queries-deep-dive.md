---
id: admin-queries-deep-dive
title: Consultas de administración y panel de control Análisis profundo
sidebar_label: "Consultas de administrador: análisis profundo"
sidebar_position: 62
---

# Consultas de administración y panel de control Análisis profundo

Referencia completa para datos del panel de administración, gestión de clientes, búsqueda avanzada, estadísticas y funciones de consulta de informes.

## Descripción general

La capa de consultas de administración potencia el panel de administración con consultas optimizadas en dos módulos principales:

- **`dashboard.queries.ts`** -- Estadísticas del panel, métricas de participación, gráficos semanales/diarios y elementos de mayor rendimiento
- **`client.queries.ts`** (sección de administración): listado de clientes con paginación, datos del panel de administración, búsqueda avanzada con más de 20 dimensiones de filtro y estadísticas completas.

## Archivos fuente

```
lib/db/queries/dashboard.queries.ts
lib/db/queries/client.queries.ts
```

---

## Function Reference: dashboard.queries.ts

### `getVotesReceivedCount`

Gets total votes received on a set of items.

```typescript
async function getVotesReceivedCount(itemSlugs: string[]): Promise<number>
```

**Parameters:**

| Parameter   | Type       | Required | Description                      |
|-------------|------------|----------|----------------------------------|
| `itemSlugs` | `string[]` | Yes      | Array of item slugs to count for |

**Returns:** `Promise<number>` -- Total vote count

**SQL Pattern:**

```sql
SELECT count(*) FROM votes WHERE item_id IN (...);
```

---

### `getCommentsReceivedCount`

Obtiene el total de comentarios no eliminados recibidos sobre un conjunto de elementos.

```typescript
async function getCommentsReceivedCount(itemSlugs: string[]): Promise<number>
```

**Parámetros:**

|Parámetro|Tipo|Requerido|Descripción|
|-------------|------------|----------|----------------------------------|
|`itemSlugs`|`string[]`|si|Conjunto de babosas de elementos para contar|

**Patrón SQL:**

```sql
SELECT count(*) FROM comments
WHERE item_id IN (...) AND deleted_at IS NULL;
```

---

### `getUniqueItemsInteractedCount`

Gets count of unique items a user has interacted with (voted or commented on).

```typescript
async function getUniqueItemsInteractedCount(
  clientProfileId: string
): Promise<number>
```

**Parameters:**

| Parameter         | Type     | Required | Description       |
|-------------------|----------|----------|-------------------|
| `clientProfileId` | `string` | Yes      | Client profile ID |

**Returns:** `Promise<number>` -- Count of unique items (approximate, may double-count items with both vote and comment)

**SQL Pattern:** Runs two `COUNT(DISTINCT item_id)` queries on `votes` and `comments` tables, then sums results.

**Note:** This is an approximation metric. For exact unique counts, a `UNION` query would be needed.

---

### `getUserTotalActivityCount`

Obtiene el recuento de actividad total de un usuario (votos + comentarios realizados por el usuario).

```typescript
async function getUserTotalActivityCount(
  clientProfileId: string
): Promise<number>
```

**Parámetros:**

|Parámetro|Tipo|Requerido|Descripción|
|-------------------|----------|----------|-------------------|
|`clientProfileId`|`string`|si|ID del perfil del cliente|

---

### `getWeeklyEngagementData`

Gets weekly engagement data (votes and comments received on user's items) for charting.

```typescript
async function getWeeklyEngagementData(
  itemSlugs: string[],
  weeks: number = 12
): Promise<Array<{ week: string; votes: number; comments: number }>>
```

**Parameters:**

| Parameter   | Type       | Required | Default | Description                 |
|-------------|------------|----------|---------|-----------------------------|
| `itemSlugs` | `string[]` | Yes      | --      | Array of item slugs         |
| `weeks`     | `number`   | No       | `12`    | Number of weeks to fetch    |

**Returns:** Array of `{ week: 'W1', votes: 5, comments: 3 }` objects

**SQL Pattern:**

```sql
SELECT to_char(created_at, 'IYYY-IW') as week, count(*)
FROM votes
WHERE item_id IN (...) AND created_at >= ?
GROUP BY to_char(created_at, 'IYYY-IW')
ORDER BY to_char(created_at, 'IYYY-IW');
```

**Performance Notes:**
- Runs two separate GROUP BY queries for votes and comments, then merges in-memory
- Uses ISO week format (`IYYY-IW`) for consistent week numbering across year boundaries
- Returns empty data (zeros) for weeks with no activity

---

### `getDailyActivityData`

Obtiene datos de actividad diaria para el gráfico de actividad (últimos N días).

```typescript
async function getDailyActivityData(
  clientProfileId: string,
  itemSlugs: string[],
  days: number = 7
): Promise<Array<{
  date: string;
  submissions: number;
  views: number;
  engagement: number;
}>>
```

**Parámetros:**

|Parámetro|Tipo|Requerido|Predeterminado|Descripción|
|-------------------|------------|----------|---------|--------------------------|
|`clientProfileId`|`string`|si| --      |ID del perfil del cliente|
|`itemSlugs`|`string[]`|si| --      |Babosas de artículos|
|`days`|`number`|No| `7`     |Número de días|

**Devoluciones:** Matriz diaria con `{ date: 'Mon', submissions: 0, views: 0, engagement: 5 }`

**Patrón SQL:** Utiliza `EXTRACT(DOW FROM created_at)` para agrupaciones de días de la semana independientes de la configuración regional.

**Nota:** los campos `submissions` y `views` son marcadores de posición (siempre `0`); La implementación real está en la capa del repositorio.

---

### `getTopItemsEngagement`

Gets top performing items ranked by total engagement (votes + comments).

```typescript
async function getTopItemsEngagement(
  itemSlugs: string[],
  limit: number = 5
): Promise<Array<{ itemId: string; votes: number; comments: number }>>
```

**Parameters:**

| Parameter   | Type       | Required | Default | Description               |
|-------------|------------|----------|---------|---------------------------|
| `itemSlugs` | `string[]` | Yes      | --      | Array of item slugs       |
| `limit`     | `number`   | No       | `5`     | Maximum items to return   |

**Returns:** Array sorted by total engagement descending

---

### `getRecentSubmissionsCount`

Función de marcador de posición. Los elementos se almacenan en Git, no en la base de datos.

```typescript
async function getRecentSubmissionsCount(_days: number = 7): Promise<number>
```

**Devoluciones:** Siempre `0`. La implementación real está en la capa del repositorio.

---

## Function Reference: client.queries.ts (Admin Section)

### `getClientProfiles`

Gets paginated client profiles with authentication data. Excludes admin users from results.

```typescript
async function getClientProfiles(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  plan?: string;
  accountType?: string;
  provider?: string;
}): Promise<{
  profiles: ClientProfileWithAuth[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}>
```

**SQL Pattern:**
- Uses `LEFT JOIN` on `userRoles` and `roles` to exclude admin users (`WHERE roles.id IS NULL`)
- Uses subquery for `accountProvider` to avoid duplicate rows from multiple OAuth accounts
- Supports `ILIKE` search across username, displayName, company, name, and email
- Provider filter uses an `EXISTS` subquery on the accounts table

---

### `getClientProfileStats`

Obtiene estadísticas básicas del perfil del cliente.

```typescript
async function getClientProfileStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
  byPlan: Record<string, number>;
  byAccountType: Record<string, number>;
}>
```

---

### `getEnhancedClientStats`

Gets comprehensive statistics with multiple dimensions including provider distribution, activity metrics, and growth rates.

```typescript
async function getEnhancedClientStats(): Promise<{
  overview: { total, active, inactive, suspended, trial };
  byProvider: { credentials, google, github, facebook, twitter, linkedin, other };
  byPlan: Record<string, number>;
  byAccountType: Record<string, number>;
  byStatus: Record<string, number>;
  activity: { newThisWeek, newThisMonth, activeThisWeek, activeThisMonth };
  growth: { weeklyGrowth, monthlyGrowth };
}>
```

**SQL Pattern:** Uses a multi-dimensional `GROUP BY` across status, plan, accountType, and provider in a single query, then calculates activity metrics with date-range filters.

**Performance Notes:**
- Executes multiple queries for different metrics
- All queries exclude admin users via `LEFT JOIN` on roles
- Growth rates are calculated as percentages of total

---

### `getAdminDashboardData`

Punto final del panel de administración optimizado que devuelve clientes, estadísticas y paginación en una sola llamada. Reduce los viajes de ida y vuelta de la base de datos.

```typescript
async function getAdminDashboardData(params: {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  plan?: string;
  accountType?: string;
  provider?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  updatedAfter?: Date;
  updatedBefore?: Date;
}): Promise<{
  clients: ClientProfileWithAuth[];
  stats: { /* full EnhancedClientStats */ };
  pagination: { page, totalPages, total, limit };
}>
```

**Filtros compatibles:**
- Búsqueda de texto (ILIKE en 5 campos)
- Estado, plan, tipo de cuenta
- Proveedor de autenticación (subconsulta EXISTS)
- Intervalo de fechas (creado/actualizado después/antes)

---

### `advancedClientSearch`

Full-featured search with 20+ filter dimensions, sorting, and metadata tracking.

```typescript
async function advancedClientSearch(params: {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  plan?: string;
  accountType?: string;
  provider?: string;
  dateRange?: { startDate?: Date; endDate?: Date };
  createdAfter?: Date;
  createdBefore?: Date;
  updatedAfter?: Date;
  updatedBefore?: Date;
  emailDomain?: string;
  companySearch?: string;
  locationSearch?: string;
  industrySearch?: string;
  minSubmissions?: number;
  maxSubmissions?: number;
  hasAvatar?: boolean;
  hasWebsite?: boolean;
  hasPhone?: boolean;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
  sortBy?: 'createdAt' | 'updatedAt' | 'name' | 'email' | 'company' | 'totalSubmissions';
  sortOrder?: 'asc' | 'desc';
}): Promise<{
  clients: ClientProfileWithAuth[];
  pagination: { page, totalPages, total, limit };
  searchMetadata: { appliedFilters: string[], searchTime: number, resultCount: number };
}>
```

**Unique Features:**
- **Email domain filter**: `ILIKE '%@example.com%'`
- **Boolean presence filters**: `hasAvatar`, `hasWebsite`, `hasPhone` check for non-null, non-empty values
- **Numeric range filters**: `minSubmissions`, `maxSubmissions`
- **Search metadata**: Returns list of applied filters and result count
- **Configurable sorting**: 6 sort fields with ascending/descending order

**Performance Notes:**
- All ILIKE patterns use proper SQL escaping for special characters (`%`, `_`, `\`)
- Admin users are excluded via LEFT JOIN pattern
- Uses `COUNT(DISTINCT)` for accurate totals with JOINs

---

## Notas de rendimiento

1. **Patrón de exclusión de administradores**: todas las consultas de listados utilizan `LEFT JOIN userRoles / roles WHERE roles.id IS NULL` para excluir constantemente a los usuarios administradores de las vistas del cliente.

2. **Subconsulta para proveedor**: utiliza la subconsulta `(SELECT provider FROM accounts WHERE ... LIMIT 1)` en lugar de JOIN para evitar la multiplicación de filas de múltiples cuentas OAuth.

3. **Escapado de SQL adecuado**: todas las entradas de búsqueda de texto tienen caracteres de escape ILIKE especiales (`%`, `_`, `\`) para evitar la inyección de SQL a través de términos de búsqueda.

4. **Manejo de semanas ISO** -- `getWeeklyEngagementData` utiliza un asistente personalizado `getISOWeekString` que coincide con `to_char(date, 'IYYY-IW')` de PostgreSQL para el manejo correcto de la semana ISO en los límites del año.

## Ejemplos de uso

### Cargando el panel de administración

```typescript
import { getAdminDashboardData } from '@/lib/db/queries';

const dashboard = await getAdminDashboardData({
  page: 1,
  limit: 25,
  search: 'acme',
  status: 'active',
});

// dashboard.clients -- paginated client list
// dashboard.stats   -- full statistics
// dashboard.pagination -- page metadata
```

### Búsqueda avanzada de clientes

```typescript
import { advancedClientSearch } from '@/lib/db/queries';

const results = await advancedClientSearch({
  page: 1,
  limit: 10,
  emailDomain: 'company.com',
  plan: 'premium',
  hasAvatar: true,
  sortBy: 'totalSubmissions',
  sortOrder: 'desc',
});

console.log(results.searchMetadata.appliedFilters);
// ['Email domain: company.com', 'Plan: premium', 'Has avatar: true']
```
