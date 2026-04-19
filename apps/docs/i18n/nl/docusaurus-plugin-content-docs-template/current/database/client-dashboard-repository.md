---
id: client-dashboard-repository
title: Klantdashboardopslagplaats
sidebar_label: Klantdashboardopslagplaats
sidebar_position: 19
---

# Klantdashboardopslagplaats

De `ClientDashboardRepository` verzamelt gegevens uit de op Git gebaseerde itemopslag en de relationele database (stemmen, opmerkingen, weergaven) om uitgebreide dashboardstatistieken voor individuele klantgebruikers te produceren.

**Bronbestand:** `template/lib/repositories/client-dashboard.repository.ts`

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

## Geëxporteerde typen

### `DashboardStats`

Het primaire retourtype dat alle dashboardstatistieken bevat:

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

### Ondersteunende typen

|Typ|Velden|Doel|
|------|--------|---------|
|`ActivityData`|`date`, `submissions`, `views`, `engagement`|Dagelijkse activiteit voor grafieken|
|`SubmissionTimelineData`|`month`, `submissions`|Maandelijkse inzending telt|
|`EngagementOverviewData`|`week`, `votes`, `comments`|Wekelijkse uitsplitsing van de betrokkenheid|
|`StatusBreakdownData`|`status`, `value`, `color`|Goedgekeurde/in behandeling/afgewezen tellingen|
|`TopItem`|`id`, `title`, `views`, `votes`, `comments`|Best presterende artikelen|
|`PeriodComparisonData`|`thisWeek`, `lastWeek`, `change`|Vergelijking van week tot week|
|`CategoryPerformanceData`|`category`, `itemCount`, `totalEngagement`, `avgEngagement`|Prestaties per categorie|
|`ApprovalTrendData`|`month`, `approved`, `total`, `rate`|Maandelijkse goedkeuringspercentages|
|`SubmissionCalendarData`|`date`, `count`|Dagelijkse indiening van heatmapgegevens|
|`EngagementDistributionData`|`id`, `title`, `slug`, `engagement`, `percentage`|Betrokkenheidsaandeel per item|

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

## Primaire methode

### `getStats(userId): Promise<DashboardStats>`

Het belangrijkste toegangspunt dat de volledige dashboardgegevensset voor een bepaalde gebruiker samenstelt.

```ts
async getStats(userId: string): Promise<DashboardStats>
```

**Verwerkingsstroom:**

1. **Klantprofiel oplossen** -- belt `getClientProfileByUserId(userId)` om de `clientProfileId` te verkrijgen
2. **Gebruikersitems ophalen** -- laadt alle niet-verwijderde items die door deze gebruiker zijn ingediend vanuit de Git-repository
3. **Extraheer item-slugs** - gebruikt als join-sleutels voor databasequery's
4. **Voer parallelle query's uit** -- voert 11 query's tegelijkertijd uit via `Promise.all`:

|Query-functie|Bron|Gegevens opgehaald|
|----------------|--------|---------------|
|`getVotesReceivedCount(slugs)`|`dashboard.queries`|Totaal aantal stemmen op items van gebruikers|
|`getCommentsReceivedCount(slugs)`|`dashboard.queries`|Totaal aantal reacties op items van gebruikers|
|`getUniqueItemsInteractedCount(profileId)`|`dashboard.queries`|Items waarmee de gebruiker interactie heeft gehad|
|`getUserTotalActivityCount(profileId)`|`dashboard.queries`|Totaal aantal gebruikersactiviteiten|
|`getWeeklyEngagementData(slugs, 12)`|`dashboard.queries`|12 weken aan betrokkenheidsgegevens|
|`getDailyActivityData(profileId, slugs, 7)`|`dashboard.queries`|7 dagen aan activiteitsgegevens|
|`getTopItemsEngagement(slugs, 10)`|`dashboard.queries`|Top 10 items op basis van betrokkenheid|
|`getTotalViewsCount(slugs)`|`item-view.queries`|Totaal aantal paginaweergaven|
|`getRecentViewsCount(slugs, 7)`|`item-view.queries`|Weergaven in de afgelopen zeven dagen|
|`getDailyViewsData(slugs, 14)`|`item-view.queries`|14 dagen aan dagelijkse weergavegegevens|
|`getViewsPerItem(slugs)`|`item-view.queries`|Bekijk aantallen per artikelslak|

5. **Bereken afgeleide statistieken**: verwerkt ruwe gegevens in diagramformaten

---

## Private Calculation Methods

### `calculateStatusBreakdown(items)`

Counts items by status (approved, pending, rejected) and assigns color codes.

Returns: `StatusBreakdownData[]` with hex colors (`#10B981`, `#F59E0B`, `#EF4444`).

---

### `calculateSubmissionTimeline(items)`

Verzamelt de inzendingen per maand van de afgelopen zes maanden. Gebruikt `submitted_at` tijdstempels van itemgegevens.

Retourneert: `SubmissionTimelineData[]` met maandafkortingen (januari, februari, etc.).

---

### `calculateRecentSubmissions(items, days)`

Counts items submitted within the last N days.

---

### `mapTopItems(engagement, items, viewsPerItem)`

Voegt betrokkenheidsgegevens (stemmen, opmerkingen) uit de database samen met itemmetagegevens uit Git en weergavetellingen. Retourneert de top 5 items.

---

### `injectViewsIntoActivityData(activityData, dailyViewsMap)`

Merges daily view counts from the `dailyViewsMap` into the activity chart data array by matching date strings.

---

### `calculatePeriodComparison(engagementOverview, items, dailyViewsMap)`

Berekent wijzigingen van week tot week voor stemmen, opmerkingen, inzendingen en weergaven. Berekent de procentuele verandering met bescherming tegen delen door nul (retourneert 100% als de vorige 0 was en de huidige positief is).

---

### `calculateCategoryPerformance(items, topItemsEngagement, viewsPerItem)`

Groups items by category and aggregates engagement (votes + comments + views). Items with multiple categories are counted for each category. Returns the top 5 categories sorted by average engagement.

---

### `calculateApprovalTrend(items)`

Houdt het maandelijkse goedkeuringspercentage van de afgelopen zes maanden bij. Retourneert het aantal goedgekeurde artikelen, het totale aantal artikelen en het goedkeuringspercentage.

---

### `calculateSubmissionCalendar(items)`

Generates a 90-day calendar heatmap dataset showing daily submission counts.

---

### `calculateEngagementDistribution(items, topItemsEngagement, viewsPerItem)`

Berekent het percentage betrokkenheidsaandeel voor de top 10 items op basis van totale betrokkenheid (stemmen + reacties + weergaven).

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

## Constanten

|Constant|Waarden|
|----------|--------|
|`STATUS_COLORS`|Goedgekeurd: `#10B981`, in behandeling: `#F59E0B`, afgewezen: `#EF4444`|
|`ENGAGEMENT_COLORS`|bekeken: `#3B82F6`, stemmen: `#10B981`, commentaar: `#F59E0B`, aandelen: `#8B5CF6`|
|`MONTH_NAMES`|`['Jan', 'Feb', ..., 'Dec']`|

---

## Empty State Handling

When a user has no client profile, the repository returns a complete `DashboardStats` object with all values zeroed out via `getEmptyStats()`. This includes properly structured empty arrays for all chart data so the UI can render empty-state charts without null checks.

---

## Gebruiksvoorbeeld

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
