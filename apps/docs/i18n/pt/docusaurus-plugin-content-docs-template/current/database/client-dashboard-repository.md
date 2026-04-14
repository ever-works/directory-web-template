---
id: client-dashboard-repository
title: Repositório de painel do cliente
sidebar_label: Repositório de painel do cliente
sidebar_position: 19
---

# Repositório de painel do cliente

O `ClientDashboardRepository` agrega dados do armazenamento de itens baseado em Git e do banco de dados relacional (votos, comentários, visualizações) para produzir estatísticas de painel abrangentes para usuários de clientes individuais.

**Arquivo fonte:** `template/lib/repositories/client-dashboard.repository.ts`

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

O tipo de retorno principal que contém todas as métricas do painel:

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

### Tipos de suporte

|Tipo|Campos|Objetivo|
|------|--------|---------|
|`ActivityData`|`date`, `submissions`, `views`, `engagement`|Atividade diária para gráficos|
|`SubmissionTimelineData`|`month`, `submissions`|Contagens de envios mensais|
|`EngagementOverviewData`|`week`, `votes`, `comments`|Análise semanal do engajamento|
|`StatusBreakdownData`|`status`, `value`, `color`|Contagens aprovadas/pendentes/rejeitadas|
|`TopItem`|`id`, `title`, `views`, `votes`, `comments`|Itens de melhor desempenho|
|`PeriodComparisonData`|`thisWeek`, `lastWeek`, `change`|Comparação semana a semana|
|`CategoryPerformanceData`|`category`, `itemCount`, `totalEngagement`, `avgEngagement`|Desempenho por categoria|
|`ApprovalTrendData`|`month`, `approved`, `total`, `rate`|Taxas de aprovação mensais|
|`SubmissionCalendarData`|`date`, `count`|Dados de mapa de calor de envio diário|
|`EngagementDistributionData`|`id`, `title`, `slug`, `engagement`, `percentage`|Parcela de engajamento por item|

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

## Método Primário

### `getStats(userId): Promise<DashboardStats>`

O principal ponto de entrada que cria o conjunto de dados completo do painel para um determinado usuário.

```ts
async getStats(userId: string): Promise<DashboardStats>
```

**Fluxo de processamento:**

1. **Resolver perfil do cliente** -- chama `getClientProfileByUserId(userId)` para obter o `clientProfileId`
2. **Buscar itens do usuário** – carrega todos os itens não excluídos enviados por este usuário do repositório Git
3. **Extrair slugs de itens** – usados como chaves de junção para consultas de banco de dados
4. **Executar consultas paralelas** -- executa 11 consultas simultaneamente via `Promise.all`:

|Função de consulta|Fonte|Dados recuperados|
|----------------|--------|---------------|
|`getVotesReceivedCount(slugs)`|`dashboard.queries`|Total de votos nos itens do usuário|
|`getCommentsReceivedCount(slugs)`|`dashboard.queries`|Total de comentários nos itens do usuário|
|`getUniqueItemsInteractedCount(profileId)`|`dashboard.queries`|Itens com os quais o usuário interagiu|
|`getUserTotalActivityCount(profileId)`|`dashboard.queries`|Contagem total de atividades do usuário|
|`getWeeklyEngagementData(slugs, 12)`|`dashboard.queries`|12 semanas de dados de engajamento|
|`getDailyActivityData(profileId, slugs, 7)`|`dashboard.queries`|7 dias de dados de atividade|
|`getTopItemsEngagement(slugs, 10)`|`dashboard.queries`|Os 10 principais itens por engajamento|
|`getTotalViewsCount(slugs)`|`item-view.queries`|Total de visualizações de página|
|`getRecentViewsCount(slugs, 7)`|`item-view.queries`|Visualizações nos últimos sete dias|
|`getDailyViewsData(slugs, 14)`|`item-view.queries`|14 dias de visualização diária de dados|
|`getViewsPerItem(slugs)`|`item-view.queries`|Ver contagens por slug de item|

5. **Calcular métricas derivadas** – processa dados brutos em formatos prontos para gráficos

---

## Private Calculation Methods

### `calculateStatusBreakdown(items)`

Counts items by status (approved, pending, rejected) and assigns color codes.

Returns: `StatusBreakdownData[]` with hex colors (`#10B981`, `#F59E0B`, `#EF4444`).

---

### `calculateSubmissionTimeline(items)`

Agrega envios por mês nos últimos 6 meses. Usa carimbos de data/hora `submitted_at` dos dados do item.

Retorna: `SubmissionTimelineData[]` com abreviações dos meses (janeiro, fevereiro, etc.).

---

### `calculateRecentSubmissions(items, days)`

Counts items submitted within the last N days.

---

### `mapTopItems(engagement, items, viewsPerItem)`

Une dados de engajamento (votos, comentários) do banco de dados com metadados de itens do Git e contagens de visualizações. Retorna os 5 principais itens.

---

### `injectViewsIntoActivityData(activityData, dailyViewsMap)`

Merges daily view counts from the `dailyViewsMap` into the activity chart data array by matching date strings.

---

### `calculatePeriodComparison(engagementOverview, items, dailyViewsMap)`

Calcula alterações semanais para votos, comentários, envios e visualizações. Calcula a variação percentual com proteção de divisão por zero (retorna 100% se o anterior for 0 e a corrente for positiva).

---

### `calculateCategoryPerformance(items, topItemsEngagement, viewsPerItem)`

Groups items by category and aggregates engagement (votes + comments + views). Items with multiple categories are counted for each category. Returns the top 5 categories sorted by average engagement.

---

### `calculateApprovalTrend(items)`

Rastreia a taxa de aprovação mensal nos últimos 6 meses. Retorna a contagem de itens aprovados, o total de itens e a porcentagem de aprovação.

---

### `calculateSubmissionCalendar(items)`

Generates a 90-day calendar heatmap dataset showing daily submission counts.

---

### `calculateEngagementDistribution(items, topItemsEngagement, viewsPerItem)`

Calcula a porcentagem de participação de engajamento para os 10 principais itens por engajamento total (votos + comentários + visualizações).

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

|Constante|Valores|
|----------|--------|
|`STATUS_COLORS`|Aprovado: `#10B981`, Pendente: `#F59E0B`, Rejeitado: `#EF4444`|
|`ENGAGEMENT_COLORS`|visualizações: `#3B82F6`, votos: `#10B981`, comentários: `#F59E0B`, compartilhamentos: `#8B5CF6`|
|`MONTH_NAMES`|`['Jan', 'Feb', ..., 'Dec']`|

---

## Empty State Handling

When a user has no client profile, the repository returns a complete `DashboardStats` object with all values zeroed out via `getEmptyStats()`. This includes properly structured empty arrays for all chart data so the UI can render empty-state charts without null checks.

---

## Exemplo de uso

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
