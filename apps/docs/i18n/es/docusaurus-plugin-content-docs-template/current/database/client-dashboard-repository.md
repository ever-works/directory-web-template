---
id: client-dashboard-repository
title: Repositorio del panel del cliente
sidebar_label: Repositorio del panel del cliente
sidebar_position: 19
---

# Repositorio del panel del cliente

`ClientDashboardRepository` agrega datos del almacenamiento de elementos basado en Git y la base de datos relacional (votos, comentarios, vistas) para producir estadísticas integrales del panel para usuarios de clientes individuales.

**Archivo fuente:** `template/lib/repositories/client-dashboard.repository.ts`

---

## Architecture Overview

```
Client Dashboard UI
        |
  API Route / Server Action
        |
  ClientDashboardRepository
        |
  +-----+-----+-----+-----+
  |           |             |
ItemRepository  DB Queries  View Queries
  (Git)       (dashboard)   (item-view)
```

The repository orchestrates parallel queries across two data sources:

1. **Git-based items** -- via `ItemRepository` for submission data
2. **PostgreSQL** -- via specialized query functions for votes, comments, views, and engagement data

---

## Tipos exportados

### `DashboardStats`

El tipo de devolución principal que contiene todas las métricas del panel:

```ts
interface DashboardStats {
  totalSubmissions: number;
  totalViews: number;
  totalVotesReceived: number;
  totalCommentsReceived: number;
  viewsAvailable: boolean;
  recentActivity: { newSubmissions: number; newViews: number };
  uniqueItemsInteracted: number;
  totalActivity: number;
  activityChartData: ActivityData[];
  engagementChartData: Array<{ name: string; value: number; color: string }>;
  submissionTimeline: SubmissionTimelineData[];
  engagementOverview: EngagementOverviewData[];
  statusBreakdown: StatusBreakdownData[];
  topItems: TopItem[];
  periodComparison: PeriodComparisonData;
  categoryPerformance: CategoryPerformanceData[];
  approvalTrend: ApprovalTrendData[];
  submissionCalendar: SubmissionCalendarData[];
  engagementDistribution: EngagementDistributionData[];
}
```

### Tipos de apoyo

|Tipo|Campos|Propósito|
|------|--------|---------|
|`ActivityData`|`date`, `submissions`, `views`, `engagement`|Actividad diaria para gráficos|
|`SubmissionTimelineData`|`month`, `submissions`|Recuentos de envíos mensuales|
|`EngagementOverviewData`|`week`, `votes`, `comments`|Desglose del compromiso semanal|
|`StatusBreakdownData`|`status`, `value`, `color`|Recuentos aprobados/pendientes/rechazados|
|`TopItem`|`id`, `title`, `views`, `votes`, `comments`|Artículos de mejor rendimiento|
|`PeriodComparisonData`|`thisWeek`, `lastWeek`, `change`|Comparación semana tras semana|
|`CategoryPerformanceData`|`category`, `itemCount`, `totalEngagement`, `avgEngagement`|Rendimiento por categoría|
|`ApprovalTrendData`|`month`, `approved`, `total`, `rate`|Tasas de aprobación mensuales|
|`SubmissionCalendarData`|`date`, `count`|Datos del mapa de calor de envío diario|
|`EngagementDistributionData`|`id`, `title`, `slug`, `engagement`, `percentage`|Cuota de participación por elemento|

---

## Class Definition

```ts
export class ClientDashboardRepository {
  private itemRepository: ItemRepository;

  constructor() {
    this.itemRepository = new ItemRepository();
  }
}
```

---

## Método primario

### `getStats(userId): Promise<DashboardStats>`

El punto de entrada principal que crea el conjunto de datos completo del panel para un usuario determinado.

```ts
async getStats(userId: string): Promise<DashboardStats>
```

**Flujo de procesamiento:**

1. **Resolver perfil de cliente** -- llama a `getClientProfileByUserId(userId)` para obtener el `clientProfileId`
2. **Obtener elementos del usuario**: carga todos los elementos no eliminados enviados por este usuario desde el repositorio de Git.
3. **Extraer slugs de elementos**: se utilizan como claves de unión para consultas de bases de datos
4. **Ejecutar consultas paralelas**: ejecuta 11 consultas simultáneamente a través de `Promise.all`:

