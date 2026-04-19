---
id: client-dashboard-repository
title: Client-Dashboard-Repository
sidebar_label: Client-Dashboard-Repository
sidebar_position: 19
---

# Client-Dashboard-Repository

Der `ClientDashboardRepository` aggregiert Daten aus dem Git-basierten Elementspeicher und der relationalen Datenbank (Stimmen, Kommentare, Ansichten), um umfassende Dashboard-Statistiken für einzelne Client-Benutzer zu erstellen.

**Quelldatei:** `template/lib/repositories/client-dashboard.repository.ts`

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

## Exportierte Typen

### `DashboardStats`

Der primäre Rückgabetyp, der alle Dashboard-Metriken enthält:

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

### Unterstützende Typen

|Typ|Felder|Zweck|
|------|--------|---------|
|`ActivityData`|`date`, `submissions`, `views`, `engagement`|Tägliche Aktivität für Diagramme|
|`SubmissionTimelineData`|`month`, `submissions`|Es zählt die monatliche Einreichung|
|`EngagementOverviewData`|`week`, `votes`, `comments`|Wöchentliche Aufschlüsselung der Verlobungen|
|`StatusBreakdownData`|`status`, `value`, `color`|Genehmigte/ausstehende/abgelehnte Zählungen|
|`TopItem`|`id`, `title`, `views`, `votes`, `comments`|Artikel mit der besten Leistung|
|`PeriodComparisonData`|`thisWeek`, `lastWeek`, `change`|Wochenvergleich|
|`CategoryPerformanceData`|`category`, `itemCount`, `totalEngagement`, `avgEngagement`|Leistung nach Kategorie|
|`ApprovalTrendData`|`month`, `approved`, `total`, `rate`|Monatliche Genehmigungsraten|
|`SubmissionCalendarData`|`date`, `count`|Tägliche Übermittlungs-Heatmap-Daten|
|`EngagementDistributionData`|`id`, `title`, `slug`, `engagement`, `percentage`|Engagement-Anteil pro Artikel|

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

## Primäre Methode

### `getStats(userId): Promise<DashboardStats>`

Der Haupteinstiegspunkt, der den vollständigen Dashboard-Datensatz für einen bestimmten Benutzer erstellt.

```ts
async getStats(userId: string): Promise<DashboardStats>
```

**Verarbeitungsablauf:**

1. **Kundenprofil auflösen** – ruft `getClientProfileByUserId(userId)` auf, um das `clientProfileId` zu erhalten
2. **Benutzerelemente abrufen** – lädt alle nicht gelöschten Elemente, die von diesem Benutzer übermittelt wurden, aus dem Git-Repository
3. **Element-Slugs extrahieren** – werden als Join-Schlüssel für Datenbankabfragen verwendet
4. **Parallele Abfragen ausführen** – führt 11 Abfragen gleichzeitig über `Promise.all` aus:

|Abfragefunktion|Quelle|Daten abgerufen|
|----------------|--------|---------------|
|`getVotesReceivedCount(slugs)`|`dashboard.queries`|Gesamtstimmen zu den Artikeln des Benutzers|
|`getCommentsReceivedCount(slugs)`|`dashboard.queries`|Gesamtzahl der Kommentare zu den Artikeln des Benutzers|
|`getUniqueItemsInteractedCount(profileId)`|`dashboard.queries`|Elemente, mit denen der Benutzer interagiert hat|
|`getUserTotalActivityCount(profileId)`|`dashboard.queries`|Gesamtzahl der Benutzeraktivitäten|
|`getWeeklyEngagementData(slugs, 12)`|`dashboard.queries`|12 Wochen Engagement-Daten|
|`getDailyActivityData(profileId, slugs, 7)`|`dashboard.queries`|7 Tage Aktivitätsdaten|
|`getTopItemsEngagement(slugs, 10)`|`dashboard.queries`|Top 10 Artikel nach Engagement|
|`getTotalViewsCount(slugs)`|`item-view.queries`|Gesamtseitenaufrufe|
|`getRecentViewsCount(slugs, 7)`|`item-view.queries`|Aufrufe in den letzten 7 Tagen|
|`getDailyViewsData(slugs, 14)`|`item-view.queries`|14 Tage tägliche Ansichtsdaten|
|`getViewsPerItem(slugs)`|`item-view.queries`|Anzahl der Aufrufe pro Artikel-Slug|

5. **Abgeleitete Metriken berechnen** – verarbeitet Rohdaten in diagrammfähige Formate

---

## Private Calculation Methods

### `calculateStatusBreakdown(items)`

Counts items by status (approved, pending, rejected) and assigns color codes.

Returns: `StatusBreakdownData[]` with hex colors (`#10B981`, `#F59E0B`, `#EF4444`).

---

### `calculateSubmissionTimeline(items)`

Fasst die Einreichungen der letzten 6 Monate nach Monat zusammen. Verwendet `submitted_at` Zeitstempel aus Artikeldaten.

Rückgabe: `SubmissionTimelineData[]` mit Monatsabkürzungen (Jan, Feb usw.).

---

### `calculateRecentSubmissions(items, days)`

Counts items submitted within the last N days.

---

### `mapTopItems(engagement, items, viewsPerItem)`

Verknüpft Engagement-Daten (Stimmen, Kommentare) aus der Datenbank mit Elementmetadaten aus Git und Anzahl der Aufrufe. Gibt die Top-5-Elemente zurück.

---

### `injectViewsIntoActivityData(activityData, dailyViewsMap)`

Merges daily view counts from the `dailyViewsMap` into the activity chart data array by matching date strings.

---

### `calculatePeriodComparison(engagementOverview, items, dailyViewsMap)`

Berechnet wöchentliche Änderungen für Abstimmungen, Kommentare, Einsendungen und Ansichten. Berechnet die prozentuale Änderung mit Division durch Null-Schutz (gibt 100 % zurück, wenn der vorherige Wert 0 war und der Strom positiv ist).

---

### `calculateCategoryPerformance(items, topItemsEngagement, viewsPerItem)`

Groups items by category and aggregates engagement (votes + comments + views). Items with multiple categories are counted for each category. Returns the top 5 categories sorted by average engagement.

---

### `calculateApprovalTrend(items)`

Verfolgt die monatliche Genehmigungsrate der letzten 6 Monate. Gibt die Anzahl der genehmigten Artikel, die Gesamtzahl der Artikel und den Genehmigungsprozentsatz zurück.

---

### `calculateSubmissionCalendar(items)`

Generates a 90-day calendar heatmap dataset showing daily submission counts.

---

### `calculateEngagementDistribution(items, topItemsEngagement, viewsPerItem)`

Berechnet den Prozentsatz des Engagementanteils für die Top-10-Elemente nach Gesamtengagement (Stimmen + Kommentare + Aufrufe).

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

## Konstanten

|Konstant|Werte|
|----------|--------|
|`STATUS_COLORS`|Genehmigt: `#10B981`, Ausstehend: `#F59E0B`, Abgelehnt: `#EF4444`|
|`ENGAGEMENT_COLORS`|Aufrufe: `#3B82F6`, Stimmen: `#10B981`, Kommentare: `#F59E0B`, Anteile: `#8B5CF6`|
|`MONTH_NAMES`|`['Jan', 'Feb', ..., 'Dec']`|

---

## Empty State Handling

When a user has no client profile, the repository returns a complete `DashboardStats` object with all values zeroed out via `getEmptyStats()`. This includes properly structured empty arrays for all chart data so the UI can render empty-state charts without null checks.

---

## Anwendungsbeispiel

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
