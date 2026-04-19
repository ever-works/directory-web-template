---
id: client-dashboard-repository
title: Repozytorium panelu klienta
sidebar_label: Repozytorium panelu klienta
sidebar_position: 19
---

# Repozytorium panelu klienta

`ClientDashboardRepository` agreguje dane z magazynu elementów opartego na Git i relacyjnej bazy danych (głosy, komentarze, wyświetlenia), aby wygenerować kompleksowe statystyki dashboardów dla indywidualnych użytkowników klientów.

**Plik źródłowy:** `template/lib/repositories/client-dashboard.repository.ts`

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

## Eksportowane typy

### `DashboardStats`

Podstawowy typ zwrotu zawierający wszystkie metryki dashboardu:

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

### Typy pomocnicze

|Wpisz|Pola|Cel|
|------|--------|---------|
|`ActivityData`|`date`, `submissions`, `views`, `engagement`|Dzienna aktywność na wykresach|
|`SubmissionTimelineData`|`month`, `submissions`|Liczy się miesięczne przesyłanie|
|`EngagementOverviewData`|`week`, `votes`, `comments`|Tygodniowy podział zaangażowania|
|`StatusBreakdownData`|`status`, `value`, `color`|Liczba zatwierdzonych/oczekujących/odrzuconych|
|`TopItem`|`id`, `title`, `views`, `votes`, `comments`|Najskuteczniejsze elementy|
|`PeriodComparisonData`|`thisWeek`, `lastWeek`, `change`|Porównanie tydzień po tygodniu|
|`CategoryPerformanceData`|`category`, `itemCount`, `totalEngagement`, `avgEngagement`|Wydajność według kategorii|
|`ApprovalTrendData`|`month`, `approved`, `total`, `rate`|Miesięczne stawki zatwierdzeń|
|`SubmissionCalendarData`|`date`, `count`|Codzienne przesyłanie danych mapy cieplnej|
|`EngagementDistributionData`|`id`, `title`, `slug`, `engagement`, `percentage`|Udział zaangażowania na element|

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

## Metoda podstawowa

### `getStats(userId): Promise<DashboardStats>`

Główny punkt wejścia, który buduje kompletny zestaw danych dashboardu dla danego użytkownika.

```ts
async getStats(userId: string): Promise<DashboardStats>
```

**Przebieg przetwarzania:**

1. **Rozwiąż profil klienta** — wywołuje `getClientProfileByUserId(userId)`, aby uzyskać `clientProfileId`
2. **Pobierz elementy użytkownika** — ładuje wszystkie nieusunięte elementy przesłane przez tego użytkownika z repozytorium Git
3. **Wyodrębnij ślimaki przedmiotów** — używane jako klucze łączenia w zapytaniach do bazy danych
4. **Wykonuj zapytania równoległe** -- uruchamia 11 zapytań jednocześnie poprzez `Promise.all`:

|Funkcja zapytania|Źródło|Dane odzyskane|
|----------------|--------|---------------|
|`getVotesReceivedCount(slugs)`|`dashboard.queries`|Całkowita liczba głosów na przedmioty użytkownika|
|`getCommentsReceivedCount(slugs)`|`dashboard.queries`|Całkowita liczba komentarzy do elementów użytkownika|
|`getUniqueItemsInteractedCount(profileId)`|`dashboard.queries`|Elementy, z którymi użytkownik wszedł w interakcję|
|`getUserTotalActivityCount(profileId)`|`dashboard.queries`|Całkowita liczba aktywności użytkownika|
|`getWeeklyEngagementData(slugs, 12)`|`dashboard.queries`|Dane dotyczące zaangażowania z 12 tygodni|
|`getDailyActivityData(profileId, slugs, 7)`|`dashboard.queries`|Dane dotyczące aktywności z 7 dni|
|`getTopItemsEngagement(slugs, 10)`|`dashboard.queries`|10 najlepszych pozycji według zaangażowania|
|`getTotalViewsCount(slugs)`|`item-view.queries`|Całkowita liczba odsłon strony|
|`getRecentViewsCount(slugs, 7)`|`item-view.queries`|Wyświetlenia w ciągu ostatnich 7 dni|
|`getDailyViewsData(slugs, 14)`|`item-view.queries`|Dane widoku dziennego z 14 dni|
|`getViewsPerItem(slugs)`|`item-view.queries`|Wyświetl liczbę sztuk na ślimak|

5. **Obliczaj metryki pochodne** – przetwarza surowe dane do formatów gotowych do tworzenia wykresów

---

## Private Calculation Methods

### `calculateStatusBreakdown(items)`

Counts items by status (approved, pending, rejected) and assigns color codes.

Returns: `StatusBreakdownData[]` with hex colors (`#10B981`, `#F59E0B`, `#EF4444`).

---

### `calculateSubmissionTimeline(items)`

Agreguje zgłoszenia według miesięcy z ostatnich 6 miesięcy. Wykorzystuje znaczniki czasu `submitted_at` z danych elementu.

Zwroty: `SubmissionTimelineData[]` ze skrótami miesięcy (styczeń, luty itp.).

---

### `calculateRecentSubmissions(items, days)`

Counts items submitted within the last N days.

---

### `mapTopItems(engagement, items, viewsPerItem)`

Łączy dane dotyczące zaangażowania (głosy, komentarze) z bazy danych z metadanymi elementów z Git i liczbą wyświetleń. Zwraca 5 pierwszych elementów.

---

### `injectViewsIntoActivityData(activityData, dailyViewsMap)`

Merges daily view counts from the `dailyViewsMap` into the activity chart data array by matching date strings.

---

### `calculatePeriodComparison(engagementOverview, items, dailyViewsMap)`

Oblicza tygodniowe zmiany dotyczące głosów, komentarzy, zgłoszeń i wyświetleń. Oblicza zmianę procentową z ochroną przed dzieleniem przez zero (zwraca 100%, jeśli poprzednio było 0, a prąd jest dodatni).

---

### `calculateCategoryPerformance(items, topItemsEngagement, viewsPerItem)`

Groups items by category and aggregates engagement (votes + comments + views). Items with multiple categories are counted for each category. Returns the top 5 categories sorted by average engagement.

---

### `calculateApprovalTrend(items)`

Śledzi miesięczny współczynnik zatwierdzeń w ciągu ostatnich 6 miesięcy. Zwraca liczbę zatwierdzonych elementów, łączną liczbę elementów i procent zatwierdzenia.

---

### `calculateSubmissionCalendar(items)`

Generates a 90-day calendar heatmap dataset showing daily submission counts.

---

### `calculateEngagementDistribution(items, topItemsEngagement, viewsPerItem)`

Oblicza procent udziału w zaangażowaniu dla 10 najważniejszych elementów według całkowitego zaangażowania (głosy + komentarze + wyświetlenia).

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

## Stałe

|Stała|Wartości|
|----------|--------|
|`STATUS_COLORS`|Zatwierdzony: `#10B981`, Oczekujący: `#F59E0B`, Odrzucony: `#EF4444`|
|`ENGAGEMENT_COLORS`|odsłon: `#3B82F6`, głosów: `#10B981`, komentarzy: `#F59E0B`, udostępnień: `#8B5CF6`|
|`MONTH_NAMES`|`['Jan', 'Feb', ..., 'Dec']`|

---

## Empty State Handling

When a user has no client profile, the repository returns a complete `DashboardStats` object with all values zeroed out via `getEmptyStats()`. This includes properly structured empty arrays for all chart data so the UI can render empty-state charts without null checks.

---

## Przykład użycia

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