|Función de consulta|Fuente|Datos recuperados|
|----------------|--------|---------------|
|`getVotesReceivedCount(slugs)`|`dashboard.queries`|Votos totales sobre los artículos del usuario.|
|`getCommentsReceivedCount(slugs)`|`dashboard.queries`|Total de comentarios sobre los artículos del usuario.|
|`getUniqueItemsInteractedCount(profileId)`|`dashboard.queries`|Elementos con los que el usuario interactuó|
|`getUserTotalActivityCount(profileId)`|`dashboard.queries`|Recuento total de actividad del usuario|
|`getWeeklyEngagementData(slugs, 12)`|`dashboard.queries`|12 semanas de datos de participación|
|`getDailyActivityData(profileId, slugs, 7)`|`dashboard.queries`|7 días de datos de actividad.|
|`getTopItemsEngagement(slugs, 10)`|`dashboard.queries`|Los 10 elementos principales por participación|
|`getTotalViewsCount(slugs)`|`item-view.queries`|Vistas totales de la página|
|`getRecentViewsCount(slugs, 7)`|`item-view.queries`|Vistas en los últimos 7 días|
|`getDailyViewsData(slugs, 14)`|`item-view.queries`|14 días de datos de visualización diaria|
|`getViewsPerItem(slugs)`|`item-view.queries`|Ver recuentos por slug de artículo|

5. **Calcular métricas derivadas**: procesa datos sin procesar en formatos listos para gráficos

---

## Private Calculation Methods

### `calculateStatusBreakdown(items)`

Counts items by status (approved, pending, rejected) and assigns color codes.

Returns: `StatusBreakdownData[]` with hex colors (`#10B981`, `#F59E0B`, `#EF4444`).

---

### `calculateSubmissionTimeline(items)`

Agrega envíos por mes durante los últimos 6 meses. Utiliza `submitted_at` marcas de tiempo de los datos del artículo.

Devuelve: `SubmissionTimelineData[]` con abreviaturas de mes (enero, febrero, etc.).

---

### `calculateRecentSubmissions(items, days)`

Counts items submitted within the last N days.

---

### `mapTopItems(engagement, items, viewsPerItem)`

Une los datos de participación (votos, comentarios) de la base de datos con metadatos de elementos de Git y recuentos de vistas. Devuelve los 5 elementos principales.

---

### `injectViewsIntoActivityData(activityData, dailyViewsMap)`

Merges daily view counts from the `dailyViewsMap` into the activity chart data array by matching date strings.

---

### `calculatePeriodComparison(engagementOverview, items, dailyViewsMap)`

Calcula los cambios semana tras semana para votos, comentarios, envíos y vistas. Calcula el cambio porcentual con protección de división por cero (devuelve 100% si el anterior era 0 y el actual es positivo).

---

### `calculateCategoryPerformance(items, topItemsEngagement, viewsPerItem)`

Groups items by category and aggregates engagement (votes + comments + views). Items with multiple categories are counted for each category. Returns the top 5 categories sorted by average engagement.

---

### `calculateApprovalTrend(items)`

Realiza un seguimiento de la tasa de aprobación mensual durante los últimos 6 meses. Devuelve el recuento de artículos aprobados, el total de artículos y el porcentaje de aprobación.

---

### `calculateSubmissionCalendar(items)`

Generates a 90-day calendar heatmap dataset showing daily submission counts.

---

### `calculateEngagementDistribution(items, topItemsEngagement, viewsPerItem)`

Calcula el porcentaje de participación de participación para los 10 elementos principales por participación total (votos + comentarios + vistas).

---

## Singleton Pattern

```ts
let clientDashboardRepositoryInstance: ClientDashboardRepository | null = null;

export function getClientDashboardRepository(): ClientDashboardRepository {
  if (!clientDashboardRepositoryInstance) {
    clientDashboardRepositoryInstance = new ClientDashboardRepository();
  }
  return clientDashboardRepositoryInstance;
}
```

Use `getClientDashboardRepository()` for the singleton instance rather than constructing directly.

---

## Constantes

|constante|Valores|
|----------|--------|
|`STATUS_COLORS`|Aprobado: `#10B981`, Pendiente: `#F59E0B`, Rechazado: `#EF4444`|
|`ENGAGEMENT_COLORS`|vistas: `#3B82F6`, votos: `#10B981`, comentarios: `#F59E0B`, compartidos: `#8B5CF6`|
|`MONTH_NAMES`|`['Jan', 'Feb', ..., 'Dec']`|

---

## Empty State Handling

When a user has no client profile, the repository returns a complete `DashboardStats` object with all values zeroed out via `getEmptyStats()`. This includes properly structured empty arrays for all chart data so the UI can render empty-state charts without null checks.

---

## Ejemplo de uso

```ts
import { getClientDashboardRepository } from '@/lib/repositories/client-dashboard.repository';

const dashboardRepo = getClientDashboardRepository();
const stats = await dashboardRepo.getStats('user-abc-123');

// Access metrics
console.log(stats.totalSubmissions);
console.log(stats.periodComparison.change.votes); // e.g. +15 (%)
console.log(stats.categoryPerformance);
```

---

## Related Files

| File | Relationship |
|------|-------------|
| `lib/repositories/item.repository.ts` | Git-based item data source |
| `lib/db/queries/dashboard.queries.ts` | Database query functions for engagement |
| `lib/db/queries/item-view.queries.ts` | Database query functions for page views |
| `lib/db/queries/client.queries.ts` | Client profile lookup |
| `lib/types/item.ts` | `ItemData` type definition |
