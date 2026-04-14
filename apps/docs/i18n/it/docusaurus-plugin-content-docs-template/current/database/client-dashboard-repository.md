---
id: client-dashboard-repository
title: Repository del dashboard del cliente
sidebar_label: Repository del dashboard del cliente
sidebar_position: 19
---

# Repository del dashboard del cliente

`ClientDashboardRepository` aggrega i dati dall'archiviazione degli elementi basata su Git e dal database relazionale (voti, commenti, visualizzazioni) per produrre statistiche complete sul dashboard per i singoli utenti del cliente.

**File sorgente:** `template/lib/repositories/client-dashboard.repository.ts`

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

## Tipi esportati

### `DashboardStats`

Il tipo restituito principale contenente tutte le metriche del dashboard:

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

### Tipi di supporto

|Digitare|Campi|Scopo|
|------|--------|---------|
|`ActivityData`|`date`, `submissions`, `views`, `engagement`|Attività quotidiana per i grafici|
|`SubmissionTimelineData`|`month`, `submissions`|Conta l'invio mensile|
|`EngagementOverviewData`|`week`, `votes`, `comments`|Ripartizione settimanale del coinvolgimento|
|`StatusBreakdownData`|`status`, `value`, `color`|Conteggi approvati/in sospeso/rifiutati|
|`TopItem`|`id`, `title`, `views`, `votes`, `comments`|Articoli con le migliori prestazioni|
|`PeriodComparisonData`|`thisWeek`, `lastWeek`, `change`|Confronto settimana su settimana|
|`CategoryPerformanceData`|`category`, `itemCount`, `totalEngagement`, `avgEngagement`|Prestazioni per categoria|
|`ApprovalTrendData`|`month`, `approved`, `total`, `rate`|Tassi di approvazione mensili|
|`SubmissionCalendarData`|`date`, `count`|Dati della mappa termica di invio giornaliero|
|`EngagementDistributionData`|`id`, `title`, `slug`, `engagement`, `percentage`|Quota di coinvolgimento per articolo|

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

## Metodo primario

### `getStats(userId): Promise<DashboardStats>`

Il punto di ingresso principale che crea il set di dati completo del dashboard per un determinato utente.

```ts
async getStats(userId: string): Promise<DashboardStats>
```

**Flusso di elaborazione:**

1. **Risolvi il profilo cliente** -- chiama `getClientProfileByUserId(userId)` per ottenere `clientProfileId`
2. **Recupera elementi utente**: carica tutti gli elementi non eliminati inviati da questo utente dal repository Git
3. **Estrai gli slug degli elementi**: utilizzati come chiavi di unione per le query del database
4. **Esegui query parallele** -- esegue 11 query simultaneamente tramite `Promise.all`:

|Funzione di interrogazione|Fonte|Dati recuperati|
|----------------|--------|---------------|
|`getVotesReceivedCount(slugs)`|`dashboard.queries`|Voti totali sugli articoli dell'utente|
|`getCommentsReceivedCount(slugs)`|`dashboard.queries`|Commenti totali sugli articoli dell'utente|
|`getUniqueItemsInteractedCount(profileId)`|`dashboard.queries`|Elementi con cui l'utente ha interagito|
|`getUserTotalActivityCount(profileId)`|`dashboard.queries`|Conteggio totale delle attività dell'utente|
|`getWeeklyEngagementData(slugs, 12)`|`dashboard.queries`|12 settimane di dati sul coinvolgimento|
|`getDailyActivityData(profileId, slugs, 7)`|`dashboard.queries`|7 giorni di dati di attività|
|`getTopItemsEngagement(slugs, 10)`|`dashboard.queries`|Primi 10 articoli per impegno|
|`getTotalViewsCount(slugs)`|`item-view.queries`|Visualizzazioni di pagina totali|
|`getRecentViewsCount(slugs, 7)`|`item-view.queries`|Visualizzazioni negli ultimi 7 giorni|
|`getDailyViewsData(slugs, 14)`|`item-view.queries`|14 giorni di dati di visualizzazione giornalieri|
|`getViewsPerItem(slugs)`|`item-view.queries`|Visualizza i conteggi per slug articolo|

5. **Calcola metriche derivate**: elabora i dati grezzi in formati pronti per i grafici

---

## Private Calculation Methods

### `calculateStatusBreakdown(items)`

Counts items by status (approved, pending, rejected) and assigns color codes.

Returns: `StatusBreakdownData[]` with hex colors (`#10B981`, `#F59E0B`, `#EF4444`).

---

### `calculateSubmissionTimeline(items)`

Aggrega gli invii per mese negli ultimi 6 mesi. Utilizza `submitted_at` timestamp dai dati dell'articolo.

Restituisce: `SubmissionTimelineData[]` con le abbreviazioni dei mesi (Gen, Feb, ecc.).

---

### `calculateRecentSubmissions(items, days)`

Counts items submitted within the last N days.

---

### `mapTopItems(engagement, items, viewsPerItem)`

Unisce i dati sul coinvolgimento (voti, commenti) dal database con i metadati degli elementi da Git e i conteggi delle visualizzazioni. Restituisce i primi 5 elementi.

---

### `injectViewsIntoActivityData(activityData, dailyViewsMap)`

Merges daily view counts from the `dailyViewsMap` into the activity chart data array by matching date strings.

---

### `calculatePeriodComparison(engagementOverview, items, dailyViewsMap)`

Calcola le modifiche settimanali per voti, commenti, invii e visualizzazioni. Calcola la variazione percentuale con la protezione divisione per zero (restituisce 100% se il precedente era 0 e la corrente è positiva).

---

### `calculateCategoryPerformance(items, topItemsEngagement, viewsPerItem)`

Groups items by category and aggregates engagement (votes + comments + views). Items with multiple categories are counted for each category. Returns the top 5 categories sorted by average engagement.

---

### `calculateApprovalTrend(items)`

Tiene traccia del tasso di approvazione mensile negli ultimi 6 mesi. Restituisce il conteggio degli elementi approvati, gli elementi totali e la percentuale di approvazione.

---

### `calculateSubmissionCalendar(items)`

Generates a 90-day calendar heatmap dataset showing daily submission counts.

---

### `calculateEngagementDistribution(items, topItemsEngagement, viewsPerItem)`

Calcola la percentuale di condivisione del coinvolgimento per i primi 10 elementi in base al coinvolgimento totale (voti + commenti + visualizzazioni).

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

## Costanti

|Costante|Valori|
|----------|--------|
|`STATUS_COLORS`|Approvato: `#10B981`, In attesa: `#F59E0B`, Rifiutato: `#EF4444`|
|`ENGAGEMENT_COLORS`|visualizzazioni: `#3B82F6`, voti: `#10B981`, commenti: `#F59E0B`, condivisioni: `#8B5CF6`|
|`MONTH_NAMES`|`['Jan', 'Feb', ..., 'Dec']`|

---

## Empty State Handling

When a user has no client profile, the repository returns a complete `DashboardStats` object with all values zeroed out via `getEmptyStats()`. This includes properly structured empty arrays for all chart data so the UI can render empty-state charts without null checks.

---

## Esempio di utilizzo

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
