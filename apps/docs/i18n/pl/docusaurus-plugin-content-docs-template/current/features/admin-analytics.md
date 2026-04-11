---
id: admin-analytics
title: Analityka administracyjna
sidebar_label: Analityka administracyjna
sidebar_position: 32
---

# Analityka administracyjna

System analityczny dla administratorów zapewnia statystyki dla całej platformy, wskaźniki zaangażowania, śledzenie wzrostu liczby użytkowników i przetwarzanie danych w tle. Łączy w sobie zapytania do baz danych w czasie rzeczywistym, agregacje w pamięci podręcznej i opcjonalną integrację z PostHog w celu zapewnienia kompleksowej analityki.

## Przegląd architektury

| Moduł | Ścieżka | Cel |
|------------|------|--------|
| Repozytorium statystyk administratora | `lib/repositories/admin-stats.repository.ts` | Podstawowe statystyki panelu |
| Zapytania na panelu | `lib/db/queries/dashboard.queries.ts` | Zapytania o agregację zaangażowania |
| Zapytania o zaangażowanie | `lib/db/queries/engagement.queries.ts` | Dane dotyczące poszczególnych elementów |
| Procesor analityczny w tle | `lib/services/analytics-background-processor.ts` | Harmonogram zadań w tle |
| Klient analityczny | `lib/analytics/index.ts` | Integracja PostHog/Sentry po stronie klienta |
| Usługa API PostHog | `lib/services/posthog-api.service.ts` | Zapytania PostHog po stronie serwera |
| Eksport analityki | `lib/services/analytics-export.service.ts` | Funkcja eksportu danych |
| Zaplanowane raporty | `lib/services/analytics-scheduled-reports.service.ts` | Automatyczne generowanie raportów |

## Statystyki panelu administracyjnego `AdminStatsRepository` agreguje cztery kategorie statystyk, wykorzystując `Promise.allSettled` do elastycznego ładowania danych:

```ts
export interface AdminDashboardStats {
  users: UserStats;
  submissions: SubmissionStats;
  activity: ActivityStats;
  newsletter: NewsletterStats;
}
```

### Statystyki użytkowników

```ts
export interface UserStats {
  totalUsers: number;
  registeredUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}
```

Zapytania wykorzystują granice dat znormalizowane w formacie UTC, aby zapewnić spójne wyniki niezależnie od strefy czasowej serwera:

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

### Statystyki zgłoszeń

```ts
export interface SubmissionStats {
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
}
```

Pobierane metodą `ItemRepository.getStats()` , ponieważ elementy znajdują się w systemie CMS opartym na Git.

### Statystyki aktywności

```ts
export interface ActivityStats {
  totalViews: number;
  totalVotes: number;
  totalComments: number;
}
```

Widoki pochodzą z PostHog po skonfigurowaniu i spadają do zera:

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

### Statystyki biuletynów

```ts
export interface NewsletterStats {
  totalSubscribers: number;
  recentSubscribers: number; // subscribed this week
}
```

## Przetwarzanie analityczne w tle `AnalyticsBackgroundProcessor` planuje sześć powtarzających się zadań:

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

| Praca | Interwał | Cel |
|---------|----------|--------|
| Agregacja wzrostu liczby użytkowników | 10 minut | Odświeża trendy wzrostu liczby użytkowników |
| Agregacja trendów aktywności | 5 minut | Aktualizuje szeregi czasowe zaangażowania |
| Ranking najlepszych przedmiotów | 15 minut | Przelicza rankingi popularności przedmiotów |
| Ostatnia aktualizacja aktywności | 2 minuty | Odświeża najnowszy kanał aktywności |
| Aktualizacja wskaźników wydajności | 30 sekund | Aktualizuje dane dotyczące wydajności w czasie rzeczywistym |
| Czyszczenie pamięci podręcznej | 1 godzina | Usuwa nieaktualne agregacje w pamięci podręcznej |

