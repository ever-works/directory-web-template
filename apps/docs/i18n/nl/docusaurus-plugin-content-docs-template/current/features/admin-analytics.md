---
id: admin-analytics
title: Beheerder Analytics
sidebar_label: Beheerder Analytics
sidebar_position: 32
---

# Beheeranalyse

Het beheerdersanalysesysteem biedt platformbrede statistieken, betrokkenheidsstatistieken, het volgen van gebruikersgroei en verwerking van achtergrondgegevens. Het combineert realtime databasequery's, aggregaties in de cache en optionele PostHog-integratie voor uitgebreide analyses.

## Architectuuroverzicht

| module | Pad | Doel |
|--------|------|---------|
| Bewaarplaats voor beheerdersstatistieken | `lib/repositories/admin-stats.repository.ts` | Kerndashboardstatistieken |
| Dashboardquery's | `lib/db/queries/dashboard.queries.ts` | Aggregatiequery's voor betrokkenheid |
| Betrokkenheidsvragen | `lib/db/queries/engagement.queries.ts` | Statistieken per artikel |
| Analytics-achtergrondprocessor | `lib/services/analytics-background-processor.ts` | Achtergrondtaakplanner |
| Analytics-client | `lib/analytics/index.ts` | PostHog/Sentry-integratie aan de clientzijde |
| PostHog API-service | `lib/services/posthog-api.service.ts` | PostHog-query's aan de serverzijde |
| Analytics-export | `lib/services/analytics-export.service.ts` | Functionaliteit voor gegevensexport |
| Geplande rapporten | `lib/services/analytics-scheduled-reports.service.ts` | Geautomatiseerde rapportgeneratie |

## Beheerdersdashboardstatistieken

De `AdminStatsRepository` verzamelt vier categorieën statistieken waarbij `Promise.allSettled` wordt gebruikt voor het veerkrachtig laden van gegevens:

```ts
export interface AdminDashboardStats {
  users: UserStats;
  submissions: SubmissionStats;
  activity: ActivityStats;
  newsletter: NewsletterStats;
}
```

### Gebruikersstatistieken

```ts
export interface UserStats {
  totalUsers: number;
  registeredUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}
```

Query's gebruiken UTC-genormaliseerde datumgrenzen om consistente resultaten te garanderen, ongeacht de tijdzone van de server:

```ts
async getUserStats(): Promise<UserStats> {
  const now = new Date();
  const todayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const weekStartUtc = new Date(todayUtc);
  // Monday-start week
  weekStartUtc.setUTCDate(
    todayUtc.getUTCDate() - ((todayUtc.getUTCDay() + 6) % 7)
  );
  const monthStartUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );

  const [total, today, week, month] = await Promise.all([
    db.select({ count: count() }).from(users)
      .where(isNull(users.deletedAt)),
    db.select({ count: count() }).from(users)
      .where(and(isNull(users.deletedAt), gte(users.createdAt, todayUtc))),
    // ... week and month queries
  ]);
  // ...
}
```

### Inzendingsstatistieken

```ts
export interface SubmissionStats {
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
}
```

Opgehaald uit de `ItemRepository.getStats()` -methode omdat items in het op Git gebaseerde CMS aanwezig zijn.

### Activiteitsstatistieken

```ts
export interface ActivityStats {
  totalViews: number;
  totalVotes: number;
  totalComments: number;
}
```

Weergaven zijn afkomstig van PostHog wanneer ze zijn geconfigureerd en vallen terug naar nul:

```ts
const [totalVotesResult, totalCommentsResult, totalViews] =
  await Promise.all([
    db.select({ count: count() }).from(votes),
    db.select({ count: count() }).from(comments)
      .where(isNull(comments.deletedAt)),
    postHogApiService.isConfigured()
      ? postHogApiService.getTotalPageViews()
      : Promise.resolve(0),
  ]);
```

### Nieuwsbriefstatistieken

```ts
export interface NewsletterStats {
  totalSubscribers: number;
  recentSubscribers: number; // subscribed this week
}
```

## Achtergrondanalyseverwerking

De `AnalyticsBackgroundProcessor` plant zes terugkerende opdrachten:

```ts
const JOB_INTERVALS = {
  USER_GROWTH: 10 * 60 * 1000,      // 10 minutes
  ACTIVITY_TRENDS: 5 * 60 * 1000,    // 5 minutes
  TOP_ITEMS: 15 * 60 * 1000,        // 15 minutes
  RECENT_ACTIVITY: 2 * 60 * 1000,   // 2 minutes
  PERFORMANCE_METRICS: 30 * 1000,    // 30 seconds
  CACHE_CLEANUP: 60 * 60 * 1000,    // 1 hour
};
```

| Baan | Interval | Doel |
|-----|----------|---------|
| Aggregatie van gebruikersgroei | 10 minuten | Vernieuwt trends in gebruikersgroei |
| Aggregatie van activiteitstrends | 5 minuten | Updates tijdreeksen voor betrokkenheid |
| Topitems rangschikking | 15 minuten | Berekent de populariteitsranglijst van artikelen opnieuw |
| Recente activiteitsupdate | 2 minuten | Vernieuwt de nieuwste activiteitenfeed |
| Update prestatiestatistieken | 30 seconden | Werkt real-time prestatiegegevens bij |
| Cache opruimen | 1 uur | Verwijdert verouderde aggregaties in de cache |

Taken kunnen worden uitgeschakeld door `DISABLE_AUTO_SYNC=true` in te stellen.

Elke taak volgt zijn eigen status:

```ts
interface JobStatus {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed' | 'scheduled';
  lastRun: Date;
  nextRun: Date;
  duration: number;
  error?: string;
}
```

## Betrokkenheidsstatistieken

### Statistieken per artikel

