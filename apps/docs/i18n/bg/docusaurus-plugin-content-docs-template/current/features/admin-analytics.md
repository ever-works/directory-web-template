---
id: admin-analytics
title: Администраторски анализ
sidebar_label: Администраторски анализ
sidebar_position: 32
---

# Администраторски анализ

Системата за администраторски анализ предоставя статистика за цялата платформа, показатели за ангажираност, проследяване на растежа на потребителите и обработка на фонови данни. Той съчетава заявки в база данни в реално време, кеширани агрегации и опционална интеграция на PostHog за цялостен анализ.

## Преглед на архитектурата

| Модул | Път | Цел |
|--------|------|---------|
| Хранилище на администраторски статистики | `lib/repositories/admin-stats.repository.ts` | Основни статистики на таблото |
| Заявки за таблото | `lib/db/queries/dashboard.queries.ts` | Заявки за агрегиране на ангажираност |
| Запитвания за ангажираност | `lib/db/queries/engagement.queries.ts` | Показатели за всеки артикул |
| Анализатор на фонов процесор | `lib/services/analytics-background-processor.ts` | Планировчик на фонови задачи |
| Клиент за анализ | `lib/analytics/index.ts` | Интеграция на PostHog/Sentry от страна на клиента |
| PostHog API услуга | `lib/services/posthog-api.service.ts` | Заявки на PostHog от страна на сървъра |
| Експортиране на анализ | `lib/services/analytics-export.service.ts` | Функция за експортиране на данни |
| Планирани отчети | `lib/services/analytics-scheduled-reports.service.ts` | Автоматично генериране на отчет |

## Статистика на таблото за управление на администратора `AdminStatsRepository` агрегира четири категории статистики, използвайки `Promise.allSettled` за устойчиво зареждане на данни:

```ts
export interface AdminDashboardStats {
  users: UserStats;
  submissions: SubmissionStats;
  activity: ActivityStats;
  newsletter: NewsletterStats;
}
```

### Потребителска статистика

```ts
export interface UserStats {
  totalUsers: number;
  registeredUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}
```

Заявките използват UTC-нормализирани граници на датата, за да осигурят последователни резултати независимо от часовата зона на сървъра:

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

### Статистика на подаването

```ts
export interface SubmissionStats {
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
}
```

Извлечено от метода `ItemRepository.getStats()` , тъй като елементите живеят в базираната на Git CMS.

### Статистика на активността

```ts
export interface ActivityStats {
  totalViews: number;
  totalVotes: number;
  totalComments: number;
}
```

Изгледите се извличат от PostHog, когато са конфигурирани, като се връщат към нула:

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

### Статистика за бюлетин

```ts
export interface NewsletterStats {
  totalSubscribers: number;
  recentSubscribers: number; // subscribed this week
}
```

## Обработка на фонови анализи `AnalyticsBackgroundProcessor` планира шест повтарящи се задачи:

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

| Работа | Интервал | Цел |
|-----|----------|---------|
| Обединяване на растежа на потребителите | 10 минути | Обновява тенденциите за растеж на потребителите |
| Агрегиране на тенденции в дейността | 5 минути | Актуализира времеви редове за ангажираност |
| Класиране на най-добрите елементи | 15 минути | Преизчислява класацията за популярност на артикул |
| Актуализация на скорошна дейност | 2 минути | Обновява най-новата емисия за активност |
| Актуализация на показателите за ефективност | 30 сек | Актуализира данните за ефективността в реално време |
| Почистване на кеша | 1 час | Премахва остарелите кеширани агрегати |

Задачите могат да бъдат деактивирани чрез настройка на `DISABLE_AUTO_SYNC=true` .

Всяка работа проследява собствения си статус:

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

## Показатели за ангажираност

### Показатели за всеки елемент

Функцията `getEngagementMetricsPerItem` извлича всички показатели паралелно:

```ts
export interface ItemEngagementMetrics {
  views: number;
  votes: number;       // Net votes (upvotes - downvotes)
  favorites: number;
  comments: number;
  avgRating: number;   // Average rating from comments (0-5)
}
```

Изпълняват се четири паралелни заявки:

1. Прегледите се броят от `item_views` 2. Нетни резултати от гласуване от `votes` (гласуване за = +1, гласуване против = -1)
3. Любимите се броят от `favorites` 4. Брой коментари и средни оценки от `comments` (с изключение на меко изтритите)

### Оценка на популярността

Елементите се оценяват с помощта на логаритмичен алгоритъм:

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

## Анализ от страна на клиента

Класът `Analytics` singleton в `lib/analytics/index.ts` управлява проследяването от страна на клиента:

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

### Доставчици на проследяване на изключения

Модулът за анализ поддържа три конфигурации за проследяване на изключения:

| Доставчик | Описание |
|----------|-------------|
| `posthog` | Грешки, изпратени само до PostHog |
| `sentry` | Грешки, изпратени само до Sentry |
| `both` | Грешки, изпратени до PostHog и Sentry |

Доставчикът се определя от `EXCEPTION_TRACKING_PROVIDER` с автоматично възстановяване, ако конфигурираният доставчик не е наличен.

### Конфигурация на PostHog

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

Процентите на вземане на проби контролират процента на сесиите, които се проследяват, конфигурирани чрез променливи на средата.

## Заявки за данни на таблото

### Седмични тенденции в ангажираността

```ts
export async function getWeeklyEngagementData(
  itemSlugs: string[],
  weeks: number = 12
): Promise<Array<{ week: string; votes: number; comments: number }>>
```

Използва PostgreSQL `to_char(date, 'IYYY-IW')` за ISO групиране на седмици.

### Разбивка на дневната активност

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

### Най-ефективни артикули

```ts
export async function getTopItemsEngagement(
  itemSlugs: string[],
  limit: number = 5
): Promise<Array<{ itemId: string; votes: number; comments: number }>>
```

Елементите се класират по обща ангажираност (гласове плюс коментари).

## Устойчиво зареждане на данни

Методът `getAllStats` използва `Promise.allSettled` , за да гарантира, че частичните повреди няма да разрушат таблото:

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

## Изисквания за разрешение

Функциите на анализа се контролират от системата за разрешения:

```ts
// Required permissions for analytics access
PERMISSIONS.analytics.read   // 'analytics:read'
PERMISSIONS.analytics.export // 'analytics:export'
```

Достъп до функции, базиран на план:

| Характеристика | Безплатно | Стандартен | Премиум |
|---------|------|----------|---------|
| Преглед на статистика | Не | Да | Да |
| Разширен анализ | Не | Не | Да |

## Свързана документация

– [Фон на Анализ](/docs/template/services/analytics-background) – Подробности за обработка на фон
- [Услуга PostHog](/docs/template/services/posthog-service) -- API на PostHog от страна на сървъра
- [Услуга за експортиране](/docs/template/services/export-service) -- Експортиране на данни
– [Услуга за активност](/docs/template/services/activity-service) – Проследяване на активността на потребителя
– [Услуга за ангажиране](/docs/template/services/engagement-services) – Оценяване на популярността