Zadania można wyłączyć, ustawiając `DISABLE_AUTO_SYNC=true` .

Każde zadanie śledzi swój własny status:

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

## Wskaźniki zaangażowania

### Dane dotyczące poszczególnych elementów

Funkcja `getEngagementMetricsPerItem` pobiera wszystkie metryki równolegle:

```ts
export interface ItemEngagementMetrics {
  views: number;
  votes: number;       // Net votes (upvotes - downvotes)
  favorites: number;
  comments: number;
  avgRating: number;   // Average rating from comments (0-5)
}
```

Wykonywane są cztery równoległe zapytania:

1. Wyświetl liczbę od `item_views` 2. Wyniki głosów netto od `votes` (głos za = +1, głos za minusem = -1)
3. Ulubione liczą się od `favorites` 4. Liczba komentarzy i średnie oceny od `comments` (z wyłączeniem usuniętych nietrafnie)

### Punktacja popularności

Pozycje są oceniane przy użyciu algorytmu logarytmicznego:

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

## Analityka po stronie klienta

Klasa singletonu `Analytics` w `lib/analytics/index.ts` zarządza śledzeniem po stronie klienta:

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

### Dostawcy śledzenia wyjątków

Moduł analityczny obsługuje trzy konfiguracje śledzenia wyjątków:

| Dostawca | Opis |
|--------------|------------|
| `posthog` | Błędy wysłane tylko do PostHog |
| `sentry` | Błędy wysyłane tylko do Sentry |
| `both` | Błędy wysłane zarówno do PostHog, jak i Sentry |

Dostawca jest ustalany od `EXCEPTION_TRACKING_PROVIDER` z automatycznym przywróceniem, jeśli skonfigurowany dostawca jest niedostępny.

### Konfiguracja PostHog

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

Częstotliwości próbkowania kontrolują procent śledzonych sesji, konfigurowany za pomocą zmiennych środowiskowych.

## Zapytania o dane panelu kontrolnego

### Tygodniowe trendy w zaangażowaniu

```ts
export async function getWeeklyEngagementData(
  itemSlugs: string[],
  weeks: number = 12
): Promise<Array<{ week: string; votes: number; comments: number }>>
```

Używa PostgreSQL `to_char(date, 'IYYY-IW')` do grupowania tygodni ISO.

### Dzienny podział aktywności

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

### Elementy o najwyższej skuteczności

```ts
export async function getTopItemsEngagement(
  itemSlugs: string[],
  limit: number = 5
): Promise<Array<{ itemId: string; votes: number; comments: number }>>
```

Pozycje są uszeregowane według całkowitego zaangażowania (głosy i komentarze).

## Odporne ładowanie danych

Metoda `getAllStats` wykorzystuje `Promise.allSettled` , aby mieć pewność, że częściowe awarie nie uszkodzą deski rozdzielczej:

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

## Wymagania dotyczące uprawnień

Funkcje Analytics są blokowane przez system uprawnień:

```ts
// Required permissions for analytics access
PERMISSIONS.analytics.read   // 'analytics:read'
PERMISSIONS.analytics.export // 'analytics:export'
```

Dostęp do funkcji w oparciu o plan:

| Funkcja | Bezpłatne | Standardowe | Premium |
|--------|------|----------|---------|
| Zobacz statystyki | Nie | Tak | Tak |
| Zaawansowana analityka | Nie | Nie | Tak |

## Powiązana dokumentacja

– [Podstawy Analytics](/docs/template/services/analytics-background) – Szczegóły przetwarzania w tle
- [Usługa PostHog](/docs/template/services/posthog-service) -- API PostHog po stronie serwera
- [Usługa eksportu](/docs/template/services/export-service) -- Eksport danych
- [Usługa aktywności](/docs/template/services/activity-service) -- Śledzenie aktywności użytkownika
– [Usługa angażująca](/docs/template/services/engagement-services) – Punktacja popularności