De functie `getEngagementMetricsPerItem` haalt alle statistieken parallel op:

```ts
export interface ItemEngagementMetrics {
  views: number;
  votes: number;       // Net votes (upvotes - downvotes)
  favorites: number;
  comments: number;
  avgRating: number;   // Average rating from comments (0-5)
}
```

Er worden vier parallelle query's uitgevoerd:

1. Bekijk tellingen vanaf `item_views` 2. Netto stemscores vanaf `votes` (upvote = +1, downvote = -1)
3. Favorieten tellen vanaf `favorites` 4. Aantal reacties en gemiddelde beoordelingen vanaf `comments` (exclusief zacht verwijderd)

### Populariteitsscore

Items worden gescoord met behulp van een logaritmisch algoritme:

```ts
// Approximate max scores at 1M interactions:
// Featured: 10,000 points (base boost)
// Views: ~6,000 points (weight: 1000)
// Votes: ~7,200 points (weight: 1200)
// Rating: 0-2,500 points (linear, 500 per star)
// Favorites: ~6,600 points (weight: 1100)
// Comments: ~6,000 points (weight: 1000)
// Recency: 0-1,750 points (decay over 180 days)
```

## Analyse aan de klantzijde

De singleton-klasse `Analytics` in `lib/analytics/index.ts` beheert tracking aan de clientzijde:

```ts
export class Analytics {
  init()                                    // Initialize PostHog
  identify(userId, properties?)             // Identify user
  track(eventName, properties?)             // Custom events
  trackPageView(url, properties?)           // Page views
  isFeatureEnabled(flagKey, defaultValue?)  // Feature flags
  captureException(error, context?)         // Error tracking
  setUserProperties(properties)             // User attributes
  setSuperProperties(properties)            // Global event properties
}
```

### Providers voor het volgen van uitzonderingen

De analysemodule ondersteunt drie configuraties voor het bijhouden van uitzonderingen:

| Aanbieder | Beschrijving |
|----------|------------|
| `posthog` | Fouten die alleen naar PostHog worden verzonden |
| `sentry` | Fouten die alleen naar Sentry worden verzonden |
| `both` | Fouten verzonden naar zowel PostHog als Sentry |

De provider wordt bepaald vanaf `EXCEPTION_TRACKING_PROVIDER` met automatische terugval als de geconfigureerde provider niet beschikbaar is.

### PostHog-configuratie

```ts
const config = {
  api_host: POSTHOG_HOST,
  debug: POSTHOG_DEBUG,
  capture_pageview: POSTHOG_AUTO_CAPTURE,
  capture_pageleave: true,
  session_recording: {
    maskAllInputs: true,
    maskTextSelector: "[data-mask]",
    sampleRate: POSTHOG_SESSION_RECORDING_SAMPLE_RATE,
  },
};
```

Bemonsteringsfrequenties bepalen het percentage sessies dat wordt bijgehouden, geconfigureerd via omgevingsvariabelen.

## Dashboardgegevensquery's

### Wekelijkse betrokkenheidstrends

```ts
export async function getWeeklyEngagementData(
  itemSlugs: string[],
  weeks: number = 12
): Promise<Array<{ week: string; votes: number; comments: number }>>
```

Gebruikt PostgreSQL `to_char(date, 'IYYY-IW')` voor ISO-weekgroepering.

### Uitsplitsing van dagelijkse activiteiten

```ts
export async function getDailyActivityData(
  clientProfileId: string,
  itemSlugs: string[],
  days: number = 7
): Promise<
  Array<{
    date: string;
    submissions: number;
    views: number;
    engagement: number;
  }>
>
```

### Best presterende items

```ts
export async function getTopItemsEngagement(
  itemSlugs: string[],
  limit: number = 5
): Promise<Array<{ itemId: string; votes: number; comments: number }>>
```

Items worden gerangschikt op basis van totale betrokkenheid (stemmen plus opmerkingen).

## Veerkrachtig gegevens laden

De `getAllStats` -methode gebruikt `Promise.allSettled` om ervoor te zorgen dat gedeeltelijke fouten het dashboard niet kapot maken:

```ts
async getAllStats(): Promise<AdminDashboardStats> {
  const [u, s, a, n] = await Promise.allSettled([
    this.getUserStats(),
    this.getSubmissionStats(),
    this.getActivityStats(),
    this.getNewsletterStats(),
  ]);

  // Each section falls back to zero values on rejection
  const users =
    u.status === 'fulfilled'
      ? u.value
      : {
          totalUsers: 0,
          registeredUsers: 0,
          newUsersToday: 0,
          newUsersThisWeek: 0,
          newUsersThisMonth: 0,
        };
  // ... similar for submissions, activity, newsletter
}
```

## Toestemmingsvereisten

Analytics-functies worden beveiligd door het toestemmingssysteem:

```ts
// Required permissions for analytics access
PERMISSIONS.analytics.read   // 'analytics:read'
PERMISSIONS.analytics.export // 'analytics:export'
```

Op abonnementsbasis toegang tot functies:

| Kenmerk | Gratis | Standaard | Premie |
|---------|------|----------|---------|
| Statistieken bekijken | Nee | Ja | Ja |
| Geavanceerde analyses | Nee | Nee | Ja |

## Gerelateerde documentatie

- [Analytics-achtergrond](/docs/template/services/analytics-background) -- Achtergrondverwerkingsdetails
- [PostHog Service](/docs/template/services/posthog-service) -- PostHog server-side API
- [Exportservice](/docs/template/services/export-service) -- Gegevensexport
- [Activiteitsservice] (/docs/template/services/activity-service) - Volgen van gebruikersactiviteiten
- [Engagementservice](/docs/template/services/engagement-services) -- Populariteitsscore
