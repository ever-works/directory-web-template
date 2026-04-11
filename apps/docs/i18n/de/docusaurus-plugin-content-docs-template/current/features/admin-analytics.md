---
id: admin-analytics
title: Admin-Analyse
sidebar_label: Admin-Analyse
sidebar_position: 32
---

# Admin-Analyse

Das Admin-Analysesystem bietet plattformweite Statistiken, Engagement-Metriken, Verfolgung des Benutzerwachstums und Hintergrunddatenverarbeitung. Es kombiniert Echtzeit-Datenbankabfragen, zwischengespeicherte Aggregationen und optionale PostHog-Integration für umfassende Analysen.

## Architekturübersicht

| Modul | Pfad | Zweck |
|--------|------|---------|
| Admin-Statistik-Repository | `lib/repositories/admin-stats.repository.ts` | Kern-Dashboard-Statistiken |
| Dashboard-Abfragen | `lib/db/queries/dashboard.queries.ts` | Abfragen zur Engagement-Aggregation |
| Engagement-Abfragen | `lib/db/queries/engagement.queries.ts` | Metriken pro Artikel |
| Analytics-Hintergrundprozessor | `lib/services/analytics-background-processor.ts` | Hintergrundjobplaner |
| Analytics-Client | `lib/analytics/index.ts` | Clientseitige PostHog/Sentry-Integration |
| PostHog-API-Dienst | `lib/services/posthog-api.service.ts` | Serverseitige PostHog-Abfragen |
| Analytics-Export | `lib/services/analytics-export.service.ts` | Datenexportfunktion |
| Geplante Berichte | `lib/services/analytics-scheduled-reports.service.ts` | Automatisierte Berichtserstellung |

## Admin-Dashboard-Statistiken

Der `AdminStatsRepository` aggregiert vier Kategorien von Statistiken unter Verwendung von `Promise.allSettled` für ein stabiles Laden von Daten:

```ts
export interface AdminDashboardStats {
  users: UserStats;
  submissions: SubmissionStats;
  activity: ActivityStats;
  newsletter: NewsletterStats;
}
```

### Benutzerstatistiken

```ts
export interface UserStats {
  totalUsers: number;
  registeredUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}
```

Abfragen verwenden UTC-normalisierte Datumsgrenzen, um unabhängig von der Serverzeitzone konsistente Ergebnisse sicherzustellen:

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

### Einreichungsstatistik

```ts
export interface SubmissionStats {
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
}
```

Wird von der `ItemRepository.getStats()` -Methode abgerufen, da Elemente im Git-basierten CMS gespeichert sind.

### Aktivitätsstatistik

```ts
export interface ActivityStats {
  totalViews: number;
  totalVotes: number;
  totalComments: number;
}
```

Ansichten werden bei der Konfiguration von PostHog bezogen und fallen auf Null zurück:

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

### Newsletter-Statistiken

```ts
export interface NewsletterStats {
  totalSubscribers: number;
  recentSubscribers: number; // subscribed this week
}
```

## Hintergrundanalyseverarbeitung

Der `AnalyticsBackgroundProcessor` plant sechs wiederkehrende Jobs:

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

| Job | Intervall | Zweck |
|-----|----------|---------|
| Aggregation des Benutzerwachstums | 10 Minuten | Aktualisiert Benutzerwachstumstrends |
| Aggregation von Aktivitätstrends | 5 Minuten | Aktualisiert Engagement-Zeitreihen |
| Ranking der Top-Artikel | 15 Minuten | Berechnet die Beliebtheitsrankings von Artikeln neu |
| Aktuelles Aktivitätsupdate | 2 Minuten | Aktualisiert den neuesten Aktivitätsfeed |
| Aktualisierung der Leistungsmetriken | 30 Sek. | Aktualisiert Echtzeit-Leistungsdaten |
| Cache-Bereinigung | 1 Stunde | Entfernt veraltete zwischengespeicherte Aggregationen |

