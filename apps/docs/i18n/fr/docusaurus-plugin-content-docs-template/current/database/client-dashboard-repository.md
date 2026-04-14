---
id: client-dashboard-repository
title: Référentiel du tableau de bord client
sidebar_label: Référentiel du tableau de bord client
sidebar_position: 19
---

# Référentiel du tableau de bord client

Le `ClientDashboardRepository` regroupe les données du stockage d'éléments basé sur Git et de la base de données relationnelle (votes, commentaires, vues) pour produire des statistiques de tableau de bord complètes pour les utilisateurs clients individuels.

**Fichier source :** `template/lib/repositories/client-dashboard.repository.ts`

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

## Types exportés

### `DashboardStats`

Type de retour principal contenant toutes les métriques du tableau de bord :

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

### Types pris en charge

|Tapez|Champs|Objectif|
|------|--------|---------|
|`ActivityData`|`date`, `submissions`, `views`, `engagement`|Activité quotidienne pour les graphiques|
|`SubmissionTimelineData`|`month`, `submissions`|Nombre de soumissions mensuelles|
|`EngagementOverviewData`|`week`, `votes`, `comments`|Répartition hebdomadaire des engagements|
|`StatusBreakdownData`|`status`, `value`, `color`|Nombres approuvés/en attente/rejetés|
|`TopItem`|`id`, `title`, `views`, `votes`, `comments`|Articles les plus performants|
|`PeriodComparisonData`|`thisWeek`, `lastWeek`, `change`|Comparaison semaine après semaine|
|`CategoryPerformanceData`|`category`, `itemCount`, `totalEngagement`, `avgEngagement`|Performances par catégorie|
|`ApprovalTrendData`|`month`, `approved`, `total`, `rate`|Taux d'approbation mensuels|
|`SubmissionCalendarData`|`date`, `count`|Données de la carte thermique de soumission quotidienne|
|`EngagementDistributionData`|`id`, `title`, `slug`, `engagement`, `percentage`|Part d'engagement par article|

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

## Méthode principale

### `getStats(userId): Promise<DashboardStats>`

Le point d'entrée principal qui crée l'ensemble de données complet du tableau de bord pour un utilisateur donné.

```ts
async getStats(userId: string): Promise<DashboardStats>
```

**Flux de traitement :**

1. **Résoudre le profil client** -- appelle `getClientProfileByUserId(userId)` pour obtenir le `clientProfileId`
2. **Récupérer les éléments utilisateur** -- charge tous les éléments non supprimés soumis par cet utilisateur à partir du référentiel Git
3. **Extraire les slugs d'éléments** -- utilisés comme clés de jointure pour les requêtes de base de données
4. **Exécuter des requêtes parallèles** -- exécute 11 requêtes simultanément via `Promise.all` :

|Fonction de requête|Origine|Données récupérées|
|----------------|--------|---------------|
|`getVotesReceivedCount(slugs)`|`dashboard.queries`|Total des votes sur les éléments de l'utilisateur|
|`getCommentsReceivedCount(slugs)`|`dashboard.queries`|Total des commentaires sur les éléments de l'utilisateur|
|`getUniqueItemsInteractedCount(profileId)`|`dashboard.queries`|Éléments avec lesquels l'utilisateur a interagi|
|`getUserTotalActivityCount(profileId)`|`dashboard.queries`|Nombre total d'activités des utilisateurs|
|`getWeeklyEngagementData(slugs, 12)`|`dashboard.queries`|12 semaines de données d'engagement|
|`getDailyActivityData(profileId, slugs, 7)`|`dashboard.queries`|7 jours de données d'activité|
|`getTopItemsEngagement(slugs, 10)`|`dashboard.queries`|Top 10 des articles par engagement|
|`getTotalViewsCount(slugs)`|`item-view.queries`|Nombre total de pages vues|
|`getRecentViewsCount(slugs, 7)`|`item-view.queries`|Vues au cours des 7 derniers jours|
|`getDailyViewsData(slugs, 14)`|`item-view.queries`|14 jours de données de visualisation quotidiennes|
|`getViewsPerItem(slugs)`|`item-view.queries`|Afficher le nombre par élément|

5. **Calculer les métriques dérivées** – traite les données brutes dans des formats prêts à l'emploi

---

## Private Calculation Methods

### `calculateStatusBreakdown(items)`

Counts items by status (approved, pending, rejected) and assigns color codes.

Returns: `StatusBreakdownData[]` with hex colors (`#10B981`, `#F59E0B`, `#EF4444`).

---

### `calculateSubmissionTimeline(items)`

Regroupe les soumissions par mois pour les 6 derniers mois. Utilise les horodatages `submitted_at` à partir des données d'élément.

Renvoie : `SubmissionTimelineData[]` avec les abréviations des mois (janvier, février, etc.).

---

### `calculateRecentSubmissions(items, days)`

Counts items submitted within the last N days.

---

### `mapTopItems(engagement, items, viewsPerItem)`

Joint les données d'engagement (votes, commentaires) de la base de données aux métadonnées des éléments de Git et au nombre de vues. Renvoie les 5 premiers éléments.

---

### `injectViewsIntoActivityData(activityData, dailyViewsMap)`

Merges daily view counts from the `dailyViewsMap` into the activity chart data array by matching date strings.

---

### `calculatePeriodComparison(engagementOverview, items, dailyViewsMap)`

Calcule les modifications d'une semaine à l'autre pour les votes, les commentaires, les soumissions et les vues. Calcule la variation en pourcentage avec protection division par zéro (renvoie 100 % si le précédent était 0 et le courant est positif).

---

### `calculateCategoryPerformance(items, topItemsEngagement, viewsPerItem)`

Groups items by category and aggregates engagement (votes + comments + views). Items with multiple categories are counted for each category. Returns the top 5 categories sorted by average engagement.

---

### `calculateApprovalTrend(items)`

Suit le taux d’approbation mensuel au cours des 6 derniers mois. Renvoie le nombre d'éléments approuvés, le nombre total d'éléments et le pourcentage d'approbation.

---

### `calculateSubmissionCalendar(items)`

Generates a 90-day calendar heatmap dataset showing daily submission counts.

---

### `calculateEngagementDistribution(items, topItemsEngagement, viewsPerItem)`

Calcule le pourcentage de part d'engagement pour les 10 principaux éléments par engagement total (votes + commentaires + vues).

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

|Constante|Valeurs|
|----------|--------|
|`STATUS_COLORS`|Approuvé : `#10B981`, En attente : `#F59E0B`, Rejeté : `#EF4444`|
|`ENGAGEMENT_COLORS`|vues : `#3B82F6`, votes : `#10B981`, commentaires : `#F59E0B`, partages : `#8B5CF6`|
|`MONTH_NAMES`|`['Jan', 'Feb', ..., 'Dec']`|

---

## Empty State Handling

When a user has no client profile, the repository returns a complete `DashboardStats` object with all values zeroed out via `getEmptyStats()`. This includes properly structured empty arrays for all chart data so the UI can render empty-state charts without null checks.

---

## Exemple d'utilisation

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
