---
id: admin-analytics
title: Analisi amministrativa
sidebar_label: Analisi amministrativa
sidebar_position: 32
---

# Analisi amministrativa

Il sistema di analisi amministrativa fornisce statistiche a livello di piattaforma, metriche di coinvolgimento, monitoraggio della crescita degli utenti ed elaborazione dei dati in background. Combina query di database in tempo reale, aggregazioni memorizzate nella cache e integrazione PostHog opzionale per analisi complete.

## Panoramica dell'architettura

| Modulo | Percorso | Scopo |
|--------|------|---------|
| Repository delle statistiche di amministrazione | `lib/repositories/admin-stats.repository.ts` | Statistiche principali del dashboard |
| Query del dashboard | `lib/db/queries/dashboard.queries.ts` | Query di aggregazione del coinvolgimento |
| Domande sul coinvolgimento | `lib/db/queries/engagement.queries.ts` | Metriche per articolo |
| Processore in background di analisi | `lib/services/analytics-background-processor.ts` | Pianificazione lavori in background |
| Cliente di analisi | `lib/analytics/index.ts` | Integrazione PostHog/Sentry lato client |
| Servizio API PostHog | `lib/services/posthog-api.service.ts` | Query PostHog lato server |
| Esportazione analisi | `lib/services/analytics-export.service.ts` | Funzionalità di esportazione dati |
| Rapporti pianificati | `lib/services/analytics-scheduled-reports.service.ts` | Generazione automatizzata di report |

## Statistiche del dashboard di amministrazione

Il `AdminStatsRepository` aggrega quattro categorie di statistiche utilizzando `Promise.allSettled` per il caricamento resiliente dei dati:

```ts
export interface AdminDashboardStats {
  users: UserStats;
  submissions: SubmissionStats;
  activity: ActivityStats;
  newsletter: NewsletterStats;
}
```

### Statistiche utente

```ts
export interface UserStats {
  totalUsers: number;
  registeredUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}
```

Le query utilizzano limiti di data normalizzati UTC per garantire risultati coerenti indipendentemente dal fuso orario del server:

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

### Statistiche di invio

```ts
export interface SubmissionStats {
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
}
```

Recuperato dal metodo `ItemRepository.getStats()` poiché gli elementi risiedono nel CMS basato su Git.

### Statistiche delle attività

```ts
export interface ActivityStats {
  totalViews: number;
  totalVotes: number;
  totalComments: number;
}
```

Le visualizzazioni provengono da PostHog quando configurate, tornando a zero:

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

### Statistiche della newsletter

```ts
export interface NewsletterStats {
  totalSubscribers: number;
  recentSubscribers: number; // subscribed this week
}
```

## Elaborazione analitica in background

Il `AnalyticsBackgroundProcessor` pianifica sei lavori ricorrenti:

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

| Lavoro | Intervallo | Scopo |
|-----|----------|---------|
| Aggregazione crescita utenti | 10 minuti | Aggiorna le tendenze di crescita degli utenti |
| Aggregazione delle tendenze delle attività | 5 minuti | Aggiorna le serie temporali del coinvolgimento |
| Classifica degli articoli migliori | 15 minuti | Ricalcola le classifiche di popolarità degli articoli |
| Aggiornamento attività recente | 2 minuti | Aggiorna il feed delle attività più recenti |
| Aggiornamento delle metriche delle prestazioni | 30 secondi | Aggiorna i dati sulle prestazioni in tempo reale |
| Pulizia della cache | 1 ora | Rimuove le aggregazioni memorizzate nella cache obsolete |

I lavori possono essere disabilitati impostando `DISABLE_AUTO_SYNC=true` .

Ogni lavoro tiene traccia del proprio stato:

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

## Metriche di coinvolgimento

### Metriche per articolo

La funzione `getEngagementMetricsPerItem` recupera tutte le metriche in parallelo:

```ts
export interface ItemEngagementMetrics {
  views: number;
  votes: number;       // Net votes (upvotes - downvotes)
  favorites: number;
  comments: number;
  avgRating: number;   // Average rating from comments (0-5)
}
```

Vengono eseguite quattro query parallele:

1. Visualizza i conteggi da `item_views` 2. Punteggi netti dei voti da `votes` (voto positivo = +1, voto negativo = -1)
3. I preferiti contano da `favorites` 4. Conteggio dei commenti e valutazioni medie da `comments` (esclusi quelli eliminati temporaneamente)

### Punteggio di popolarità

Gli elementi vengono valutati utilizzando un algoritmo logaritmico:

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

## Analisi lato client

La classe singleton `Analytics` in `lib/analytics/index.ts` gestisce il tracciamento lato client:

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

### Provider di monitoraggio delle eccezioni

Il modulo di analisi supporta tre configurazioni di monitoraggio delle eccezioni:

| Fornitore | Descrizione |
|----------|-------------|
| `posthog` | Errori inviati solo a PostHog |
| `sentry` | Errori inviati solo a Sentry |
| `both` | Errori inviati sia a PostHog che a Sentry |

Il provider viene determinato da `EXCEPTION_TRACKING_PROVIDER` con fallback automatico se il provider configurato non è disponibile.

### Configurazione PostHog

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

Le frequenze di campionamento controllano la percentuale di sessioni tracciate, configurate tramite variabili di ambiente.

## Query sui dati del dashboard

### Tendenze di coinvolgimento settimanali

```ts
export async function getWeeklyEngagementData(
  itemSlugs: string[],
  weeks: number = 12
): Promise<Array<{ week: string; votes: number; comments: number }>>
```

Utilizza PostgreSQL `to_char(date, 'IYYY-IW')` per il raggruppamento settimanale ISO.

### Ripartizione delle attività quotidiane

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

### Articoli con le migliori prestazioni

```ts
export async function getTopItemsEngagement(
  itemSlugs: string[],
  limit: number = 5
): Promise<Array<{ itemId: string; votes: number; comments: number }>>
```

Gli elementi sono classificati in base al coinvolgimento totale (voti più commenti).

## Caricamento dati resiliente

Il metodo `getAllStats` utilizza `Promise.allSettled` per garantire che i guasti parziali non rompano il dashboard:

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

## Requisiti di autorizzazione

Le funzionalità di analisi sono controllate dal sistema di autorizzazione:

```ts
// Required permissions for analytics access
PERMISSIONS.analytics.read   // 'analytics:read'
PERMISSIONS.analytics.export // 'analytics:export'
```

Accesso alle funzionalità in base al piano:

| Caratteristica | Gratuito | Norma | Premio |
|---------|------|----------|---------|
| Visualizza statistiche | No | Sì | Sì |
| Analisi avanzata | No | No | Sì |

## Documentazione correlata

- [Background su Analytics](/docs/template/services/analytics- background) -- Dettagli sull'elaborazione in background
- [Servizio PostHog](/docs/template/services/posthog-service) - API lato server PostHog
- [Servizio di esportazione](/docs/template/services/export-service) -- Esportazione dei dati
- [Servizio attività](/docs/template/services/activity-service) - Monitoraggio dell'attività dell'utente
- [Servizio di coinvolgimento](/docs/template/services/engagement-services) -- Punteggio di popolarità