Jobs können durch die Einstellung `DISABLE_AUTO_SYNC=true` deaktiviert werden.

Jeder Job verfolgt seinen eigenen Status:

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

## Engagement-Metriken

### Metriken pro Artikel

Die Funktion `getEngagementMetricsPerItem` ruft alle Metriken parallel ab:

```ts
export interface ItemEngagementMetrics {
  views: number;
  votes: number;       // Net votes (upvotes - downvotes)
  favorites: number;
  comments: number;
  avgRating: number;   // Average rating from comments (0-5)
}
```

Vier parallele Abfragen werden ausgeführt:

1. Zählungen ab `item_views` anzeigen
2. Netto-Stimmenwerte von `votes` (Upvote = +1, Downvote = -1)
3. Der Favorit zählt ab `favorites` 4. Kommentaranzahl und durchschnittliche Bewertungen ab `comments` (ohne vorläufig gelöschte Kommentare)

### Beliebtheitsbewertung

Die Punkte werden mithilfe eines logarithmischen Algorithmus bewertet:

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

## Clientseitige Analyse

Die Singleton-Klasse `Analytics` in `lib/analytics/index.ts` verwaltet die clientseitige Nachverfolgung:

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

### Ausnahmeverfolgungsanbieter

Das Analysemodul unterstützt drei Ausnahmeverfolgungskonfigurationen:

| Anbieter | Beschreibung |
|----------|-------------|
| `posthog` | Nur an PostHog gesendete Fehler |
| `sentry` | Nur an Sentry gesendete Fehler |
| `both` | Fehler werden sowohl an PostHog als auch an Sentry gesendet |

Ab `EXCEPTION_TRACKING_PROVIDER` erfolgt die Provider-Ermittlung mit automatischem Fallback, wenn der konfigurierte Provider nicht erreichbar ist.

### PostHog-Konfiguration

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

Die Abtastraten steuern den Prozentsatz der verfolgten Sitzungen und werden über Umgebungsvariablen konfiguriert.

## Dashboard-Datenabfragen

### Wöchentliche Engagement-Trends

```ts
export async function getWeeklyEngagementData(
  itemSlugs: string[],
  weeks: number = 12
): Promise<Array<{ week: string; votes: number; comments: number }>>
```

Verwendet PostgreSQL `to_char(date, 'IYYY-IW')` für die ISO-Wochengruppierung.

### Tägliche Aktivitätsaufschlüsselung

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

### Artikel mit der besten Leistung

```ts
export async function getTopItemsEngagement(
  itemSlugs: string[],
  limit: number = 5
): Promise<Array<{ itemId: string; votes: number; comments: number }>>
```

Die Elemente werden nach Gesamtengagement (Stimmen plus Kommentare) geordnet.

## Resilientes Laden von Daten

Die `getAllStats` -Methode verwendet `Promise.allSettled` , um sicherzustellen, dass Teilfehler das Dashboard nicht beschädigen:

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

## Berechtigungsanforderungen

Analytics-Funktionen werden durch das Berechtigungssystem eingeschränkt:

```ts
// Required permissions for analytics access
PERMISSIONS.analytics.read   // 'analytics:read'
PERMISSIONS.analytics.export // 'analytics:export'
```

Planbasierter Funktionszugriff:

| Funktion | Kostenlos | Standard | Prämie |
|---------|------|----------|---------|
| Statistiken anzeigen | Nein | Ja | Ja |
| Erweiterte Analytik | Nein | Nein | Ja |

## Verwandte Dokumentation

– [Analytics-Hintergrund](/docs/template/services/analytics-background) – Details zur Hintergrundverarbeitung
– [PostHog-Dienst](/docs/template/services/posthog-service) – serverseitige PostHog-API
- [Exportdienst](/docs/template/services/export-service) – Datenexport
– [Aktivitätsdienst](/docs/template/services/activity-service) – Verfolgung der Benutzeraktivität
– [Engagement Service](/docs/template/services/engagement-services) – Beliebtheitsbewertung
